import sqlite3 from "sqlite3";
import crypto from "crypto";
import PerfTags from "../perf-tags-binding/perf-tags.js";
import { FileStorage } from "./file-storage.js";
import { JobManager } from "./job-manager.js";
import { Mutex } from "async-mutex";

/**
 * @typedef {0 | 1} DBBoolean
 * @typedef {Object} Databases
 * @property {sqlite3.Database} sqlite3
 * @property {Mutex} sqlMutex
 * @property {Mutex} sqlTransactionMutex
 * @property {PerfTags} perfTags
 * @property {Mutex} perfTagsMutex
 * @property {FileStorage} fileStorage
 * @property {JobManager} jobManager
 */

/**
 * @param {Databases} dbs
 * @param {string} sql
 * @param {any} params
 */
export async function dbrun(dbs, sql, params) {
    if (dbs.inTransaction === undefined) {
        await dbs.sqlTransactionMutex.acquire();
    }
    await dbs.sqlMutex.acquire();

    const err = await new Promise(resolve => {
        dbs.sqlite3.run(sql, params, err => {
            resolve(err);
        });
    });

    dbs.sqlMutex.release();
    if (dbs.inTransaction === undefined) {
        dbs.sqlTransactionMutex.release();
    }

    if (err !== null) {
        Error.captureStackTrace(err);
        throw `Error in sql call originating from "${sql.slice(0, 10000)}": ${err} at ${err.stack}`;
    }

    return;
}


/**
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 */
export async function dbgetselect(dbs, sql, params) {
    await dbs.sqlMutex.acquire();

    const {err, row} = await new Promise(resolve => {
        dbs.sqlite3.get(sql, params, (err, row) => {
            resolve({err, row});
        });
    });

    dbs.sqlMutex.release();

    if (err !== null) {
        Error.captureStackTrace(err);
        throw `Error in sql call originating from "${sql.slice(0, 10000)}": ${err} at ${err.stack}`;
    }

    return row;
}

/**
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 */
export async function dbget(dbs, sql, params) {
    if (dbs.inTransaction === undefined) {
        await dbs.sqlTransactionMutex.acquire();
    }
    await dbs.sqlMutex.acquire();

    const {err, row} = await new Promise(resolve => {
        dbs.sqlite3.get(sql, params, (err, row) => {
            resolve({err, row});
        });
    });

    dbs.sqlMutex.release();
    if (dbs.inTransaction === undefined) {
        dbs.sqlTransactionMutex.release();
    }

    if (err !== null) {
        Error.captureStackTrace(err);
        throw `Error in sql call originating from "${sql.slice(0, 10000)}": ${err} at ${err.stack}`;
    }

    return row;
}

/**
 * @param {Databases} dbs 
 * @param {string} sql 
 * @param {any} params 
 */
export async function dballselect(dbs, sql, params) {
    await dbs.sqlMutex.acquire();

    const {err, rows} = await new Promise(resolve => {
        dbs.sqlite3.all(sql, params, (err, rows) => {
            resolve({err, rows});
        });
    });

    dbs.sqlMutex.release();

    if (err !== null) {
        Error.captureStackTrace(err);
        throw `Error in sql call originating from "${sql.slice(0, 10000)}": ${err} at ${err.stack}`;
    }

    return rows;
}

/**
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 */
export async function dball(dbs, sql, params) {
    if (dbs.inTransaction === undefined) {
        await dbs.sqlTransactionMutex.acquire();
    }
    await dbs.sqlMutex.acquire();

    const {err, rows} = await new Promise(resolve => {
        dbs.sqlite3.all(sql, params, (err, rows) => {
            resolve({err, rows});
        });
    });

    dbs.sqlMutex.release();
    if (dbs.inTransaction === undefined) {
        dbs.sqlTransactionMutex.release();
    }

    if (err !== null) {
        Error.captureStackTrace(err);
        throw `Error in sql call originating from "${sql.slice(0, 10000)}": ${err} at ${err.stack}`;
    }

    return rows;
}

/**
 * @param {number} rows 
 */
export function dbvariablelist(rows) {
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
    if (dbs.inTransaction !== undefined) {
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
}

export function dbsqlcommand(sql, params) {
    return {
        sql,
        params: params ?? []
    };
}

/**
 * @param {string} tableName 
 * @param {number} reserveSequenceCount 
 */
export function dbreserveseq(tableName, reserveSequenceCount) {
    return [
        dbsqlcommand(
            `UPDATE sqlite_sequence SET seq = $reserveSequenceCount WHERE name = $tableName`,
            {
                $reserveSequenceCount: reserveSequenceCount,
                $tableName: tableName
            }
        ),
        dbsqlcommand(
            `INSERT INTO sqlite_sequence (name,seq) SELECT $tableName, $reserveSequenceCount WHERE NOT EXISTS 
             (SELECT changes() AS change FROM sqlite_sequence WHERE change <> 0);
            `,
            {
                $reserveSequenceCount: reserveSequenceCount,
                $tableName: tableName
            }
        )
    ];
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