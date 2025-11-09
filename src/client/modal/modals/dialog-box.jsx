import '../../global.css';

/** @import {ModalOptions} from "../modal.jsx" */
/** @import {Setters, States} from "../../App.jsx" */

/**
 * @template T
 * @typedef {Object} OptionButton
 * @property {T} value
 * @property {string} text
 */

/** 
 * @template T
 * @param {{
 *  setters: Setters
 *  modalOptions: ModalOptions<{
 *      promptText: string
 *      optionButtons: OptionButton<T>[]
 *  }>
 * }} param0
*/
const DialogBox = ({setters, modalOptions}) => {
    return (
        <div style={{flexDirection: "column", margin: 4}}>
            <div>
                {modalOptions.extraProperties.promptText}
            </div>
            <div style={{flexDirection: "row-reverse", marginTop: 16}}>
                <div>
                    {modalOptions.extraProperties.optionButtons.map(optionButton => (
                        <input type="button" value={optionButton.text} onClick={() => {
                            modalOptions.resolve(optionButton.value);
                            setters.popModal();
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DialogBox;

export const MODAL_PROPERTIES = {
    modalName: "dialog-box",
    displayName: "Dialog Box",
    shrinkToContent: true
};
export const DIALOG_BOX_MODAL_PROPERTIES = MODAL_PROPERTIES;