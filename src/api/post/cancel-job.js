/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSIONS } from "../../client/js/user.js";

export async function validate(dbs, req, res) {
    const jobID = z.number().safeParse(req?.body?.jobID, {path: ["jobID"]});
    if (!jobID.success) return jobID.error.message;

    return {
        jobID: jobID.data
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
export default async function post(dbs, req, res) {
    dbs.jobManager.cancelJobOnRunner(req.user.id(), req.body.jobID);
    res.status(200).send("Cancelled job");
}
