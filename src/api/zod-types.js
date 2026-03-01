import { z } from "zod";
import { SYSTEM_LOCAL_METRIC_SERVICE, SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/defaults.js";
import { Z_WANTED_FILE_FIELD, Z_WANTED_TAGGABLE_FIELD } from "../db/cursor-manager.js";
import { METRIC_TYPES } from "../client/js/metrics.js";
import { PQC } from "../client/js/constants.js";

export const Z_COERCE_NUMBER_PREPROCESS = z.preprocess(v => Number(v), z.number()).pipe;

export const Z_PERCENTAGE = z.number().min(0).max(1);
export const Z_CLIENT_COMPARATOR = z.union([z.literal("<"), z.literal("<="), z.literal(">"), z.literal(">="), z.literal("="), z.literal("<>")]);
/** @typedef {z.infer<typeof Z_CLIENT_COMPARATOR>} ClientComparator */

export const Z_DATABASE_ID = z.coerce.number().nonnegative().int();
export const Z_FILE_ID = Z_DATABASE_ID;
export const Z_LOCAL_TAG_ID = Z_DATABASE_ID;

const Z_PERFTAGS_ID = z.coerce.bigint().nonnegative();
export const Z_TAGGABLE_ID = Z_PERFTAGS_ID;
export const Z_TAG_ID = Z_PERFTAGS_ID;

export const Z_USER_LOCAL_TAG_SERVICE_ID = Z_DATABASE_ID.refine(num => num !== SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID, {"message": "Cannot lookup tags in system local tag service"});
export const Z_USER_LOCAL_TAGGABLE_SERVICE_ID = Z_DATABASE_ID;
export const Z_USER_LOCAL_METRIC_SERVICE_ID = Z_DATABASE_ID.refine(num => num !== SYSTEM_LOCAL_METRIC_SERVICE.Local_Metric_Service_ID, {"message": "Cannot lookup metrics in system local metric service"});
export const Z_USER_LOCAL_DOWNLOADER_SERVICE_ID = Z_DATABASE_ID;

export const Z_NAMESPACE_ID = Z_DATABASE_ID;

export const Z_USER_LOCAL_METRIC_ID = Z_DATABASE_ID;
export const Z_METRIC_VALUE = z.coerce.number().finite();
export const Z_METRIC_PRECISION = z.coerce.number().min(0).max(10).int();
export const Z_METRIC_TYPE = Z_COERCE_NUMBER_PREPROCESS(z.union([
    z.literal(METRIC_TYPES.NUMERIC),
    z.literal(METRIC_TYPES.INCDEC),
    z.literal(METRIC_TYPES.STARS),
]));


export const Z_WANTED_FIELD = Z_WANTED_TAGGABLE_FIELD
.or(Z_WANTED_FILE_FIELD);
/** @typedef {z.infer<typeof Z_WANTED_FIELD>} SearchWantedField */

const Z_GENERIC_FILE_RELATION = z.object({
    type: z.literal("duplicates-with-same-quality")
      .or(z.literal("duplicates-with-same-quality-trash-larger"))
      .or(z.literal("alternates"))
      .or(z.literal("false-positives")),
    File_ID_1: z.number(),
    File_ID_2: z.number()
}).refine(
    obj => obj.File_ID_1 !== obj.File_ID_2,
    {
        message: "File_ID_1 cannot be the same as File_ID_2",
        path: ["File_ID_1", "File_ID_2"]
    }
);

const Z_BETTER_DUPLICATE_FILE_RELATION = z.object({
    type: z.literal("duplicates-with-better").or(z.literal("duplicates-with-better-trash-worse")),
    Better_File_ID: z.number(),
    Worse_File_ID: z.number()
}).refine(
    obj => obj.Better_File_ID !== obj.Worse_File_ID,
    {
        message: "Better_File_ID cannot be the same as Worse_File_ID",
        path: ["Better_File_ID", "Worse_File_ID"]
    }
);

const Z_IMPLIED_FILE_RELATION = z.object({
    type: z.literal("implied")
});

export const Z_FILE_RELATION = Z_GENERIC_FILE_RELATION.or(Z_BETTER_DUPLICATE_FILE_RELATION).or(Z_IMPLIED_FILE_RELATION);
/** @typedef {z.infer<typeof Z_FILE_RELATION>} FileRelation */

/// ParserSameTypeToTypeGenerics

/**
 * @template {z.ZodType} TypeToType
 * @template {z.ZodType} TypeToBoolean
 * @typedef {(
 *     Omit<z.infer<TypeToType>, "then">
 *   | {
 *         type: PQC.CONDITIONAL_TRANSFORM
 *         ifCheck: z.infer<TypeToBoolean>
 *         trueCase: SameTypeToTypeGeneric<TypeToType, TypeToBoolean>
 *         elseCase: SameTypeToTypeGeneric<TypeToType, TypeToBoolean>
 *     } | {
 *         type: PQC.IDENTITY
 *     }
 * ) & {
 *     then: SameTypeToTypeGeneric<TypeToType, TypeToBoolean>
 * }
 * } SameTypeToTypeGeneric
 **/

/**
 * @template {z.ZodType} TypeToType
 * @template {z.ZodType} TypeToBoolean
 * @param {TypeToType} typeToType 
 * @param {TypeToBoolean} typeToBoolean 
 */
function ParserQuerySameTypeToTypeGenerics(typeToType, typeToBoolean) {
    const Z_CONDITIONAL_BASE = z.object({
        type: z.literal(PQC.CONDITIONAL_TRANSFORM),
        ifCheck: typeToBoolean
    });
    /**
     * @typedef {z.infer<typeof Z_CONDITIONAL_BASE> & {
     *      trueCase: SameTypeToTypeGeneric<TypeToType, TypeToBoolean>
     *      elseCase?: SameTypeToTypeGeneric<TypeToType, TypeToBoolean>
     * }} ParserQueryConditionalBase
     **/
    /** @type {z.ZodType<ParserQueryConditionalBase>} */
    const Z_CONDITIONAL = Z_CONDITIONAL_BASE.extend({
        trueCase: z.lazy(() => Z_SAME_TYPE_TO_TYPE_GENERIC),
        elseCase: z.lazy(() => z.optional(Z_SAME_TYPE_TO_TYPE_GENERIC)),
        then: z.lazy(() => Z_SAME_TYPE_TO_TYPE_GENERIC)
    });

    const Z_SAME_TYPE_TO_TYPE_GENERIC_BASE = typeToType.or(z.object({
        type: z.literal(PQC.IDENTITY)
    }));
    

    /** @type {z.ZodType<SameTypeToTypeGeneric<TypeToType, TypeToBoolean>>} */
    const Z_SAME_TYPE_TO_TYPE_GENERIC = z.intersection(Z_SAME_TYPE_TO_TYPE_GENERIC_BASE, z.object({
        then: z.lazy(() => Z_SAME_TYPE_TO_TYPE_GENERIC)
    })).or(Z_CONDITIONAL);

    return Z_SAME_TYPE_TO_TYPE_GENERIC;
}

/// ParserQueryTransformArray

const Z_PARSER_QUERY_TRANSFORM_ARRAY_BASE = z.object({
    type: z.literal(PQC.FOR_EACH)
});

/// ParserQueryTransformXPathContextNode

const Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_STRING_ARRAY = z.object({
    type: z.literal(PQC.GET_ELEMENT_ATTRIBUTE),
    attributeName: z.string(),
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY))
});

