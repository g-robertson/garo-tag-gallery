/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";
import { AppliedMetrics } from "../../db/metrics.js";
import { LocalTags } from "../../db/tags.js";
import { Z_METRIC_VALUE, Z_USER_LOCAL_METRIC_ID, Z_USER_LOCAL_TAG_SERVICE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    const tagLookupName = z.string().safeParse(req?.body?.tagLookupName, {path: ["tagLookupName"]});
    if (!tagLookupName.success) return tagLookupName.error.message;

    const localTagServiceIDs = z.array(Z_USER_LOCAL_TAG_SERVICE_ID).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) { return localTagServiceIDs.error.message; }

    const removeExistingTag = req?.body?.removeExistingTag === "on";

    const localMetricID = Z_USER_LOCAL_METRIC_ID.safeParse(req?.body?.localMetricID, {path: ["localMetricID"]});
    if (!localMetricID.success) return localMetricID.error.message;

    const metricValue = Z_METRIC_VALUE.safeParse(req?.body?.metricValue, {path: ["metricValue"]});
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

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    const permissions = [PERMISSIONS.LOCAL_METRIC_SERVICES.APPLY_METRIC, PERMISSIONS.LOCAL_TAG_SERVICES.APPLY_TAGS];
    if (req.body.removeExistingTag) {
        permissions.push(PERMISSIONS.LOCAL_TAG_SERVICES.DELETE_TAGS);
    }

    return {
        permissions,
        objects: {
            Local_Metric_IDs: [req.body.localMetricID],
            Local_Tag_Service_IDs: req.body.localTags.map(localTag => localTag.Local_Tag_Service_ID)
        }
    };
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
