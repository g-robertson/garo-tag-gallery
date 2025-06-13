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

    return <iframe name="frame" style={{display: "none"}} onLoad={() => {
        if (firstLoad) {
            setFirstLoad(false);
        } else {
            onFormSubmit();
        }
    }}></iframe>
}