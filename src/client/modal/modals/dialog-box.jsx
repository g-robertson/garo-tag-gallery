import '../../global.css';
import { Modals } from '../../modal/modals.js';

/** @import {ExtraProperties} from "../modals.js" */
/** @import {Modal} from "../modals.js" */

/**
 * @template T
 * @typedef {Object} OptionButton
 * @property {T} value
 * @property {string} text
 */

/** 
 * @template T
 * @param {{
 *  extraProperties: ExtraProperties<{
 *      promptText: string
 *      optionButtons: OptionButton<T>[]
 *  }>
 *  modalResolve: (value: T) => void
 * }} param0
*/
export default function DialogBox({ extraProperties, modalResolve }) {
    return {
        component: (
            <div style={{flexDirection: "column", margin: 4}}>
                <div>
                    {extraProperties.promptText}
                </div>
                <div style={{flexDirection: "row-reverse", marginTop: 16}}>
                    <div>
                        {extraProperties.optionButtons.map(optionButton => (
                            <input type="button" value={optionButton.text} onClick={() => {
                                modalResolve(optionButton.value);
                                Modals.Global().popModal();
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        ),
        displayName: "Dialog Box",
        shrinkToContent: true
    };
};