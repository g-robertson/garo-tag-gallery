import { createSystemTag } from "./tags.js";

export const DEFAULT_LOCAL_TAGGABLE_SERVICE = {
    Service_ID: 2,
    Local_Taggable_Service_ID: 0,
    Service_Name: "Default local taggables",
    In_Local_Taggable_Service_Tag_ID: 3n
};
export const IN_DEFAULT_LOCAL_TAGGABLE_SERVICE_TAG = createSystemTag(3n, {
    Source_Name: "System generated",
    Display_Name: `system:in local taggable service:${DEFAULT_LOCAL_TAGGABLE_SERVICE.Service_Name}`,
    Lookup_Name: `system:in local taggable service:${DEFAULT_LOCAL_TAGGABLE_SERVICE.Local_Taggable_Service_ID}`
});
