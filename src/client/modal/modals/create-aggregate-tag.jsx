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
/** @import {ClientAggregateTag, ClientAggregateTagCondition, ClientComparator, ClientSearchTag} from "../../../api/post/search-taggables.js" */
/** @import {DisplayClientTagGroup} from "../../components/tag-groups-selector.jsx" */

export default function CreateAggregateTag() {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    let modalResolve;
    /** @type {Promise<T>} */
    const promiseValue = new Promise(resolve => { modalResolve = resolve; });

    const SpecifyTagGroupTags = ReferenceableReact();
    const TagOccurrencesCountSpecifyQuery = ReferenceableReact();
    const TagOccurrencesPercentageSpecifyQuery = ReferenceableReact();
    const TagOccurrencesPercentageSpecifyQueries = ReferenceableReact();
    const CreateAggregateTagButton = ReferenceableReact();

    /** @type {State<DisplayClientTagGroup | undefined} */
    const tagGroupState = new State(undefined);
    /** @type {State<ClientAggregateTagCondition[]} */
    const conditionsState = new State([]);

    /** @type {State<ClientComparator>} */
    const countComparatorState = new State("<");
    const countValueState = new State(0);
    /** @type {State<ClientComparator>} */
    const percentageComparatorState = new State("<");
    const percentageValueState = new State(0);
    /** @type {State<ClientComparator>} */
    const percentageOfSecondQueryComparatorState = new State("<");
    const percentageOfSecondQueryValueState = new State(0);

    const onAdd = () => {
        const onTagGroupChanged = () => {
            SpecifyTagGroupTags.dom.disabled = tagGroupState.get() === undefined;
            TagOccurrencesCountSpecifyQuery.dom.disabled = tagGroupState.get() === undefined;
            TagOccurrencesPercentageSpecifyQuery.dom.disabled = tagGroupState.get() === undefined;
            TagOccurrencesPercentageSpecifyQueries.dom.disabled = tagGroupState.get() === undefined;
            CreateAggregateTagButton.dom.disabled = tagGroupState.get() === undefined;
        };
        onTagGroupChanged();

        tagGroupState.addOnUpdateCallback(onTagGroupChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
    }

    return {
        component: <div style={{width: "100%", height: "100%", flexDirection: "column"}} onAdd={onAdd}>
            An aggregate tag selects from a union of all of the tags in a certain selected group that meets a specified condition
            <div style={{flex: 4}}>
                <TagGroupsSelector
                    multiSelect={false}
                    onTagGroupsSelected={(tagGroups) => {
                        tagGroupState.set(tagGroups[0]);
                    }} />
            </div>
            <div style={{marginLeft: 8, marginTop: 4}}>
                Select a tag group from above: <div style={{height: 20, flexGrow: 100}}><LazyTextObjectSelector textObjectsConstState={tagGroupState.asTransform(tagGroup => [tagGroup], addToCleanup)} elementsSelectable={false} scrollbarWidth={0} /></div>
            </div>
            <div style={{marginLeft: 8, flexDirection: "column"}}>
                <div style={{marginTop: 4}}>Where the tags within the group must follow any selected conditions below</div>
                <div style={{marginTop: 4}}>Conditions selected:</div>
                <div style={{height: 100, marginTop: 4}}>
                    <LazyTextObjectSelector textObjectsConstState={conditionsState} multiSelect={false} onValuesDoubleClicked={(_, indicesSelected) => {
                        conditionsState.get().splice(indicesSelected[0], 1);
                        conditionsState.forceUpdate();
                    }} />
                </div>
                <div className="not-in-list-condition" style={{marginTop: 8, flexDirection: "column"}}>
                    <div>
                        Apply condition: Tag must not be within specified list of tags
                        {SpecifyTagGroupTags.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify tags" onClick={async () => {
                            const tagGroup = tagGroupState.get();
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
                            
                            const notInTagList = await Modals.Global().pushModal(SelectFromListOfTags({tags}));
                            if (notInTagList === null || notInTagList === undefined) {
                                return;
                            }

                            conditionsState.get().push({
                                type: "is-not-in-tag-list",
                                list: notInTagList,
                                displayName: `is not in tags:${notInTagList.map(tag => tag.displayName).join(' OR ')}`
                            });
                            conditionsState.forceUpdate();
                        }}/>)}
                    </div>
                    <div className="count-matching-query-condition" style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [count] taggables that match a specified query (can be empty)</div>
                        <div style={{marginTop: 8}}>
                            <div><input checked={true} style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorState.set("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorState.set("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorState.set(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => countComparatorState.set(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Count: <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput selectedNumberState={countValueState} />
                            </div></div>
                            {TagOccurrencesCountSpecifyQuery.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify query" onClick={async () => {
                                const searchQuery = await Modals.Global().pushModal(CreateAndSearchGroup({
                                    selectionButtonText: `Select query that ${countComparatorState.get()}${countValueState.get()} taggables must match`,
                                }));

                                if (searchQuery === undefined) {
                                    return;
                                }

                                conditionsState.get().push({
                                    type: "tag-occurrences-compared-to-n-within-expression",
                                    comparator: countComparatorState.get(),
                                    occurrences: countValueState.get(),
                                    expression: searchQuery,
                                    displayName: `must have ${countComparatorState.get()}${countValueState.get()} taggables${searchQuery.value.length !== 0 ? ` match the query (${clientSearchQueryToDisplayName(searchQuery)})`: ""}`
                                });
                                conditionsState.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                    <div className="percentage-matching-query-condition" style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [percentage] taggables match a specified query</div>
                        <div style={{marginTop: 8}}>
                            <div><input checked={true} style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorState.set("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorState.set("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorState.set(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => percentageComparatorState.set(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Percentage (0-100%): <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    selectedNumberState={percentageValueState}
                                    minValue={0}
                                    maxValue={100}
                                />
                            </div></div>
                            {TagOccurrencesPercentageSpecifyQuery.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify query" onClick={async () => {
                                const searchQuery = await Modals.Global().pushModal(CreateAndSearchGroup({
                                    selectionButtonText: `Select query that ${percentageComparatorState.get()}${percentageValueState.get()}% of taggables must match`,
                                }));

                                if (searchQuery === undefined || searchQuery.value.length === 0) {
                                    return;
                                }

                                conditionsState.get().push({
                                    type: "tag-occurrences-compared-to-n-percent-within-expression",
                                    comparator: percentageComparatorState.get(),
                                    percentage: percentageValueState.get() / 100,
                                    expression: searchQuery,
                                    displayName: `must have ${percentageComparatorState.get()}${percentageValueState.get()}% of taggables match the query (${clientSearchQueryToDisplayName(searchQuery)})`
                                });
                                conditionsState.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                    <div className="percentage-of-subquery-matching-query-condition" style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [percentage] of taggables that match a specified query match a second specified query</div>
                        <div style={{marginTop: 8}}>
                            <div><input checked={true} style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorState.set("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorState.set("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorState.set(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => percentageOfSecondQueryComparatorState.set(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Percentage (0-100%): <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    selectedNumberState={percentageOfSecondQueryValueState}
                                    minValue={0}
                                    maxValue={100}
                                />
                            </div></div>
                            {TagOccurrencesPercentageSpecifyQueries.react(<input style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify queries" onClick={async () => {
                                const searchQuery = await Modals.Global().pushModal(CreateAndSearchGroup({
                                    selectionButtonText: "Select query that will filter taggables"
                                }));
                                const secondSearchQuery = await Modals.Global().pushModal(CreateAndSearchGroup({
                                    selectionButtonText: `Select query that ${percentageOfSecondQueryComparatorState.get()}${percentageOfSecondQueryValueState.get()}% of filtered taggables must match`
                                }));
                                if (searchQuery === undefined || searchQuery.value.length === 0 || secondSearchQuery === undefined || secondSearchQuery.value.length === 0) {
                                    return;
                                }

                                conditionsState.get().push({
                                    type: "filtered-tag-occurrences-compared-to-n-percent-within-expression",
                                    comparator: percentageOfSecondQueryComparatorState.get(),
                                    percentage: percentageOfSecondQueryValueState.get() / 100,
                                    filteringExpression: searchQuery,
                                    expression: secondSearchQuery,
                                    displayName: `must have ${percentageOfSecondQueryComparatorState.get()}${percentageOfSecondQueryValueState.get()}% of taggables that match the query (${clientSearchQueryToDisplayName(searchQuery)}) also match the query (${clientSearchQueryToDisplayName(secondSearchQuery)})`
                                });
                                conditionsState.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                </div>
                <div style={{marginTop: 4, marginBottom: 4}}>
                    {CreateAggregateTagButton.react(<input type="button" value="Create Aggregate Tag" onClick={() => {
                        /** @type {ClientAggregateTag} */
                        const aggregateTag = {
                            type: "aggregateTag",
                            tagGroup: tagGroupState.get(),
                            conditions: conditionsState.get(),
                            displayName: `system:aggregate tag with group:${tagGroupState.get().displayName}${conditionsState.get().length !== 0 ? " WHERE " : ""}${conditionsState.get().map(condition => condition.displayName).join(" AND ")}`
                        }

                        delete aggregateTag.tagGroup['extraInfo'];
                        modalResolve(aggregateTag);
                        Modals.Global().popModal();
                    }}/>)}
                </div>
            </div>
        </div>,
        displayName: "Create Aggregate Tag",
        promiseValue
    };
};