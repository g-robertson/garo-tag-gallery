import xpath from "xpath"
import {DOMParser} from "@xmldom/xmldom"
import { walkObject } from "../client/js/client-util.js";
import z from "zod";
import { PQC } from "../client/js/constants.js";

/** @import {ParserQueryTransformJson, ParserQueryTransformString, ParserQueryTransformStringArray, ParserQueryTransformStringToOutput, ParserQueryTransformXML, ParserQueryTransformXPathContextNode, ParserQueryXPathCombineTraits, ParserQueryXPathTraits, SameTypeToTypeGeneric} from "../api/zod-types.js" */

/**
 * @typedef {{
 *     additionalUrls: string[]
 *     importFileNames: string[]
 * }} ParserAccumulator
 **/

/**
 * @param {ParserAccumulator} accumulator
 * @param {ParserAccumulator} current
 */
function accumulateFromParser(accumulator, current) {
    for (const additionalUrl of current.additionalUrls) {
        accumulator.additionalUrls.push(additionalUrl);
    }
    for (const importFileName of current.importFileNames) {
        accumulator.importFileNames.push(importFileName);
    }
}

/** @typedef {SameTypeToTypeGeneric<z.ZodType<{type: PQC.IDENTITY}>, z.ZodType<{type: PQC.IDENTITY}>>} DefaultSameTypeToTypeGeneric */

/**
 * @param {DefaultSameTypeToTypeGeneric['type']} type
 * @returns {type is SameTypeToTypeGeneric['type']}  
 */
function isGenericType(type) {
    return type === PQC || type === PQC.CONDITIONAL_TRANSFORM;
}

/**
 * @param {DefaultSameTypeToTypeGeneric} parserQuery
 * @param {(parserQuery: any, ...genericArgs: any) => ReturnType<typeof parserQueryParseString>} sameTypeParser
 * @param {(...genericArgs: any) => ParserValueType} sameTypeValueCreator
 * @param {any[]} genericArgs
 */
function parserQueryParseGeneric(parserQuery, sameTypeParser, sameTypeValueCreator, genericArgs) {
    /** @type {ParserAccumulator} */
    const parserAccumulator = {
        additionalUrls: [],
        importFileNames: []
    };

    if (parserQuery.type === PQC.IDENTITY) {
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, sameTypeParser(then, ...genericArgs).parserAccumulator)
        }
        return {parserAccumulator, value: sameTypeValueCreator(...genericArgs)};
    } else if (parserQuery.type === PQC.CONDITIONAL_TRANSFORM) {
        const ifCheckResult = sameTypeParser(parserQuery.ifCheck, ...genericArgs);
        accumulateFromParser(parserAccumulator, ifCheckResult.parserAccumulator);
            
        const result = sameTypeParser((ifCheckResult.value === true) ? parserQuery.trueCase : parserQuery.elseCase, ...genericArgs);
        accumulateFromParser(parserAccumulator, result.parserAccumulator);
        
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, sameTypeParser(then, result).parserAccumulator);
        }
        return {parserAccumulator, value: result.value};
    }

    return {parserAccumulator};
}

/**
 * @param {ParserQueryXPathTraits} xpathTraits 
 */
function parserQueryEvaluateXPathTraits(xpathTraits) {
    if (xpathTraits.type === PQC.XPATH_TRAIT_GROUP) {
        return xpathTraits.expressions.map(parserQueryEvaluateXPathTraits).join(xpathTraits.groupType);
    } else if (xpathTraits.type === PQC.NOT) {
        return `not(${parserQueryEvaluateXPathTraits(xpathTraits.expression)})`;
    } else if (xpathTraits.type === PQC.ELEMENT_TYPE) {
        if (xpathTraits.operator === PQC.OPERATORS.CONTAINS) {
            return `contains(name(), "${xpathTraits.value}")`;
        } else {
            return `name()${xpathTraits.operator}"${xpathTraits.value}"`;
        }
    } else if (xpathTraits.type === PQC.ELEMENT_ATTRIBUTE_NAME) {
        if (xpathTraits.operator === PQC.EXISTENCE_OPERATORS.EXISTS) {
            return `@${xpathTraits.value}`;
        }
    } else if (xpathTraits.type === PQC.ATTRIBUTE_VALUE) {
        if (xpathTraits.operator === PQC.OPERATORS.CONTAINS) {
            return `contains(@${xpathTraits.attributeName}, "${xpathTraits.value}")`;
        } else {
            return `${xpathTraits.attributeName}${xpathTraits.operator}"${xpathTraits.value}"`;
        }
    }
    
    return "";
}

