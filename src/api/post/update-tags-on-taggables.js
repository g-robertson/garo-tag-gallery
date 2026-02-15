/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { LocalTags, Tags, TagsNamespaces } from "../../db/tags.js";
import { normalPreInsertLocalTag } from "../../client/js/tags.js";
import { dbBeginTransaction, dbEndTransaction } from "../../db/db-util.js";
import { Z_TAGGABLE_ID, Z_USER_LOCAL_TAG_SERVICE_ID } from "../zod-types.js";

/** @import {DBLocalTag} from "../../db/tags.js" */

const Z_CLIENT_TAG = z.object({
    displayName: z.string(),
    tagName: z.string(),
    namespaces: z.array(z.string()),
    tagCount: z.number()
});

/** @typedef {z.infer<typeof Z_CLIENT_TAG>} ClientTag */


export async function validate(dbs, req, res) {
    const taggableIDs = z.array(Z_TAGGABLE_ID).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;
    const tagsToAdd = z.array(z.tuple([Z_USER_LOCAL_TAG_SERVICE_ID, z.array(Z_CLIENT_TAG)])).safeParse(req?.body?.tagsToAdd, {path: "tagsToAdd"});
    if (!tagsToAdd.success) return tagsToAdd.error.message;
    const tagsToRemove = z.array(z.tuple([Z_USER_LOCAL_TAG_SERVICE_ID, z.array(z.string().nonempty())])).safeParse(req?.body?.tagsToRemove, {path: "tagsToRemove"});
    if (!tagsToRemove.success) return tagsToRemove.error.message;

    return {
        taggableIDs: taggableIDs.data,
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


/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES, PERMISSIONS.LOCAL_TAG_SERVICES.CREATE_TAGS, PERMISSIONS.LOCAL_TAG_SERVICES.APPLY_TAGS],
        objects: {
            Local_Tag_Service_IDs: [...new Set([
                ...req.body.tagsToAdd.keys(),
                ...req.body.tagsToRemove.keys(),
            ])],
            Taggable_IDs: req.body.taggableIDs
        }
    };
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
        const dbLocalTagsMap = new Map((await LocalTags.uniqueInsertMany(
            dbs, 
            [...tags.keys()].map(tag => normalPreInsertLocalTag(tag, "User added")),
            localTagServiceID
        )).map(dbLocalTag => [
            dbLocalTag.Lookup_Name,
            dbLocalTag
        ]));

        await TagsNamespaces.uniqueInsertMany(dbs, new Map([...tags.values()].filter(tag => tag.namespaces.length !== 0).map(tag => [
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
    await Tags.uniqueInsertTagPairingsToTaggables(dbs, tagPairingsToAdd);

    await dbEndTransaction(dbs);

    res.status(200).send("Updated taggables");
}
