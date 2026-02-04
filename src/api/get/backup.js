/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { abjsonStringify } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { IMPORTABLE_TYPES } from "../../db/import.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { LocalTaggableServices, Taggables, UserFacingLocalFiles } from "../../db/taggables.js";
import { LocalTagServices } from "../../db/tags.js";
import PerfTags from "../../perf-tags-binding/perf-tags.js";

export async function validate(dbs, req, res) {}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}

// TODO: currently backup only works for the user who requested it, does not create whole backup of all users
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const taggables = await Taggables.searchWithUser(dbs, PerfTags.SEARCH_UNIVERSE, req.user);

    const localTaggableServices = await LocalTaggableServices.userSelectAll(dbs, req.user, PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES);
    const localTagServices = await LocalTagServices.userSelectAll(dbs, req.user, PERMISSIONS.LOCAL_TAG_SERVICES.READ_TAGS);
    const localMetricServices = await LocalMetricServices.userSelectAll(dbs, req.user, PERMISSIONS.LOCAL_METRIC_SERVICES.READ_METRIC);

    
    const userFacingLocalFiles = await UserFacingLocalFiles.selectManyByTaggableIDs(
        dbs,
        taggables.map(taggable => taggable.Taggable_ID),
        req.user.id(),
        localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID),
        localMetricServices
    );

    const backup = [];
    backup.push(...localTaggableServices.map(localTaggableService => ({
        Type: IMPORTABLE_TYPES.LOCAL_TAGGABLE_SERVICE,
        Local_Taggable_Service_ID: localTaggableService.Local_Taggable_Service_ID,
        Service_Name: localTaggableService.Service_Name
    })));
    
    backup.push(...localTagServices.map(localTagService => ({
        Type: IMPORTABLE_TYPES.LOCAL_TAG_SERVICE,
        Local_Tag_Service_ID: localTagService.Local_Tag_Service_ID,
        Service_Name: localTagService.Service_Name
    })));
    
    backup.push(...localMetricServices.map(localMetricService => ({
        Type: IMPORTABLE_TYPES.LOCAL_METRIC_SERVICE,
        Local_Metric_Service_ID: localMetricService.Local_Metric_Service_ID,
        Service_Name: localMetricService.Service_Name
    })));

    for (const localMetricService of localMetricServices) {
        backup.push(...localMetricService.Local_Metrics.map(localMetric => ({
            Type: IMPORTABLE_TYPES.LOCAL_METRIC,
            Local_Metric_ID: localMetric.Local_Metric_ID,
            Local_Metric_Service_ID: localMetric.Local_Metric_Service_ID,
            Local_Metric_Name: localMetric.Local_Metric_Name,
            Local_Metric_Lower_Bound: localMetric.Local_Metric_Lower_Bound,
            Local_Metric_Upper_Bound: localMetric.Local_Metric_Upper_Bound,
            Local_Metric_Precision: localMetric.Local_Metric_Precision,
            Local_Metric_Type: localMetric.Local_Metric_Type
        })));
    }

    backup.push(...userFacingLocalFiles.map(userFacingLocalFile => ({
        Type: IMPORTABLE_TYPES.USER_FACING_LOCAL_FILE,
        File_Hash: userFacingLocalFile.File_Hash,
        File_Extension: userFacingLocalFile.File_Extension,
        Taggable_Created_Date: userFacingLocalFile.Taggable_Created_Date,
        Taggable_Deleted_Date: userFacingLocalFile.Taggable_Deleted_Date,
        Taggable_Last_Modified_Date: userFacingLocalFile.Taggable_Last_Modified_Date,
        Taggable_Last_Viewed_Date: userFacingLocalFile.Taggable_Last_Viewed_Date,
        Local_Taggable_Service_ID: userFacingLocalFile.Local_Taggable_Service_ID,
        URL_Associations: userFacingLocalFile.URL_Associations,
        Tags: userFacingLocalFile.Tag_Groups.map(tagGroup => tagGroup.tags.map(tag => [
            tag.Lookup_Name,
            tag.Display_Name,
            tag.Source_Name,
            tagGroup.Namespaces,
            tag.Local_Tag_Service_ID
        ])).flat(),
        Metrics: userFacingLocalFile.Metrics.map(metric => ({
            Local_Metric_Service_ID: metric.Local_Metric_Service_ID,
            Local_Metric_ID: metric.Local_Metric_ID,
            Applied_Value: metric.Applied_Value
        }))
    })));


    for (const part of abjsonStringify(backup)) {
        res.write(part);
    }

    res.end();
    res.status(200);
}
