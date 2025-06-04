import sqlite3 from "sqlite3";
import crypto from "crypto";

/**
 * @typedef {0 | 1} DBBoolean
 * @typedef {Object} Databases
 * @property {Databases} sqlite3
 * @property {ChildProcess} perfTags
 */

/**
 * @param {Databases} dbs
 * @param {string} sql
 * @param {any} params
 * @returns {Promise<Error | null>}
 */
export async function dbrun(dbs, sql, params) {
    return await new Promise(resolve => {
        dbs.sqlite3.run(sql, params, err => {
            resolve(err);
        });
    });
}

/**
 * 
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 * @returns {Promise<{err: Error | null, row: any[]}>}
 */
export async function dbget(dbs, sql, params) {
    return await new Promise(resolve => {
        dbs.sqlite3.get(sql, params, (err, row) => {
            resolve({err, row});
        });
    })
}

/**
 * 
 * @param {Databases} dbs
 * @param {string} sql 
 * @param {any} params
 * @returns {Promise<{err: Error | null, rows: any[]}>}
 */
export async function dball(dbs, sql, params) {
    return await new Promise(resolve => {
        dbs.sqlite3.all(sql, params, (err, rows) => {
            resolve({err, rows});
        });
    })
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