const Z_PARSER_XPATH_OPERATOR = z.union([
    z.literal(PQC.OPERATORS.EQ),
    z.literal(PQC.OPERATORS.NEQ),
    z.literal(PQC.OPERATORS.GT),
    z.literal(PQC.OPERATORS.GTE),
    z.literal(PQC.OPERATORS.LT),
    z.literal(PQC.OPERATORS.LTE),
    z.literal(PQC.OPERATORS.CONTAINS)
]);

const Z_PARSER_XPATH_TRAIT_EXPRESSION = z.object({
    type: z.literal(PQC.ELEMENT_TYPE).or(z.literal(PQC.ATTRIBUTE_VALUE)),
    operator: Z_PARSER_XPATH_OPERATOR,
    value: z.string()
}).or(z.object({
    type: z.literal(PQC.ELEMENT_ATTRIBUTE_NAME),
    operator: z.literal(PQC.EXISTENCE_OPERATORS.EXISTS),
    attributeName: z.string(),
    value: z.string()
}));

const Z_PARSER_XPATH_COMBINE_TRAITS_BASE  = z.object({
    type: z.literal(PQC.XPATH_TRAIT_GROUP),
    groupType: z.union([z.literal(PQC.GROUPING_TYPES.AND), z.literal(PQC.GROUPING_TYPES.OR)])
});
/** @typedef {z.infer<typeof Z_PARSER_XPATH_COMBINE_TRAITS_BASE> & {expressions: (z.infer<typeof Z_PARSER_XPATH_TRAIT_EXPRESSION> | ParserQueryXPathTraits)[] }} ParserQueryXPathCombineTraits */
/** @type {z.ZodType<ParserQueryXPathCombineTraits>} */
const Z_PARSER_XPATH_COMBINE_TRAITS = Z_PARSER_XPATH_COMBINE_TRAITS_BASE.extend({
    expressions: z.array(Z_PARSER_XPATH_TRAIT_EXPRESSION.or(z.lazy(() => Z_PARSER_XPATH_TRAITS)))
});

