/**
 * @param {number} localTaggableServiceID
 */
export default async function deleteLocalTaggableService(localTaggableServiceID) {
    await fetch("/api/post/delete-local-taggable-service", {
        body: JSON.stringify({
            localTaggableServiceID
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST"
    });
}