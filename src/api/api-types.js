import sqlite3 from "sqlite3";
import { ChildProcess } from "child_process"
import { User } from "../client/js/user.js";
/** 
 * @import express from "@types/express"
 * @import {PermissionType} from "../db/user.js"
 **/
/**
   * @typedef {(dbs: {sqlite3: sqlite3.Database, }, req: express.Request & {user: User}, res: express.Response) => Promise<void>} APIFunction
   * 
   * @typedef {Object} APIEndpoint
   * @property {APIFunction} default
   * @property {APIFunction} checkPermission
   * @property {PermissionType | PermissionType[]} PERMISSIONS_REQUIRED
*/