const Z_PARSER_XPATH_NOT_TRAIT_BASE = z.object({
    type: z.literal(PQC.NOT)
});
/** @typedef {z.infer<typeof Z_PARSER_XPATH_NOT_TRAIT_BASE> & {expression: (z.infer<typeof Z_PARSER_XPATH_TRAIT_EXPRESSION> | ParserQueryXPathTraits)[] }} ParserQueryXPathNotTrait */
/** @type {z.ZodType<ParserQueryXPathNotTrait>} */
const Z_PARSER_XPATH_NOT_TRAIT = Z_PARSER_XPATH_NOT_TRAIT_BASE.extend({
    expression: Z_PARSER_XPATH_TRAIT_EXPRESSION.or(z.lazy(() => Z_PARSER_XPATH_TRAITS))
});

/** @typedef {z.infer<typeof Z_PARSER_XPATH_TRAITS>} ParserQueryXPathTraits */
const Z_PARSER_XPATH_TRAITS = Z_PARSER_XPATH_COMBINE_TRAITS.or(Z_PARSER_XPATH_NOT_TRAIT).or(Z_PARSER_XPATH_TRAIT_EXPRESSION);


const Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_XPATH_CONTEXT_NODE_BASE = z.object({
    type: z.literal(PQC.GET_DESCENDENTS)
}).or(z.object({
    type: z.literal(PQC.GET_UP_TO_NTH_ANCESTOR),
    n: z.number(),
})).or(z.object({
    type: z.literal(PQC.WITH_TRAITS),
    traits: Z_PARSER_XPATH_TRAITS
}));

/** @type {z.ZodType<ParserQueryTransformXPathContextNodeToXPathContextNode>} */
const Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_XPATH_CONTEXT_NODE = z.intersection(Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_XPATH_CONTEXT_NODE_BASE, z.object({
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE))
}));
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_XPATH_CONTEXT_NODE_BASE> & {then: ParserQueryTransformXPathContextNode[]}} ParserQueryTransformXPathContextNodeToXPathContextNode */

const Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_BASE = Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_STRING_ARRAY.or(Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_XPATH_CONTEXT_NODE);
/** @type {z.ZodType<ParserQueryTransformXPathContextNode>} */
const Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE = Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_BASE
    .or(Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_TO_XPATH_CONTEXT_NODE);
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE_BASE> | ParserQueryTransformXPathContextNodeToXPathContextNode} ParserQueryTransformXPathContextNode */

/// ParserQueryTransformXml

const Z_PARSER_QUERY_TRANSFORM_XML_TO_XPATH_CONTEXT_NODE = z.object({
    type: z.literal(PQC.TRANSFORM_XML_TO_XPATH_ROOT_CONTEXT_NODE),
    then: z.array(Z_PARSER_QUERY_TRANSFORM_XPATH_CONTEXT_NODE)
});

const Z_PARSER_QUERY_TRANSFORM_XML = Z_PARSER_QUERY_TRANSFORM_XML_TO_XPATH_CONTEXT_NODE;
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_XML>} ParserQueryTransformXML */

/// ParserQueryTransformJSON

const Z_PARSER_QUERY_TRANSFORM_JSON_ARRAY = Z_PARSER_QUERY_TRANSFORM_ARRAY_BASE.extend({
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_JSON))
});
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_JSON_ARRAY>} ParserQueryTransformJsonArray */

const Z_PARSER_QUERY_TRANSFORM_JSON_TO_STRING_ARRAY = z.object({
    type: z.literal(PQC.TO_STRING_ARRAY),
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY))
}).or(z.object({
    type: z.literal(PQC.GET_ALL_STRING_PROPERTY_VALUES),
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY))
}));

const Z_PARSER_QUERY_TRANSFORM_JSON_TO_JSON_BASE = z.object({
    type: z.literal(PQC.GET_DESCENDENTS_WITH_PROPERTY_NAME),
    propertyName: z.string(),
}).or(z.object({
    type: z.literal(PQC.FOR_EACH)
})).or(z.object({
    type: z.literal(PQC.GET_NTH_VALUE),
    n: z.number()
}));
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_JSON_TO_JSON_BASE> & {then: ParserQueryTransformJson[]}} ParserQueryTransformJsonToJson */
/** @type {z.ZodType<ParserQueryTransformJsonToJson>} */
const Z_PARSER_QUERY_TRANSFORM_JSON_TO_JSON = z.intersection(Z_PARSER_QUERY_TRANSFORM_JSON_TO_JSON_BASE, z.object({
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_JSON))
}));

