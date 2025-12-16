/**
 * @import {APIFunction} from "../api-types.js"
 * @import {DBLocalTag} from "../../db/tags.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";

export async function validate(dbs, req, res) {
    const jobID = z.number().safeParse(req?.body?.jobID, {path: ["jobID"]});
    if (!jobID.success) return jobID.error.message;

    return {
        jobID: jobID.data
    };
}

export const PERMISSIONS_REQUIRED = {
    TYPE: PERMISSIONS.NONE,
    BITS: PERMISSION_BITS.NONE
};
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    return true;
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function post(dbs, req, res) {
    dbs.jobManager.cancelJobOnRunner(req.user.id(), req.body.jobID);
    res.status(200).send("Cancelled job");
}
