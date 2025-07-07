import '../../global.css';
import TagGroupsSelector from '../../components/tag-groups-selector.jsx';
import { useState } from 'react';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import { SELECT_FROM_LIST_OF_TAGS_MODAL_PROPERTIES } from "./select-from-list-of-tags-modal.jsx"
import { createAppliedMetricDisplayName } from '../../js/metrics.js';
import getTagsFromNamespaceID from '../../../api/client-get/tags-from-namespace.js';
import { CREATE_AND_SEARCH_GROUP_MODAL_PROPERTIES } from './create-and-search-group.jsx';
import NumericInput from '../../components/numeric-input.jsx';
import { clientSearchQueryToDisplayName } from '../../js/tags.js';

/** @import {User} from "../../js/user.js" */
/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientAggregateTag, ClientAggregateTagCondition, ClientComparator, ClientSearchTag} from "../../../api/post/search-taggables.js" */
/** @import {DisplayClientTagGroup} from "../../components/tag-groups-selector.jsx" */

/** 
 * @param {{
 *  user: User
 *  modalOptions: ModalOptions
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * } param0}
*/
const CreateAggregateTag = ({user, modalOptions, pushModal, popModal}) => {
    /** @type {[DisplayClientTagGroup[], (tagGroups: DisplayClientTagGroup[]) => void]} */
    const [tagGroups, setTagGroups] = useState([]); 
    /** @type {[ClientAggregateTagCondition[], (conditions: ClientAggregateTagCondition[]) => void]} */
    const [conditions, setConditions] = useState([]);

    /** @type {[ClientComparator, (countComparator: ClientComparator) => void]} */
    const [countComparator, setCountComparator] = useState("<");
    const [countValue, setCountValue] = useState(0);
    /** @type {[ClientComparator, (percentageComparator: ClientComparator) => void]} */
    const [percentageComparator, setPercentageComparator] = useState("<");
    const [percentageValue, setPercentageValue] = useState(0);
    /** @type {[ClientComparator, (percentageOfSecondQueryComparator: ClientComparator) => void]} */
    const [percentageOfSecondQueryComparator, setPercentageOfSecondQueryComparator] = useState("<");
    const [percentageOfSecondQueryValue, setPercentageOfSecondQueryValue] = useState(0);
    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            An aggregate tag selects from a union of all of the tags in a certain selected group that meets a specified condition
            <div style={{flex: 4}}>
                <TagGroupsSelector
                    user={user}
                    multiSelect={false}
                    onTagGroupsSelected={(tagGroups) => {
                        setTagGroups(tagGroups)
                    }} />
            </div>
            <div style={{marginLeft: 8, marginTop: 4}}>
                Select a tag group from above: <div style={{height: 20, flexGrow: 100}}><LazyTextObjectSelector textObjects={tagGroups} elementsSelectable={false} scrollbarWidth={0} /></div>
            </div>
            <div style={{marginLeft: 8, flexDirection: "column"}}>
                <div style={{marginTop: 4}}>Where the tags within the group must follow any selected conditions below</div>
                <div style={{marginTop: 4}}>Conditions selected:</div>
                <div style={{height: 100, marginTop: 4}}>
                    <LazyTextObjectSelector textObjects={conditions} multiSelect={false} onValuesDoubleClicked={(_, indicesSelected) => {
                        conditions.splice(indicesSelected[0], 1);

                        setConditions([...conditions]);
                    }} />
                </div>
                <div style={{marginTop: 8, flexDirection: "column"}}>
                    <div>
                        Apply condition: Tag must not be within specified list of tags
                        <input disabled={tagGroups.length === 0} style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify tags" onClick={async () => {
                            const tagGroup = tagGroups[0];
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
                                            displayName: createAppliedMetricDisplayName(localMetric.Local_Metric_Name, user.name(), i)
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
                            
                            const notInTagList = await pushModal(SELECT_FROM_LIST_OF_TAGS_MODAL_PROPERTIES.modalName, {
                                tags
                            });
                            if (notInTagList === null || notInTagList === undefined) {
                                return;
                            }

                            conditions.push({
                                type: "is-not-in-tag-list",
                                list: notInTagList,
                                displayName: `is not in tags:${notInTagList.map(tag => tag.displayName).join(' OR ')}`
                            });
                            setConditions([...conditions]);
                        }}/>
                    </div>
                    <div style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [count] taggables that match a specified query (can be empty)</div>
                        <div style={{marginTop: 8}}>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => setCountComparator("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => setCountComparator("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => setCountComparator(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="countComparator" type="radio" onClick={() => setCountComparator(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Count: <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    defaultValue={0}
                                    onChange={(num) => {
                                        setCountValue(num);
                                    }}
                                />
                            </div></div>
                            <input disabled={tagGroups.length === 0} style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify query" onClick={async () => {
                                const searchQuery = await pushModal(CREATE_AND_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {
                                    selectionButtonText: `Select query that ${countComparator}${countValue} taggables must match`
                                });

                                if (searchQuery === undefined) {
                                    return;
                                }

                                conditions.push({
                                    type: "tag-occurrences-compared-to-n-within-expression",
                                    comparator: countComparator,
                                    occurrences: countValue,
                                    expression: searchQuery,
                                    displayName: `must have ${countComparator}${countValue} taggables${searchQuery.value.length !== 0 ? ` match the query (${clientSearchQueryToDisplayName(searchQuery)})`: ""}`
                                });
                                setConditions([...conditions]);
                            }} />
                        </div>
                    </div>
                    <div style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [percentage] taggables match a specified query</div>
                        <div style={{marginTop: 8}}>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => setPercentageComparator("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => setPercentageComparator("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => setPercentageComparator(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="percentageComparator" type="radio" onClick={() => setPercentageComparator(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Percentage (0-100%): <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    defaultValue={0}
                                    onChange={(num) => {
                                        setPercentageValue(num);
                                    }}
                                    minValue={0}
                                    maxValue={100}
                                />
                            </div></div>
                            <input disabled={tagGroups.length === 0} style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify query" onClick={async () => {
                                const searchQuery = await pushModal(CREATE_AND_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {
                                    selectionButtonText: `Select query that ${percentageComparator}${percentageValue}% of taggables must match`
                                });
                                if (searchQuery === undefined || searchQuery.value.length === 0) {
                                    return;
                                }

                                conditions.push({
                                    type: "tag-occurrences-compared-to-n-percent-within-expression",
                                    comparator: percentageComparator,
                                    percentage: percentageValue / 100,
                                    expression: searchQuery,
                                    displayName: `must have ${percentageComparator}${percentageValue}% of taggables match the query (${clientSearchQueryToDisplayName(searchQuery)})`
                                });
                                setConditions([...conditions]);
                            }} />
                        </div>
                    </div>
                    <div style={{flexDirection: "column", marginTop: 4}}>
                        <div>Apply condition: Tag must have [more/less] than [percentage] of taggables that match a specified query match a second specified query</div>
                        <div style={{marginTop: 8}}>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => setPercentageOfSecondQueryComparator("<")} defaultChecked={true} />&lt;</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => setPercentageOfSecondQueryComparator("<=")} />&lt;=</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => setPercentageOfSecondQueryComparator(">")} />&gt;</div>
                            <div><input style={{marginTop: -2}} name="percentageOfSecondQueryComparator" type="radio" onClick={() => setPercentageOfSecondQueryComparator(">=")} />&gt;=</div>
                            <div style={{marginLeft: 8}}>Percentage (0-100%): <div style={{marginTop: -2, marginLeft: 4}}>
                                <NumericInput
                                    defaultValue={0}
                                    onChange={(num) => {
                                        setPercentageOfSecondQueryValue(num);
                                    }}
                                    minValue={0}
                                    maxValue={100}
                                />
                            </div></div>
                            <input disabled={tagGroups.length === 0} style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify queries" onClick={async () => {
                                const searchQuery = await pushModal(CREATE_AND_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {
                                    selectionButtonText: "Select query that will filter taggables"
                                });
                                const secondSearchQuery = await pushModal(CREATE_AND_SEARCH_GROUP_MODAL_PROPERTIES.modalName, {
                                    selectionButtonText: `Select query that ${percentageOfSecondQueryComparator}${percentageOfSecondQueryValue}% of filtered taggables must match`
                                });
                                if (searchQuery === undefined || searchQuery.value.length === 0 || secondSearchQuery === undefined || secondSearchQuery.value.length === 0) {
                                    return;
                                }

                                conditions.push({
                                    type: "filtered-tag-occurrences-compared-to-n-percent-within-expression",
                                    comparator: percentageOfSecondQueryComparator,
                                    percentage: percentageOfSecondQueryValue / 100,
                                    filteringExpression: searchQuery,
                                    expression: secondSearchQuery,
                                    displayName: `must have ${percentageOfSecondQueryComparator}${percentageOfSecondQueryValue}% of taggables that match the query (${clientSearchQueryToDisplayName(searchQuery)}) also match the query (${clientSearchQueryToDisplayName(secondSearchQuery)})`
                                });
                                setConditions([...conditions]);
                            }} />
                        </div>
                    </div>
                </div>
                <div style={{marginTop: 4, marginBottom: 4}}>
                    <input disabled={tagGroups.length === 0} type="button" value="Create Aggregate Tag" onClick={() => {
                        /** @type {ClientAggregateTag} */
                        const aggregateTag = {
                            type: "aggregateTag",
                            tagGroup: tagGroups[0],
                            conditions,
                            displayName: `system:aggregate tag with group:${tagGroups[0].displayName}${conditions.length !== 0 ? " WHERE " : ""}${conditions.map(condition => condition.displayName).join(" AND ")}`
                        }

                        delete aggregateTag.tagGroup['extraInfo'];
                        modalOptions.resolve(aggregateTag);
                        popModal();
                    }}/>
                </div>
            </div>
        </div>
    );
};

export default CreateAggregateTag;

export const MODAL_PROPERTIES = {
    modalName: "create-aggregate-tag",
    displayName: "Create Aggregate Tag"
};
export const CREATE_AGGREGATE_TAG_MODAL_PROPERTIES = MODAL_PROPERTIES;