/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { UserFacingLocalTags, LocalTagServices } from "../../db/tags.js";
import { LocalTaggableServices } from "../../db/taggables.js";
import PerfTags from "../../perf-tags-binding/perf-tags.js";

export async function validate(dbs, req, res) {
    const localTagServiceIDs = z.array(z.number().nonnegative().int()
        .refine(num => num !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, {"message": "Cannot lookup tags in system local tag service"})
    ).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) return localTagServiceIDs.error.message;
    
    const taggableIDs = z.array(z.number().nonnegative().int()).or(z.undefined()).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;

    return {
        localTagServiceIDs: localTagServiceIDs.data,
        taggableIDs: taggableIDs.data?.map?.(BigInt)
    };
}

export const PERMISSIONS_REQUIRED = [{
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.READ
}, {
    TYPE: PERMISSIONS.LOCAL_TAGGABLE_SERVICES,
    BITS: PERMISSION_BITS.READ
}];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTagServiceIDsToCheck = req.body.localTagServiceIDs;
    const localTagServices = await LocalTagServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.READ, localTagServiceIDsToCheck);
    let taggableServicesMatch = true;
    if (req.body.taggableIDs !== undefined) {
        const localTaggableServicesToCheck = await LocalTaggableServices.selectManyByTaggableIDs(dbs, req.body.taggableIDs);
        const localTaggableServices = await LocalTaggableServices.userSelectManyByIDs(localTaggableServicesToCheck.map(localTaggableService => localTaggableService.Local_Taggable_Service_ID));
        taggableServicesMatch = localTaggableServicesToCheck.length === localTaggableServices.length;
    }
    return (localTagServices.length === localTagServiceIDsToCheck.length) && taggableServicesMatch;
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
        tag.Tag_Count
    ])));
}
