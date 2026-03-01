export const CONSTANTS = {
    RESERVED_FOR_FUTURE_USE: "system:reserved:for future use:USER SHOULD NOT SEE"
};
export const C = CONSTANTS;

export const PARSER_QUERY_CONSTANTS = /** @type {const} */ ({
    TRANSFORM_TEXT_AS_HTML_TO_XML: "TransformTextAsHTMLToXML",
    TRANSFORM_TEXT_TO_JSON: "TransformTextToJson",
    TRANSFORM_TEXT_TO_IMPORT_FILE_NAME: "TransformTextToImportFileName",
    TRANSFORM_TEXT_TO_ADDITIONAL_URL: "TransformTextToAdditionalURL",
    STARTS_WITH: "StartsWith",
    ENDS_WITH: "EndsWith",
    TRANSFORM_TEXT_TO_LOWERCASE: "TransformTextToLowercase",
    TRANSFORM_XML_TO_XPATH_ROOT_CONTEXT_NODE: "TransformXMLToXPathRootContextNode",
    GET_DESCENDENTS: "GetDescendents",
    WITH_TRAITS: "WithTraits",
    XPATH_TRAIT_GROUP: "XPathTraitGroup",
    ELEMENT_TYPE: "ElementType",
    ELEMENT_ATTRIBUTE_NAME: "AttributeName",
    ATTRIBUTE_VALUE: "AttributeValue",
    GET_ELEMENT_ATTRIBUTE: "GetAttribute",
    FOR_EACH: "ForEach",
    GET_UP_TO_NTH_ANCESTOR: "GetUpToNthAncestor",
    NOT: "Not",
    IDENTITY: "Identity",
    CONDITIONAL_TRANSFORM: "ConditionalTransform",
    GET_DESCENDENTS_WITH_PROPERTY_NAME: "GetDescendentsWithPropertyName",
    GET_ALL_STRING_PROPERTY_VALUES: "GetAllStringPropertyValues",
    GET_NTH_VALUE: "GetNthValue",
    TO_STRING_ARRAY: "ToStringArray",
    FILTER: "Filter",
    DISTINCT: "Distinct",
    MAP: "Map",
    GROUPING_TYPES: {
        AND: " and ",
        OR: " or "
    },
    OPERATORS: {
        EQUALS: "=",
        EQ: "=",
        NOT_EQUALS: "!=",
        NEQ: "!=",
        GREATER_THAN_OR_EQUAL: ">=",
        GTE: ">=",
        GREATER_THAN: ">",
        GT: ">",
        LESS_THAN_OR_EQUAL: "<=",
        LTE: "<=",
        LESS_THAN: "<",
        LT: "<",
        CONTAINS: "contains"
    },
    EXISTENCE_OPERATORS: {
        EXISTS: "exists"
    }
});
export const PQC = PARSER_QUERY_CONSTANTS;