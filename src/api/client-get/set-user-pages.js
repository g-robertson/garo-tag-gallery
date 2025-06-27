/** @import {PageType} from "../../client/page/page.jsx" */

/**
 * @param {PageType[]} pages
 */
export default async function setUserPages(pages) {
    await fetch("/api/post/set-user-pages", {
        body: JSON.stringify({
            pages
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}