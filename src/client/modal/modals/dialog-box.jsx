import '../../global.css';
import { Modals } from '../../modal/modals.js';

/**
 * @template T
 * @typedef {Object} OptionButton
 * @property {T} value
 * @property {string} text
 */

/** 
 * @template T
 * @param {{
 *  displayName?: string
 *  promptText: string
 *  optionButtons: OptionButton<T>[]
 * }} param0
*/
export default function DialogBox({ displayName, promptText, optionButtons }) {
    let modalResolve;
    /** @type {Promise<T>} */
    const promiseValue = new Promise(resolve => { modalResolve = resolve; });

    return {
        component: (
            <div className="dialog-box-modal" style={{flexDirection: "column", margin: 4}}>
                <div>
                    {promptText}
                </div>
                <div style={{flexDirection: "row-reverse", marginTop: 16}}>
                    <div>
                        {optionButtons.map(optionButton => (
                            <input type="button" value={optionButton.text} onClick={() => {
                                modalResolve(optionButton.value);
                                Modals.Global().popModal();
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        ),
        displayName: displayName ?? "Dialog Box",
        shrinkToContent: true,
        promiseValue
    };
};