/** @import {ParserQueryTransformString} from "../api/zod-types.js" */
/** @import {PreInsertLocalURLParser} from "../../db/parsers.js" */

import { SUPPORTED_FILE_EXTENSIONS } from "./client-util.js";
import { PQC } from "./constants.js";
import { createSystemTag, mapLookupNameToPreInsertSystemTag } from "./tags.js";

/**
 * @param {number} localURLParserID
 */
export function createFromLocalURLParserLookupName(localURLParserID) {
    return `system:is from local url parser:${localURLParserID}`;
}

/**
 * @param {number} Local_URL_Parser_ID
 * @param {bigint} From_Local_URL_Parser_Tag_ID
 * @param {PreInsertLocalURLParser} preInsertLocalURLParser
 */
export function createSystemURLParser(Local_URL_Parser_ID, From_Local_URL_Parser_Tag_ID, preInsertLocalURLParser) {
    return Object.freeze({
        Local_URL_Parser_ID,
        From_Local_URL_Parser_Tag: createSystemTag(From_Local_URL_Parser_Tag_ID, mapLookupNameToPreInsertSystemTag(createFromLocalURLParserLookupName(Local_URL_Parser_ID))),
        ...preInsertLocalURLParser,
    });
}

/** @type {ParserQueryTransformString} */
export const DEFAULT_HTML_URL_PARSER_CONTENT_PARSER = {
    type: PQC.TRANSFORM_TEXT_AS_HTML_TO_XML,
    then: [{
        type: PQC.TRANSFORM_XML_TO_XPATH_ROOT_CONTEXT_NODE,
        then: [{
            type: PQC.GET_DESCENDENTS,
            then: [{
                type: PQC.WITH_TRAITS,
                traits: {
                    type: PQC.XPATH_TRAIT_GROUP,
                    groupType: PQC.GROUPING_TYPES.AND,
                    expressions: [
                        {
                            type: PQC.ELEMENT_TYPE,
                            operator: PQC.OPERATORS.EQ,
                            value: "img"
                        },
                        {
                            type: PQC.ELEMENT_ATTRIBUTE_NAME,
                            operator: PQC.EXISTENCE_OPERATORS.EXISTS,
                            value: "src"
                        }
                    ]
                },
                then: [
                    {
                        type: PQC.GET_ELEMENT_ATTRIBUTE,
                        attributeName: "src",
                        then: [{
                            type: PQC.FOR_EACH,
                            then: [{
                                type: PQC.TRANSFORM_TEXT_TO_IMPORT_FILE_NAME
                            }]
                        }]
                    },
                    {
                        type: PQC.GET_UP_TO_NTH_ANCESTOR,
                        n: 3,
                        then: [{
                            type: PQC.WITH_TRAITS,
                            traits: {
                                type: PQC.XPATH_TRAIT_GROUP,
                                groupType: PQC.GROUPING_TYPES.AND,
                                expressions: [
                                    {
                                        type: PQC.ELEMENT_TYPE,
                                        operator: PQC.OPERATORS.EQ,
                                        value: "a"
                                    },
                                    {
                                        type: PQC.ELEMENT_ATTRIBUTE_NAME,
                                        operator: PQC.EXISTENCE_OPERATORS.EXISTS,
                                        value: "href"
                                    }
                                ]
                            },
                            then: [{
                                type: PQC.GET_ELEMENT_ATTRIBUTE,
                                attributeName: "href",
                                then: [{
                                    type: PQC.FOR_EACH,
                                    then: [{
                                        type: PQC.TRANSFORM_TEXT_TO_ADDITIONAL_URL,
                                        depthAllowed: 0
                                    }]
                                }]
                            }]
                        }]
                    }
                ]
            }],
        }]
    }]
};


/** @type {ParserQueryTransformString} */
export const DEFAULT_JSON_URL_PARSER_CONTENT_PARSER = {
    type: PQC.TRANSFORM_TEXT_TO_JSON,
    then: [{
        type: PQC.GET_ALL_STRING_PROPERTY_VALUES,
        then: [{
            type: PQC.FILTER,
            conditions: [
                {
                    type: PQC.STARTS_WITH,
                    prefixes: ["https://", "http://"],
                    caseSensitive: false
                },
                {
                    type: PQC.ENDS_WITH,
                    suffixes: [...SUPPORTED_FILE_EXTENSIONS],
                    caseSensitive: false
                }
            ],
            then: [{
                type: PQC.MAP,
                mapFn: {
                    type: PQC.TRANSFORM_TEXT_TO_LOWERCASE,
                    then: []
                },
                then: [{
                    type: PQC.DISTINCT,
                    then: [{
                        type: PQC.FOR_EACH,
                        then: [{
                            type: PQC.TRANSFORM_TEXT_TO_IMPORT_FILE_NAME
                        }]
                    }]
                }]
            }]
        }]
    }]
};