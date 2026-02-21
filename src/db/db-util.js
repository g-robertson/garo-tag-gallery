import sqlite3 from "better-sqlite3";
import crypto from "crypto";
import PerfTags from "../perf-binding/perf-tags.js";
import { FileStorage } from "./file-storage.js";
import { JobManager } from "./job-manager.js";
import { Mutex } from "async-mutex";
import path from "path";
import { CursorManager } from "./cursor-manager.js";
import PerfImg from "../perf-binding/perf-img.js";

export const DATABASE_DIR = process.env.DATABASE_DIR;
export const PARTIAL_ZIPS_FOLDER = path.join(DATABASE_DIR, "_partial-zips");
export const TMP_FOLDER = path.join(DATABASE_DIR, "_tmp");

/**
 * @typedef {0 | 1} DBBoolean
 * @typedef {Object} Databases
 * @property {number} inTransaction
 * @property {sqlite3.Database} sqlite3
 * @property {Mutex} sqlMutex
 * @property {Mutex} sqlTransactionMutex
 * @property {PerfTags} perfTags
 * @property {PerfImg} perfImg
 * @property {Mutex} perfTagsMutex
 * @property {FileStorage} fileStorage
 * @property {JobManager<number>} jobManager
 * @property {CursorManager} cursorManager
 */

function mapParams(params) {
    return params.map(param => {
        if (typeof param === "boolean") {
            return param ? 1 : 0;
        } else {
            return param;
        }
    })
}

/**
 * @param {Databases} dbs
 * @param {string} sql
 * @param {any} params
 */
export async function dbrun(dbs, sql, params) {
    params ??= [];
    if (dbs.inTransaction === 0) {
        await dbs.sqlTransactionMutex.acquire();
    }
    await dbs.sqlMutex.acquire();

    try {
        const stmt = dbs.sqlite3.prepare(sql);
        stmt.run(...mapParams(params));
    } catch (err) {
        if (err !== null) {
            Error.captureStackTrace(err);
            throw `Error in sql call originating from "${sql.slice(0, 10000)} with parameters ${params}": ${err} at ${err.stack}`;
        }
    }

    dbs.sqlMutex.release();
    if (dbs.inTransaction === 0) {
        dbs.sqlTransactionMutex.release();
    }

    return;
}


/**
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 */
export async function dbgetselect(dbs, sql, params) {
    params ??= [];
    await dbs.sqlMutex.acquire();

    let row;
    try {
        const stmt = dbs.sqlite3.prepare(sql);
        row = stmt.get(...mapParams(params));
    } catch (err) {
        if (err !== null) {
            Error.captureStackTrace(err);
            throw `Error in sql call originating from "${sql.slice(0, 10000)} with parameters ${params}": ${err} at ${err.stack}`;
        }
    }

    dbs.sqlMutex.release();

    return row;
}

/**
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 */
export async function dbget(dbs, sql, params) {
    params ??= [];
    if (dbs.inTransaction === 0) {
        await dbs.sqlTransactionMutex.acquire();
    }
    await dbs.sqlMutex.acquire();

    let row;
    try {
        const stmt = dbs.sqlite3.prepare(sql);
        row = stmt.get(...mapParams(params));
    } catch (err) {
        if (err !== null) {
            Error.captureStackTrace(err);
            throw `Error in sql call originating from "${sql.slice(0, 10000)} with parameters ${params}": ${err} at ${err.stack}`;
        }
    }

    dbs.sqlMutex.release();
    if (dbs.inTransaction === 0) {
        dbs.sqlTransactionMutex.release();
    }

    return row;
}

/**
 * @param {Databases} dbs 
 * @param {string} sql 
 * @param {any} params 
 */
export async function dballselect(dbs, sql, params) {
    params ??= [];
    await dbs.sqlMutex.acquire();

    let rows;
    try {
        const stmt = dbs.sqlite3.prepare(sql);
        rows = stmt.all(...mapParams(params));
    } catch (err) {
        if (err !== null) {
            Error.captureStackTrace(err);
            throw `Error in sql call originating from "${sql.slice(0, 10000)} with parameters ${params}": ${err} at ${err.stack}`;
        }
    }

    dbs.sqlMutex.release();

    return rows;
}

/**
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 */
export async function dball(dbs, sql, params) {
    params ??= [];
    if (dbs.inTransaction === 0) {
        await dbs.sqlTransactionMutex.acquire();
    }
    await dbs.sqlMutex.acquire();

    let rows;
    try {
        const stmt = dbs.sqlite3.prepare(sql);
        rows = stmt.all(...mapParams(params));
    } catch (err) {
        if (err !== null) {
            Error.captureStackTrace(err);
            throw `Error in sql call originating from "${sql.slice(0, 10000)} with parameters ${params}": ${err} at ${err.stack}`;
        }
    }

    dbs.sqlMutex.release();
    if (dbs.inTransaction === 0) {
        dbs.sqlTransactionMutex.release();
    }

    return rows;
}

/**
 * @param {number} rows 
 */
export function dbvariablelist(rows) {
    if (rows < 1) {
        throw new Error("dbvariablelist was called with no rows");
    }

    let list = "(?";
    for (let i = 1; i < rows; ++i) {
        list += ",?";
    }
    list += ")";
    return list;
}

export function dbtuples(rows, columns) {
    columns ??= 1;
    let tuple = "?"
    for (let i = 1; i < columns; ++i) {
        tuple += ",?";
    }
    tuple = `(${tuple})`;

    let tuples = tuple;
    for (let i = 1; i < rows; ++i) {
        tuples += `,${tuple}`;
    }
    return tuples;
}

/**
 * @param {Databases} dbs 
 */
export async function dbBeginTransaction(dbs) {
    if (dbs.inTransaction !== 0) {
        return {
            ...dbs,
            inTransaction: dbs.inTransaction + 1
        };
    }

    await dbs.sqlTransactionMutex.acquire();
    dbs = {
        ...dbs,
        inTransaction: 1
    };
    await dbrun(dbs, "BEGIN TRANSACTION;");
    await dbs.perfTags.beginTransaction();
    return dbs;
}

/**
 * @param {Databases} dbs 
 */
export async function dbEndTransaction(dbs) {
    if (dbs.inTransaction > 1) {
        return {
            ...dbs,
            inTransaction: dbs.inTransaction - 1
        };
    }

    await dbs.perfTags.endTransaction();
    await dbrun(dbs, "COMMIT;");
    dbs.sqlTransactionMutex.release();

    return {
        ...dbs,
        inTransaction: 0
    };
}

export function dbsqlcommand(sql, params) {
    return {
        sql,
        params: params ?? []
    };
}

function dbGenerateCryptoText(length) {
    return crypto.randomBytes(length).toString("hex");
}

export function dbGenerateAccessKey() {
    return dbGenerateCryptoText(128);
}

/**
 * @template T, R
 * @param {T[]} data 
 * @param {number} increment 
 * @param {(sliced: T[]) => R} callback 
 */
export async function asyncDataSlicer(data, increment, callback) {
    /** @type {R[]} */
    const results = []
    for (let i = 0; i < data.length; i += increment) {
        results.push(await callback(data.slice(i, i + increment)));
    }

    return results;
}