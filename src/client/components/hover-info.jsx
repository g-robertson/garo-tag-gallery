// STATELESS
/** @import {JSX} from "react" */

/**
 * @param {{
 *   children: JSX.Element,
 *   hoverText: string
 * }} param0  
 */
const HoverInfo = ({children, hoverText}) => {
    return <>
        <span style={{whiteSpace: "pre"}}> <span title={hoverText}>{children}<sub><sub>?</sub></sub></span> </span>
    </>
}

export default HoverInfo;