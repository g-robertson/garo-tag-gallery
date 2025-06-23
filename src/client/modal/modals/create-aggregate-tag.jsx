import '../../global.css';
import { User } from '../js/user.js';
import TagGroupsSelector from '../../components/tag-groups-selector.jsx';
import { useState } from 'react';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {ClientAggregateTag, ClientTagGroup} from "../../../api/post/search-taggables.js" */

/** 
 * @param {{
 *  user: User
 *  modalOptions: ModalOptions
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * } param0}
*/
const CreateAggregateTag = ({user, modalOptions, pushModal, popModal}) => {
    /** @type {[ClientTagGroup[], (tagGroups: ClientTagGroup[]) => void]} */
    const [tagGroups, setTagGroups] = useState([]); 
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
                    <LazyTextObjectSelector textObjects={[]} elementsSelectable={false} />
                </div>
                <div style={{marginTop: 8, flexDirection: "column"}}>
                    <div>
                        Apply condition: Tag must not be within specified list of tags
                        <input disabled={tagGroups.length === 0} style={{marginLeft: 4, marginTop: -2}} type="button" value="Specify tags" onClick={() => {

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
                                conditions: []
                            }
                        }

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