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
import { State } from '../../js/state.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';

/**
 * @import {State} from "../../js/state.js"
 * @import {ClientComparator} from "../../../api/zod-types.js"
 * @import {ClientConditionalExpressionListUnion, ExpressionListCondition, ClientSearchTag} from "../../../api/post/search-taggables.js"
 * @import {DisplayClientExpressionList} from "../../components/tag-groups-selector.jsx"
 **/

export default function CreateConditionalExpressionListUnionType() {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    let modalResolve;
    /** @type {Promise<T>} */
    const promiseValue = new Promise(resolve => { modalResolve = resolve; });

    const SpecifyTagGroupTags = ReferenceableReact();
    const TagOccurrencesCountSpecifyQuery = ReferenceableReact();
    const TagOccurrencesPercentageSpecifyQuery = ReferenceableReact();
    const TagOccurrencesPercentageSpecifyQueries = ReferenceableReact();
    const CreateConditionalExpressionListUnionTypeButton = ReferenceableReact();

    /** @type {State<DisplayClientExpressionList | undefined} */
    const expressionListState = new State(undefined);
    /** @type {State<ExpressionListCondition[]} */
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
            SpecifyTagGroupTags.dom.disabled = expressionListState.get() === undefined;
            TagOccurrencesCountSpecifyQuery.dom.disabled = expressionListState.get() === undefined;
            TagOccurrencesPercentageSpecifyQuery.dom.disabled = expressionListState.get() === undefined;
            TagOccurrencesPercentageSpecifyQueries.dom.disabled = expressionListState.get() === undefined;
            CreateConditionalExpressionListUnionTypeButton.dom.disabled = expressionListState.get() === undefined;
        };
        onTagGroupChanged();

        expressionListState.addOnUpdateCallback(onTagGroupChanged, addToCleanup);
        return () => executeFunctions(addToCleanup);
    }

    return {
        component: <div style={{width: "100%", height: "100%", flexDirection: "column"}} onAdd={onAdd}>
            An conditional expression list union selects from a union of all of the expressions in a certain selected expression list that meets a specified condition
            <div style={{flex: 4}}>
                <TagGroupsSelector
                    multiSelect={false}
                    onTagGroupsSelected={(expressionLists) => {
                        expressionListState.set(expressionLists[0]);
                    }} />
            </div>
            <div style={{marginLeft: 8, marginTop: 4}}>
                Select a tag group from above: <div style={{height: 20, flexGrow: 100}}><LazyTextObjectSelector textObjectsConstState={expressionListState.asTransform(expressionList => [expressionList], addToCleanup)} elementsSelectable={false} scrollbarWidth={0} /></div>
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
                            const expressionList = expressionListState.get();
                            /** @type {ClientSearchTag[]} */
                            let tags = [];
                            if (expressionList.type === "applied-metrics") {
                                const localMetric = expressionList.extraInfo.localMetric;
                                if (localMetric.Local_Metric_Lower_Bound === -Infinity || localMetric.Local_Metric_Upper_Bound === Infinity) {
                                    throw "Have not yet implemented applied metric exact selection for unbounded metrics";
                                } else {
                                    const step = Math.pow(10, localMetric.Local_Metric_Precision);
                                    for (let i = localMetric.Local_Metric_Lower_Bound; i <= localMetric.Local_Metric_Upper_Bound; i += step) {
                                        tags.push({
                                            type: "localMetricComparison",
                                            Local_Metric_ID: localMetric.Local_Metric_ID,
                                            comparator: "=",
                                            localMetricComparison: i,
                                            displayName: createAppliedMetricDisplayName(localMetric.Local_Metric_Name, User.Global().name(), i)
                                        });
                                    }
                                }
                            } else if (expressionList.type === "namespace") {
                                const tagsFromNamespaces = await getTagsFromNamespaceID(expressionList.namespaceID);
                                for (const expressionList of tagsFromNamespaces) {
                                    tags.push({
                                        type: "tagByLookup",
                                        Lookup_Name: expressionList.tagName,
                                        displayName: expressionList.displayName
                                    });
                                }
                            }
                            
                            const notInCompareList = await Modals.Global().pushModal(SelectFromListOfTags({tags}));
                            if (notInCompareList === null || notInCompareList === undefined) {
                                return;
                            }

                            conditionsState.get().push({
                                type: "is-not-in-compare-list",
                                compareList: notInCompareList,
                                displayName: `is not in list:${notInCompareList.map(tag => tag.displayName).join(' OR ')}`
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
                                    type: "expression-occurrences-compared-to-n-within-compare-expression",
                                    comparator: countComparatorState.get(),
                                    occurrences: countValueState.get(),
                                    compareExpression: searchQuery,
                                    displayName: `must have ${countComparatorState.get()}${countValueState.get()} taggables${searchQuery.expressions.length !== 0 ? ` match the query (${clientSearchQueryToDisplayName(searchQuery)})`: ""}`
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

                                if (searchQuery === undefined || searchQuery.expressions.length === 0) {
                                    return;
                                }

                                conditionsState.get().push({
                                    type: "expression-occurrences-compared-to-n-percent-within-compare-expression",
                                    comparator: percentageComparatorState.get(),
                                    percentage: percentageValueState.get() / 100,
                                    compareExpression: searchQuery,
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
                                if (searchQuery === undefined || searchQuery.expressions.length === 0 || secondSearchQuery === undefined || secondSearchQuery.expressions.length === 0) {
                                    return;
                                }

                                conditionsState.get().push({
                                    type: "filtered-expression-occurrences-compared-to-n-percent-within-compare-expression",
                                    comparator: percentageOfSecondQueryComparatorState.get(),
                                    percentage: percentageOfSecondQueryValueState.get() / 100,
                                    filteringExpression: searchQuery,
                                    compareExpression: secondSearchQuery,
                                    displayName: `must have ${percentageOfSecondQueryComparatorState.get()}${percentageOfSecondQueryValueState.get()}% of taggables that match the query (${clientSearchQueryToDisplayName(searchQuery)}) also match the query (${clientSearchQueryToDisplayName(secondSearchQuery)})`
                                });
                                conditionsState.forceUpdate();
                            }} />)}
                        </div>
                    </div>
                </div>
                <div style={{marginTop: 4, marginBottom: 4}}>
                    {CreateConditionalExpressionListUnionTypeButton.react(<input type="button" value="Create Conditional List Expression Union" onClick={() => {
                        /** @type {ClientConditionalExpressionListUnion} */
                        const conditionalExpressionListUnion = {
                            type: "conditional-expression-list-union",
                            expressionList: expressionListState.get(),
                            conditions: conditionsState.get(),
                            displayName: `system:conditional ${expressionListState.get().displayName} union${conditionsState.get().length !== 0 ? " WHERE " : ""}${conditionsState.get().map(condition => condition.displayName).join(" AND ")}`                        }

                        delete conditionalExpressionListUnion.expressionList['extraInfo'];
                        modalResolve(conditionalExpressionListUnion);
                        Modals.Global().popModal();
                    }}/>)}
                </div>
            </div>
        </div>,
        displayName: "Create Conditional List Expression Union",
        promiseValue
    };
};