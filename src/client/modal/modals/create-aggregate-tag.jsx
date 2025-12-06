import '../../global.css';
import TagGroupsSelector from '../../components/tag-groups-selector.jsx';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import SelectFromListOfTags from "./select-from-list-of-tags-modal.jsx"
import { createAppliedMetricDisplayName } from '../../js/metrics.js';
import getTagsFromNamespaceID from '../../../api/client-get/tags-from-namespace.js';
import CreateAndSearchGroup from './create-and-search-group.jsx';
import NumericInput from '../../components/numeric-input.jsx';
import { clientSearchQueryToDisplayName } from '../../js/tags.js';
import { User } from '../../js/user.js';
import { Modals } from '../../modal/modals.js';
import { State } from '../../page/pages.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';

/** @import {State} from "../../page/pages.js" */
/** @import {ExtraProperties} from "../modals.js" */
/** @import {ClientAggregateTag, ClientAggregateTagCondition, ClientComparator, ClientSearchTag} from "../../../api/post/search-taggables.js" */
/** @import {DisplayClientTagGroup} from "../../components/tag-groups-selector.jsx" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties
 *  modalResolve: (value: any) => void
 * } param0}
*/
export default function CreateAggregateTag({extraProperties, modalResolve}) {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const SpecifyTagGroupTags = ReferenceableReact();
    const TagOccurrencesCountSpecifyQuery = ReferenceableReact();
    const TagOccurrencesPercentageSpecifyQuery = ReferenceableReact();
    const TagOccurrencesPercentageSpecifyQueries = ReferenceableReact();
    const CreateAggregateTagButton = ReferenceableReact();

    /** @type {State<DisplayClientTagGroup | undefined} */
    const tagGroupRef = new State(undefined);
    /** @type {State<ClientAggregateTagCondition[]} */
    const conditionsRef = new State([]);

    /** @type {State<ClientComparator>} */
    const countComparatorRef = new State("<");
    const countValueRef = new State(0);
    /** @type {State<ClientComparator>} */
    const percentageComparatorRef = new State("<");
    const percentageValueRef = new State(0);
    /** @type {State<ClientComparator>} */
    const percentageOfSecondQueryComparatorRef = new State("<");
    const percentageOfSecondQueryValueRef = new State(0);

    const onAdd = () => {
        const onTagGroupChanged = () => {
            SpecifyTagGroupTags.dom.disabled = tagGroupRef.get() === undefined;
            TagOccurrencesCountSpecifyQuery.dom.disabled = tagGroupRef.get() === undefined;
            TagOccurrencesPercentageSpecifyQuery.dom.disabled = tagGroupRef.get() === undefined;
            TagOccurrencesPercentageSpecifyQueries.dom.disabled = tagGroupRef.get() === undefined;
            CreateAggregateTagButton.dom.disabled = tagGroupRef.get() === undefined;
        };
        onTagGroupChanged();

        tagGroupRef.addOnUpdateCallback(onTagGroupChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
    }

    return {
        component: <div style={{width: "100%", height: "100%", flexDirection: "column"}} onAdd={onAdd}>
            An aggregate tag selects from a union of all of the tags in a certain selected group that meets a specified condition
            <div style={{flex: 4}}>
                <TagGroupsSelector
                    multiSelect={false}
                    onTagGroupsSelected={(tagGroups) => {
                        tagGroupRef.set(tagGroups[0]);
                    }} />
            </div>
            <div style={{marginLeft: 8, marginTop: 4}}>
                Select a tag group from above: <div style={{height: 20, flexGrow: 100}}><LazyTextObjectSelector textObjectsConstState={tagGroupRef.asTransform(tagGroup => [tagGroup], addToCleanup)} elementsSelectable={false} scrollbarWidth={0} /></div>
            </div>
            <div style={{marginLeft: 8, flexDirection: "column"}}>
                <div style={{marginTop: 4}}>Where the tags within the group must follow any selected conditions below</div>
                <div style={{marginTop: 4}}>Conditions selected:</div>
                <div style={{height: 100, marginTop: 4}}>
                    <LazyTextObjectSelector textObjectsConstState={conditionsRef} multiSelect={false} onValuesDoubleClicked={(_, indicesSelected) => {
                        conditionsRef.get().splice(indicesSelected[0], 1);
                        conditionsRef.forceUpdate();
                    }} />
                </div>
                <div className="not-in-list-condition" style={{marginTop: 8, flexDirection: "column"}}>
                    <div>
                        Apply condition: Tag must not be within specified list of tags
                        {SpecifyTagGroupTags.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify tags" onClick={async () => {
                            const tagGroup = tagGroupRef.get();
                            /** @type {ClientSearchTag[]} */
                            let tags = [];
                            if (tagGroup.type === "applied-metrics") {
                                const localMetric = tagGroup.extraInfo.localMetric;
                                if (localMetric.Local_Metric_Lower_Bound === -Infinity || localMetric.Local_Metric_Upper_Bound === Infinity) {
                                    throw "Have not yet implemented applied metric exact selection for unbounded metrics";
                                } else {
                                    const step = Math.pow(10, localMetric.Local_Metric_Precision);
                                    for (let i = localMetric.Local_Metric_Lower_Bound; i <= localMetric.Local_Metric_Upper_Bound; i += step) {
                                        tags.push({
                                            type: "appliedLocalMetric",
                                            Local_Metric_ID: localMetric.Local_Metric_ID,
                                            Applied_Value: i,
                                            displayName: createAppliedMetricDisplayName(localMetric.Local_Metric_Name, User.Global().name(), i)
                                        });
                                    }
                                }
                            } else if (tagGroup.type === "namespace") {
                                const tagsFromNamespaces = await getTagsFromNamespaceID(tagGroup.namespaceID);
                                for (const tagGroup of tagsFromNamespaces) {
                                    tags.push({
                                        type: "tagByLookup",
                                        Lookup_Name: tagGroup.tagName,
                                        displayName: tagGroup.displayName
                                    });
                                }
                            }
                            
                            const notInTagList = await Modals.Global().pushModal(SelectFromListOfTags, {
                                tags
                            });
                            if (notInTagList === null || notInTagList === undefined) {
                                return;
                            }

                            conditionsRef.get().push({
                                type: "is-not-in-tag-list",
                                list: notInTagList,
                                displayName: `is not in tags:${notInTagList.map(tag => tag.displayName).join(' OR ')}`
                            });
                            conditionsRef.forceUpdate();
                        }}/>)}
                    </div>
                    <div className="count-matching-query-condition" style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [count] taggables that match a specified query (can be empty)</div>
                        <div style={{marginTop: 8}}>
                            <div><input checked={true} style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorRef.set("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorRef.set("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorRef.set(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorRef.set(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Count: <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput selectedNumberRef={countValueRef} />
                            </div></div>
                            {TagOccurrencesCountSpecifyQuery.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify query" onClick={async () => {
                                const searchQuery = await Modals.Global().pushModal(CreateAndSearchGroup, {
                                    selectionButtonText: `Select query that ${countComparatorRef.get()}${countValueRef.get()} taggables must match`
                                });

                                if (searchQuery === undefined) {
                                    return;
                                }

                                conditionsRef.get().push({
                                    type: "tag-occurrences-compared-to-n-within-expression",
                                    comparator: countComparatorRef.get(),
                                    occurrences: countValueRef.get(),
                                    expression: searchQuery,
                                    displayName: `must have ${countComparatorRef.get()}${countValueRef.get()} taggables${searchQuery.value.length !== 0 ? ` match the query (${clientSearchQueryToDisplayName(searchQuery)})`: ""}`
                                });
                                conditionsRef.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                    <div className="percentage-matching-query-condition" style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [percentage] taggables match a specified query</div>
                        <div style={{marginTop: 8}}>
                            <div><input checked={true} style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorRef.set("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorRef.set("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorRef.set(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorRef.set(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Percentage (0-100%): <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    selectedNumberRef={percentageValueRef}
                                    minValue={0}
                                    maxValue={100}
                                />
                            </div></div>
                            {TagOccurrencesPercentageSpecifyQuery.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify query" onClick={async () => {
                                const searchQuery = await Modals.Global().pushModal(CreateAndSearchGroup, {
                                    selectionButtonText: `Select query that ${percentageComparatorRef.get()}${percentageValueRef.get()}% of taggables must match`
                                });
                                if (searchQuery === undefined || searchQuery.value.length === 0) {
                                    return;
                                }

                                conditionsRef.get().push({
                                    type: "tag-occurrences-compared-to-n-percent-within-expression",
                                    comparator: percentageComparatorRef.get(),
                                    percentage: percentageValueRef.get() / 100,
                                    expression: searchQuery,
                                    displayName: `must have ${percentageComparatorRef.get()}${percentageValueRef.get()}% of taggables match the query (${clientSearchQueryToDisplayName(searchQuery)})`
                                });
                                conditionsRef.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                    <div className="percentage-of-subquery-matching-query-condition" style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [percentage] of taggables that match a specified query match a second specified query</div>
                        <div style={{marginTop: 8}}>
                            <div><input checked={true} style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorRef.set("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorRef.set("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorRef.set(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorRef.set(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Percentage (0-100%): <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    selectedNumberRef={percentageOfSecondQueryValueRef}
                                    minValue={0}
                                    maxValue={100}
                                />
                            </div></div>
                            {TagOccurrencesPercentageSpecifyQueries.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify queries" onClick={async () => {
                                const searchQuery = await Modals.Global().pushModal(CreateAndSearchGroup, {
                                    selectionButtonText: "Select query that will filter taggables"
                                });
                                const secondSearchQuery = await Modals.Global().pushModal(CreateAndSearchGroup, {
                                    selectionButtonText: `Select query that ${percentageOfSecondQueryComparatorRef.get()}${percentageOfSecondQueryValueRef.get()}% of filtered taggables must match`
                                });
                                if (searchQuery === undefined || searchQuery.value.length === 0 || secondSearchQuery === undefined || secondSearchQuery.value.length === 0) {
                                    return;
                                }

                                conditionsRef.get().push({
                                    type: "filtered-tag-occurrences-compared-to-n-percent-within-expression",
                                    comparator: percentageOfSecondQueryComparatorRef.get(),
                                    percentage: percentageOfSecondQueryValueRef.get() / 100,
                                    filteringExpression: searchQuery,
                                    expression: secondSearchQuery,
                                    displayName: `must have ${percentageOfSecondQueryComparatorRef.get()}${percentageOfSecondQueryValueRef.get()}% of taggables that match the query (${clientSearchQueryToDisplayName(searchQuery)}) also match the query (${clientSearchQueryToDisplayName(secondSearchQuery)})`
                                });
                                conditionsRef.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                </div>
                <div style={{marginTop: 4, marginBottom: 4}}>
                    {CreateAggregateTagButton.react(<input type="button" value="Create Aggregate Tag" onClick={() => {
                        /** @type {ClientAggregateTag} */
                        const aggregateTag = {
                            type: "aggregateTag",
                            tagGroup: tagGroupRef.get(),
                            conditions: conditionsRef.get(),
                            displayName: `system:aggregate tag with group:${tagGroupRef.get().displayName}${conditionsRef.get().length !== 0 ? " WHERE " : ""}${conditionsRef.get().map(condition => condition.displayName).join(" AND ")}`
                        }

                        delete aggregateTag.tagGroup['extraInfo'];
                        modalResolve(aggregateTag);
                        Modals.Global().popModal();
                    }}/>)}
                </div>
            </div>
        </div>,
        displayName: "Create Aggregate Tag"
    };
};