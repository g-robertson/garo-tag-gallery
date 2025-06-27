import { User } from "../client/js/user.js";
/** 
 * @import express from "@types/express"
 * @import {PermissionType, PermissionInt} from "../db/user.js"
 * @import {Databases} from "../db/db-util.js"
 **/

/**
 * @template {any} [T=any]
 * @typedef {(dbs: Databases, req: Omit<express.Request, "body"> & {user: User, userAccessKey: string} & {body: Exclude<T, string>}, res: express.Response) => Promise<void>} APIFunction
 */

/**
   * @typedef {(dbs: Databases, req: express.Request & {user: User, userAccessKey: string}, res: express.Response) => Promise<string | Record<string, any> | undefined>} APIValidationFunction
   * 
   * @typedef {Object} APIEndpoint
   * @property {APIFunction} default
   * @property {APIValidationFunction} validate
   * @property {APIFunction} checkPermission
   * @property {{
   *   TYPE: PermissionType
   *   BITS: PermissionInt
   * }[]} PERMISSIONS_REQUIRED
*/