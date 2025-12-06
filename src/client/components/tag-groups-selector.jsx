import getNamespaces from "../../api/client-get/namespaces.js";
import { executeFunctions } from "../js/client-util.js";
import { User } from "../js/user.js";
import { State } from "../page/pages.js";
import LazyTextObjectSelector from "./lazy-text-object-selector.jsx";
import MultiSelect from "./multi-select.jsx";

/** @import {DBNamespace} from "../../db/tags.js" */
/** @import {DBLocalMetric} from "../../db/metrics.js" */
/** @import {ClientTagGroup} from "../../api/post/search-taggables.js" */
/** @import {State} from "../page/pages.js" */

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
 *  multiSelect?: boolean
 *  onTagGroupsSelected?: (tagGroups: DisplayClientTagGroup[]) => void
 * }} param0
 */
const TagGroupsSelector = ({multiSelect, onTagGroupsSelected}) => {
    /** @type {(() => {})[]} */
    const addToCleanup = [];
    multiSelect ??= true;
    onTagGroupsSelected ??= () => {};
    const NAMESPACES_SELECTED = 0;
    const METRIC_RATINGS_SELECTED = 1;
    const selectedTagGroupOptionsRef = new State(new Set([NAMESPACES_SELECTED, METRIC_RATINGS_SELECTED]));
    /** @type {State<DBNamespace[]>} */
    const namespacesRef = new State([]);
    const tagGroupsConstState = State.tupleTransform([selectedTagGroupOptionsRef, namespacesRef], () => {
        const selectedTagGroupOptions = selectedTagGroupOptionsRef.get();
        /** @type {DisplayClientTagGroup[]} */
        let tagGroups = [];
        if (selectedTagGroupOptions.has(METRIC_RATINGS_SELECTED)) {
            tagGroups = tagGroups.concat(User.Global().localMetricServices().map(localMetricService => localMetricService.Local_Metrics).flat().map(localMetric => ({
                type: "applied-metrics",
                displayName: `aggregate metric:${localMetric.Local_Metric_Name}`,
                Local_Metric_ID: localMetric.Local_Metric_ID,
                extraInfo: {
                    localMetric
                }
            })));
        }
        if (selectedTagGroupOptions.has(NAMESPACES_SELECTED)) {
            tagGroups = tagGroups.concat(namespacesRef.get().map(namespace => ({
                type: "namespace",
                displayName: `aggregate namespace:${namespace.Namespace_Name}`,
                namespaceID: namespace.Namespace_ID,
                extraInfo: {
                    namespace
                }
            })));
        }

        return tagGroups;
    }, addToCleanup);

    const onAdd = () => {
        return () => executeFunctions(addToCleanup);
    }

    getNamespaces().then(namespaces => namespacesRef.set(namespaces));

    return (
        <div onAdd={onAdd} style={{flexDirection: "column", width: "100%"}}>
            <div>Tag groups to view:</div>
            <div>
                <MultiSelect optionsConstState={ConstState.instance([
                    {
                        value: NAMESPACES_SELECTED,
                        displayName: "Namespaces"
                    },
                    {
                        value: METRIC_RATINGS_SELECTED,
                        displayName: "Metric ratings"
                    }
                ])} selectedOptionsRef={selectedTagGroupOptionsRef} />
            </div>
            Select Tag Groups:
            <div>Tag group filter (unimpl): <input type="text" /></div>
            
            <div style={{flex: 5}}>
                {<LazyTextObjectSelector
                    textObjectsConstState={tagGroupsConstState}
                    onValuesDoubleClicked={(valuesSelected) => {
                        onTagGroupsSelected(valuesSelected);
                    }}
                    customItemComponent={({realizedValue}) => <>{realizedValue.displayName}</>}
                    customTitleRealizer={(realizedValue) => realizedValue.displayName}
                    multiSelect={multiSelect}
                />}
            </div>
        </div>
    );
}

export default TagGroupsSelector;