export const BUG_PRIORITIES = /** @type {const} */ ({
    CURRENT_WORK: "1 - Current Work",
    NEXT_WORK: "2 - Next Work",
    INTEND_FOR_THIS_RELEASE: "3 - Intend for this release",
    INTEND_FOR_NEXT_RELEASE: "4 - Intend for next release",
    BACKLOGGED_FOR_LATER: "5 - Backlogged",
    UNSCHEDULED: "6 - Unscheduled"
});
/** @typedef {(typeof BUG_PRIORITIES)[keyof typeof BUG_PRIORITIES]} BugPriority */

export const BUG_NOTICES = /** @type {const} */ ({
    // Will only be noticed by dev, as it is completely inconsequential
    ONLY_DEV: "0 - Only Dev Will Notice",
    // Will only be noticed by few users of the application and has an intuitive workaround
    MINOR: "1 - Minor",
    // Will be noticed by many users of the application and has an intuitive workaround
    MEDIUM: "2 - Medium",
    // Will be noticed by few users of the application and has no intuitive workaround or possibly no workaround at all
    MAJOR: "3 - Major",
    // Will be noticed by many users of the application and has no intuitive workaround or possibly no workaround at all
    FATAL: "4 - Fatal"
});
/** @typedef {(typeof BUG_NOTICES)[keyof typeof BUG_NOTICES]} BugNoticeability */

export const BUG_IMPACTS = /** @type {const} */ ({
    ASSUMED_WORKING: "0 - Assumed Working",
    // This bug makes a certain part of the application display incorrectly
    COSMETIC: "1 - Cosmetic",
    // This bug makes a certain part of the application work incorrectly for developers
    DEV_IMPEDIMENT: "2 - Developer Impediment",
    // This bug makes a certain part of the application partially unusable
    PARTIALLY_UNUSABLE: "3 - Partially Unusable Functionality",
    // This bug makes a certain part of the application corrupt user input data in a predictable and easily correctable way
    CORRECTIBLE_INPUT_CORRUPTION: "4 - Correctible Input Corruption",
    // This bug makes a certain part of the application unusable
    UNUSABLE: "5 - Unusable Functionality",
    // This bug makes a certain part of the application corrupt user input data in an unpredictable or unfixable way
    CORRUPTS_DATA: "6 - Corrupts Data",
});
/** @typedef {(typeof BUG_IMPACTS)[keyof typeof BUG_IMPACTS]} BugImpact */

export const IMPLEMENTATION_DIFFICULTIES = /** @type {const} */ ({
    UNDER_AN_HOUR: "0 - Under an hour",
    UNDER_A_DAY: "1 - Under a day",
    UNDER_A_WEEK: "2 - Under a week",
    UNDER_A_MONTH: "3 - Under a month",
    UNSURE: "? - Unsure"
});
/** @typedef {(typeof IMPLEMENTATION_DIFFICULTIES)[keyof typeof IMPLEMENTATION_DIFFICULTIES]} ImplementationDifficulty */

/**
 * @typedef {Object} UnimplementedTestInfo
 * @property {BugPriority} priority
 * @property {BugNoticeability} noticeability
 * @property {BugImpact} impact
 * @property {ImplementationDifficulty} expectedDifficulty
 */