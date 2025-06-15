import { useState } from "react";

/**
 * 
 * @param {{
 *     onFormSubmit: () => void
 * }} param0 
 * @returns 
 */
export const OnFormSubmit = ({onFormSubmit}) => {
    const [firstLoad, setFirstLoad] = useState(true);

    return <iframe name="frame" style={{display: "none"}} onLoad={(e) => {
        if (firstLoad) {
            setFirstLoad(false);
        } else {
            if (e.currentTarget.contentWindow.performance.getEntriesByType("navigation")[0].responseStatus === 200) {
                onFormSubmit();
            }
        }
    }}></iframe>
}