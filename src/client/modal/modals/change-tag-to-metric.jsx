import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import { User } from '../../js/user.js';
import { ExistingState } from '../../page/pages.js';
import { ReferenceableReact } from '../../js/client-util.js';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {ExistingStateRef} from "../../page/pages.js" */
/** @import {ClientQueryTag} from "../../../api/client-get/tags-from-local-tag-services.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function ChangeTagToMetricModal({ extraProperties, modalResolve }) {
    const SuccessMessage = ReferenceableReact();
    const MetricValue = ReferenceableReact();
    const LocalTagID = ReferenceableReact();

    const localTagServicesConstRef = User.Global().localTagServicesRef();
    const selectedLocalTagServiceIDsRef = ExistingState.stateRef(new Set(localTagServicesConstRef.get().map(localTagService => localTagService.Local_Tag_Service_ID)));
    /** @type {ExistingStateRef<ClientQueryTag>} */
    const tagRef = ExistingState.stateRef(null);

    const onAdd = () => {
        const onTagSelected = () => {
            const tag = tagRef.get();
            console.log(tag);
            throw "Bugged implementation, expecting LocalTagID but only have tagByLookup accessible";
            if (tag !== null) {
                LocalTagID.dom.value = tag;
            }
        }

        let cleanup = () => {};
        cleanup = tagRef.addOnUpdateCallback(onTagSelected, cleanup);
        return cleanup;
    }

    return {
        component: <div style={{width: "100%", flexDirection: "column"}} onAdd={onAdd}>
            <div style={{flex: "4 1 100%", margin: 8}}>
                <LocalTagsSelector
                    localTagServicesConstRef={localTagServicesConstRef}
                    selectedLocalTagServiceIDsRef={selectedLocalTagServiceIDsRef}
                    multiSelect={false}
                    excludeable={false}
                    onTagsSelected={(tags) => {
                        tagRef.update(tags[0]);
                    }}
                />
            </div>
            <div style={{marginLeft: 8}}>
                Select a tag from above:
                <div style={{height: 20, flexGrow: 100}}>
                    <LazyTextObjectSelector textObjectsConstRef={tagRef.getTransformRef(tag => (tag !== null ? [tag] : []))} elementsSelectable={false} scrollbarWidth={0} />
                </div>
            </div>
            <form style={{flex: 5}} action="/api/post/change-tag-to-metric" target="frame" method="POST">
                <LocalMetricSelector />
                {LocalTagID.react(<input name="localTagID" style={{display: "none"}} />)}
                <div style={{marginLeft: "8px"}}>
                    Select what metric value you wish for this tag to be applied as:
                    {MetricValue.react(<input name="metricValue" type="text" />)}
                </div>
                <div style={{marginLeft: "8px"}}>
                    Remove existing tag?: <input name="removeExistingTag" type="checkbox" />
                </div>
                <div style={{marginLeft: "8px"}}>
                    <input type="submit" value="Submit" />
                </div>
                <OnFormSubmit onFormSubmit={() => {
                    SuccessMessage.dom.textContent = `Successfully set tag ${tag.displayName} to metric value ${MetricValue.dom.value}`;
                }}/>
                {SuccessMessage.react(<div style={{color: "green"}}></div>)}
            </form>
        </div>,
        displayName: "Change Tag to Metric"
    };
};