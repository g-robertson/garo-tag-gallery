/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalTags, LocalTagServices, Tags, TagsNamespaces } from "../../db/tags.js";
import { LocalTaggableServices } from "../../db/taggables.js";
import { normalPreInsertLocalTag } from "../../client/js/tags.js";
import { dbBeginTransaction, dbEndTransaction } from "../../db/db-util.js";

/** @import {DBLocalTag} from "../../db/tags.js" */

const Z_CLIENT_TAG = z.object({
    displayName: z.string(),
    tagName: z.string(),
    namespaces: z.array(z.string()),
    tagCount: z.number()
});

/** @typedef {z.infer<typeof Z_CLIENT_TAG>} ClientTag */


export async function validate(dbs, req, res) {
    const taggableIDs = z.array(z.number().nonnegative().int()).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;
    const tagsToAdd = z.array(z.tuple([z.number().nonnegative().int(), z.array(Z_CLIENT_TAG)])).safeParse(req?.body?.tagsToAdd, {path: "tagsToAdd"});
    if (!tagsToAdd.success) return tagsToAdd.error.message;
    const tagsToRemove = z.array(z.tuple([z.number().nonnegative().int(), z.array(z.string().nonempty())])).safeParse(req?.body?.tagsToRemove, {path: "tagsToRemove"});
    if (!tagsToRemove.success) return tagsToRemove.error.message;

    return {
        taggableIDs: taggableIDs.data.map(BigInt),
        tagsToAdd: new Map(tagsToAdd.data.map(([localTagServiceID, tags]) => [
            localTagServiceID,
            new Map(tags.map(tag => [
                tag.tagName,
                tag
            ]))
        ])),
        tagsToRemove: new Map(tagsToRemove.data.map(([localTagServiceID, tags]) => [localTagServiceID, tags]))
    };
}

export const PERMISSIONS_REQUIRED = [
    {TYPE: PERMISSIONS.LOCAL_TAG_SERVICES, BITS: PERMISSION_BITS.CREATE | PERMISSION_BITS.READ},
    {TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES, BITS: PERMISSION_BITS.UPDATE}
];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTagServiceIDsToCheck = new Set([
        ...req.body.tagsToAdd.keys(),
        ...req.body.tagsToRemove.keys()
    ]);
    const localTagServiceIDs = await LocalTagServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.CREATE | PERMISSION_BITS.READ, [...localTagServiceIDsToCheck]);

    const localTaggableServicesToCheck = await LocalTaggableServices.selectManyByTaggableIDs(dbs, req.body.taggableIDs);
    const localTaggableServices = await LocalTaggableServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.UPDATE, localTaggableServicesToCheck.map(localTaggableService => localTaggableService.Local_Taggable_Service_ID));

    return localTagServiceIDsToCheck.size === localTagServiceIDs.length && localTaggableServicesToCheck.length === localTaggableServices.length;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    dbs = await dbBeginTransaction(dbs);

    /** @type {Set<bigint>} */
    const allTagsToRemove = new Set();
    for (const [localTagServiceID, tags] of req.body.tagsToRemove) {
        for (const dbLocalTag of await LocalTags.selectManyByLookupNames(dbs, tags, [localTagServiceID])) {
            allTagsToRemove.add(dbLocalTag.Tag_ID);
        }
    }
    
    /** @type {Set<bigint>} */
    const allTagsToAdd = new Set();
    for (const [localTagServiceID, tags] of req.body.tagsToAdd) {
        const dbLocalTagsMap = new Map((await LocalTags.upsertMany(
            dbs, 
            [...tags.keys()].map(tag => normalPreInsertLocalTag(tag, "User added")),
            localTagServiceID
        )).map(dbLocalTag => [
            dbLocalTag.Lookup_Name,
            dbLocalTag
        ]));

        await TagsNamespaces.upsertMany(dbs, new Map([...tags.values()].filter(tag => tag.namespaces.length !== 0).map(tag => [
            dbLocalTagsMap.get(tag.tagName).Tag_ID,
            new Set(tag.namespaces)
        ])));

        for (const tag of dbLocalTagsMap.values()) {
            allTagsToAdd.add(tag.Tag_ID);
        }
    }
    
    /** @type {Map<bigint, bigint[]>} */
    const tagPairingsToRemove = new Map([...allTagsToRemove].map(tagID => [
        tagID,
        req.body.taggableIDs
    ]));
    await Tags.deleteTagPairingsFromTaggables(dbs, tagPairingsToRemove);
    /** @type {Map<bigint, bigint[]>} */
    const tagPairingsToAdd = new Map([...allTagsToAdd].map(tagID => [
        tagID,
        req.body.taggableIDs
    ]));
    await Tags.upsertTagPairingsToTaggables(dbs, tagPairingsToAdd);

    await dbEndTransaction(dbs);

    res.status(200).send("Updated taggables");
}
