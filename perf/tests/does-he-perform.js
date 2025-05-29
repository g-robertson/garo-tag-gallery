import { appendFileSync, writeFileSync } from "fs";
import { deleteTagPairings, filePairingsToTagPairings, getCurrentPerfTags, getFilesStr, getNewPerfTags, getTagPairingsStr, getTagsStr, insertFiles, insertTagPairings, insertTags, killCurrentPerfTags, readFilesTags, serializeUint64, toggleTagPairings } from "./helpers.js";

const TESTS = {
    "read_file_tags": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTagPairings(perfTags, getTagPairingsStr(tagPairings));
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00002") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_file_tags_after_exit": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTagPairings(perfTags, getTagPairingsStr(tagPairings));
        perfTags = await getNewPerfTags();
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00002") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_file_tags_after_kill": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00002") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 0) {
            throw "File pairings file0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_exit": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        perfTags = await getNewPerfTags();
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 0) {
            throw "File pairings file0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_after_kill": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 0) {
            throw "File pairings file0001 does not have 0 tags";
        }
    },
    "read_toggled_tag_pairings_complex": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        const tagPairings2 = filePairingsToTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']});
        const tagPairings3 = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings2));
        await insertTags(perfTags, getTagsStr(tagPairings3));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings2));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings3));
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1 ||
            filePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_exits": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        const tagPairings2 = filePairingsToTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']});
        const tagPairings3 = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings2));
        await insertTags(perfTags, getTagsStr(tagPairings3));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings2));
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings3));
        perfTags = await getNewPerfTags();
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1 ||
            filePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_kills": async () => {
        appendFileSync("err.log", "START BAD RUN");
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        const tagPairings2 = filePairingsToTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']});
        const tagPairings3 = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings2));
        await insertTags(perfTags, getTagsStr(tagPairings3));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings2));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings3));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        writeFileSync("perf-input.txt", getFilesStr(tagPairings));
        const {oked, filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1 ||
            filePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    },
    "read_toggled_tag_pairings_complex_with_kills_and_additional_file": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        const tagPairings2 = filePairingsToTagPairings({'file0001': ['tag00001','tag00003','tag00005','tag00007']});
        const tagPairings3 = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00007']});
        const tagPairings4 = filePairingsToTagPairings({'file0002': ['tag00001','tag00033','tag00052','tag00071']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertFiles(perfTags, getFilesStr(tagPairings4));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings2));
        await insertTags(perfTags, getTagsStr(tagPairings3));
        await insertTags(perfTags, getTagsStr(tagPairings4));
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings2));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings3));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        await toggleTagPairings(perfTags, getTagPairingsStr(tagPairings4));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        await readFilesTags(perfTags, getFilesStr(tagPairings));
        await killCurrentPerfTags();
        perfTags = await getNewPerfTags();
        let {filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 4) {
            throw "File pairings file0001 does not have 4 tags";
        }
        
        if (filePairings['file0001'].indexOf("tag00001") === -1 ||
            filePairings['file0001'].indexOf("tag00003") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1 ||
            filePairings['file0001'].indexOf("tag00005") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
        
        ({filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings4)));
        if (filePairings['file0002'] === undefined) {
            throw "File pairings does not have file0002";
        }
        if (filePairings['file0002'].length !== 4) {
            throw "File pairings file0002 does not have 4 tags";
        }
        if (filePairings['file0002'].indexOf("tag00001") === -1 ||
            filePairings['file0002'].indexOf("tag00033") === -1 ||
            filePairings['file0002'].indexOf("tag00052") === -1 ||
            filePairings['file0002'].indexOf("tag00071") === -1) {
            throw "File pairings file0002 lacks one of the placed tags";
        }
    },
    "read_deleted_tag_pairings": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = filePairingsToTagPairings({'file0001': ['tag00001','tag00002','tag00003','tag00004']});
        const tagPairings2 = filePairingsToTagPairings({'file0001': ['tag00001','tag00003']});
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));
        await insertTagPairings(perfTags, getTagPairingsStr(tagPairings));
        await deleteTagPairings(perfTags, getTagPairingsStr(tagPairings2));
        let {filePairings} = await readFilesTags(perfTags, getFilesStr(tagPairings));
        if (filePairings['file0001'] === undefined) {
            throw "File pairings does not have file0001";
        }
        if (filePairings['file0001'].length !== 2) {
            throw "File pairings file0001 does not have 4 tags";
        }
        
        if (filePairings['file0001'].indexOf("tag00002") === -1 ||
            filePairings['file0001'].indexOf("tag00004") === -1) {
            throw "File pairings file0001 lacks one of the placed tags";
        }
    }
};
export default TESTS;