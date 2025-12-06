import { State } from "../page/pages.js";

/**
 * 
 * @param {{
 *     onFormSubmit: () => void
 * }} param0 
 * @returns 
 */
export const OnFormSubmit = ({onFormSubmit}) => {
    onFormSubmit ??= () => {};
    let firstLoad = true;

    return <iframe id="frame" name="frame" style={{display: "none"}} onLoad={(e) => {
        if (firstLoad) {
            firstLoad = false;
        } else {
            if (e.currentTarget.contentWindow.performance.getEntriesByType("navigation")[0].responseStatus === 200) {
                onFormSubmit();
            }
        }
    }}></iframe>
}