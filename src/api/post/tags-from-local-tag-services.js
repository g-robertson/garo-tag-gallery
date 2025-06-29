/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { UserFacingLocalTags, LocalTagServices } from "../../db/tags.js";

export async function validate(dbs, req, res) {
    let localTagServiceIDs = z.array(z.number().nonnegative().int()
        .refine(num => num !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, {"message": "Cannot lookup tags in system local tag service"})
    ).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) return localTagServiceIDs.error.message;

    return {
        localTagServiceIDs: localTagServiceIDs.data
    };
}

export const PERMISSIONS_REQUIRED = {
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.READ
};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTagServiceIDsToCheck = req.body.localTagServiceIDs;
    const localTagServices = await LocalTagServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.READ, localTagServiceIDsToCheck);
    return localTagServices.length === localTagServiceIDsToCheck.length;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const tags = await UserFacingLocalTags.selectManyByLocalTagServiceIDs(dbs, req.body.localTagServiceIDs);
    return res.status(200).send(JSON.stringify(tags.map(tag => [
        tag.Local_Tag_ID,
        tag.Local_Tag_Service_ID,
        tag.Client_Display_Name,
        tag.Display_Name,
        tag.Namespaces,
        tag.Tag_Count
    ])));
}
