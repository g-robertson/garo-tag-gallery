/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { AppliedMetrics, LocalMetricServices } from "../../db/metrics.js";
import { LocalTaggableServices } from "../../db/taggables.js";

export async function validate(dbs, req, res) {
    const taggableID = z.coerce.bigint().nonnegative().safeParse(req?.body?.taggableID, {path: ["taggableID"]});
    if (!taggableID.success) return taggableID.error.message;

    const localMetricID = z.coerce.number().nonnegative().int().safeParse(req?.body?.localMetricID, {path: ["localMetricID"]});
    if (!localMetricID.success) return localMetricID.error.message;

    const metricValue = z.coerce.number().finite().safeParse(req?.body?.metricValue, {path: ["metricValue"]});
    if (!metricValue.success) return metricValue.error.message;

    return {
        taggableID: taggableID.data,
        localMetricID: localMetricID.data,
        metricValue: metricValue.data
    };
}

export const PERMISSIONS_REQUIRED = [{
    TYPE: PERMISSIONS.LOCAL_METRIC_SERVICES,
    BITS: PERMISSION_BITS.READ
}, {
    TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
    BITS: PERMISSION_BITS.READ
}];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localMetricServiceToCheck = await LocalMetricServices.selectByLocalMetricID(dbs, req.body.localMetricID);
    const localMetricService = await LocalMetricServices.userSelectByID(dbs, req.user, PERMISSION_BITS.READ, localMetricServiceToCheck.Local_Metric_Service_ID);

    const localTaggableServiceToCheck = await LocalTaggableServices.selectByTaggableID(dbs, req.body.taggableID);
    const localTaggableService = await LocalTaggableServices.userSelectByID(dbs, req.user, PERMISSION_BITS.READ, localTaggableServiceToCheck.Local_Taggable_Service_ID);
    
    return localMetricService !== undefined && localTaggableService !== undefined;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    const appliedMetric = await AppliedMetrics.tagMap(dbs, await AppliedMetrics.upsert(dbs, {
        Local_Metric_ID: req.body.localMetricID,
        User_ID: req.user.id(),
        Applied_Value: req.body.metricValue
    }));
    await AppliedMetrics.applyToTaggable(
        dbs,
        req.body.taggableID,
        appliedMetric
    );
    res.status(200).send("Tag to metric done");
}
