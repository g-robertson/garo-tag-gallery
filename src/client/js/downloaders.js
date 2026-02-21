
/**
 * @param {number} localDownloaderServiceID 
 */
export function createFromLocalDownloaderServiceLookupName(localDownloaderServiceID) {
    return `system:is from local downloader service:${localDownloaderServiceID}`
}

/**
 * @param {number}
 */
export function createFromLocalDownloaderLookupName(localDownloaderID) {
    return `system:is from local downloader service:${localDownloaderID}`
}