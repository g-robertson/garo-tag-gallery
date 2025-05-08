export default async function get() {
    const me = await fetch("/api/get/me");
    return await me.json();
}