import { writeFileSync } from "fs";
import { getCurrentPerfTags, getFilesStr, getNewPerfTags, getTagPairingsStr, getTagsStr, insertFiles, insertTagPairings, insertTags } from "./helpers.js";

const TESTS = {
    "exit": async () => {
        let perfTags = await getNewPerfTags();
        perfTags.perfTags.stdin.write("exit\n");

        const oked = await perfTags.dataOrTimeout("OK!\r\n", 100);
        if (!oked) {
            throw `Test case failed, no OK! returned from exit`;
        }

        const exited = await perfTags.nonErrorExitOrTimeout(100);
        if (!exited) {
            throw `Test case failed, no exit from exit`;
        }
    },
    "bad_command": async () => {
        let perfTags = await getNewPerfTags();
        perfTags.perfTags.stdin.write("exiT\r\n");
        const badcmdd = await perfTags.dataOrTimeout("BAD COMMAND!\r\n", 100);
        if (!badcmdd) {
            throw `Test case failed, no BAD COMMAND! returned from exiT`;
        }
    },
    "tag_pairings_without_parents_fails": async () => {
        let perfTags = await getNewPerfTags();
        writeFileSync("perf-input.txt", getTagPairingsStr({'tag00001': ['file0001']}));
        perfTags.perfTags.stdin.write("insert_tag_pairings\r\n");
        const errored = await perfTags.errorOrTimeout(1000);
        if (!errored) {
            throw `Test case failed, no error on insert_tag_pairings without parents`;
        }
    },
    "insert_tag_pairings_without_file_parents": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = {'tag00001': ['file0001']};
        await insertTags(perfTags, getTagsStr(tagPairings));
        writeFileSync("perf-input.txt", getTagPairingsStr(tagPairings));
        perfTags.perfTags.stdin.write("insert_tag_pairings\r\n");

        const errored = await perfTags.errorOrTimeout(1000);
        if (!errored) {
            throw `Test case failed, no error on insert_tag_pairings without file parents`;
        }
    },
    "insert_tag_pairings_without_tag_parents": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = {'tag00001': ['file0001']};
        await insertFiles(perfTags, getFilesStr(tagPairings));
        writeFileSync("perf-input.txt", getTagPairingsStr(tagPairings));
        perfTags.perfTags.stdin.write("insert_tag_pairings\r\n");

        const errored = await perfTags.errorOrTimeout(1000);
        if (!errored) {
            throw `Test case failed, no error on insert_tag_pairings without tag parents`;
        }
    },
    "insert_tag_pairings": async () => {
        let perfTags = await getNewPerfTags();
        const tagPairings = {'tag00001': ['file0001']};
        await insertFiles(perfTags, getFilesStr(tagPairings));
        await insertTags(perfTags, getTagsStr(tagPairings));

        const oked = await insertTagPairings(perfTags, getTagPairingsStr(tagPairings));
        if (!oked) {
            throw `Test case failed, no OK! on insertion of tag pairings with parents both inserted`;
        }
    }
};
export default TESTS;