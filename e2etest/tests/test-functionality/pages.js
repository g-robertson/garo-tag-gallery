import { DUPLICATES_PROCESSING_PAGE_TESTS } from "./pages/duplicates-processing-page.js";
import { FILE_SEARCH_PAGE_TESTS } from "./pages/file-search-page.js";



/** @type {TestSuite[]} */
export const PAGES_TESTS = [
    {name: "FileSearchPage", tests: FILE_SEARCH_PAGE_TESTS},
    {name: "DuplicatesProcessingPage", tests: DUPLICATES_PROCESSING_PAGE_TESTS}
]
