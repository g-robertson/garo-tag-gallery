import getNamespaces from "../../api/client-get/namespaces.js";
import { User } from "../js/user.js";
import LazyTextObjectSelector from "./lazy-text-object-selector.jsx";
import MultiSelect from "./multi-select.jsx";
import { useEffect, useState } from "react";

/** @import {DBNamespace} from "../../db/tags.js" */
/** @import {DBLocalMetric} from "../../db/metrics.js" */
/** @import {ClientTagGroup} from "../../api/post/search-taggables.js" */

/**
 * @typedef {{
 *     extraInfo?: {
 *         localMetric?: DBLocalMetric
 *         namespace?: DBNamespace
 *     }
 * } & ClientTagGroup} DisplayClientTagGroup
 */

/**
 * @param {{
 *  user: User
 *  multiSelect?: boolean
 *  onTagGroupsSelected?: (tagGroups: DisplayClientTagGroup[]) => void
 * }} param0
 */
const TagGroupsSelector = ({user, multiSelect, onTagGroupsSelected}) => {
    multiSelect ??= true;
    onTagGroupsSelected ??= () => {};
    const NAMESPACES_SELECTED = 0;
    const METRIC_RATINGS_SELECTED = 1;
    const [tagGroupOptionsSelected, setTagGroupOptionsSelected] = useState(new Set([NAMESPACES_SELECTED, METRIC_RATINGS_SELECTED]));
    /** @type {[DBNamespace[], (namespaces: DBNamespace[]) => void]} */
    const [namespaces, setNamespaces] = useState([]);
    /** @type {DisplayClientTagGroup[]} */
    let tagGroups = [];
    if (tagGroupOptionsSelected.has(METRIC_RATINGS_SELECTED)) {
        tagGroups = tagGroups.concat(user.localMetricServices().map(localMetricService => localMetricService.Local_Metrics).flat().map(localMetric => ({
            type: "applied-metrics",
            displayName: `aggregate metric:${localMetric.Local_Metric_Name}`,
            Local_Metric_ID: localMetric.Local_Metric_ID,
            extraInfo: {
                localMetric
            }
        })));
    }
    if (tagGroupOptionsSelected.has(NAMESPACES_SELECTED)) {
        tagGroups = tagGroups.concat(namespaces.map(namespace => ({
            type: "namespace",
            displayName: `aggregate namespace:${namespace.Namespace_Name}`,
            namespaceID: namespace.Namespace_ID,
            extraInfo: {
                namespace
            }
        })));
    }
    /** @type {[string, (tagGroupFilterValue: string) => void]} */
    const [tagGroupFilterValue, setTagGroupFilterValue] = useState("");

    useEffect(() => {
        (async () => {
            setNamespaces(await getNamespaces());
        })();
    }, []);

    return (
        <div style={{flexDirection: "column", width: "100%"}}>
            <div>Tag groups to view:</div>
            <div>
                <MultiSelect options={[
                    {
                        value: NAMESPACES_SELECTED,
                        displayName: "Namespaces"
                    },
                    {
                        value: METRIC_RATINGS_SELECTED,
                        displayName: "Metric ratings"
                    }
                ]} defaultOptionsSelected={[...tagGroupOptionsSelected]} onOptionsChange={async (optionsSelected) => {
                    setTagGroupOptionsSelected(new Set(optionsSelected))
                }}/>
            </div>
            Select Tag Groups:
            <div>Tag group filter: <input type="text" value={tagGroupFilterValue} onChange={(e) => {
                setTagGroupFilterValue(e.currentTarget.value);
            }}/></div>
            
            <div style={{flex: 5}}>
                <LazyTextObjectSelector
                    textObjects={tagGroups.filter(tagGroup => tagGroup.displayName.toLowerCase().includes(tagGroupFilterValue.toLowerCase()))}
                    onValuesDoubleClicked={(valuesSelected) => {
                        onTagGroupsSelected(valuesSelected);
                    }}
                    customItemComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                    customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    multiSelect={multiSelect}
                />
            </div>
        </div>
    );
}

export default TagGroupsSelector;