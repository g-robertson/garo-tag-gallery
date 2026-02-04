/** @import {Databases} from "../db/db-util.js" */
/** @import {APIPermissions, APIReq, APIRes} from "./api-types.js" */
/** @import {Permission, PermissionObjectScope} from "../client/js/user.js" */
import { SCOPES } from "../client/js/user.js";
import { LocalMetricServices } from "../db/metrics.js";
import { LocalFiles, LocalTaggableServices } from "../db/taggables.js";
import { LocalTagServices } from "../db/tags.js";

/**
 * @param {Databases} dbs
 * @param {APIReq} req
 * @param {APIRes} res
 * @param {APIPermissions} apiPermissions 
 */
export async function checkPermissions(dbs, req, res, apiPermissions) {
    /** @type {Map<PermissionObjectScope, Permission[]>} */
    const objectScopedPermissions = new Map(Object.values(SCOPES).map(objectScope => [objectScope, []]));
    
    for (const permission of apiPermissions.permissions) {
        for (const objectScope of permission.objectScopes) {
            objectScopedPermissions.get(objectScope).push(permission);
        }
    }

    const localTagServicesPermissionsRequired = objectScopedPermissions.get(SCOPES.LOCAL_TAG_SERVICES);
    if (localTagServicesPermissionsRequired.length !== 0) {
        let madeCheck = false;
        const localTagServiceIDsToCheck = new Set(apiPermissions.objects.Local_Tag_Service_IDs ?? []);

        if (apiPermissions.objects.Local_Tag_IDs !== undefined) {
            for (const localTagService of await LocalTagServices.selectManyByLocalTagIDs(dbs, apiPermissions.objects.Local_Tag_IDs)) {
                localTagServiceIDsToCheck.add(localTagService.Local_Tag_Service_ID);
            }
        }
        
        if (localTagServiceIDsToCheck.size !== 0) {
            const userLocalTagServices = await LocalTagServices.userSelectManyByIDs(dbs, req.user, localTagServicesPermissionsRequired, [...localTagServiceIDsToCheck]);
            if (localTagServiceIDsToCheck.size !== userLocalTagServices.length) {
                return {
                    success: false,
                    message: "User does not have a permission required for one of the local tag service IDs provided"
                };
            }
            madeCheck = true;
        }

        if (!madeCheck) {
            return {
                success: false,
                message: "Endpoint should check for permissions in Local_Tag_Service_IDs yet no checks were made"
            };
        }
    }

    const localTaggableServicesPermissionsRequired = objectScopedPermissions.get(SCOPES.LOCAL_TAGGABLE_SERVICES);
    if (localTaggableServicesPermissionsRequired.length !== 0) {
        let madeCheck = false;

        const localTaggableServiceIDsToCheck = new Set(apiPermissions.objects.Local_Taggable_Service_IDs ?? []);

        if (apiPermissions.objects.Taggable_IDs !== undefined) {
            for (const localTaggableService of await LocalTaggableServices.selectManyByTaggableIDs(dbs, apiPermissions.objects.Taggable_IDs)) {
                localTaggableServiceIDsToCheck.add(localTaggableService.Local_Taggable_Service_ID);
            }
        }

        if (localTaggableServiceIDsToCheck.size !== 0) {
            const userLocalTaggableServices = await LocalTaggableServices.userSelectManyByIDs(dbs, req.user, localTaggableServicesPermissionsRequired, [...localTaggableServiceIDsToCheck]);
            if (localTaggableServiceIDsToCheck.size !== userLocalTaggableServices.length) {
                return {
                    success: false,
                    message: "User does not have a permission required for one of the local taggable service IDs provided"
                };
            }
            madeCheck = true;
        }

        // Check if user has permission to a taggable service for each File ID
        if (apiPermissions.objects.File_IDs !== undefined) {
            const allUserPermissionedLocalTaggableServiceIDs = new Set((await LocalTaggableServices.userSelectAll(
                dbs,
                req.user,
                localTaggableServicesPermissionsRequired
            )).map(localTaggableService => localTaggableService.Local_Taggable_Service_ID));

            /** @type {Set<bigint>} */
            const allTaggables = new Set();
            const files = LocalFiles.groupLocalFilesTaggables(await LocalFiles.selectManyByFileIDs(dbs, apiPermissions.objects.File_IDs));
            for (const file of files) {
                for (const taggable of file.Taggable_ID) {
                    allTaggables.add(taggable);
                }
            }
            const taggablesLocalTaggableServicesMap = await LocalTaggableServices.selectMappedByTaggableIDs(dbs, [...allTaggables]);
        
            for (const file of files) {
                let taggableMatchedTaggableService = false;
                for (const taggable of file.Taggable_ID) {
                    if (allUserPermissionedLocalTaggableServiceIDs.has(taggablesLocalTaggableServicesMap.get(taggable).Local_Taggable_Service_ID)) {
                        taggableMatchedTaggableService = true;
                        break;
                    }
                }
        
                if (!taggableMatchedTaggableService) {
                    return {
                        success: false,
                        message: "User does not have a permission required for one of the File IDs local taggable service IDs"
                    };
                }
            }
            madeCheck = true;
        }

        if (!madeCheck) {
            return {
                success: false,
                message: "Endpoint should check for permissions in Local_Taggable_Service_IDs yet no checks were made"
            };
        }
    }

    const localMetricServicesPermissionsRequired = objectScopedPermissions.get(SCOPES.LOCAL_METRIC_SERVICES);
    if (localMetricServicesPermissionsRequired.length !== 0) {
        let madeCheck = false;

        const localMetricServiceIDsToCheck = new Set(apiPermissions.objects.Local_Metric_Service_IDs ?? []);

        if (apiPermissions.objects.Local_Metric_IDs !== undefined) {
            for (const localMetricService of await LocalMetricServices.selectManyByLocalMetricIDs(dbs, apiPermissions.objects.Local_Metric_IDs)) {
                localMetricServiceIDsToCheck.add(localMetricService.Local_Metric_Service_ID);
            }
        }

        if (localMetricServiceIDsToCheck.size !== 0) {
            const userLocalMetricServices = await LocalMetricServices.userSelectManyByIDs(dbs, req.user, localMetricServicesPermissionsRequired, localMetricServiceIDsToCheck);
            if (localMetricServiceIDsToCheck.size !== userLocalMetricServices.length) {
                return {
                    success: false,
                    message: "User does not have a permission required for one of the local metric service IDs provided"
                };
            }
            madeCheck = true;
        }

        if (!madeCheck) {
            return {
                success: false,
                message: "Endpoint should check for permissions in Local_Metric_Service_IDs yet no checks were made"
            };
        }
    }

    return {
        success: true
    };
}