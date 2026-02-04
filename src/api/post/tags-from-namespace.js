/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { PERMISSIONS } from "../../client/js/user.js";
import { LocalTagServices, UserFacingLocalTags } from "../../db/tags.js";
import { Z_NAMESPACE_ID } from "../zod-types.js";

export async function validate(dbs, req, res) {
    let namespaceID = Z_NAMESPACE_ID.safeParse(req?.body?.namespaceID, {path: ["namespaceID"]});
    if (!namespaceID.success) return namespaceID.error.message;

    return {
        namespaceID: namespaceID.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const localTagServices = await LocalTagServices.userSelectAll(dbs, req.user, PERMISSIONS.LOCAL_TAG_SERVICES.READ_TAGS);
    const tagGroups = await UserFacingLocalTags.selectManyByNamespaceID(dbs, req.body.namespaceID, localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID));
    return res.status(200).send(JSON.stringify(tagGroups.map(tagGroup => [
        tagGroup.Lookup_Name,
        tagGroup.Client_Display_Name,
        tagGroup.Namespaces,
        tagGroup.Tag_Count
    ])));
}
