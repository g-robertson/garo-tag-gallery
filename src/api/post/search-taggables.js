/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { searchTaggables, userSelectAllLocalTaggableServices } from "../../db/taggables.js";
import { selectLocalTagServiceIDsByLocalTagIDs, selectLocalTagsByLocalTagIDs, userSelectAllLocalTagServices, userSelectLocalTagServices } from "../../db/tags.js";
import PerfTags from "../../perf-tags-binding/perf-tags.js";

export function validate(dbs, req, res) {
    const searchQuery = req?.body?.searchQuery;
    if (!(searchQuery instanceof Array)) {
        return "searchQuery was not an array";
    }

    const allLocalTagIDs = new Set();
    for (const searchTags of searchQuery) {
        if (!(searchTags instanceof Array)) {
            return "searchQuery was not an array of array";
        }

        for (const searchTag of searchTags) {
            if (typeof searchTag !== "object") {
                return "searchQuery was not an array of array of search objects";
            }

            const {Local_Tag_ID, exclude} = searchTag;
            if (!Number.isSafeInteger(Local_Tag_ID)) {
                return "searchQuery was not an array of array of search objects with Local_Tag_ID as safe integer";
            }

            if (typeof exclude !== "boolean") {
                return "searchQuery was not an array of array of search objects with exclude as boolean";
            }

            allLocalTagIDs.add(Local_Tag_ID);
        }
    }

    req.sanitizedBody = {
        searchQuery,
        allLocalTagIDs: [...allLocalTagIDs]
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.LOCAL_TAGGABLE_SERVICES, PERMISSIONS.LOCAL_TAG_SERVICES];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.READ;
export async function checkPermission(dbs, req, res) {
    const localTagServiceIDsToCheck = await selectLocalTagServiceIDsByLocalTagIDs(dbs, req.sanitizedBody.allLocalTagIDs)
    const localTagServices = await userSelectLocalTagServices(dbs, req.user, PERMISSION_BITS.READ, localTagServiceIDsToCheck);
    return localTagServices.length === localTagServiceIDsToCheck.length;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const localTagsMap = new Map((await selectLocalTagsByLocalTagIDs(dbs, req.sanitizedBody.allLocalTagIDs)).map(tag => [tag.Local_Tag_ID, tag]));
    if (localTagsMap.size !== req.sanitizedBody.allLocalTagIDs.length) {
        return res.status(400).send("One of the local tags sent in did not exist");
    }
    const localTagServices = await userSelectAllLocalTagServices(dbs, req.user, PERMISSION_BITS.READ);
    const localTaggableServices = await userSelectAllLocalTaggableServices(dbs, req.user, PERMISSION_BITS.READ);
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

    const taggables = await searchTaggables(
        dbs,
        searchCriteria,
        localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID),
        localTaggableServices.map(localTaggableService => localTaggableService.In_Local_Taggable_Service_Tag_ID)
    );

    return res.status(200).send(bjsonStringify(taggables.map(taggableID => Number(taggableID))));
}
