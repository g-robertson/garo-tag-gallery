import { z } from "zod";
import { SYSTEM_LOCAL_METRIC_SERVICE, SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/defaults.js";
import { Z_WANTED_FILE_FIELD, Z_WANTED_TAGGABLE_FIELD } from "../db/cursor-manager.js";
import { METRIC_TYPES } from "../client/js/metrics.js";

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
/** @typedef {z.infer<typeof Z_FILE_RELATION} FileRelation */
