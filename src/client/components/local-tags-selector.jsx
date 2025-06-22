import LazyTagSelector from "./lazy-tag-selector.jsx";
import MultiSelect from "./multi-select.jsx";
import { useState } from "react";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../js/tags.js";
import getTagsFromLocalTagServiceIDs from "../../api/client-get/tags-from-local-tag-services.js";

/** @import {ClientTag} from "../../api/client-get/tags-from-local-tag-services.js" */


const SYSTEM_TAGS = [];

/**
 * @param {{
 *  localTagServices: DBPermissionedLocalTagService[]
 *  multiSelect?: boolean
 *  excludeable?: boolean
 *  onTagsSelected?: (tags: ClientTag[], isExcludeOn: boolean) => void
 * }} param0
 */
const LocalTagsSelector = ({localTagServices, multiSelect, excludeable, onTagsSelected}) => {
    excludeable ??= true;
    multiSelect ??= true;
    onTagsSelected ??= () => {};
    /** @type {[ClientTag[], (tags: ClientTag[]) => void]} */
    const [tags, setTags] = useState([]);
    /** @type {[string, (tagFilterValue: string) => void]} */
    const [tagFilterValue, setTagFilterValue] = useState("");
    /** @type {[boolean, (isExcludeOn: boolean) => void]} */
    const [isExcludeOn, setIsExcludeOn] = useState(false);

    return (
        <div style={{flexDirection: "column", width: "100%"}}>
            <div>Tag services to view:</div>
            <div>
                <MultiSelect options={[
                    ...localTagServices.map(localTagService => ({
                        value: localTagService.Local_Tag_Service_ID.toString(),
                        displayName: localTagService.Service_Name
                    })),
                    {
                        value: SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID.toString(),
                        displayName: SYSTEM_LOCAL_TAG_SERVICE.Service_Name
                    }
                ]} onOptionsChange={async (optionsSelected) => {
                    setTags((await getTagsFromLocalTagServiceIDs(optionsSelected.map(option => Number(option)))).sort((a, b) => b.tagCount - a.tagCount));
                }}/>
            </div>
            Select Tags:
            <div>Tag filter: <input type="text" value={tagFilterValue} onChange={(e) => {
                setTagFilterValue(e.currentTarget.value);
            }}/></div>
            {excludeable
                ? <div>Exclude: <input type="checkbox" checked={isExcludeOn} onChange={() => {
                    setIsExcludeOn(!isExcludeOn);
                }}/></div>
                : <></>
            }
            
            <div style={{flex: 5}}>
                <LazyTagSelector
                    tags={
                        tags.filter(tag => {
                            const colonSplitTagFilter = tagFilterValue.split(':');
                            let tagNameMatchedPartsFrom = colonSplitTagFilter.length;
                            for (let i = 0; i < colonSplitTagFilter.length; ++i) {
                                if (tag.tagName.startsWith(colonSplitTagFilter.slice(i).join(':'))) {
                                    tagNameMatchedPartsFrom = i;
                                    break;
                                }
                            }

                            const namespaceParts = colonSplitTagFilter.slice(0, Math.min(colonSplitTagFilter.length - 1, tagNameMatchedPartsFrom));
                            for (const namespacePart of namespaceParts) {
                                if (tag.namespaces.indexOf(namespacePart) === -1) {
                                    return false;
                                }
                            }
                            if (tagNameMatchedPartsFrom === colonSplitTagFilter.length) {
                                let namespacePartialMatch = false;
                                for (const namespace of tag.namespaces) {
                                    if (namespace.startsWith(colonSplitTagFilter[colonSplitTagFilter.length - 1])) {
                                        namespacePartialMatch = true;
                                    }
                                }
                                if (!namespacePartialMatch) {
                                    return false;
                                }
                            }

                            return true;
                        })
                    }
                    onValuesDoubleClicked={(valuesSelected) => {
                        onTagsSelected(valuesSelected, isExcludeOn);
                    }}
                    customItemComponent={({realizedValue}) => <>{realizedValue.displayName}{realizedValue.tagCount !== undefined ? ` (${realizedValue.tagCount})` : ""}</>}
                    customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    multiSelect={multiSelect}
                />
            </div>
        </div>
    );
}

export default LocalTagsSelector;