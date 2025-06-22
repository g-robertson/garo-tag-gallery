import { fbjsonParse } from "../../client/js/client-util.js";
import { User } from "../../client/js/user.js";

export default async function getMe() {
    const me = await fetch("/api/get/me");
    return new User(await fbjsonParse(me));
}