/**
 * @import {APIFunction} from "../api-types.js"
 */

import { abjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { Taggables, UserFacingLocalFiles } from "../../db/taggables.js";
import { LocalTagServices } from "../../db/tags.js";
import { Users } from "../../db/user.js";
import PerfTags from "../../perf-tags-binding/perf-tags.js";

export const PERMISSIONS_REQUIRED = {TYPE: PERMISSIONS.NONE, BITS: 0};

export async function validate(dbs, req, res) {}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    return false;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const taggables = await Taggables.searchWithUser(dbs, PerfTags.SEARCH_UNIVERSE, req.user);

    const localTagServices = await LocalTagServices.userSelectAll(dbs, req.user, PERMISSION_BITS.READ);
    const localMetricServices = await LocalMetricServices.userSelectAll(dbs, req.user, PERMISSION_BITS.READ);

    const userFacingLocalFiles = await UserFacingLocalFiles.selectManyByTaggableIDs(
        dbs,
        taggables.map(taggable => taggable.Taggable_ID),
        req.user.id(),
        localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID),
        localMetricServices
    );

    const backup = userFacingLocalFiles.map(userFacingLocalFile => ({
        File_Location: `${userFacingLocalFile.File_Hash}${userFacingLocalFile.File_Extension}`,
        Taggable_Created_Date: userFacingLocalFile.Taggable_Created_Date,
        Taggable_Deleted_Date: userFacingLocalFile.Taggable_Deleted_Date,
        Taggable_Last_Modified_Date: userFacingLocalFile.Taggable_Last_Modified_Date,
        Taggable_Last_Viewed_Date: userFacingLocalFile.Taggable_Last_Viewed_Date,
        Local_Taggable_Service_ID: userFacingLocalFile.Local_Taggable_Service_ID,
        URL_Associations: userFacingLocalFile.URL_Associations,
        Tags: userFacingLocalFile.Tags.map(tag => ([
            tag.Lookup_Name,
            tag.Display_Name,
            tag.Source_Name,
            tag.Namespaces,
            tag.Local_Tag_Service_ID
        ])),
        Metrics: userFacingLocalFile.Metrics.map(metric => ({
            Local_Metric_Service_ID: metric.Local_Metric_Service_ID,
            Local_Metric_ID: metric.Local_Metric_ID,
            Applied_Value: metric.Applied_Value
        }))
    }));


    for (const part of abjsonStringify(backup)) {
        res.write(part);
    }

    res.end();
    res.status(200);
}
