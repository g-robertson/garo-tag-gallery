/**
 * @import {APIFunction, APIGetPermissionsFunction} from "../api-types.js"
 * @import {ClientComparator} from "../zod-types.js"
 * @import {DBTaggable, TaggableGroupedDBJoinedTaggableFile} from "../../db/taggables.js"
 * @import {DBAppliedMetric, DBPermissionedLocalMetricService} from "../../db/metrics.js"
 */

import { bjsonStringify, clientjsonStringify, mapNullCoalesce, replaceObject } from "../../client/js/client-util.js";
import { PERMISSIONS } from "../../client/js/user.js";
import { TaggableFiles, Taggables } from "../../db/taggables.js";
import { LocalTags, TagsNamespaces } from "../../db/tags.js";
import z from "zod";
import PerfTags from "../../perf-binding/perf-tags.js";
import { IN_TRASH_TAG } from "../../client/js/defaults.js";
import { AppliedMetrics, LocalMetrics, LocalMetricServices } from "../../db/metrics.js";
import { Cursor, getCursorAsFileWantedFields, getCursorAsTaggableWantedFields } from "../../db/cursor-manager.js";
import { Z_CLIENT_COMPARATOR, Z_LOCAL_TAG_ID, Z_METRIC_VALUE, Z_NAMESPACE_ID, Z_PERCENTAGE, Z_USER_LOCAL_METRIC_ID, Z_USER_LOCAL_METRIC_SERVICE_ID, Z_USER_LOCAL_TAG_SERVICE_ID, Z_WANTED_FIELD } from "../zod-types.js";

