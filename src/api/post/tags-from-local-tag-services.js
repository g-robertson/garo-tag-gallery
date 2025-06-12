/**
 * @import {APIFunction} from "../api-types.js"
 */

import { SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { selectUserFacingLocalTagsFromLocalTagServices, userSelectLocalTagServices } from "../../db/tags.js";

export function validate(dbs, req, res) {
    let localTagServiceIDs = req?.body?.localTagServiceIDs;
    if (!(localTagServiceIDs instanceof Array)) {
        return "localTagServiceIDs was not an array";
    }
    for (const localTagServiceID of localTagServiceIDs) {
        if (typeof localTagServiceID !== "number") {
            return "localTagServiceIDs was not an array of numbers";
        }

        if (localTagServiceID === SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID) {
            return "Cannot lookup tags in system local tag service";
        }
    }

    req.sanitizedBody = {
        localTagServiceIDs
    };
}

export const PERMISSIONS_REQUIRED = PERMISSIONS.LOCAL_TAG_SERVICES;
export const PERMISSION_BITS_REQUIRED = PERMISSION_BITS.READ;
export async function checkPermission(dbs, req, res) {
    const localTagServiceIDsToCheck = req.sanitizedBody.localTagServiceIDs.filter(localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);
    const localTagServices = await userSelectLocalTagServices(dbs, req.user, PERMISSION_BITS.READ, localTagServiceIDsToCheck);
    return localTagServices.length === localTagServiceIDsToCheck.length;
}


/** @type {APIFunction} */
export default async function get(dbs, req, res) {
    const tags = await selectUserFacingLocalTagsFromLocalTagServices(dbs, req.sanitizedBody.localTagServiceIDs);

    for (const tag of tags) {
        tag.Tag_Name = tag.Display_Name;
        if (tag.Namespaces.length === 1) {
            tag.Display_Name = `${tag.Namespaces[0]}:${tag.Display_Name}`;
        } else if (tag.Namespaces.length > 1) {
            tag.Display_Name = `multi-namespaced:${tag.Display_Name}`;
        }
    }

    return res.status(200).send(JSON.stringify(tags.map(tag => [
        tag.Local_Tag_ID,
        tag.Display_Name,
        tag.Tag_Name,
        tag.Namespaces
    ])));
}
