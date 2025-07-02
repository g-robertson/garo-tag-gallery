import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import { useState } from 'react';

/** @import {User} from "../../js/user.js" */
/** @import {ClientTag} from "../../../api/client-get/tags-from-local-tag-services.js" */

/** 
 * @param {{
 *  user: User
 *  pushModal: (modalName: string, extraProperties: any) => Promise<any>
 *  popModal: () => void
 * }}
*/
const ChangeTagToMetric = ({user, pushModal, popModal}) => {
    /** @type {[null | ClientTag, (tag: null | ClientTag) => void]} */
    const [tag, setTag] = useState(null);
    const tags = tag === null ? [] : [tag];
    const [successMessage, setSuccessMessage] = useState("");

    return (
        <div style={{width: "100%", flexDirection: "column"}}>
            <div style={{flex: 4, margin: 8}}>
                <LocalTagsSelector
                    localTagServices={user.localTagServices()}
                    multiSelect={false}
                    excludeable={false}
                    pushModal={pushModal}
                    allowSystemTags={false}
                    onTagsSelected={(tags) => {
                        setTag(tags[0]);
                    }}
                />
            </div>
            <div style={{marginLeft: 8}}>
                Select a tag from above: <div style={{height: 20, flexGrow: 100}}><LazyTextObjectSelector textObjects={tags} elementsSelectable={false} scrollbarWidth={0} /></div>
            </div>
            <form style={{flex: 5}} action="/api/post/change-tag-to-metric" target="frame" method="POST">
                <LocalMetricSelector user={user} />
                <input name="localTagID" style={{display: "none"}} value={tag !== null ? tag.localTagID : ""} />
                <div style={{marginLeft: "8px"}}>
                    Select what metric value you wish for this tag to be applied as: <input id="metricValue" name="metricValue" type="text" />
                </div>
                <div style={{marginLeft: "8px"}}>
                    Remove existing tag?: <input name="removeExistingTag" type="checkbox" />
                </div>
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
                <OnFormSubmit onFormSubmit={() => {
                    setSuccessMessage(`Successfully set tag ${tag.displayName} to metric value ${document.getElementById("metricValue").value}`);
                }}/>
                <div style={{color: "green"}}>
                    {successMessage}
                </div>
            </form>
        </div>
    );
};

export default ChangeTagToMetric;

export const MODAL_PROPERTIES = {
    modalName: "change-tag-to-metric",
    displayName: "Change Tag to Metric"
};
export const CHANGE_TAG_TO_METRIC_MODAL_PROPERTIES = MODAL_PROPERTIES;