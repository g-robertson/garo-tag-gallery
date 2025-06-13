/**
 * @import {APIFunction} from "../api-types.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { userSelectAllLocalMetricServices } from "../../db/metrics.js";
import { selectLocalTaggableServiceIDsByTaggableIDs, selectUserFacingTaggables, userSelectLocalTaggableServices } from "../../db/taggables.js";
import { userSelectAllLocalTagServices } from "../../db/tags.js";

export function validate(dbs, req, res) {
    const taggableIDs = req?.body?.taggableIDs;
    if (!(taggableIDs instanceof Array)) {
        return "taggableIDs was not an array";
    }

    for (const taggableID of taggableIDs) {
        if (typeof taggableID !== "number") {
            return "taggableIDs was not an array of number";
        }
    }

    req.sanitizedBody = {
        taggableIDs: taggableIDs.map(taggableID => BigInt(taggableID))
    };
}

export const PERMISSIONS_REQUIRED = [PERMISSIONS.LOCAL_TAGGABLE_SERVICES, PERMISSIONS.LOCAL_TAG_SERVICES];
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.READ;
export async function checkPermission(dbs, req, res) {
    const localTaggableServiceIDsToCheck = await selectLocalTaggableServiceIDsByTaggableIDs(dbs, req.sanitizedBody.taggableIDs);
    const localTaggableServices = await userSelectLocalTaggableServices(dbs, req.user, PERMISSION_BITS.READ, localTaggableServiceIDsToCheck);
    return localTaggableServices.length === localTaggableServiceIDsToCheck.length;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const localTagServices = await userSelectAllLocalTagServices(dbs, req.user, PERMISSION_BITS.READ);
    const localMetricServices = await userSelectAllLocalMetricServices(dbs, req.user, PERMISSION_BITS.READ);
    const userFacingTaggables = await selectUserFacingTaggables(
        dbs,
        req.sanitizedBody.taggableIDs,
        req.user.id(),
        localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID),
        localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID)
    );

    return res.status(200).send(bjsonStringify(userFacingTaggables));
}
