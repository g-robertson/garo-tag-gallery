/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 */

export async function validate(dbs, req, res) {}

/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    return {
        permissions: [],
        objects: {}
    };
}

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    res.send(JSON.stringify(dbs.jobManager.getJobsForRunner(req.user.id())));
}
