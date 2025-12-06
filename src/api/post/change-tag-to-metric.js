/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { AppliedMetrics, LocalMetricServices } from "../../db/metrics.js";
import { LocalTags, LocalTagServices } from "../../db/tags.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";

export async function validate(dbs, req, res) {
    const tagLookupName = z.string().safeParse(req?.body?.tagLookupName, {path: ["tagLookupName"]});
    if (!tagLookupName.success) return tagLookupName.error.message;

    const localTagServiceIDs = z.array(z.coerce.number().nonnegative().int()
        .refine(num => num !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, {"message": "Cannot lookup tags in system local tag service"})
    ).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) { return localTagServiceIDs.error.message; }

    const removeExistingTag = req?.body?.removeExistingTag === "on";

    const localMetricID = z.coerce.number().nonnegative().int().safeParse(req?.body?.localMetricID, {path: ["localMetricID"]});
    if (!localMetricID.success) return localMetricID.error.message;

    const metricValue = z.coerce.number().finite().safeParse(req?.body?.metricValue, {path: ["metricValue"]});
    if (!metricValue.success) return metricValue.error.message;

    const localTags = await LocalTags.selectManyByLookupNames(dbs, [tagLookupName.data], localTagServiceIDs.data)
    if (localTags.length === 0) {
        return "Local tag by lookup name did not exist";
    }

    return {
        localTags,
        removeExistingTag,
        localMetricID: localMetricID.data,
        metricValue: metricValue.data
    };
}

export const PERMISSIONS_REQUIRED = [{
    TYPE: PERMISSIONS.LOCAL_METRIC_SERVICES,
    BITS: PERMISSION_BITS.READ
}, {
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.READ | PERMISSION_BITS.DELETE
}];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localMetricServiceToCheck = await LocalMetricServices.selectByLocalMetricID(dbs, req.body.localMetricID);
    const localMetricService = await LocalMetricServices.userSelectByID(dbs, req.user, PERMISSION_BITS.READ, localMetricServiceToCheck.Local_Metric_Service_ID);

    const localTagServicePermissionsRequired = req.body.removeExistingTag ? PERMISSION_BITS.READ | PERMISSION_BITS.DELETE : PERMISSION_BITS.READ;
    const localTagService = await LocalTagServices.userSelectByID(dbs, req.user, localTagServicePermissionsRequired, req.body.localTag.Local_Tag_Service_ID);
    
    return localMetricService !== undefined && localTagService !== undefined;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    for (const localTag of req.body.localTags) {
        await AppliedMetrics.userConvertFromLocalTag(
            dbs, 
            localTag,
            {
                Local_Metric_ID: req.body.localMetricID,
                User_ID: req.user.id(),
                Applied_Value: req.body.metricValue
            },
            req.body.removeExistingTag,
            req.user
        );
    }
    
    res.status(200).send("Tag to metric done");
}
