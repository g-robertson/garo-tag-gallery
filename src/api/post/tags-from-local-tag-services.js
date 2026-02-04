/**
 * @import {APIFunction, APIGetPermissionsFunction, APIValidationFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { UserFacingLocalTags } from "../../db/tags.js";
import PerfTags from "../../perf-tags-binding/perf-tags.js";
import { getCursorAsTaggableIDs } from "../../db/cursor-manager.js";
import { Z_USER_LOCAL_TAG_SERVICE_ID } from "../zod-types.js";

/**
 * @param {Parameters<APIValidationFunction>[0]} dbs 
 * @param {Parameters<APIValidationFunction>[1]} req 
 * @param {Parameters<APIValidationFunction>[2]} res 
 */
export async function validate(dbs, req, res) {
    const localTagServiceIDs = z.array(Z_USER_LOCAL_TAG_SERVICE_ID).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) return localTagServiceIDs.error.message;
    
    const taggableCursor = z.optional(z.string()).safeParse(req?.body?.taggableCursor, {path: ["taggableCursor"]});
    if (!taggableCursor.success) return taggableCursor.error.message;

    const taggableIDsRequested = z.optional(z.array(z.number())).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
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


/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    const permissions = [];
    if (req.body.localTagServiceIDs.length !== 0) {
        permissions.push(PERMISSIONS.LOCAL_TAG_SERVICES.READ_TAGS);
    }
    if (req.body.taggableIDs !== undefined && req.body.taggableIDs.length !== 0) {
        permissions.push(PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES);
    }

    return {
        permissions,
        objects: {
            Taggable_IDs: req.body.taggableIDs,
            Local_Tag_Service_IDs: req.body.localTagServiceIDs
        }
    };
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
        tag.Tag_Count,
        tag.tags.map(tag => tag.Local_Tag_Service_ID)
    ])));
}
