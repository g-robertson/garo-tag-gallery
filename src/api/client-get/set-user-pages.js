import { bjsonStringify } from "../../client/js/client-util.js";
import { Pages } from "../../client/page/pages.js";

/**
 * @param {Pages} pages
 */
export default async function setUserPages(pages) {
    await fetch("/api/post/set-user-pages", {
        body: bjsonStringify({
            pages
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}