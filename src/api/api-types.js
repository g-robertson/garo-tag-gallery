import sqlite3 from "sqlite3";
import { ChildProcess } from "child_process"
import { User } from "../client/js/user.js";
/** 
 * @import express from "@types/express"
 * @import {PermissionType, PermissionInt} from "../db/user.js"
 * @import {Databases} from "../db/db-util.js"
 **/
/**
   * @typedef {(dbs: Databases, req: express.Request & {user: User}, res: express.Response) => Promise<void>} APIFunction
   * @typedef {(dbs: Databases, req: express.Request & {user: User}, res: express.Response) => Promise<string | undefined>} APIValidationFunction
   * 
   * @typedef {Object} APIEndpoint
   * @property {APIFunction} default
   * @property {APIValidationFunction} validate
   * @property {APIFunction} checkPermission
   * @property {PermissionType | PermissionType[]} PERMISSIONS_REQUIRED
   * @property {PermissionInt} PERMISSION_BITS_REQUIRED
*/