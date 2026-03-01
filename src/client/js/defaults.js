import { randomID } from "./client-util.js";
import { C } from "./constants.js";
import { createFromLocalDownloaderServiceLookupName } from "./downloaders.js";
import { createInLocalMetricServiceLookupName, createSystemMetric, mapNameToPositiveIntegerPreInsertSystemMetric, mapNameToPositivePreInsertSystemMetric, METRIC_TYPES } from "./metrics.js";
import { createSystemURLParser, DEFAULT_HTML_URL_PARSER_CONTENT_PARSER, DEFAULT_JSON_URL_PARSER_CONTENT_PARSER } from "./parsers.js";
import { createInLocalTaggableServiceLookupName } from "./taggables.js";
import { createSystemTag, mapLookupNameToPreInsertSystemTag, SYSTEM_GENERATED } from "./tags.js";

const IN_LOCAL_SERVICE_TAG_OFFSET = 0n;
const SYSTEM_TAG_OFFSET = 1000n;
const SYSTEM_METRIC_TAG_OFFSET = 2000n;
const SYSTEM_URL_PARSER_TAG_OFFSET = 3000n;

/** @type {ReturnType<typeof createSystemTag>[]} */
const Default_Tags_Collection = [];

/** @type {ReturnType<typeof createSystemMetric>[]} */
const Default_Local_Metrics_Collection = [];

/** @type {ReturnType<typeof createSystemURLParser>[]} */
const Default_Local_URL_Parsers_Collection = [];

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
export const SYSTEM_LOCAL_METRIC_SERVICE = {
    Service_ID: 3,
    Local_Metric_Service_ID: 0,
    Service_Name: "System local metrics",
    Has_Metric_From_Local_Metric_Service_Tag: createSystemTag(IN_LOCAL_SERVICE_TAG_OFFSET + 1n, mapLookupNameToPreInsertSystemTag(createInLocalMetricServiceLookupName(0)))
};
export const SYSTEM_LOCAL_DOWNLOADER_SERVICE = {
    Service_ID: 4,
    Local_Downloader_Service_ID: 0,
    Service_Name: "System local downloader service",
    From_Local_Downloader_Service_Tag: createSystemTag(IN_LOCAL_SERVICE_TAG_OFFSET + 2n, mapLookupNameToPreInsertSystemTag(createFromLocalDownloaderServiceLookupName(0)))
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
export const DURATION_METRIC = createSystemMetric(5, SYSTEM_METRIC_TAG_OFFSET + 5n, mapNameToPositivePreInsertSystemMetric("system:duration"));
Default_Local_Metrics_Collection.push(DURATION_METRIC);
export const AUDIO_SIZE_METRIC = createSystemMetric(6, SYSTEM_METRIC_TAG_OFFSET + 6n, mapNameToPositiveIntegerPreInsertSystemMetric("system:audio size"));
Default_Local_Metrics_Collection.push(AUDIO_SIZE_METRIC);
export const AUDIO_DIMENSIONS_METRIC = createSystemMetric(7, SYSTEM_METRIC_TAG_OFFSET + 7n, mapNameToPositiveIntegerPreInsertSystemMetric("system:audio dimensions"));
Default_Local_Metrics_Collection.push(AUDIO_DIMENSIONS_METRIC);
export const AUDIO_SAMPLE_RATE_METRIC = createSystemMetric(8, SYSTEM_METRIC_TAG_OFFSET + 8n, mapNameToPositivePreInsertSystemMetric("system:sample rate"));
Default_Local_Metrics_Collection.push(AUDIO_SAMPLE_RATE_METRIC);

export const LAST_SYSTEM_METRIC = createSystemMetric(999, SYSTEM_METRIC_TAG_OFFSET + 999n, {
    Local_Metric_Name: C.RESERVED_FOR_FUTURE_USE,
    Local_Metric_Lower_Bound: 1,
    Local_Metric_Upper_Bound: -1,
    Local_Metric_Precision: 0,
    Local_Metric_Type: 0
});
Default_Local_Metrics_Collection.push(LAST_SYSTEM_METRIC);

Default_Local_URL_Parsers_Collection.push(createSystemURLParser(0, SYSTEM_URL_PARSER_TAG_OFFSET + 0n, {
    Local_URL_Parser_Name: "Default Website Parser",
    Local_URL_Parser_Content_Parser_JSON: DEFAULT_HTML_URL_PARSER_CONTENT_PARSER,
    Local_URL_Parser_URL_Classifier_JSON: {urlPattern: ".*"},
    Local_URL_Parser_Priority: -10000000
}));
Default_Local_URL_Parsers_Collection.push(createSystemURLParser(1, SYSTEM_URL_PARSER_TAG_OFFSET + 1n, {
    Local_URL_Parser_Name: "Default JSON Parser",
    Local_URL_Parser_Content_Parser_JSON: DEFAULT_JSON_URL_PARSER_CONTENT_PARSER,
    Local_URL_Parser_URL_Classifier_JSON: {urlPattern: ".*"},
    Local_URL_Parser_Priority: -20000000
}));

export const LAST_SYSTEM_URL_PARSER = createSystemURLParser(999, SYSTEM_URL_PARSER_TAG_OFFSET + 999n, {
    Local_URL_Parser_Name: C.RESERVED_FOR_FUTURE_USE,
    Local_URL_Parser_Content_Parser_JSON: {},
    Local_URL_Parser_URL_Classifier_JSON: {},
    Local_URL_Parser_Priority: Number.MIN_VALUE
});
Default_Local_URL_Parsers_Collection.push(LAST_SYSTEM_URL_PARSER);

export const LAST_SYSTEM_TAG = createSystemTag(0xFFFFn, {
    Source_Name: SYSTEM_GENERATED,
    Display_Name: C.RESERVED_FOR_FUTURE_USE,
    Lookup_Name: randomID(64)
});
Default_Tags_Collection.push(LAST_SYSTEM_TAG);

export const __MIGRATE_DEFAULT_TAGS = Default_Tags_Collection;
export const DEFAULT_TAGS = __MIGRATE_DEFAULT_TAGS.filter(tag => !tag.Lookup_Name.includes(C.RESERVED_FOR_FUTURE_USE));
export const __MIGRATE_DEFAULT_LOCAL_METRICS = Default_Local_Metrics_Collection;
export const DEFAULT_LOCAL_METRICS = __MIGRATE_DEFAULT_LOCAL_METRICS.filter(metric => !metric.Local_Metric_Name.includes(C.RESERVED_FOR_FUTURE_USE));
export const __MIGRATE_DEFAULT_LOCAL_URL_PARSERS = Default_Local_URL_Parsers_Collection;
export const DEFAULT_LOCAL_URL_PARSERS = __MIGRATE_DEFAULT_LOCAL_URL_PARSERS.filter(urlParser => !urlParser.Local_URL_Parser_Name.includes(C.RESERVED_FOR_FUTURE_USE));