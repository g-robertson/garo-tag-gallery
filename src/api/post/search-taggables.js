/**
 * @import {APIFunction} from "../api-types.js"
 * @import {DBTaggable} from "../../db/taggables.js"
 * @import {DBAppliedMetric} from "../../db/metrics.js"
 */

import { bjsonStringify } from "../../client/js/client-util.js";
import { PERMISSION_BITS, PERMISSIONS } from "../../client/js/user.js";
import { Taggables } from "../../db/taggables.js";
import { LocalTags, LocalTagServices, TagsNamespaces } from "../../db/tags.js";
import z from "zod";
import PerfTags from "../../perf-tags-binding/perf-tags.js";
import { localTagsPKHash, SYSTEM_LOCAL_TAG_SERVICE } from "../../client/js/tags.js";
import { AppliedMetrics, LocalMetricServices } from "../../db/metrics.js";

const Z_CLIENT_SEARCH_TAG_BY_LOOKUP = z.object({
    type: z.literal("tagByLookup"),
    lookupName: z.string(),
    sourceName: z.string(),
    localTagServiceID: z.number()
});

const Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID = z.object({
    type: z.literal("tagByLocalTagID"),
    localTagID: z.number()
});

const Z_CLIENT_SEARCH_TAG = Z_CLIENT_SEARCH_TAG_BY_LOCAL_TAG_ID.or(Z_CLIENT_SEARCH_TAG_BY_LOOKUP);

const Z_AGGREGATE_TAG_CONDITIONS = z.object({
    type: z.literal("is-not-in-tag-list"),
    value: z.array(Z_CLIENT_SEARCH_TAG)
});

const Z_NAMESPACE_AGGREGATE_TAG_GROUP = z.object({
    type: z.literal("namespace"),
    namespaceID: z.number()
});
const Z_APPLIED_METRICS_AGGREGATE_TAG_GROUP = z.object({
    type: z.literal("applied-metrics"),
    localMetricID: z.number()
});

const Z_AGGREGATE_TAG_GROUP = Z_NAMESPACE_AGGREGATE_TAG_GROUP.or(Z_APPLIED_METRICS_AGGREGATE_TAG_GROUP);

const Z_AGGREGATE_TAG = z.object({
    type: z.literal("aggregateTag"),
    value: z.object({
        tagGroup: Z_AGGREGATE_TAG_GROUP,
        conditions: z.array(Z_AGGREGATE_TAG_CONDITIONS)
    })
});

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
 * @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG_BY_LOOKUP} ClientSearchTagByLookup
 * @typedef {z.infer<typeof Z_CLIENT_SEARCH_TAG>} ClientSearchTag
 * @typedef {z.infer<typeof Z_AGGREGATE_TAG_CONDITIONS>} ClientAggregateTagCondition
 * @typedef {z.infer<typeof Z_AGGREGATE_TAG>} ClientAggregateTag
 * @typedef {z.infer<typeof Z_AGGREGATE_TAG_GROUP>} ClientTagGroup
*/


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
 *     value: bigint
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
 *     value: bigint
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
 * @param {ClientSearchQuery} clientSearchQuery 
 * @param {Map<number, bigint>} localTagsMap 
 * @param {Map<number, Map<string, bigint>>} tagLookupsMap 
 * @param {Map<number, Map<number, bigint>>} appliedMetricMap
 * @param {Map<number, bigint[]>} tagsNamespacesMap
 */
