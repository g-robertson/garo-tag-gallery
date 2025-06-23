import '../../global.css';
import TagGroupsSelector from '../../components/tag-groups-selector.jsx';
import { useState } from 'react';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import { MODAL_PROPERTIES as SELECT_FROM_LIST_OF_TAGS_MODAL_PROPERTIES } from "./select-from-list-of-tags-modal.jsx"
import { SYSTEM_LOCAL_TAG_SERVICE } from '../../js/tags.js';
import { createAppliedMetricDisplayName, createAppliedMetricLookupName } from '../../js/metrics.js';
import getTagsFromNamespaceID from '../../../api/client-get/tags-from-namespace.js';

/** @import {User} from "../../js/user.js" */
/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientAggregateTag, ClientAggregateTagCondition, ClientSearchTag} from "../../../api/post/search-taggables.js" */
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
                    <LazyTextObjectSelector textObjects={conditions} elementsSelectable={false} />
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
                                            type: "tagByLookup",
                                            lookupName: createAppliedMetricLookupName(localMetric.Local_Metric_ID, user.id(), i),
                                            displayName: createAppliedMetricDisplayName(localMetric.Local_Metric_Name, user.name(), i),
                                            sourceName: "System generated",
                                            localTagServiceID: SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID
                                        })
                                    }
                                }
                            } else if (tagGroup.type === "namespace") {
                                const tagsFromNamespaces = await getTagsFromNamespaceID(tagGroup.namespaceID);
                                for (const tag of tagsFromNamespaces) {
                                    tags.push({
                                        type: "tagByLocalTagID",
                                        localTagID: tag.localTagID,
                                        displayName: tag.displayName
                                    });
                                }
                            }
                            
                            const notInTagList = await pushModal(SELECT_FROM_LIST_OF_TAGS_MODAL_PROPERTIES.modalName, {
                                tags
                            });
                            conditions.push({
                                type: "is-not-in-tag-list",
                                value: notInTagList,
                                displayName: `is not in tags:${notInTagList.map(tag => tag.displayName).join(' OR ')}`
                            });
                            setConditions([...conditions]);
                        }}/>
                    </div>
                </div>
                <div style={{marginTop: 4, marginBottom: 4}}>
                    <input disabled={tagGroups.length === 0} type="button" value="Create Aggregate Tag" onClick={() => {
                        /** @type {ClientAggregateTag} */
                        const aggregateTag = {
                            type: "aggregateTag",
                            value: {
                                tagGroup: tagGroups[0],
                                conditions
                            },
                            displayName: `system:aggregate tag with group:${tagGroups[0].displayName} WHERE ${conditions.map(condition => condition.displayName).join(" AND ")}`
                        }

                        console.log(aggregateTag);
                        delete aggregateTag.value.tagGroup['extraInfo'];
                        modalOptions.resolve([aggregateTag]);
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