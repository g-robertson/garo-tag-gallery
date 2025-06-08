import { dbrun, dball, dbBeginTransaction, dbEndTransaction } from "../db/db-util.js";
import { MIGRATION as MIGRATION00000000 } from "./migrations/00000000-init-db.js";


/**
 * @import {Databases} from "../db/db-util.js"
 */

/**
 * 
 * @param {Databases} dbs
 */
export default async function migrate(dbs) {
    await dbrun(dbs, `
    CREATE TABLE IF NOT EXISTS Migrations_Applied(
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT UNIQUE,
        Applied_Date INTEGER
    );`);

    const migrationNames = new Set((await dball(dbs, "SELECT Name FROM Migrations_Applied;")).map(row => row['Name']));
    const migrations = [MIGRATION00000000];
    for (const migration of migrations) {
        if (migrationNames.has(migration.name)) {
            continue;
        }

        await dbBeginTransaction(dbs);
        for (let command of migration.commands) {
            if (typeof command === "string") {
                command = {sql: command};
            }
            try {
                await dbrun(dbs, command.sql, command.params);
            } catch (err) {
                throw `Error while migrating database on command ${command.sql}: ${err.message}`;
            }
        }
        await dbrun(dbs, "INSERT INTO Migrations_Applied(Name, Applied_Date) VALUES (?, unixepoch('now'));", migration.name);
        await dbEndTransaction(dbs);
    }
}