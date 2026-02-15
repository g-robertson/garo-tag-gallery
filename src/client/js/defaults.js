import { randomID } from "./client-util.js";
import { createSystemMetric, mapNameToPositiveIntegerPreInsertSystemMetric, mapNameToPositivePreInsertSystemMetric, METRIC_TYPES } from "./metrics.js";
import { createInLocalTaggableServiceLookupName } from "./taggables.js";
import { createSystemTag, mapLookupNameToPreInsertSystemTag, SYSTEM_GENERATED } from "./tags.js";

const IN_LOCAL_SERVICE_TAG_OFFSET = 0n;
const SYSTEM_TAG_OFFSET = 1000n;
const SYSTEM_METRIC_TAG_OFFSET = 2000n;

/** @type {ReturnType<typeof createSystemTag>[]} */
const Default_Tags_Collection = [];

/** @type {ReturnType<typeof createSystemMetric>[]} */
const Default_Local_Metrics_Collection = [];

export const SYSTEM_LOCAL_TAG_SERVICE = {
    Service_ID: 0,
    Local_Tag_Service_ID: 0,
    Service_Name: "System local tags"
};
export const DEFAULT_LOCAL_TAG_SERVICE = {
    Service_ID: 1,
    Local_Tag_Service_ID: 1,
    Service_Name: "Default local tags"
};
export const DEFAULT_LOCAL_TAGGABLE_SERVICE = {
    Service_ID: 2,
    Local_Taggable_Service_ID: 0,
    Service_Name: "Default local taggables",
    In_Local_Taggable_Service_Tag: createSystemTag(IN_LOCAL_SERVICE_TAG_OFFSET + 0n, mapLookupNameToPreInsertSystemTag(createInLocalTaggableServiceLookupName(0)))
};
Default_Tags_Collection.push(DEFAULT_LOCAL_TAGGABLE_SERVICE.In_Local_Taggable_Service_Tag);
export const SYSTEM_LOCAL_METRIC_SERVICE = {
    Service_ID: 3,
    Local_Metric_Service_ID: 0,
    Service_Name: "System local metrics",
};

export const HAS_NOTES_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 0n, mapLookupNameToPreInsertSystemTag("system:has notes"));
Default_Tags_Collection.push(HAS_NOTES_TAG);
export const HAS_URL_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 1n, mapLookupNameToPreInsertSystemTag("system:has url"));
Default_Tags_Collection.push(HAS_URL_TAG);
export const IS_FILE_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 2n, mapLookupNameToPreInsertSystemTag("system:is file"));
Default_Tags_Collection.push(IS_FILE_TAG);
export const IN_TRASH_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 3n, mapLookupNameToPreInsertSystemTag("system:in trash"));
Default_Tags_Collection.push(IN_TRASH_TAG);

export const HAS_TRANSPARENCY_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 4n, mapLookupNameToPreInsertSystemTag("system:has transparency"));
Default_Tags_Collection.push(HAS_TRANSPARENCY_TAG);
export const HAS_METADATA_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 5n, mapLookupNameToPreInsertSystemTag("system:has metadata"));
Default_Tags_Collection.push(HAS_METADATA_TAG);
export const HAS_ICC_PROFILE_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 6n, mapLookupNameToPreInsertSystemTag("system:has icc profile"));
Default_Tags_Collection.push(HAS_ICC_PROFILE_TAG);
export const HAS_EXIF_TAG = createSystemTag(SYSTEM_TAG_OFFSET + 7n, mapLookupNameToPreInsertSystemTag("system:has exif"));
Default_Tags_Collection.push(HAS_EXIF_TAG);

export const FILE_SIZE_METRIC = createSystemMetric(0, SYSTEM_METRIC_TAG_OFFSET + 0n, mapNameToPositiveIntegerPreInsertSystemMetric("system:file size"));
Default_Local_Metrics_Collection.push(FILE_SIZE_METRIC);
export const VIDEO_SIZE_METRIC = createSystemMetric(1, SYSTEM_METRIC_TAG_OFFSET + 1n, mapNameToPositiveIntegerPreInsertSystemMetric("system:video size"));
Default_Local_Metrics_Collection.push(VIDEO_SIZE_METRIC);
export const FRAME_COUNT_METRIC = createSystemMetric(2, SYSTEM_METRIC_TAG_OFFSET + 2n, mapNameToPositiveIntegerPreInsertSystemMetric("system:frame count"));
Default_Local_Metrics_Collection.push(FRAME_COUNT_METRIC);
export const WIDTH_METRIC = createSystemMetric(3, SYSTEM_METRIC_TAG_OFFSET + 3n, mapNameToPositiveIntegerPreInsertSystemMetric("system:width"));
Default_Local_Metrics_Collection.push(WIDTH_METRIC);
export const HEIGHT_METRIC = createSystemMetric(4, SYSTEM_METRIC_TAG_OFFSET + 4n, mapNameToPositiveIntegerPreInsertSystemMetric("system:height"));
Default_Local_Metrics_Collection.push(HEIGHT_METRIC);
export const DURATION_METRIC = createSystemMetric(5, SYSTEM_METRIC_TAG_OFFSET + 5n, mapNameToPositivePreInsertSystemMetric("system:height"));
Default_Local_Metrics_Collection.push(DURATION_METRIC);
export const AUDIO_SIZE_METRIC = createSystemMetric(6, SYSTEM_METRIC_TAG_OFFSET + 6n, mapNameToPositiveIntegerPreInsertSystemMetric("system:audio size"));
Default_Local_Metrics_Collection.push(AUDIO_SIZE_METRIC);
export const AUDIO_DIMENSIONS_METRIC = createSystemMetric(7, SYSTEM_METRIC_TAG_OFFSET + 7n, mapNameToPositiveIntegerPreInsertSystemMetric("system:audio dimensions"));
Default_Local_Metrics_Collection.push(AUDIO_DIMENSIONS_METRIC);
export const AUDIO_SAMPLE_RATE_METRIC = createSystemMetric(8, SYSTEM_METRIC_TAG_OFFSET + 8n, mapNameToPositivePreInsertSystemMetric("system:sample rate"));
Default_Local_Metrics_Collection.push(AUDIO_SAMPLE_RATE_METRIC);

export const LAST_SYSTEM_METRIC = createSystemMetric(1000, SYSTEM_METRIC_TAG_OFFSET + 1000n, {
    Local_Metric_Name: "system:reserved:user should not see",
    Local_Metric_Lower_Bound: 1,
    Local_Metric_Upper_Bound: -1,
    Local_Metric_Precision: 0,
    Local_Metric_Type: 0
});
Default_Local_Metrics_Collection.push(LAST_SYSTEM_METRIC);

export const LAST_SYSTEM_TAG = createSystemTag(0xFFFFn, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: "system:reserved:user should not see",
    Lookup_Name: randomID(64)
});
Default_Tags_Collection.push(LAST_SYSTEM_TAG);

export const DEFAULT_TAGS = Default_Tags_Collection;
export const DEFAULT_LOCAL_METRICS = Default_Local_Metrics_Collection;