/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { LocalMetricServices } from "../../db/metrics.js";
import { UserFacingLocalFiles } from "../../db/taggables.js";
import { LocalTagServices } from "../../db/tags.js";
import { Z_TAGGABLE_ID } from "../zod-types.js";

export function validate(dbs, req, res) {
    const taggableIDs = z.array(Z_TAGGABLE_ID).safeParse(req?.body?.taggableIDs, {path: ["taggableIDs"]});
    if (!taggableIDs.success) return taggableIDs.error.message;

    return {
        taggableIDs: taggableIDs.data
    };
}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    const permissions = [];
    if (req.body.taggableIDs.length !== 0) {
        permissions.push(PERMISSIONS.LOCAL_TAGGABLE_SERVICES.READ_TAGGABLES);
    }

    return {
        permissions,
        objects: {
            Taggable_IDs: req.body.taggableIDs
        }
    };
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const localTagServices = await LocalTagServices.userSelectAll(dbs, req.user, PERMISSIONS.LOCAL_TAG_SERVICES.READ_TAGS);
    const localMetricServices = await LocalMetricServices.userSelectAll(dbs, req.user, PERMISSIONS.LOCAL_METRIC_SERVICES.READ_METRIC);
    const userFacingTaggables = await UserFacingLocalFiles.selectManyByTaggableIDs(
        dbs,
        req.body.taggableIDs,
        req.user.id(),
        localTagServices.map(localTagService => localTagService.Local_Tag_Service_ID),
        localMetricServices
    );

    return res.status(200).send(bjsonStringify(userFacingTaggables.map(userFacingTaggable => ({
        ...userFacingTaggable,
        Tag_Groups: undefined,
        Tags: userFacingTaggable.Tag_Groups.map(tagGroup => tagGroup.Client_Display_Name)
    }))));
}