/**
 * @param {Document} dom 
 * @param {string} xpathContext 
 */
function parserQueryXPathContextNodeValue(dom, xpathContext) {
    return {dom, xpathContext};
}

/**
 * @param {ParserQueryTransformXPathContextNode} parserQuery 
 * @param {Document} dom 
 * @param {string} xpathContext 
 */
function parserQueryParseXPathContextNode(parserQuery, dom, xpathContext) {
    /** @type {ParserAccumulator} */
    const parserAccumulator = {
        additionalUrls: [],
        importFileNames: []
    };

    if (isGenericType(parserQuery.type)) {
        const result = parserQueryParseGeneric(parserQuery, parserQueryParseXPathContextNode, parserQueryXPathContextNodeValue, [dom, xpathContext]);
        accumulateFromParser(parserAccumulator, result.parserAccumulator);
        return {parserAccumulator, value: result.value};
    } else if (parserQuery.type === PQC.GET_UP_TO_NTH_ANCESTOR) {
        const newXPathContext = `${xpathContext}/ancestor::*[position()<=${parserQuery.n}]`;
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseXPathContextNode(then, dom, newXPathContext).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryXPathContextNodeValue(dom, newXPathContext)};
    } else if (parserQuery.type === PQC.GET_DESCENDENTS) {
        const newXPathContext = `${xpathContext}//*`;
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseXPathContextNode(then, dom, newXPathContext).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryXPathContextNodeValue(dom, newXPathContext)};
    } else if (parserQuery.type === PQC.WITH_TRAITS) {
        const newXPathContext = `${xpathContext}[${parserQueryEvaluateXPathTraits(parserQuery.traits)}]`;
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseXPathContextNode(then, dom, newXPathContext).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryXPathContextNodeValue(dom, newXPathContext)};
    } else if (parserQuery.type === PQC.GET_ELEMENT_ATTRIBUTE) {
        const selection = xpath.select(`${xpathContext}/@${parserQuery.attributeName}`, dom).map(node => node.value);
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseStringArray(then, selection).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryStringArrayValue(selection)};
    }

    return {parserAccumulator};
}

/**
 * @param {Document} dom 
 */
function parserQueryXMLValue(dom) {
    return dom;
}

/**
 * @param {ParserQueryTransformXML} parserQuery 
 * @param {Document} dom 
 */
function parserQueryParseXML(parserQuery, dom) {
    /** @type {ParserAccumulator} */
    const parserAccumulator = {
        additionalUrls: [],
        importFileNames: []
    };

    if (isGenericType(parserQuery.type)) {
        const result = parserQueryParseGeneric(parserQuery, parserQueryParseXML, parserQueryXMLValue, [dom]);
        accumulateFromParser(parserAccumulator, result.parserAccumulator);
        return {parserAccumulator, value: result.value};
    } else if (parserQuery.type === PQC.TRANSFORM_XML_TO_XPATH_ROOT_CONTEXT_NODE) {
        const xpathContext = "";
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseXPathContextNode(then, dom, xpathContext).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryXPathContextNodeValue(dom, xpathContext)};
    }

    return {parserAccumulator};
}

/**
 * @param {any} json 
 */
function parserQueryJSONValue(json) {
    return json;
}

/**
 * @param {ParserQueryTransformJson} parserQuery 
 * @param {any} json
 */
