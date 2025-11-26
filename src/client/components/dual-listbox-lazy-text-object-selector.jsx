import { ExistingState } from '../page/pages.js';
import '../global.css';

import LazyTextObjectSelector from './lazy-text-object-selector.jsx';


/** @import {ExistingStateRef} from '../page/pages.js' */

/**
 * @template T
 * @param {{
 *  items: T[]
 *  selectedItemsRef: ExistingStateRef<Set<T>>
 *  initialSelectedItemIndices?: number[]
 *  onSelectionChanged?: (selectedItems: T) => void
 *  customItemSelectedComponent: (param0: {realizedValue: T, index: number}) => JSX.Element
 *  itemSelectorHeaderComponent?: JSX.Element
 *  customItemSelectorComponent: (param0: {realizedValue: T, index: number}) => JSX.Element
 *  customTitleRealizer?: (value: T) => string
 * }} param0
 */
const DualListboxLazyTextObjectSelector = ({
    items,
    selectedItemsRef,
    customItemSelectedComponent,
    itemSelectorHeaderComponent,
    customItemSelectorComponent,
    customTitleRealizer
}) => {
    itemSelectorHeaderComponent ??= <></>;
    customTitleRealizer ??= () => "";

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}}>
            Selected items:
            <div style={{flex: 1}}>
                {<LazyTextObjectSelector
                    textObjectsConstRef={selectedItemsRef}
                    onValuesDoubleClicked={((items) => {
                        const selectedItems = selectedItemsRef.get();
                        for (const item of items) {
                            selectedItems.delete(item);
                        }
                        selectedItemsRef.forceUpdate();
                    })}
                    multiSelect={true}
                    customItemComponent={({realizedValue, index}) => customItemSelectedComponent({realizedValue: items[realizedValue], index})}
                    customTitleRealizer={customTitleRealizer}
                />}
            </div>
            {itemSelectorHeaderComponent}
            <div style={{marginTop: 8, flex: 3}}>
                {<LazyTextObjectSelector
                    textObjectsConstRef={ExistingState.stateRef(items)}
                    onValuesDoubleClicked={(items) => {
                        const selectedItems = selectedItemsRef.get();
                        for (const item of items) {
                            if (selectedItems.has(item)) {
                                selectedItems.delete(item);
                            } else {
                                selectedItems.add(item);
                            }
                        }
                        selectedItemsRef.forceUpdate();
                    }}
                    multiSelect={true}
                    customItemComponent={customItemSelectorComponent}
                    customTitleRealizer={customTitleRealizer}
                />}
            </div>
        </div>
    );
};

export default DualListboxLazyTextObjectSelector;