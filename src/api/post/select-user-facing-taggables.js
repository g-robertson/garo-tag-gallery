/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { LocalTaggableServices, UserFacingLocalFiles } from "../../db/taggables.js";
import { LocalTagServices } from "../../db/tags.js";

export function validate(dbs, req, res) {
    const taggableIDs = z.array(z.number().nonnegative().int()).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;

    req.sanitizedBody = {
        taggableIDs: taggableIDs.data.map(taggableID => BigInt(taggableID))
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
    const localTaggableServicesToCheck = await LocalTaggableServices.selectManyByTaggableIDs(dbs, req.sanitizedBody.taggableIDs);
    const localTaggableServices = await LocalTaggableServices.userSelectManyByIDs(
        dbs,
        req.user,
        PERMISSION_BITS.READ,
        localTaggableServicesToCheck.map(localTaggableService => localTaggableService.Local_Taggable_Service_ID)
    );
    return localTaggableServices.length === localTaggableServicesToCheck.length;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const localTagServices = await LocalTagServices.userSelectAll(dbs, req.user, PERMISSION_BITS.READ);
    const localMetricServices = await LocalMetricServices.userSelectAll(dbs, req.user, PERMISSION_BITS.READ);
    const userFacingTaggables = await UserFacingLocalFiles.selectManyByTaggableIDs(
        dbs,
        req.sanitizedBody.taggableIDs,
        req.user.id(),
        localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID),
        localMetricServices.map(localMetricService => localMetricService.Local_Metric_Service_ID)
    );

    return res.status(200).send(bjsonStringify(userFacingTaggables));
}