function parserQueryParseJSON(parserQuery, json) {
    /** @type {ParserAccumulator} */
    const parserAccumulator = {
        additionalUrls: [],
        importFileNames: []
    };

    if (isGenericType(parserQuery.type)) {
        const result = parserQueryParseGeneric(parserQuery, parserQueryParseJSON, parserQueryJSONValue, [json]);
        accumulateFromParser(parserAccumulator, result.parserAccumulator);
        return {parserAccumulator, value: result.value};
    } else if (parserQuery.type === PQC.GET_DESCENDENTS_WITH_PROPERTY_NAME) {
        const descendents = [];

        walkObject(json, (subObject) => {
            const descendent = subObject[parserQuery.propertyName];
            if (descendent !== undefined) {
                descendents.push({
                    [parserQuery.propertyName]: descendent
                });
            }

            return subObject;
        });

        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseJSON(then, descendents).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryJSONValue(descendents)};
    } else if (parserQuery.type === PQC.GET_ALL_STRING_PROPERTY_VALUES) {
        const stringArray = [];
        walkObject(json, (subObject) => {
            if (typeof subObject === "string") {
                stringArray.push(subObject);
            }
            return subObject;
        });
        
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseStringArray(then, stringArray).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryStringArrayValue(stringArray)};
    } else if (parserQuery.type === PQC.FOR_EACH) {
        let entries = [];
        if (json instanceof Array) {
            entries = json;
        } else if (typeof json === "object") {
            entries = Object.entries(json);
        }
        for (const then of parserQuery.then) {
            for (const entry of entries) {
                accumulateFromParser(parserAccumulator, parserQueryParseJSON(then, entry).parserAccumulator);
            }
        }
        return {parserAccumulator};
    } else if (parserQuery.type === PQC.GET_NTH_VALUE) {
        const nthValue = Object.values(json)[parserQuery.n];
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseJSON(then, nthValue).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryJSONValue(nthValue)};
    } else if (parserQuery.type === PQC.TO_STRING_ARRAY) {
        /** @type {string[]} */
        const stringArray = [...Object.values(json)].map(value => value.toString());
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseStringArray(then, stringArray).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryStringArrayValue(stringArray)};
    }

    return {parserAccumulator};
}

/**
 * @param {string[]} stringArray 
 */
function parserQueryStringArrayValue(stringArray) {
    return stringArray;
}

/**
 * @param {ParserQueryTransformStringArray} parserQuery 
 * @param {string[]} stringArray 
 */
function parserQueryParseStringArray(parserQuery, stringArray) {
    /** @type {ParserAccumulator} */
    const parserAccumulator = {
        additionalUrls: [],
        importFileNames: []
    };
    
    if (isGenericType(parserQuery.type)) {
        const result = parserQueryParseGeneric(parserQuery, parserQueryParseStringArray, parserQueryStringArrayValue, [stringArray]);
        accumulateFromParser(parserAccumulator, result.parserAccumulator);
        return {parserAccumulator, value: result.value};
    } else if (parserQuery.type === PQC.FOR_EACH) {
        for (const then of parserQuery.then) {
            for (const string of stringArray) {
                accumulateFromParser(parserAccumulator, parserQueryParseString(then, string).parserAccumulator);
            }
        }
        return {parserAccumulator};
    } else if (parserQuery.type === PQC.FILTER) {
        let filteredStrings = [...stringArray];
        for (const condition of parserQuery.conditions) {
            filteredStrings = filteredStrings.filter(string => {
                const result = parserQueryParseString(string, condition);
                accumulateFromParser(parserAccumulator, result.parserAccumulator);
                return result.value === true;
            });
        }

        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseStringArray(then, filteredStrings).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryStringArrayValue(filteredStrings)};
    } else if (parserQuery.type === PQC.DISTINCT) {
        const distinct = [...new Set(stringArray)];
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseStringArray(then, distinct).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryStringArrayValue(distinct)};
    } else if (parserQuery.type === PQC.MAP) {
        const mapped = [];
        for (const string of stringArray) {
            const result = parserQueryParseString(string, parserQuery.mapFn);
            accumulateFromParser(parserAccumulator, result.parserAccumulator);
            mapped.push(result.value);
        }

        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseStringArray(then, mapped).parserAccumulator);
        }

        return {parserAccumulator, value: parserQueryStringArrayValue(mapped)};
    }

    return {parserAccumulator};
}

const DOM_PARSER = new DOMParser();

/**
 * @param {boolean} boolean 
 */
function parserQueryBooleanValue(boolean) {
    return boolean;
}

