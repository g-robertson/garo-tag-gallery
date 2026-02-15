/** @import {Databases} from "./db-util.js" */

import { HAS_NOTES_TAG } from "../client/js/defaults.js";
import {dball, dbtuples} from "./db-util.js";

/**
 * @typedef {Object} DBNote
 * @property {number} Taggable_Note_ID
 * @property {bigint} Taggable_ID
 * @property {string} Note_Association
 * @property {string} Note
 * @property {number} Taggable_Note_Last_Viewed_Date
 * @property {number} Taggable_Note_Last_Modified_Date
 * @property {number} Taggable_Note_Created_Date
 * @property {number} Taggable_Note_Deleted_Date
 */

/**
 * @typedef {Object} PreInsertNote
 * @property {string} Note_Association,
 * @property {string} Note
 */

/**
 * @param {Databases} dbs
 * @param {Map<bigint, PreInsertNote[]>} taggableNotePairings
 */
export async function addNotesToTaggables(dbs, taggableNotePairings) {
    const taggableNotesInsertionParams = [];
    /** @type {Set<bigint>} */
    const taggableIDsWithNotes = new Set();
    for (const [taggableId, notes] of taggableNotePairings.entries()) {
        for (const note of notes) {
            taggableIDsWithNotes.add(taggableId);
            taggableNotesInsertionParams.push(Number(taggableId));
            taggableNotesInsertionParams.push(note.Note_Association);
            taggableNotesInsertionParams.push(note.Note);
        }
    }
    if (taggableNotesInsertionParams.length === 0) {
        return;
    }
    

    /** @type {DBNote[]} */
    const taggableNotes = (await dball(dbs, `
        INSERT INTO Taggable_Notes(
            Taggable_ID,
            Note_Association,
            Note
        ) VALUES ${dbtuples(3, taggableNotesInsertionParams.length / 3)} RETURNING *;
    `, taggableNotesInsertionParams));

    await dbs.perfTags.insertTagPairings(new Map([HAS_NOTES_TAG.Tag_ID, [...taggableIDsWithNotes]]), dbs.inTransaction);

    return taggableNotes.map(taggableNote => ({
        ...taggableNote,
        Taggable_ID: BigInt(taggableNote.Taggable_ID)
    }));
}