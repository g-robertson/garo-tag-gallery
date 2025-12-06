import '../../global.css';
import { OnFormSubmit } from '../../components/on-form-submit.jsx';
import LocalMetricSelector from '../../components/local-metric-selector.jsx';
import LocalTagsSelector from '../../components/local-tags-selector.jsx';
import LazyTextObjectSelector from '../../components/lazy-text-object-selector.jsx';
import { User } from '../../js/user.js';
import { State } from '../../page/pages.js';
import { executeFunctions, ReferenceableReact } from '../../js/client-util.js';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {State} from "../../page/pages.js" */
/** @import {ClientQueryTag} from "../../../api/client-get/tags-from-local-tag-services.js" */

/** 
 * @param {{
 *  extraProperties: ExtraProperties<any>
 *  modalResolve: (value: any) => void
 * }}
*/
export default function ChangeTagToMetricModal({ extraProperties, modalResolve }) {
    /** @type {(() => void)[]} */
    const addToCleanup = [];

    const SuccessMessage = ReferenceableReact();
    const MetricValue = ReferenceableReact();
    const TagLookupName = ReferenceableReact();
    const LocalTagServiceIDs = ReferenceableReact();

    const localTagServicesConstState = User.Global().localTagServicesRef();
    const selectedLocalTagServiceIDsState = new State(new Set(localTagServicesConstState.get().map(localTagService => localTagService.Local_Tag_Service_ID)));
    /** @type {State<ClientQueryTag>} */
    const tagRef = new State(undefined);

    const onAdd = () => {
        const onTagSelected = () => {
            const tag = tagRef.get();

            if (tag !== undefined) {
                TagLookupName.dom.value = tag.Lookup_Name;
            }
        }

        const onSelectedLocalTagServiceIDsChange = () => {
            LocalTagServiceIDs.dom.replaceChildren(...[...selectedLocalTagServiceIDsState.get()].map(localTagServiceID => (
                <option dom value={localTagServiceID} selected={true}></option>
            )));
        };
        onSelectedLocalTagServiceIDsChange();

        tagRef.addOnUpdateCallback(onTagSelected, addToCleanup);
        selectedLocalTagServiceIDsState.addOnUpdateCallback(onSelectedLocalTagServiceIDsChange, addToCleanup);
        return () => executeFunctions(addToCleanup);
    }

    return {
        component: <div className="change-tag-to-metric-modal" style={{width: "100%", flexDirection: "column"}} onAdd={onAdd}>
            <div style={{flex: "4 1 100%", margin: 8}}>
                <LocalTagsSelector
                    localTagServicesConstState={localTagServicesConstState}
                    selectedLocalTagServiceIDsState={selectedLocalTagServiceIDsState}
                    multiSelect={false}
                    excludeable={false}
                    onTagsSelected={(tags) => {
                        tagRef.set(tags[0]);
                    }}
                />
            </div>
            <div style={{marginLeft: 8}}>
                Select a tag from above:
                <div style={{height: 20, flexGrow: 100}}>
                    <LazyTextObjectSelector textObjectsConstState={tagRef.asTransform(tag => (tag !== null ? [tag] : []), addToCleanup)} elementsSelectable={false} scrollbarWidth={0} />
                </div>
            </div>
            <form style={{flex: 5}} action="/api/post/change-tag-to-metric" target="frame" method="POST">
                <LocalMetricSelector />
                {LocalTagServiceIDs.react(<select multiple name="localTagServiceIDs[]" style={{display: "none"}}></select>)}
                {TagLookupName.react(<input name="tagLookupName" style={{display: "none"}} />)}
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
                    SuccessMessage.dom.textContent = `Successfully set tag ${tagRef.get().displayName} to metric value ${MetricValue.dom.value}`;
                }}/>
                {SuccessMessage.react(<div style={{color: "green"}}></div>)}
            </form>
        </div>,
        displayName: "Change Tag to Metric"
    };
};