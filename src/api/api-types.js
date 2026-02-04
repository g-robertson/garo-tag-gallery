import { User } from "../client/js/user.js";
/** 
 * @import express from "@types/express"
 * @import {Permission} from "../client/js/user.js"
 * @import {Databases} from "../db/db-util.js"
 **/

/**
 * @typedef {Object} APIPermissionObject
 * @property {number[]=} Local_Tag_Service_IDs
 * @property {number[]=} Local_Tag_IDs
 * @property {number[]=} Local_Taggable_Service_IDs
 * @property {number[]=} File_IDs
 * @property {bigint[]=} Taggable_IDs
 * @property {number[]=} Local_Metric_Service_IDs
 * @property {number[]=} Local_Metric_IDs
 */

/**
 * @typedef {Object} APIPermissions
 * @property {Permission[]} permissions
 * @property {APIPermissionObject} objects
*/

/**
 * @template {any} [T=any]
 * @typedef {Omit<express.Request, "body"> & {user: User, userAccessKey: string} & {body: Exclude<T, string>}} APIReq
 **/

/**
 * @typedef {express.Response} APIReq
 **/

/**
 * @template {any} [T=any]
 * @typedef {(dbs: Databases, req: APIReq<T>, res: express.Response) => Promise<void>} APIFunction
 */

/**
 * @template {any} [T=any]
 * @typedef {(dbs: Databases, req: APIReq<T>, res: express.Response) => Promise<APIPermissions>} APIGetPermissionsFunction
 */

/**
 * @template {any} [T=any]
 * @typedef {(dbs: Databases, req: APIReq<{}>, res: express.Response) => T} APIValidationFunction
 */

/**
   * 
   * @typedef {Object} APIEndpoint
   * @property {APIFunction} default
   * @property {APIValidationFunction} validate
   * @property {APIGetPermissionsFunction} getPermissions
*/