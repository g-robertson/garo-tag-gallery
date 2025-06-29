/**
 * @param {number} localTagServiceID
 */
export default async function deleteLocalTagService(localTagServiceID) {
    await fetch("/api/post/delete-local-tag-service", {
        body: JSON.stringify({
            localTagServiceID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}