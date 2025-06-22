/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { Taggables, LocalTaggableServices } from "../../db/taggables.js";
import { LocalTags, LocalTagServices } from "../../db/tags.js";
import z from "zod";
import PerfTags from "../../perf-tags-binding/perf-tags.js";

const Z_SEARCH_QUERY = z.array(z.array(z.object({
    "Local_Tag_ID": z.number().nonnegative().int(),
    "exclude": z.boolean()
})));
export function validate(dbs, req, res) {
    const trySearchQuery = Z_SEARCH_QUERY.safeParse(req?.body?.searchQuery, {path: ["searchQuery"]});
    if (!trySearchQuery.success) return trySearchQuery.error.message;
    const searchQuery = trySearchQuery.data;

    const allLocalTagIDs = new Set();
    for (const searchTags of searchQuery) {
        for (const searchTag of searchTags) {
            const {Local_Tag_ID, exclude} = searchTag;
            allLocalTagIDs.add(Local_Tag_ID);
        }
    }

    req.sanitizedBody = {
        searchQuery,
        allLocalTagIDs: [...allLocalTagIDs]
    };
}

export const PERMISSIONS_REQUIRED = [
{
    TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
    BITS: PERMISSION_BITS.READ
}, {
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.READ
}];
export async function checkPermission(dbs, req, res) {
    const localTagServicesToCheck = await LocalTagServices.selectManyByLocalTagIDs(dbs, req.sanitizedBody.allLocalTagIDs)
    const localTagServices = await LocalTagServices.userSelectByID(dbs, req.user, PERMISSION_BITS.READ, localTagServicesToCheck.map(localTagServiceToCheck => localTagServiceToCheck.Local_Tag_Service_ID))
    return localTagServices.length === localTagServicesToCheck.length;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const localTagsMap = new Map((await LocalTags.selectManyByIDs(dbs, req.sanitizedBody.allLocalTagIDs)).map(tag => [tag.Local_Tag_ID, tag]));
    if (localTagsMap.size !== req.sanitizedBody.allLocalTagIDs.length) {
        return res.status(400).send("One of the local tags sent in did not exist");
    }
    
    const searchCriteria = PerfTags.searchIntersect(req.sanitizedBody.searchQuery.map(searchTags => {
        return PerfTags.searchUnion(searchTags.map(({Local_Tag_ID, exclude}) => {
            const {Tag_ID} = localTagsMap.get(Local_Tag_ID);
            if (exclude) {
                return PerfTags.searchComplement(PerfTags.searchTag(Tag_ID));
            } else {
                return PerfTags.searchTag(Tag_ID);
            }
        }));
    }));
    const taggables = await Taggables.searchWithUser(
        dbs,
        searchCriteria,
        req.user
    );

    return res.status(200).send(bjsonStringify(taggables.map(taggable => Number(taggable.Taggable_ID))));
}
