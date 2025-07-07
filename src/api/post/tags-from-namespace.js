/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { LocalTagServices, UserFacingLocalTags } from "../../db/tags.js";

export async function validate(dbs, req, res) {
    let namespaceID = z.number().nonnegative().int().safeParse(req?.body?.namespaceID, {path: ["namespaceID"]});
    if (!namespaceID.success) return namespaceID.error.message;

    return {
        namespaceID: namespaceID.data
    };
}

export const PERMISSIONS_REQUIRED = {
    TYPE: PERMISSIONS.NONE,
    BITS: PERMISSION_BITS.NONE
};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    return false;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const localTagServices = await LocalTagServices.userSelectAll(dbs, req.user, PERMISSION_BITS.READ);
    const tagGroups = await UserFacingLocalTags.selectManyByNamespaceID(dbs, req.body.namespaceID, localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID));
    return res.status(200).send(JSON.stringify(tagGroups.map(tagGroup => [
        tagGroup.Lookup_Name,
        tagGroup.Client_Display_Name,
        tagGroup.Namespaces,
        tagGroup.Tag_Count
    ])));
}
