/**
 * @import {APIFunction} from "../api-types.js"
 * @import {DBLocalTag} from "../../db/tags.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { AppliedMetrics, LocalMetricServices } from "../../db/metrics.js";
import { LocalTags, LocalTagServices } from "../../db/tags.js";

export async function validate(dbs, req, res) {
    const localTagID = z.coerce.number().nonnegative().int().safeParse(req?.body?.localTagID, {path: ["localTagID"]});
    if (!localTagID.success) return localTagID.error.message;

    const removeExistingTag = req?.body?.removeExistingTag === "on";

    const localMetricID = z.coerce.number().nonnegative().int().safeParse(req?.body?.localMetricID, {path: ["localMetricID"]});
    if (!localMetricID.success) return localMetricID.error.message;

    const metricValue = z.coerce.number().finite().safeParse(req?.body?.metricValue, {path: ["metricValue"]});
    if (!metricValue.success) return metricValue.error.message;

    const localTag = await LocalTags.selectByID(dbs, localTagID.data);
    if (localTag === undefined) {
        return "local tag ID did not exist";
    }

    return {
        localTag,
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
    await AppliedMetrics.userConvertFromLocalTag(
        dbs, 
        req.body.localTag,
        {
            Local_Metric_ID: req.body.localMetricID,
            User_ID: req.user.id(),
            Applied_Value: req.body.metricValue
        },
        req.body.removeExistingTag,
        req.user
    );
    res.status(200).send("Tag to metric done");
}
