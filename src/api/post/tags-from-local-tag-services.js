/**
 * @import {APIFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { UserFacingLocalTags, LocalTagServices } from "../../db/tags.js";
import PerfTags from "../../perf-tags-binding/perf-tags.js";
import { getCursorAsTaggableIDs } from "../../db/cursor-manager.js";
import { bjsonStringify } from "../../client/js/client-util.js";

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const localTagServiceIDs = z.array(z.number().nonnegative().int()
        .refine(num => num !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, {"message": "Cannot lookup tags in system local tag service"})
    ).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) return localTagServiceIDs.error.message;
    
    const taggableCursor = z.string().or(z.undefined()).safeParse(req?.body?.taggableCursor, {path: ["taggableCursor"]});
    if (!taggableCursor.success) return taggableCursor.error.message;

    const taggableIDsRequested = z.array(z.number()).or(z.undefined()).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDsRequested.success) return taggableIDsRequested.error.message;

    let taggableIDs = getCursorAsTaggableIDs(dbs.cursorManager.getCursorForUser(req.user.id(), taggableCursor.data));
    if (taggableIDsRequested.data !== undefined) {
        const permittedTaggableIDs = new Set(taggableIDs);
        taggableIDs = taggableIDsRequested.data.map(BigInt);
        
        for (const taggableID of taggableIDs) {
            if (!permittedTaggableIDs.has(taggableID)) {
                return `The taggable with id=${taggableID} was not found in the cursor provided`;
            }
        }
    }
     

    return {
        localTagServiceIDs: localTagServiceIDs.data,
        taggableIDs
    };
}

export const PERMISSIONS_REQUIRED = {
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.READ
};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTagServiceIDsToCheck = req.body.localTagServiceIDs;
    const localTagServices = await LocalTagServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.READ, localTagServiceIDsToCheck);
    return localTagServices.length === localTagServiceIDsToCheck.length;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    let searchCriteria = "";
    if (req.body.taggableIDs !== undefined) {
        searchCriteria = PerfTags.searchTaggableList(req.body.taggableIDs);
    }
    
    const tags = await UserFacingLocalTags.selectManyByLocalTagServiceIDs(dbs, req.body.localTagServiceIDs, searchCriteria);
    return res.status(200).send(JSON.stringify(tags.map(tag => [
        tag.Lookup_Name,
        tag.Client_Display_Name,
        tag.Namespaces,
        tag.Tag_Count
    ])));
}
