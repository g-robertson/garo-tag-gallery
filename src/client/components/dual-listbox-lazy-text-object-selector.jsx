import { useEffect, useState } from 'react';
import '../global.css';

import LazyTextObjectSelector from './lazy-text-object-selector.jsx';

/**
 * @template T
 * @param {{
 *  items: T[]
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
    initialSelectedItemIndices,
    onSelectionChanged,
    customItemSelectedComponent,
    itemSelectorHeaderComponent,
    customItemSelectorComponent,
    customTitleRealizer
}) => {
    itemSelectorHeaderComponent ??= <></>;
    customTitleRealizer ??= () => "";
    onSelectionChanged ??= () => {};

    /** @type {[Set<number>, (selectedItemIndices: Set<number>) => void]} */
    const [selectedItemIndices, setSelectedItems] = useState(new Set(initialSelectedItemIndices ?? []));

    useEffect(() => {
        onSelectionChanged([...selectedItemIndices].map(index => items[index]));
    }, [selectedItemIndices]);

    return (
        <div style={{width: "100%", flexDirection: "column", margin: 4}}>
            Selected items:
            <div style={{flex: 1}}>
                <LazyTextObjectSelector
                    textObjects={[...selectedItemIndices]}
                    onValuesDoubleClicked={((indices) => {
                        for (const index of indices) {
                            selectedItemIndices.delete(index);
                        }
                        setSelectedItems(new Set(selectedItemIndices));
                    })}
                    customItemComponent={({realizedValue, index}) => customItemSelectedComponent({realizedValue: items[realizedValue], index})}
                    customTitleRealizer={customTitleRealizer}
                />
            </div>
            {itemSelectorHeaderComponent}
            <div style={{marginTop: 8, flex: 3}}>
                <LazyTextObjectSelector
                    textObjects={items}
                    onValuesDoubleClicked={(_, indices) => {
                        for (const index of indices) {
                            if (selectedItemIndices.has(index)) {
                                selectedItemIndices.delete(index);
                            } else {
                                selectedItemIndices.add(index);
                            }
                        }
                        setSelectedItems(new Set(selectedItemIndices));
                    }}
                    customItemComponent={customItemSelectorComponent}
                    customTitleRealizer={customTitleRealizer}
                />
            </div>
        </div>
    );
};

export default DualListboxLazyTextObjectSelector;