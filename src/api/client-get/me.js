import { fbjsonParse } from "../../client/js/client-util.js";

export default async function getMe() {
    const me = await fetch("/api/get/me");
    return await fbjsonParse(me);
}