const Z_CLIENT_SEARCH_TAG_BY_LOOKUP = z.object({
    type: z.literal("tagByLookup"),
    Lookup_Name: z.string()
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_BY_LOOKUP>} ClientSearchTagByLookup */

const Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID = z.object({
    type: z.literal("tagByLocalTagID"),
    localTagID: Z_LOCAL_TAG_ID
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID>} ClientSearchTagByLocalTagID */

const Z_CLIENT_SEARCH_TAG_HAS_METRIC_ID = z.object({
    type: z.literal("hasLocalMetricID"),
    Local_Metric_ID: Z_USER_LOCAL_METRIC_ID
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_HAS_METRIC_ID>} ClientSearchTagHasMetricID */

const Z_CLIENT_SEARCH_TAG_IN_METRIC_SERVICE_ID = z.object({
    type: z.literal("inLocalMetricServiceID"),
    localMetricServiceID: Z_USER_LOCAL_METRIC_SERVICE_ID
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_IN_METRIC_SERVICE_ID>} ClientSearchTagInLocalMetricServiceID */

const Z_CLIENT_SEARCH_TAG_LOCAL_METRIC_COMPARISON = z.object({
    type: z.literal("localMetricComparison"),
    comparator: Z_CLIENT_COMPARATOR,
    Local_Metric_ID: Z_USER_LOCAL_METRIC_ID,
    metricComparisonValue: Z_METRIC_VALUE
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_LOCAL_METRIC_COMPARISON>} ClientSearchTagLocalMetricComparison */

const Z_CLIENT_SEARCH_TAG = Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID
    .or(Z_CLIENT_SEARCH_TAG_BY_LOOKUP)
    .or(Z_CLIENT_SEARCH_TAG_HAS_METRIC_ID)
    .or(Z_CLIENT_SEARCH_TAG_IN_METRIC_SERVICE_ID)
    .or(Z_CLIENT_SEARCH_TAG_LOCAL_METRIC_COMPARISON);
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG>} ClientSearchTag */

const Z_PSEUDO_TAG = z.object({
    type: z.literal("pseudo-tag"),
    pseudoTagName: z.string()
});
/** @typedef {z.infer<typeof Z_PSEUDO_TAG} ClientPseudoTag */

const Z_NAMESPACE_TAGS_LIST = z.object({
    type: z.literal("namespace"),
    namespaceID: Z_NAMESPACE_ID
});
const Z_APPLIED_METRICS_TAGS_LISTS = z.object({
    type: z.literal("applied-metrics"),
    Local_Metric_ID: Z_USER_LOCAL_METRIC_ID
});

const Z_EXPRESSION_LIST = Z_NAMESPACE_TAGS_LIST.or(Z_APPLIED_METRICS_TAGS_LISTS);
/** @typedef {z.infer<typeof Z_EXPRESSION_LIST>} ClientExpressionList */

const Z_EXPRESSION_LIST_CONDITION = z.object({
    type: z.literal("expression-occurrences-compared-to-n-within-compare-expression"),
    comparator: Z_CLIENT_COMPARATOR,
    occurrences: z.number().nonnegative().int(),
    compareExpression: z.lazy(() => Z_SEARCH_QUERY)
}).or(z.object({
    type: z.literal("expression-occurrences-compared-to-n-percent-within-compare-expression"),
    comparator: Z_CLIENT_COMPARATOR,
    percentage: Z_PERCENTAGE,
    compareExpression: z.lazy(() => Z_SEARCH_QUERY)
})).or(z.object({
    type: z.literal("filtered-expression-occurrences-compared-to-n-percent-within-compare-expression"),
    comparator: Z_CLIENT_COMPARATOR,
    percentage: Z_PERCENTAGE,
    filteringExpression: z.lazy(() => Z_SEARCH_QUERY),
    compareExpression: z.lazy(() => Z_SEARCH_QUERY)
})).or(z.object({
    type: z.literal("is-not-in-compare-list"),
    compareList: z.array(Z_CLIENT_SEARCH_TAG.or(Z_PSEUDO_TAG))
}));
/** @typedef {z.infer<typeof Z_EXPRESSION_LIST_CONDITION>} ExpressionListCondition */

const Z_CLIENT_CONDITIONAL_EXPRESSION_LIST_UNION = z.object({
    type: z.literal("conditional-expression-list-union"),
    expressionList: Z_EXPRESSION_LIST,
    conditions: z.array(Z_EXPRESSION_LIST_CONDITION)
});
/** @typedef {z.infer<typeof Z_CLIENT_CONDITIONAL_EXPRESSION_LIST_UNION>} ClientConditionalExpressionListUnion */

/** @type {z.ZodAny} */
const Z_SEARCH_QUERY = z.object({
    type: z.literal("union").or(z.literal("intersect")),
    expressions: z.array(z.lazy(() => Z_SEARCH_QUERY))
}).or(z.object({
    type: z.literal("complement"),
    expression: z.lazy(() => Z_SEARCH_QUERY)  
}))
.or(Z_CLIENT_SEARCH_TAG)
.or(Z_CLIENT_CONDITIONAL_EXPRESSION_LIST_UNION);

/**
 * @typedef {{
 *     type: "union" | "intersect",
 *     expressions: ClientSearchQuery[]
 * } | {
 *     type: "complement",
 *     expression: ClientSearchQuery
 * } | ClientSearchTag | ClientConditionalExpressionListUnion} ClientSearchQuery
 **/

const Z_WANTED_CURSOR = z.literal("Taggable")
.or(z.literal("File"));
/** @typedef {z.infer<typeof Z_WANTED_CURSOR>} WantedCursor */

/**
 * @typedef {Object} SearchTag
 * @property {"tag"} type
 * @property {bigint} tagID
 **/

/**
 * @typedef {Object} SearchTagUnion
 * @property {"union"} type
 * @property {SearchTag[]} expressions
 **/

/**
 * @typedef {Object} SearchTaggableList
 * @property {"taggable-list"} type
 * @property {bigint[]} taggableIDs
 * @property {string=} pseudoTagName
 **/

/**
 * @typedef {{
 *     type: "union" | "intersect",
 *     expressions: SearchQueryRecursive[]
 * } | {
 *     type: "conditional-expression-list-union",
 *     expressionList: SearchQueryRecursive[],
 *     conditions: ExpressionListCondition[]
 * } | {
 *     type: "complement",
 *     expression: SearchQueryRecursive
 * } | SearchTag | SearchTaggableList} SearchQueryRecursive
 */


/**
 * @typedef {SearchQueryRecursive | {type: "universe" | "complement-universe"}} SearchQuery
 */

/**
 * @typedef {{
 *     type: "union" | "intersect",
 *     expressions: PreSearchQuery[]
 * } | {
 *     type: "conditional-expression-list-union",
 *     expressionList: PreSearchQuery[],
 *     conditions: ExpressionListCondition[]
 * }| {
 *     type: "complement",
 *     expression: PreSearchQuery
 * } | SearchTag | SearchTaggableList | {
 *     type: "universe" | "complement-universe"
 * }} PreSearchQuery
 */

/**
 * @template T
 * @param {T} searchQuery
 * @param {(step: T) => void} callback
 */
function walkSearchQuery(searchQuery, callback) {
    if (searchQuery.type === "union" || searchQuery.type === "intersect") {
        for (const innerClientSearchQuery of searchQuery.expressions) {
            walkSearchQuery(innerClientSearchQuery, callback);
        }
    } else if (searchQuery.type === "conditional-expression-list-union") {
        for (const condition of searchQuery.conditions) {
            if (condition.type === "expression-occurrences-compared-to-n-within-compare-expression" || condition.type === "expression-occurrences-compared-to-n-percent-within-compare-expression") {
                walkSearchQuery(condition.compareExpression, callback);
            } else if (condition.type === "filtered-expression-occurrences-compared-to-n-percent-within-compare-expression") {
                walkSearchQuery(condition.filteringExpression, callback);
                walkSearchQuery(condition.compareExpression, callback);
            } else if (condition.type === "is-not-in-compare-list") {
                for (const compareExpression of condition.compareList) {
                    walkSearchQuery(compareExpression, callback);
                }
            }
        }
    } else if (searchQuery.type === "complement") {
        walkSearchQuery(searchQuery.expression, callback);
    }
    callback(searchQuery);
}

/**
 * @param {ClientSearchQuery} step 
 */
function isClientSearchTag(step) {
    return step.type === "tagByLocalTagID"
        || step.type === "tagByLookup"
        || step.type === "hasLocalMetricID"
        || step.type === "inLocalMetricServiceID"
        || step.type === "localMetricComparison";
}

/**
 * @param {ClientSearchTag} clientSearchTag 
 * @param {Map<number, SearchTag>} localTagsMap 
 * @param {Map<string, SearchTagUnion>} tagLookupsMap
 * @param {Map<number, SearchTag>} localMetricServicesMap
 * @param {Map<number, SearchTag>} localMetricsMap
 * @param {Map<number, Map<ClientComparator, Map<number, SearchTagUnion>>>} localMetricComparisonsMap
 */
function transformClientSearchTag(clientSearchTag, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, localMetricComparisonsMap) {
    if (clientSearchTag.type === "tagByLocalTagID") {
        return localTagsMap.get(clientSearchTag.localTagID)
    } else if (clientSearchTag.type === "tagByLookup") {
        const tagByLookup = tagLookupsMap.get(clientSearchTag.Lookup_Name);
        if (tagByLookup !== undefined) {
            return tagByLookup;
        } else {
            return /** @type {const} */ ({
                type: "complement-universe"
            });
        }
    } else if (clientSearchTag.type === "hasLocalMetricID") {
        return localMetricsMap.get(clientSearchTag.Local_Metric_ID);
    } else if (clientSearchTag.type === "inLocalMetricServiceID") {
        return localMetricServicesMap.get(clientSearchTag.localMetricServiceID);
    } else if (clientSearchTag.type === "localMetricComparison") {
        return localMetricComparisonsMap.get(clientSearchTag.Local_Metric_ID).get(clientSearchTag.comparator).get(clientSearchTag.metricComparisonValue);
    } else {
        console.log(clientSearchTag);
        throw "Unrecognized client search tag type";
    }
}

/**
 * @param {ClientSearchTag} clientSearchTag 
 * @param {Set<number>} allLocalTagIDs
 * @param {Set<number>} allLocalMetricIDs
 * @param {Set<number>} allLocalMetricServiceIDs
 * @param {Set<string>} allTagLookups
 * @param {Map<number, Map<ClientComparator, Set<number>>>} allLocalMetricComparisons
 */
function addClientSearchTagToCollections(clientSearchTag, allLocalTagIDs, allTagLookups, allLocalMetricIDs, allLocalMetricServiceIDs, allLocalMetricComparisons) {
    if (clientSearchTag.type === "tagByLocalTagID") {
        allLocalTagIDs.add(clientSearchTag.localTagID);
    } else if (clientSearchTag.type === "tagByLookup") {
        allTagLookups.add(clientSearchTag.Lookup_Name);
    } else if (clientSearchTag.type === "hasLocalMetricID") {
        allLocalMetricIDs.add(clientSearchTag.Local_Metric_ID);
    } else if (clientSearchTag.type === "inLocalMetricServiceID") {
        allLocalMetricServiceIDs.add(clientSearchTag.localMetricServiceID);
    } else if (clientSearchTag.type === "localMetricComparison") {
        mapNullCoalesce(mapNullCoalesce(allLocalMetricComparisons, clientSearchTag.Local_Metric_ID, new Map()), clientSearchTag.comparator, new Set()).add(clientSearchTag.metricComparisonValue);
    } else {
        console.log(clientSearchTag);
        throw "Unrecognized client search tag type";
    }
}

/**
 * @param {ClientSearchQuery} clientSearchQuery 
 * @param {Map<number, SearchTag>} localTagsMap 
 * @param {Map<string, SearchTagUnion>} tagLookupsMap
 * @param {Map<number, SearchTag>} localMetricServicesMap
 * @param {Map<number, SearchTag>} localMetricsMap
 * @param {Map<number, Map<ClientComparator, Map<number, SearchTagUnion>>>} localMetricComparisonsMap
 * @param {Map<number, SearchTag[]>} appliedMetricsMap
 * @param {Map<number, SearchTag[]>} tagsNamespacesMap
 */
function transformClientSearchQueryToSearchQuery(clientSearchQuery, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, localMetricComparisonsMap, appliedMetricsMap, tagsNamespacesMap) {
    // transform client search query into pre search query
    walkSearchQuery(clientSearchQuery, step => {
        if (isClientSearchTag(step)) {
            replaceObject(step, transformClientSearchTag(step, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, localMetricComparisonsMap));
        } else if (step.type === "conditional-expression-list-union") {
            /** @type {Map<bigint | string, SearchQueryRecursive>} */
            let expressionList;
            if (step.expressionList.type === "applied-metrics") {
                expressionList = new Map(appliedMetricsMap.get(step.expressionList.Local_Metric_ID).map(tag => [
                    tag.tagID,
                    tag
                ]));
            } else if (step.expressionList.type === "namespace") {
                expressionList = new Map(tagsNamespacesMap.get(step.expressionList.namespaceID).map(tag => [
                    tag.tagID,
                    tag
                ]));
            }

            for (const condition of step.conditions) {
                if (condition.type === "is-not-in-compare-list") {
                    /** @type {(ReturnType<typeof transformClientSearchTag> | ClientPseudoTag)[]} */
                    const compareList = condition.compareList;
                    for (const compareExpression of compareList) {
                        if (compareExpression.type === "union") {
                            for (const tag of compareExpression.expressions) {
                                expressionList.delete(tag.tagID);
                            }
                        } else if (compareExpression.type === "tag") {
                            expressionList.delete(compareExpression.tagID);
                        } else if (compareExpression.type === "pseudo-tag") {
                            expressionList.delete(compareExpression.pseudoTagName);
                        }
                    }
                }
            }

            /** @type {PreSearchQuery[]} */
            const additionalConditions = [];
            for (const condition of step.conditions) {
                if (condition.type === "expression-occurrences-compared-to-n-within-compare-expression"
                 || condition.type === "expression-occurrences-compared-to-n-percent-within-compare-expression"
                 || condition.type === "filtered-expression-occurrences-compared-to-n-percent-within-compare-expression"
                ) {
                    additionalConditions.push(condition);
                }
            }

            replaceObject(step, {
                type: "conditional-expression-list-union",
                expressionList: [...expressionList.values()],
                conditions: additionalConditions
            });
        }
    });
    /** @type {PreSearchQuery} */
    const preSearchQuery = clientSearchQuery;
    let performedSimplification = false;
    // repeats until all complement-universe and universe have been removed, or it is just one complement-universe or universe
    do {
        performedSimplification = false;
        walkSearchQuery(preSearchQuery, step => {
            if (step.type === "complement") {
                if (step.expression.type === "complement-universe") {
                    replaceObject(step, {type: "universe"});
                    performedSimplification = true;
                } else if (step.expression.type === "universe") {
                    replaceObject(step, {type: "complement-universe"});
                    performedSimplification = true;
                } else if (step.expression.type === "complement") {
                    replaceObject(step, step.expression.expression);
                    performedSimplification = true;
                }
            } else if (step.type === "conditional-expression-list-union") {
                if (step.conditions.length === 0) {
                    replaceObject(step, {type: "union", expressions: step.expressionList});
                    performedSimplification = true;
                }
            } else if (step.type === "union") {
                if (step.expressions.find(unionItem => unionItem.type === "universe")) {
                    replaceObject(step, {type: "universe"});
                    performedSimplification = true;
                } else {
                    const filteredValue = step.expressions.filter(unionItem => unionItem.type !== "complement-universe");
                    if (filteredValue.length !== step.expressions.length) {
                        step.expressions = filteredValue;
                        performedSimplification = true;
                    }
                    if (step.expressions.length === 1) {
                        replaceObject(step, step.expressions[0]);
                        performedSimplification = true;
                    } else if (step.expressions.length === 0) {
                        replaceObject(step, {type: "complement-universe"});
                        performedSimplification = true;
                    }
                }
            } else if (step.type === "intersect") {
                if (step.expressions.find(unionItem => unionItem.type === "complement-universe")) {
                    replaceObject(step, {type: "complement-universe"});
                    performedSimplification = true;
                } else {
                    const filteredValue = step.expressions.filter(unionItem => unionItem.type !== "universe");
                    if (filteredValue.length !== step.expressions.length) {
                        step.expressions = filteredValue;
                        performedSimplification = true;
                    }
                    if (step.expressions.length === 1) {
                        replaceObject(step, step.expressions[0]);
                        performedSimplification = true;
                    } else if (step.expressions.length === 0) {
                        replaceObject(step, {type: "universe"});
                        performedSimplification = true;
                    }
                }
            }
        });
    } while (performedSimplification);
    /** @type {SearchQuery} */
    const searchQuery = preSearchQuery;
    return searchQuery;
}

/**
 * @param {SearchQueryRecursive} recursiveSearchQuery
 * @returns {string}
 */
function constructSearchCriteriaFromRecursiveSearchQuery(recursiveSearchQuery) {
    if (recursiveSearchQuery.type === "union") {
        return PerfTags.searchUnion(recursiveSearchQuery.expressions.map(constructSearchCriteriaFromRecursiveSearchQuery));
    } else if (recursiveSearchQuery.type === "intersect") {
        return PerfTags.searchIntersect(recursiveSearchQuery.expressions.map(constructSearchCriteriaFromRecursiveSearchQuery));
    } else if (recursiveSearchQuery.type === "conditional-expression-list-union") {
        return PerfTags.searchConditionalExpressionListUnion(
            recursiveSearchQuery.expressionList.map(constructSearchCriteriaFromRecursiveSearchQuery),
            recursiveSearchQuery.conditions.map(condition => {
                if (condition.type === "expression-occurrences-compared-to-n-within-compare-expression") {
                    return PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNWithinCompareExpression(
                        constructSearchCriteriaFromRecursiveSearchQuery(condition.compareExpression),
                        condition.comparator,
                        condition.occurrences
                    );
                } else if (condition.type === "expression-occurrences-compared-to-n-percent-within-compare-expression") {
                    return PerfTags.searchExpressionListUnionConditionExpressionOccurrencesComparedToNPercentWithinCompareExpression(
                        constructSearchCriteriaFromRecursiveSearchQuery(condition.compareExpression),
                        condition.comparator,
                        condition.percentage
                    );
                } else if (condition.type === "filtered-expression-occurrences-compared-to-n-percent-within-compare-expression") {
                    return PerfTags.searchExpressionListUnionConditionFilteredExpressionOccurrencesComparedToNPercentWithinCompareExpression(
                        constructSearchCriteriaFromRecursiveSearchQuery(condition.filteringExpression),
                        constructSearchCriteriaFromRecursiveSearchQuery(condition.compareExpression),
                        condition.comparator,
                        condition.percentage
                    )
                } else {
                    console.log(condition);
                    throw "Irregular recursive search query conditional expression list union condition type was used ^";
                }
            })
        );
    } else if (recursiveSearchQuery.type === "complement") {
        return PerfTags.searchComplement(constructSearchCriteriaFromRecursiveSearchQuery(recursiveSearchQuery.expression));
    } else if (recursiveSearchQuery.type === "tag") {
        return PerfTags.searchTag(recursiveSearchQuery.tagID)
    } else if (recursiveSearchQuery.type === "taggable-list") {
        return PerfTags.searchTaggableList(recursiveSearchQuery.taggableIDs);
    } else {
        console.log(recursiveSearchQuery);
        throw "Irregular recursive search query type was used ^";
    }
}

/**
 * @param {SearchQuery} searchQuery 
 */
function constructSearchCriteriaFromSearchQuery(searchQuery) {
    if (searchQuery.type === "complement-universe") {
        throw "search query type was complement universe, this should be filtered before constructing a search criteria";
    } else if (searchQuery.type === "universe") {
        return "";
    } else {
        return constructSearchCriteriaFromRecursiveSearchQuery(searchQuery);
    }
}

export async function validate(dbs, req, res) {
    const tryClientSearchQuery = Z_SEARCH_QUERY.safeParse(req?.body?.searchQuery, {path: ["searchQuery"]});
    if (!tryClientSearchQuery.success) return tryClientSearchQuery.error.message;
    /** @type {ClientSearchQuery} */
    const clientSearchQuery = tryClientSearchQuery.data;

    const wantedCursor = Z_WANTED_CURSOR.safeParse(req?.body?.wantedCursor, {path: ["wantedCursor"]});
    if (!wantedCursor.success) return wantedCursor.error.message;
    
    const wantedFields = Z_WANTED_FIELD.or(z.array(Z_WANTED_FIELD)).safeParse(req?.body?.wantedFields, {path: ["wantedFields"]});
    if (!wantedFields.success) return wantedFields.error.message;

    const localTagServiceIDs = z.array(Z_USER_LOCAL_TAG_SERVICE_ID).safeParse(req?.body?.localTagServiceIDs, {path: ["localTagServiceIDs"]});
    if (!localTagServiceIDs.success) return localTagServiceIDs.error.message;

    /** @type {Set<number>} */
    const allLocalTagIDs = new Set();
    /** @type {Set<string>} */
    const allTagLookups = new Set();
    
    /** @type {Set<number>} */
    const allLocalMetricIDs = new Set();
    /** @type {Set<number>} */
    const allAppliedMetricIDs = new Set();
    /** @type {Set<number>} */
    const allLocalMetricServiceIDs = new Set();
    /** @type {Map<number, Map<ClientComparator, Set<number>>>} */
    const allLocalMetricComparisons = new Map();

    /** @type {Set<number>} */
    const allNamespaceIDs = new Set();


    walkSearchQuery(clientSearchQuery, step => {
        if (isClientSearchTag(step)) {
            addClientSearchTagToCollections(step, allLocalTagIDs, allTagLookups, allLocalMetricIDs, allLocalMetricServiceIDs, allLocalMetricComparisons);
        } else if (step.type === "conditional-expression-list-union") {
            if (step.expressionList.type === "applied-metrics") {
                allAppliedMetricIDs.add(step.expressionList.Local_Metric_ID);
            } else if (step.expressionList.type === "namespace") {
                allNamespaceIDs.add(step.expressionList.namespaceID);
            }
        }
    });

    return {
        clientSearchQuery,
        wantedCursor: wantedCursor.data,
        wantedFields: wantedFields.data,
        localTagServiceIDs: localTagServiceIDs.data,
        allLocalTagIDs: [...allLocalTagIDs],
        allTagLookups: [...allTagLookups],
        allLocalMetricIDs: [...allLocalMetricIDs],
        allAppliedMetricIDs: [...allAppliedMetricIDs],
        allLocalMetricServiceIDs: [...allLocalMetricServiceIDs],
        allLocalMetricComparisons,
        allNamespaceIDs: [...allNamespaceIDs]
    };
}


/** @type {APIGetPermissionsFunction<Awaited<ReturnType<typeof validate>>>} */
export async function getPermissions(dbs, req, res) {
    const permissions = [];
    if (req.body.allLocalTagIDs.length !== 0 || req.body.localTagServiceIDs.length !== 0) {
        permissions.push(PERMISSIONS.LOCAL_TAG_SERVICES.READ_TAGS);
    }
    if (req.body.allLocalMetricIDs.length !== 0 || req.body.allAppliedMetricIDs.length !== 0 || req.body.allLocalMetricServiceIDs.length !== 0) {
        permissions.push(PERMISSIONS.LOCAL_METRIC_SERVICES.READ_METRIC);
    }

    return {
        permissions,
        objects: {
            Local_Tag_IDs: req.body.allLocalTagIDs,
            Local_Tag_Service_IDs: req.body.localTagServiceIDs,
            Local_Metric_IDs: req.body.allLocalMetricIDs.concat(req.body.allAppliedMetricIDs),
            Local_Metric_Service_IDs: req.body.allLocalMetricServiceIDs
        }
    };
}

/** @typedef {Cursor<"Taggable", DBTaggable[]>} DBTaggableCursor */
/** @typedef {Cursor<"File", TaggableGroupedDBJoinedTaggableFile[]>} DBFileCursor */

/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const localTagsMap = new Map((await LocalTags.selectManyByIDs(dbs, req.body.allLocalTagIDs)).map(tag => [
        tag.Local_Tag_ID, 
        {
            type: "tag",
            tagID: tag.Tag_ID
        }
    ]));

    /** @type {Map<string, SearchTagUnion>} */
    const tagLookupsMap = new Map(req.body.allTagLookups.map(lookupName => [
        lookupName,
        {
            type: "union",
            expressions: []
        }
    ]));
    for (const dbLocalTag of await LocalTags.selectManyByLookupNames(dbs, req.body.allTagLookups, req.body.localTagServiceIDs)) {
        tagLookupsMap.get(dbLocalTag.Lookup_Name).expressions.push({
            type: "tag",
            tagID: dbLocalTag.Tag_ID
        });
    }

    const localMetricServicesMap = new Map((await LocalMetricServices.selectManyByIDs(dbs, req.body.allLocalMetricServiceIDs)).map(localMetricService => [
        localMetricService.Local_Metric_Service_ID,
        {
            type: "tag",
            tagID: localMetricService.Has_Metric_From_Local_Metric_Service_Tag.Tag_ID
        }
    ]));

    const localMetricsMap = new Map((await LocalMetrics.tagMapped(dbs, (await LocalMetrics.selectManyByIDs(dbs, req.body.allLocalMetricIDs)))).map(localMetric => [
        localMetric.Local_Metric_ID,
        {
            type: "tag",
            tagID: localMetric.Has_Local_Metric_Tag.Tag_ID
        }
    ]));

    /** @type {Map<number, Map<ClientComparator, Map<number, SearchTag>>>} */
    const localMetricComparisonsMap = new Map([...req.body.allLocalMetricComparisons.keys()].map(localMetricID => [
        localMetricID,
        new Map()
    ]));
    for (const [localMetricID, rest] of req.body.allLocalMetricComparisons) {
        /** @type {Map<ClientComparator, Map<number, SearchTag>>} */
        const comparatorMap = new Map();
        localMetricComparisonsMap.set(localMetricID, comparatorMap);
        for (const [comparator, metricComparisonValues] of rest) {
            /** @type {Map<number, SearchTag>} */
            const metricComparisonValueMap = new Map();
            comparatorMap.set(comparator, metricComparisonValueMap);
            for (const metricComparisonValue of metricComparisonValues) {
                metricComparisonValueMap.set(metricComparisonValue, {
                    type: "union",
                    expressions: (
                        await AppliedMetrics.tagMapped(
                            dbs,
                            await AppliedMetrics.userSelectManyByComparison(dbs, req.user.id(), localMetricID, comparator, metricComparisonValue)
                        )
                    ).map(appliedMetric => ({
                        type: "tag",
                        tagID: appliedMetric.Local_Applied_Metric_Tag.Tag_ID
                    }))
                });
            }
        }
    }

    /** @type {Map<number, SearchTag[]>} */
    const appliedMetricsMap = new Map(req.body.allAppliedMetricIDs.map(localMetricID => [
        localMetricID,
        new Map()
    ]));
    for (const appliedMetric of await AppliedMetrics.tagMapped(dbs, await AppliedMetrics.userSelectManyByLocalMetricIDs(dbs, req.user.id(), req.body.allAppliedMetricIDs))) {
        mapNullCoalesce(appliedMetricsMap, appliedMetric.Local_Metric_ID, []).push(appliedMetric.Local_Applied_Metric_Tag.Tag_ID);
    }

    /** @type {Map<number, SearchTag[]>} */
    const tagsNamespacesMap = new Map(req.body.allNamespaceIDs.map(namespaceID => [namespaceID, []]));
    for (const tagNamespace of await TagsNamespaces.selectManyByNamespaceIDs(dbs, req.body.allNamespaceIDs)) {
        tagsNamespacesMap.get(tagNamespace.Namespace_ID).push({
            type: "tag",
            tagID: tagNamespace.Tag_ID
        });
    }

    const searchQuery = transformClientSearchQueryToSearchQuery(
        req.body.clientSearchQuery,
        localTagsMap,
        tagLookupsMap,
        localMetricServicesMap,
        localMetricsMap,
        localMetricComparisonsMap,
        appliedMetricsMap,
        tagsNamespacesMap
    );
    /** @type {DBTaggable[]} */
    let taggables = [];
    /** @type {string} */
    if (searchQuery.type !== "complement-universe") {
        const searchCriteria = constructSearchCriteriaFromSearchQuery(searchQuery);
        taggables = await Taggables.searchWithUser(
            dbs,
            PerfTags.searchIntersect([PerfTags.searchComplement(PerfTags.searchTag(IN_TRASH_TAG.Tag_ID)), searchCriteria]),
            req.user
        );
    }

    if (req.body.wantedCursor === "Taggable") {
        const cursor = new Cursor({cursorType: "Taggable", cursorValue: taggables})
        dbs.cursorManager.addCursorToUser(req.user.id(), cursor);

        if (req.body.wantedFields === "Taggable_ID") {
            return res.status(200).send(clientjsonStringify({
                cursor: cursor.id(),
                result: getCursorAsTaggableWantedFields(cursor, req.body.wantedFields)
            }));
        } else {
            return res.status(400).send(`No implementation currently exists for non "Taggable_ID" wantedFields on "Taggable" wantedCursor queries`);
        }
    } else if (req.body.wantedCursor === "File") {
        /** @type {DBFileCursor} */
        const cursor = new Cursor({cursorType: "File", cursorValue: TaggableFiles.groupTaggableFilesTaggables(
            await TaggableFiles.selectManyByTaggableIDs(dbs, taggables.map(taggable => taggable.Taggable_ID))
        )});
        dbs.cursorManager.addCursorToUser(req.user.id(), cursor);

        return res.status(200).send(clientjsonStringify({
            cursor: cursor.id(),
            result: getCursorAsFileWantedFields(cursor, req.body.wantedFields)
        }));
    } else {
        return res.status(400).send(`No implementation currently exists for non "Taggable" | "File" wantedCursor queries`);
    }

    return res.status(400).send("Something unexpected happened and the query was not processed");
}