/**
 * @param {string} string 
 */
function parserQueryStringValue(string) {
    return string;
}

/**
 * @param {ParserQueryTransformString} parserQuery 
 * @param {string} string
 */
export function parserQueryParseString(parserQuery, string) {
    /** @type {ParserAccumulator} */
    const parserAccumulator = {
        additionalUrls: [],
        importFileNames: []
    };


    if (isGenericType(parserQuery.type)) {
        const result = parserQueryParseGeneric(parserQuery, parserQueryParseString, parserQueryStringValue, [string]);
        accumulateFromParser(parserAccumulator, result.parserAccumulator);
        return {parserAccumulator, value: result.value};
    } else if (parserQuery.type === PQC.TRANSFORM_TEXT_AS_HTML_TO_XML) {
        const dom = DOM_PARSER.parseFromString(string);
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseXML(then, dom).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryXMLValue(dom)};
    } else if (parserQuery.type === PQC.TRANSFORM_TEXT_TO_JSON) {
        const json = JSON.parse(string);
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseJSON(then, json).parserAccumulator);
        }
        return {parserAccumulator, value: parserQueryJSONValue(json)};
    } else if (parserQuery.type === PQC.TRANSFORM_TEXT_TO_IMPORT_FILE_NAME) {
        parserAccumulator.importFileNames.push(string);
        return {parserAccumulator};
    } else if (parserQuery.type === PQC.TRANSFORM_TEXT_TO_ADDITIONAL_URL) {
        parserAccumulator.additionalUrls.push({url: string, depthAllowed: parserQuery.depthAllowed});
        return {parserAccumulator};
    } else if (parserQuery.type === PQC.STARTS_WITH) {
        if (!parserQuery.caseSensitive) {
            string = string.toLowerCase();
            parserQuery.prefixes = parserQuery.prefixes.map(prefix => prefix.toLowerCase());
        }
        const startsWith = parserQuery.prefixes.some(prefix => string.startsWith(prefix));

        return {parserAccumulator, value: parserQueryBooleanValue(startsWith)};
    }else if (parserQuery.type === PQC.ENDS_WITH) {
        if (!parserQuery.caseSensitive) {
            string = string.toLowerCase();
            parserQuery.suffixes = parserQuery.suffixes.map(suffix => suffix.toLowerCase());
        }
        const endsWith = parserQuery.suffixes.some(suffix => string.endsWith(suffix));

        return {parserAccumulator, value: parserQueryBooleanValue(endsWith)};
    } else if (parserQuery.type === PQC.TRANSFORM_TEXT_TO_LOWERCASE) {
        const toLowerCase = string.toLowerCase();
        for (const then of parserQuery.then) {
            accumulateFromParser(parserAccumulator, parserQueryParseString(then, toLowerCase).parserAccumulator);
        }

        return {parserAccumulator, value: parserQueryStringValue(toLowerCase)};
    }

    return {parserAccumulator};
}

/**
 * @param {ParserQueryTransformStringToOutput['type']} whatToDo 
 */
// TODO: This should not be on the person writing the parser.. this should be on the downloader
function MAP_HTML_URLS_TO_DISTINCT_URLS(whatToDo) {
    /** @type {ParserQueryTransformStringArray} */
    const MAPPING = {
        type: PQC.MAP,
        mapFn: {
            type: PQC.TRANSFORM_TEXT_TO_LOWERCASE,
            then: []
        },
        then: [{
            type: PQC.MAP,
            mapFn: {
                type: PQC.CONDITIONAL_TRANSFORM,
                ifCheck: {
                    type: PQC.STARTS_WITH,
                    prefixes: ["http://", "https://"]
                },
                trueCase: {
                    type: PQC.IDENTITY
                },
                elseCase: {
                    type: "splice",
                    index: 0,
                    content: {
                        type: "variable",
                        variableName: "__url__"
                    }
                },
                then: []
            },
            then: [{
                type: PQC.MAP,
                mapFn: {
                    type: PQC.TRANSFORM_TEXT_TO_LOWERCASE,
                    then: []
                },
                then: [{
                    type: PQC.DISTINCT,
                    then: []
                }]
            }]
        }]
    };

    return MAPPING;
}