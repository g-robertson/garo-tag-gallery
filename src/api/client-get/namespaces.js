import { fbjsonParse } from "../../client/js/client-util.js";


/** @type {DBNamespace[]} */
let CACHED;

export default async function getNamespaces() {
    /** @type {number[]} */
    if (CACHED === undefined) {
        const response = await fetch("/api/get/namespaces", {
            headers: {
              "Content-Type": "application/json",
            },
            method: "GET"
        });

        CACHED = await fbjsonParse(response);
    }

    return CACHED;
}