const Z_PARSER_QUERY_TRANSFORM_JSON_BASE = Z_PARSER_QUERY_TRANSFORM_JSON_TO_STRING_ARRAY;
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_JSON_BASE> | ParserQueryTransformJsonToJson} ParserQueryTransformJson */
/** @type {z.ZodType<ParserQueryTransformJson>} */
const Z_PARSER_QUERY_TRANSFORM_JSON = Z_PARSER_QUERY_TRANSFORM_JSON_BASE
    .or(Z_PARSER_QUERY_TRANSFORM_JSON_TO_JSON);

/// ParserQueryTransformString

const Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_TO_STRING_ARRAY_BASE = z.object({
    type: z.literal(PQC.FILTER),
    conditions: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING_TO_BOOLEAN)),
}).or(z.object({
    type: z.literal(PQC.MAP),
    mapFn: z.lazy(() => Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING)
})).or(z.object({
    type: z.literal(PQC.DISTINCT)
}));
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_TO_STRING_ARRAY_BASE> & {then: ParserQueryTransformStringArray[]}} ParserQueryTransformStringArrayToStringArray */
/** @type {z.ZodType<ParserQueryTransformStringArrayToStringArray>} */
const Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_TO_STRING_ARRAY = z.intersection(Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_TO_STRING_ARRAY_BASE, z.object({
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY))
}));

/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_ARRAY_BASE> & {then: ParserQueryTransformString[]}} ParserQueryTransformStringArrayBase */
/** @type {z.ZodType<ParserQueryTransformStringArrayBase>} */
const Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_BASE = Z_PARSER_QUERY_TRANSFORM_ARRAY_BASE.extend({
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING))
})
/** @typedef {ParserQueryTransformStringArrayBase | ParserQueryTransformStringArrayToStringArray} ParserQueryTransformStringArray */
/** @type {z.ZodType<ParserQueryTransformStringArray>} */
const Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY = Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_BASE.or(Z_PARSER_QUERY_TRANSFORM_STRING_ARRAY_TO_STRING_ARRAY);

/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_STRING_TO_OUTPUT>} ParserQueryTransformStringToOutput */
const Z_PARSER_QUERY_TRANSFORM_STRING_TO_OUTPUT = z.object({
    type: z.literal(PQC.TRANSFORM_TEXT_TO_IMPORT_FILE_NAME)
}).or(z.object({
    type: z.literal(PQC.TRANSFORM_TEXT_TO_ADDITIONAL_URL),
    depthAllowed: z.number()
}));

const Z_PARSER_QUERY_TRANSFORM_STRING_TO_BOOLEAN = z.object({
    type: z.literal(PQC.STARTS_WITH),
    prefixes: z.array(z.string()),
    caseSensitive: z.boolean()
}).or(z.object({
    type: z.literal(PQC.ENDS_WITH),
    suffixes: z.array(z.string()),
    caseSensitive: z.boolean()
}));

const Z_PARSER_QUERY_TRANSFORM_STRING_TO_XML = z.object({
    type: z.literal(PQC.TRANSFORM_TEXT_AS_HTML_TO_XML),
    then: z.array(Z_PARSER_QUERY_TRANSFORM_XML)
});

const Z_PARSER_QUERY_TRANSFORM_STRING_TO_JSON = z.object({
    type: z.literal(PQC.TRANSFORM_TEXT_TO_JSON),
    then: z.array(Z_PARSER_QUERY_TRANSFORM_JSON)
});

const Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING_BASE = z.object({
    type: z.literal(PQC.TRANSFORM_TEXT_TO_LOWERCASE)
});

/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING_BASE> & {then: ParserQueryTransformString[]}} ParserQueryTransformStringToStringUncond */
/** @type {z.ZodType<ParserQueryTransformStringToStringUncond>} */
const Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING_UNCOND = Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING_BASE.extend({
    then: z.lazy(() => z.array(Z_PARSER_QUERY_TRANSFORM_STRING))
});
/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING>} ParserQueryTransformStringToString */
const Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING = ParserQuerySameTypeToTypeGenerics(Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING_UNCOND, Z_PARSER_QUERY_TRANSFORM_STRING_TO_BOOLEAN);

/** @typedef {z.infer<typeof Z_PARSER_QUERY_TRANSFORM_STRING>} ParserQueryTransformString */
export const Z_PARSER_QUERY_TRANSFORM_STRING = Z_PARSER_QUERY_TRANSFORM_STRING_TO_XML
    .or(Z_PARSER_QUERY_TRANSFORM_STRING_TO_JSON)
    .or(Z_PARSER_QUERY_TRANSFORM_STRING_TO_BOOLEAN)
    .or(Z_PARSER_QUERY_TRANSFORM_STRING_TO_STRING)
    .or(Z_PARSER_QUERY_TRANSFORM_STRING_TO_OUTPUT);
