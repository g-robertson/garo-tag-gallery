/**
 * @import {APIFunction} from "../api-types.js"
 */

import { z } from "zod";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";

const Z_JOBS_ITEMS_INDICES = z.array(z.object({
    jobID: z.number(),
    jobItemIndices: z.array(z.number())
}));

/** @typedef {z.infer<typeof Z_JOBS_ITEMS_INDICES>} JobsItemsIndices */

export async function validate(dbs, req, res) {
    const jobsItemsIndices = Z_JOBS_ITEMS_INDICES.safeParse(req?.body?.jobsItemsIndices, {path: ["jobsItemsIndices"]});
    if (!jobsItemsIndices.success) return jobsItemsIndices.error.message;

    return {
        jobsItemsIndices: jobsItemsIndices.data
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
    for (const {jobID, jobItemIndices} of req.body.jobsItemsIndices) {
        dbs.jobManager.addressItemsOnRunner(req.user.id(), jobID, jobItemIndices);
    }
    res.status(200).send("Addressed jobs items");
}
