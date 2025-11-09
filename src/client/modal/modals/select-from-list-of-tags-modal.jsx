import { useState } from 'react';
import DualListboxLazyTextObjectSelector from '../../components/dual-listbox-lazy-text-object-selector.jsx';
import '../../global.css';

/** @import {Setters, States} from "../../App.jsx" */
/** @import {ModalOptions} from "../modal.jsx" */

/** 
 * @param {{
 *  setters: Setters
 *  modalOptions: ModalOptions
 * }}
*/
const SelectFromListOfTags = ({setters, modalOptions}) => {
    const [selectedTags, setSelectedTags] = useState([]);

    return (
        <div style={{width: "100%", height: "100%", flexDirection: "column"}}>
            Select from list of tags:
            <div style={{width: "100%", height: "100%"}}>
                <DualListboxLazyTextObjectSelector
                    items={modalOptions.extraProperties.tags}
                    customItemSelectorComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                    customItemSelectedComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                    onSelectionChanged={(items) => {
                        setSelectedTags(items);
                    }}
                />
            </div>
            <input style={{margin: 8}} type="button" value="Select tags" onClick={() => {
                modalOptions.resolve(selectedTags);
                setters.popModal();
            }} />
        </div>
    );
};

export default SelectFromListOfTags;

export const MODAL_PROPERTIES = {
    modalName: "select-list-of-tags",
    displayName: "Select list of tags"
};
export const SELECT_FROM_LIST_OF_TAGS_MODAL_PROPERTIES = MODAL_PROPERTIES;