function transformClientSearchQueryToSearchQuery(clientSearchQuery, localTagsMap, tagLookupsMap, appliedMetricMap, tagsNamespacesMap) {
    // transform client search query into pre search query
    walkSearchQuery(clientSearchQuery, step => {
        if (step.type === "tagByLocalTagID") {
            step.type = "tag";
            step.value = localTagsMap.get(step.localTagID);
        } else if (step.type === "tagByLookup") {
            const tagID = tagLookupsMap.get(step.localTagServiceID).get(localTagsPKHash(step.lookupName, step.sourceName));
            if (tagID === undefined) {
                step.type = "complement-universe";
            } else {
                step.type = "tag";
                step.value = tagID;
            }
        } else if (step.type === "aggregateTag") {
            const aggregateTag = step.value;
            step.type = "union";
            /** @type {Set<bigint>} */
            let tagsOfAggregate;
            if (aggregateTag.tagGroup.type === "applied-metrics") {
                tagsOfAggregate = new Set(appliedMetricMap.get(aggregateTag.tagGroup.localMetricID).values());
            } else if (aggregateTag.tagGroup.type === "namespace") {
                tagsOfAggregate = new Set(tagsNamespacesMap.get(aggregateTag.tagGroup.namespaceID));
            }

            for (const condition of aggregateTag.conditions) {
                if (condition.type === "is-not-in-tag-list") {
                    for (const clientTag of condition.value) {
                        if (clientTag.type === "tagByLocalTagID") {
                            tagsOfAggregate.delete(localTagsMap.get(clientTag.localTagID));
                        } else if (clientTag.type === "tagByLookup") {
                            tagsOfAggregate.delete(tagLookupsMap.get(clientTag.localTagServiceID).get(localTagsPKHash(clientTag.lookupName, clientTag.sourceName)));
                        }
                    }
                }
            }
            
            step.value = [...tagsOfAggregate].map(tagID => ({
                type: "tag",
                value: tagID
            }));
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
                    step.type = "universe";
                    delete step.value;
                    performedSimplification = true;
                } else if (step.value.type === "universe") {
                    step.type = "complement-universe";
                    delete step.value;
                    performedSimplification = true;
                } else if (step.value.type === "complement") {
                    step.type = step.value.value.type;
                    step.value = step.value.value.value;
                    performedSimplification = true;
                }
            } else if (step.type === "union") {
                if (step.value.find(unionItem => unionItem.type === "universe")) {
                    step.type = "universe";
                    delete step.value;
                    performedSimplification = true;
                } else {
                    const filteredValue = step.value.filter(unionItem => unionItem.type !== "complement-universe");
                    if (filteredValue.length !== step.value.length) {
                        step.value = filteredValue;
                        performedSimplification = true;
                    }
                    if (step.value.length === 0) {
                        step.type = "complement-universe";
                        delete step.value;
                        performedSimplification = true;
                    }
                }
            } else if (step.type === "intersect") {
                if (step.value.find(unionItem => unionItem.type === "complement-universe")) {
                    step.type = "complement-universe";
                    delete step.value;
                    performedSimplification = true;
                } else {
                    const filteredValue = step.value.filter(unionItem => unionItem.type !== "universe");
                    if (filteredValue.length !== step.value.length) {
                        step.value = filteredValue;
                        performedSimplification = true;
                    }
                    if (step.value.length === 0) {
                        step.type = "universe";
                        delete step.value;
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
        return PerfTags.searchTag(recursiveSearchQuery.value)
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

/**
 * @param {Map<number, Map<string, bigint>>} tagLookupMap
 * @param {ClientSearchTagByLookup} searchTagByLookup 
 */
function addSearchTagByLookupToTagLookupMap(tagLookupMap, searchTagByLookup) {
    const {localTagServiceID, lookupName, sourceName} = searchTagByLookup;
    let pkHashToTagLookupMap = tagLookupMap.get(localTagServiceID);
    if (pkHashToTagLookupMap === undefined) {
        pkHashToTagLookupMap = new Map();
        allTagLookups.set(localTagServiceID, pkHashToTagLookupMap);
    }
    pkHashToTagLookupMap.set(localTagsPKHash(lookupName, sourceName), {lookupName, sourceName});
}

export async function validate(dbs, req, res) {
    const tryClientSearchQuery = Z_SEARCH_QUERY.safeParse(req?.body?.searchQuery, {path: ["searchQuery"]});
    if (!tryClientSearchQuery.success) return tryClientSearchQuery.error.message;
    /** @type {ClientSearchQuery} */
    const clientSearchQuery = tryClientSearchQuery.data;

    /** @type {Set<number>} */
    const allLocalTagIDs = new Set();
    /** @type {Map<number, Map<string, {lookupName: string, sourceName: string}>>} */
    const allTagLookups = new Map();
    
    /** @type {Set<number>} */
    const allLocalMetricIDs = new Set();

    /** @type {Set<number>} */
    const allNamespaceIDs = new Set();

    walkSearchQuery(clientSearchQuery, step => {
        if (step.type === "tagByLocalTagID") {
            allLocalTagIDs.add(step.localTagID);
        } else if (step.type === "tagByLookup") {
            addSearchTagByLookupToTagLookupMap(allTagLookups, step);
        } else if (step.type === "aggregateTag") {
            const aggregateTag = step.value;
            if (aggregateTag.tagGroup.type === "applied-metrics") {
                allLocalMetricIDs.add(aggregateTag.tagGroup.localMetricID);
            } else if (aggregateTag.tagGroup.type === "namespace") {
                allNamespaceIDs.add(aggregateTag.tagGroup.namespaceID);
            }

            for (const condition of aggregateTag.conditions) {
                if (condition.type === "is-not-in-tag-list") {
                    for (const clientSearchTag of condition.value) {
                        if (clientSearchTag.type === "tagByLocalTagID") {
                            allLocalTagIDs.add(clientSearchTag.localTagID);
                        } else if (clientSearchTag.type === "tagByLookup") {
                            addSearchTagByLookupToTagLookupMap(allTagLookups, clientSearchTag);
                        }
                    }
                }
            }
        }
    });

    return {
        clientSearchQuery,
        allLocalTagIDs: [...allLocalTagIDs],
        allTagLookups,
        allLocalMetricIDs: [...allLocalMetricIDs],
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

    const localMetricServicesToCheck = await LocalMetricServices.selectManyByLocalMetricIDs(dbs, req.body.allLocalMetricIDs);
    const localMetricServices = await LocalMetricServices.userSelectManyByIDs(
        dbs,
        req.user,
        PERMISSION_BITS.READ,
        localMetricServicesToCheck.map(localMetricService => localMetricService.Local_Metric_Service_ID)
    );
    return localTagServices.length === localTagServiceIDsToCheck.length && localMetricServicesToCheck.length === localMetricServices.length;
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

    /** @type {Map<number, Map<number, bigint>>} */
    const localMetricsMap = new Map(req.body.allLocalMetricIDs.map(localMetricID => [localMetricID, new Map()]));
    for (const appliedMetric of await AppliedMetrics.userSelectManyByLocalMetricIDs(dbs, req.user.id(), req.body.allLocalMetricIDs)) {
        localMetricsMap.get(appliedMetric.Local_Metric_ID).set(appliedMetric.Local_Applied_Metric_ID, appliedMetric.Local_Applied_Metric_Tag_ID);
    }

    /** @type {Map<number, bigint[]>} */
    const tagsNamespacesMap = new Map(req.body.allNamespaceIDs.map(namespaceID => [namespaceID, []]));
    for (const tagNamespace of await TagsNamespaces.selectManyByNamespaceIDs(dbs, req.body.allNamespaceIDs)) {
        tagsNamespacesMap.get(tagNamespace.Namespace_ID).push(tagNamespace.Tag_ID);
    }

    const searchQuery = transformClientSearchQueryToSearchQuery(req.body.clientSearchQuery, localTagsMap, tagLookupsMap, localMetricsMap, tagsNamespacesMap);
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
