import { BUG_IMPACTS, BUG_NOTICES, BUG_PRIORITIES, IMPLEMENTATION_DIFFICULTIES } from "../../unimplemented-test-info.js";
import { DUPLICATES_PROCESSING_PAGE_TESTS } from "./pages/duplicates-processing-page.js";
import { FILE_SEARCH_PAGE_TESTS } from "./pages/file-search-page.js";



/** @type {TestSuite[]} */
export const PAGES_TESTS = [
    {name: "FileSearchPage", tests: FILE_SEARCH_PAGE_TESTS},
    {name: "DownloaderPage", tests: {
        priority: BUG_PRIORITIES.NEXT_WORK,
        noticeability: BUG_NOTICES.ONLY_DEV,
        impact: BUG_IMPACTS.ASSUMED_WORKING,
        expectedDifficulty: IMPLEMENTATION_DIFFICULTIES.UNDER_AN_HOUR
    }},
    {name: "DuplicatesProcessingPage", tests: DUPLICATES_PROCESSING_PAGE_TESTS}
]
