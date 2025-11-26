import { ExistingState } from "../page/pages.js";

/**
 * 
 * @param {{
 *     onFormSubmit: () => void
 * }} param0 
 * @returns 
 */
export const OnFormSubmit = ({onFormSubmit}) => {
    onFormSubmit ??= () => {};
    const firstLoad = ExistingState.stateRef(true);

    return <iframe id="frame" name="frame" style={{display: "none"}} onLoad={(e) => {
        if (firstLoad.get()) {
            firstLoad.update(false);
        } else {
            if (e.currentTarget.contentWindow.performance.getEntriesByType("navigation")[0].responseStatus === 200) {
                onFormSubmit();
            }
        }
    }}></iframe>
}