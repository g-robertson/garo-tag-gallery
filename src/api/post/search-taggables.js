/**
 * @import {APIFunction} from "../api-types.js"
 * @import {DBTaggable} from "../../db/taggables.js"
 * @import {DBAppliedMetric, DBPermissionedLocalMetricService} from "../../db/metrics.js"
 */

import { bjsonStringify, replaceObject } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { Taggables } from "../../db/taggables.js";
import { LocalTags, LocalTagServices, TagsNamespaces } from "../../db/tags.js";
import z from "zod";
import PerfTags from "../../perf-tags-binding/perf-tags.js";
import { localTagsPKHash, SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { AppliedMetrics, LocalMetrics, LocalMetricServices } from "../../db/metrics.js";

const Z_CLIENT_COMPARATOR = z.literal("<").or(z.literal("<=")).or(z.literal(">")).or(z.literal(">="));
/** @typedef {z.infer<typeof Z_CLIENT_COMPARATOR>} ClientComparator */

const Z_CLIENT_SEARCH_TAG_BY_LOOKUP = z.object({
    type: z.literal("tagByLookup"),
    Lookup_Name: z.string(),
    Source_Name: z.string(),
    localTagServiceID: z.number().nonnegative().refine((localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID))
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_BY_LOOKUP>} ClientSearchTagByLookup */

const Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID = z.object({
    type: z.literal("tagByLocalTagID"),
    localTagID: z.number()
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID>} ClientSearchTagByLocalTagID */

const Z_CLIENT_SEARCH_TAG_HAS_METRIC_ID = z.object({
    type: z.literal("hasLocalMetricID"),
    Local_Metric_ID: z.number()
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_HAS_METRIC_ID>} ClientSearchTagHasMetricID */

const Z_CLIENT_SEARCH_TAG_IN_METRIC_SERVICE_ID = z.object({
    type: z.literal("inLocalMetricServiceID"),
    localMetricServiceID: z.number()
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_IN_METRIC_SERVICE_ID>} ClientSearchTagInLocalMetricServiceID */

const Z_CLIENT_SEARCH_TAG_APPLIED_LOCAL_METRIC = z.object({
    type: z.literal("appliedLocalMetric"),
    Local_Metric_ID: z.number(),
    Applied_Value: z.number()
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_APPLIED_LOCAL_METRIC>} ClientSearchTagAppliedLocalMetric */

const Z_CLIENT_SEARCH_TAG_LOCAL_METRIC_COMPARISON = z.object({
    type: z.literal("localMetricComparison"),
    comparator: Z_CLIENT_COMPARATOR,
    Local_Metric_ID: z.number(),
    metricComparisonValue: z.number().finite()
});
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_LOCAL_METRIC_COMPARISON} ClientSearchTagLocalMetricComparison */

const Z_CLIENT_SEARCH_TAG = Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID
    .or(Z_CLIENT_SEARCH_TAG_BY_LOOKUP)
    .or(Z_CLIENT_SEARCH_TAG_HAS_METRIC_ID)
    .or(Z_CLIENT_SEARCH_TAG_IN_METRIC_SERVICE_ID)
    .or(Z_CLIENT_SEARCH_TAG_APPLIED_LOCAL_METRIC)
    .or(Z_CLIENT_SEARCH_TAG_LOCAL_METRIC_COMPARISON);
/** @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG>} ClientSearchTag */

const Z_AGGREGATE_TAG_CONDITIONS = z.object({
    type: z.literal("is-not-in-tag-list"),
    value: z.array(Z_CLIENT_SEARCH_TAG)
});
/** @typedef {z.infer<typeof Z_AGGREGATE_TAG_CONDITIONS>} ClientAggregateTagCondition */

const Z_NAMESPACE_AGGREGATE_TAG_GROUP = z.object({
    type: z.literal("namespace"),
    namespaceID: z.number()
});
const Z_APPLIED_METRICS_AGGREGATE_TAG_GROUP = z.object({
    type: z.literal("applied-metrics"),
    Local_Metric_ID: z.number()
});

const Z_AGGREGATE_TAG_GROUP = Z_NAMESPACE_AGGREGATE_TAG_GROUP.or(Z_APPLIED_METRICS_AGGREGATE_TAG_GROUP);
/** @typedef {z.infer<typeof Z_AGGREGATE_TAG_GROUP>} ClientTagGroup */

const Z_AGGREGATE_TAG = z.object({
    type: z.literal("aggregateTag"),
    value: z.object({
        tagGroup: Z_AGGREGATE_TAG_GROUP,
        conditions: z.array(Z_AGGREGATE_TAG_CONDITIONS)
    })
});
/** @typedef {z.infer<typeof Z_AGGREGATE_TAG>} ClientAggregateTag */

/** @type {z.ZodAny} */
const Z_SEARCH_QUERY = z.object({
    type: z.literal("union"),
    value: z.lazy(() => z.array(Z_SEARCH_QUERY))
}).or(z.object({
    type: z.literal("intersect"),
    value: z.lazy(() => z.array(Z_SEARCH_QUERY))
})).or(z.object({
    type: z.literal("complement"),
    value: z.lazy(() => Z_SEARCH_QUERY)  
}))
.or(Z_CLIENT_SEARCH_TAG)
.or(Z_AGGREGATE_TAG);
/**
 * @typedef {{
 *     type: "union" | "intersect",
 *     value: ClientSearchQuery[]
 * } | {
 *     type: "complement",
 *     value: ClientSearchQuery
 * } | ClientSearchTag | ClientAggregateTag} ClientSearchQuery
 **/

/**
 * @typedef {{
 *     type: "union" | "intersect",
 *     value: SearchQueryRecursive[]
 * } | {
 *     type: "complement",
 *     value: SearchQueryRecursive
 * } | {
 *     type: "tag",
 *     tagID: bigint
 * }} SearchQueryRecursive
 */

/**
 * @typedef {SearchQueryRecursive | {type: "universe" | "complement-universe"}} SearchQuery
 */

/**
 * @typedef {{
 *     type: "union" | "intersect",
 *     value: PreSearchQuery[]
 * } | {
 *     type: "complement",
 *     value: PreSearchQuery
 * } | {
 *     type: "tag",
 *     tagID: bigint
 * } | {
 *     type: "universe" | "complement-universe"
 * }} PreSearchQuery
 */

/**
 * @template T
 * @param {T} searchQuery
 * @param {(step: T) => void} callback
 */
function walkSearchQuery(searchQuery, callback) {
    callback(searchQuery);
    if (searchQuery.type === "union" || searchQuery.type === "intersect") {
        for (const innerClientSearchQuery of searchQuery.value) {
            walkSearchQuery(innerClientSearchQuery, callback);
        }
    } else if (searchQuery.type === "complement") {
        walkSearchQuery(searchQuery.value, callback);
    }
}

/**
 * @param {ClientSearchQuery} step 
 */
function isClientSearchTag(step) {
    return step.type === "tagByLocalTagID"
        || step.type === "tagByLookup"
        || step.type === "hasLocalMetricID"
        || step.type === "inLocalMetricServiceID"
        || step.type === "appliedLocalMetric"
        || step.type === "localMetricComparison";
}

/**
 * @param {number} lhs 
 * @param {"<" | "<=" | ">" | ">="} comparator 
 * @param {number} rhs 
 */
function dynamicComparison(lhs, comparator, rhs) {
    if (comparator === "<") {
        return lhs < rhs;
    } else if (comparator === "<=") {
        return lhs <= rhs;
    } else if (comparator === ">") {
        return lhs > rhs; 
    } else if (comparator === ">=") {
        return lhs >= rhs;
    } else {
        console.log(comparator);
        throw "Unexpected comparator value";
    }
}

/**
 * @param {ClientSearchTag} clientSearchTag 
 * @param {Map<number, bigint>} localTagsMap 
 * @param {Map<number, Map<string, bigint>>} tagLookupsMap 
 * @param {Map<number, DBPermissionedLocalMetricService>} localMetricServicesMap
 * @param {Map<number, bigint>} localMetricsMap
 * @param {Map<number, Map<number, bigint>>} appliedMetricsMap
 * @returns {ClientSearchQuery}
 */
function transformClientSearchTag(clientSearchTag, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, appliedMetricsMap) {
    /** @type {bigint} */
    let tagID;
    if (clientSearchTag.type === "tagByLocalTagID") {
        tagID = localTagsMap.get(clientSearchTag.localTagID)
    } else if (clientSearchTag.type === "tagByLookup") {
        tagID = tagLookupsMap.get(clientSearchTag.localTagServiceID).get(localTagsPKHash(clientSearchTag.Lookup_Name, clientSearchTag.Source_Name));
    } else if (clientSearchTag.type === "hasLocalMetricID") {
        tagID = localMetricsMap.get(clientSearchTag.Local_Metric_ID);
    } else if (clientSearchTag.type === "inLocalMetricServiceID") {
        tagID = localMetricServicesMap.get(clientSearchTag.localMetricServiceID).Has_Metric_From_Local_Metric_Service_Tag.Tag_ID;
    } else if (clientSearchTag.type === "appliedLocalMetric") {
        tagID = appliedMetricsMap.get(clientSearchTag.Local_Metric_ID).get(clientSearchTag.Applied_Value);
    } else if (clientSearchTag.type === "localMetricComparison") {
        return {
            type: "union",
            value: [...appliedMetricsMap.get(clientSearchTag.Local_Metric_ID).entries()].filter(([appliedValue,]) => {
                return dynamicComparison(appliedValue, clientSearchTag.comparator, clientSearchTag.metricComparisonValue);
            }).map(([_, appliedMetricValueTagID]) => ({
                type: "tag",
                tagID: appliedMetricValueTagID
            }))
        };
    } else {
        console.log(clientSearchTag);
        throw "Unrecognized client search tag type";
    }

    if (tagID === undefined) {
        return {
            type: "complement-universe"
        };
    } else {
        return {
            type: "tag",
            tagID
        };
    }
}

/**
 * @param {ClientSearchTag} clientSearchTag 
 * @param {Set<number>} allLocalTagIDs
 * @param {Set<number>} allLocalMetricIDs
 * @param {Set<number>} allLocalMetricServiceIDs
 * @param {Map<number, Map<string, {Lookup_Name: string, Source_Name: string}>>} allTagLookups 
 */
function addClientSearchTagToCollections(clientSearchTag, allLocalTagIDs, allTagLookups, allLocalMetricIDs, allLocalMetricServiceIDs) {
    if (clientSearchTag.type === "tagByLocalTagID") {
        allLocalTagIDs.add(clientSearchTag.localTagID);
    } else if (clientSearchTag.type === "tagByLookup") {
        const {localTagServiceID, Lookup_Name, Source_Name} = clientSearchTag;
        let pkHashToTagLookupMap = allTagLookups.get(localTagServiceID);
        if (pkHashToTagLookupMap === undefined) {
            pkHashToTagLookupMap = new Map();
            allTagLookups.set(localTagServiceID, pkHashToTagLookupMap);
        }
        pkHashToTagLookupMap.set(localTagsPKHash(Lookup_Name, Source_Name), {Lookup_Name, Source_Name});
    } else if (clientSearchTag.type === "hasLocalMetricID") {
        allLocalMetricIDs.add(clientSearchTag.Local_Metric_ID);
    } else if (clientSearchTag.type === "inLocalMetricServiceID") {
        allLocalMetricServiceIDs.add(clientSearchTag.localMetricServiceID);
    } else if (clientSearchTag.type === "appliedLocalMetric") {
        allLocalMetricIDs.add(clientSearchTag.Local_Metric_ID);
    } else if (clientSearchTag.type === "localMetricComparison") {
        allLocalMetricIDs.add(clientSearchTag.Local_Metric_ID);
    } else {
        console.log(clientSearchTag);
        throw "Unrecognized client search tag type";
    }
}

/**
 * @param {ClientSearchQuery} clientSearchQuery 
 * @param {Map<number, bigint>} localTagsMap 
 * @param {Map<number, Map<string, bigint>>} tagLookupsMap
 * @param {Map<number, DBPermissionedLocalMetricService>} localMetricServicesMap
 * @param {Map<number, bigint>} localMetricsMap
 * @param {Map<number, Map<number, bigint>>} appliedMetricsMap
 * @param {Map<number, bigint[]>} tagsNamespacesMap
 */
function transformClientSearchQueryToSearchQuery(clientSearchQuery, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, appliedMetricsMap, tagsNamespacesMap) {
    // transform client search query into pre search query
    walkSearchQuery(clientSearchQuery, step => {
        if (isClientSearchTag(step)) {
            replaceObject(step, transformClientSearchTag(step, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, appliedMetricsMap));
        } else if (step.type === "aggregateTag") {
            const aggregateTag = step.value;
            step.type = "union";
            /** @type {Set<bigint>} */
            let tagsOfAggregate;
            if (aggregateTag.tagGroup.type === "applied-metrics") {
                tagsOfAggregate = new Set(appliedMetricsMap.get(aggregateTag.tagGroup.Local_Metric_ID).values());
            } else if (aggregateTag.tagGroup.type === "namespace") {
                tagsOfAggregate = new Set(tagsNamespacesMap.get(aggregateTag.tagGroup.namespaceID));
            }

            for (const condition of aggregateTag.conditions) {
                if (condition.type === "is-not-in-tag-list") {
                    for (const clientSearchTag of condition.value) {
                        tagsOfAggregate.delete(transformClientSearchTag(clientSearchTag, localTagsMap, tagLookupsMap, localMetricServicesMap, localMetricsMap, appliedMetricsMap).tagID)
                    }
                }
            }
            replaceObject(step, {
                type: "union",
                value: [...tagsOfAggregate].map(tagID => ({
                    type: "tag",
                    tagID
                }))
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
                if (step.value.type === "complement-universe") {
                    replaceObject(step, {type: "universe"});
                    performedSimplification = true;
                } else if (step.value.type === "universe") {
                    replaceObject(step, {type: "complement-universe"});
                    performedSimplification = true;
                } else if (step.value.type === "complement") {
                    replaceObject(step, step.value.value);
                    performedSimplification = true;
                }
            } else if (step.type === "union") {
                if (step.value.find(unionItem => unionItem.type === "universe")) {
                    replaceObject(step, {type: "universe"});
                    performedSimplification = true;
                } else {
                    const filteredValue = step.value.filter(unionItem => unionItem.type !== "complement-universe");
                    if (filteredValue.length !== step.value.length) {
                        step.value = filteredValue;
                        performedSimplification = true;
                    }
                    if (step.value.length === 0) {
                        replaceObject(step, {type: "complement-universe"});
                        performedSimplification = true;
                    }
                }
            } else if (step.type === "intersect") {
                if (step.value.find(unionItem => unionItem.type === "complement-universe")) {
                    replaceObject(step, {type: "complement-universe"});
                    performedSimplification = true;
                } else {
                    const filteredValue = step.value.filter(unionItem => unionItem.type !== "universe");
                    if (filteredValue.length !== step.value.length) {
                        step.value = filteredValue;
                        performedSimplification = true;
                    }
                    if (step.value.length === 0) {
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
        return PerfTags.searchUnion(recursiveSearchQuery.value.map(constructSearchCriteriaFromRecursiveSearchQuery));
    } else if (recursiveSearchQuery.type === "intersect") {
        return PerfTags.searchIntersect(recursiveSearchQuery.value.map(constructSearchCriteriaFromRecursiveSearchQuery));
    } else if (recursiveSearchQuery.type === "complement") {
        return PerfTags.searchComplement(constructSearchCriteriaFromRecursiveSearchQuery(recursiveSearchQuery.value));
    } else if (recursiveSearchQuery.type === "tag") {
        return PerfTags.searchTag(recursiveSearchQuery.tagID)
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

    /** @type {Set<number>} */
    const allLocalTagIDs = new Set();
    /** @type {Map<number, Map<string, {Lookup_Name: string, Source_Name: string}>>} */
    const allTagLookups = new Map();
    
    /** @type {Set<number>} */
    const allLocalMetricIDs = new Set();
    /** @type {Set<number>} */
    const allLocalMetricServiceIDs = new Set();

    /** @type {Set<number>} */
    const allNamespaceIDs = new Set();

    walkSearchQuery(clientSearchQuery, step => {
        if (isClientSearchTag(step)) {
            addClientSearchTagToCollections(step, allLocalTagIDs, allTagLookups, allLocalMetricIDs, allLocalMetricServiceIDs);
        } else if (step.type === "aggregateTag") {
            const aggregateTag = step.value;
            if (aggregateTag.tagGroup.type === "applied-metrics") {
                allLocalMetricIDs.add(aggregateTag.tagGroup.Local_Metric_ID);
            } else if (aggregateTag.tagGroup.type === "namespace") {
                allNamespaceIDs.add(aggregateTag.tagGroup.namespaceID);
            }

            for (const condition of aggregateTag.conditions) {
                if (condition.type === "is-not-in-tag-list") {
                    for (const clientSearchTag of condition.value) {
                        addClientSearchTagToCollections(clientSearchTag, allLocalTagIDs, allTagLookups, allLocalMetricIDs, allLocalMetricServiceIDs);
                    }
                }
            }
        }
    });

    const localMetricServicesToCheckFromLocalMetricIDs = await LocalMetricServices.selectManyByLocalMetricIDs(dbs, allLocalMetricIDs);
    const localMetricServiceIDsToCheck = [...new Set([
        ...localMetricServicesToCheckFromLocalMetricIDs.map(localMetricService => localMetricService.Local_Metric_Service_ID),
        ...allLocalMetricServiceIDs
    ])];
    const localMetricServicesMap = new Map((await LocalMetricServices.userSelectManyByIDs(
        dbs,
        req.user,
        PERMISSION_BITS.READ,
        localMetricServiceIDsToCheck
    )).map(localMetricService => [localMetricService.Local_Metric_Service_ID, localMetricService]));

    if (localMetricServiceIDsToCheck.length !== localMetricServicesMap.size) {
        return "User did not have permission to view all local metric services requested";
    }

    for (const localMetricServiceID of allLocalMetricServiceIDs) {
        for (const localMetric of localMetricServicesMap.get(localMetricServiceID).Local_Metrics) {
            allLocalMetricIDs.add(localMetric.Local_Metric_ID);
        }
    }

    return {
        clientSearchQuery,
        allLocalTagIDs: [...allLocalTagIDs],
        allTagLookups,
        allLocalMetricIDs: [...allLocalMetricIDs],
        localMetricServicesMap,
        allNamespaceIDs: [...allNamespaceIDs]
    };
}

export const PERMISSIONS_REQUIRED = [{
    TYPE: PERMISSIONS.LOCAL_TAG_SERVICES,
    BITS: PERMISSION_BITS.READ
}, {
    TYPE: PERMISSIONS.LOCAL_METRIC_SERVICES,
    BITS: PERMISSION_BITS.READ
}];
/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export async function checkPermission(dbs, req, res) {
    const localTagServicesToCheckFromLocalTagIDs = await LocalTagServices.selectManyByLocalTagIDs(dbs, req.body.allLocalTagIDs);
    const localTagServiceIDsToCheck = [...new Set([
        ...localTagServicesToCheckFromLocalTagIDs.map(localTagService => localTagService.Local_Tag_Service_ID),
        ...req.body.allTagLookups.keys()
    ])].filter(localTagServiceID => localTagServiceID !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);

    const localTagServices = await LocalTagServices.userSelectManyByIDs(dbs, req.user, PERMISSION_BITS.READ, localTagServiceIDsToCheck);

    return localTagServices.length === localTagServiceIDsToCheck.length;
}


/** @type {APIFunction<Awaited<ReturnType<typeof validate>>>} */
export default async function get(dbs, req, res) {
    const localTagsMap = new Map((await LocalTags.selectManyByIDs(dbs, req.body.allLocalTagIDs)).map(tag => [tag.Local_Tag_ID, tag.Tag_ID]));
    if (localTagsMap.size !== req.body.allLocalTagIDs.length) {
        return res.status(400).send("One of the local tag IDs sent in did not exist");
    }
    /** @type {Map<number, Map<string, bigint>} */
    const tagLookupsMap = new Map();
    for (const [localTagServiceID, pkHashToTagLookupMap] of req.body.allTagLookups) {
        tagLookupsMap.set(
            localTagServiceID,
            new Map((await LocalTags.selectManyByLookups(dbs, [...pkHashToTagLookupMap.values()], localTagServiceID)).map(dbLocalTag => [
                dbLocalTag.Local_Tags_PK_Hash,
                dbLocalTag.Tag_ID
            ]))
        );
    }

    const localMetricsMap = new Map((await LocalMetrics.tagMapped(dbs, (await LocalMetrics.selectManyByIDs(dbs, req.body.allLocalMetricIDs)))).map(localMetric => [
        localMetric.Local_Metric_ID,
        localMetric.Has_Local_Metric_Tag.Tag_ID
    ]));

    /** @type {Map<number, Map<number, bigint>>} */
    const appliedMetricsMap = new Map(req.body.allLocalMetricIDs.map(localMetricID => [localMetricID, new Map()]));
    const appliedMetrics = await AppliedMetrics.tagMapped(dbs, await AppliedMetrics.userSelectManyByLocalMetricIDs(dbs, req.user.id(), req.body.allLocalMetricIDs));
    for (const appliedMetric of appliedMetrics) {
        appliedMetricsMap.get(appliedMetric.Local_Metric_ID).set(appliedMetric.Applied_Value, appliedMetric.Local_Applied_Metric_Tag.Tag_ID);
    }

    /** @type {Map<number, bigint[]>} */
    const tagsNamespacesMap = new Map(req.body.allNamespaceIDs.map(namespaceID => [namespaceID, []]));
    for (const tagNamespace of await TagsNamespaces.selectManyByNamespaceIDs(dbs, req.body.allNamespaceIDs)) {
        tagsNamespacesMap.get(tagNamespace.Namespace_ID).push(tagNamespace.Tag_ID);
    }

    const searchQuery = transformClientSearchQueryToSearchQuery(
        req.body.clientSearchQuery,
        localTagsMap,
        tagLookupsMap,
        req.body.localMetricServicesMap,
        localMetricsMap,
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
            searchCriteria,
            req.user
        );
    }

    return res.status(200).send(bjsonStringify(taggables.map(taggable => Number(taggable.Taggable_ID))));
}
