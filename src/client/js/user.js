import { LocalTagService } from "./services/local-tag-service.js";
import { Service } from "./services/service.js";
import { TagService } from "./services/tag-service.js";
/** @import {DBJoinedUser} from "../../db/user.js" */

export const PERMISSIONS = Object.freeze({
    NONE: "NONE",
    USER_MANAGEMENT: "USER_MANAGEMENT",
    LOCAL_FILE_SERVICES: "LOCAL_FILE_SERVICES",
    GLOBAL_FILE_SERVICES: "GLOBAL_FILE_SERVICES",
    LOCAL_RATING_SERVICES: "LOCAL_RATING_SERVICES",
    GLOBAL_RATING_SERVICES: "GLOBAL_RATING_SERVICES",
    LOCAL_TAG_SERVICES: "LOCAL_TAG_SERVICES",
    GLOBAL_TAG_SERVICES: "GLOBAL_TAG_SERVICES",
    LOCAL_TAG_RELATIONS_SERVICES: "LOCAL_TAG_RELATIONS_SERVICES",
    GLOBAL_TAG_RELATIONS_SERVICES: "GLOBAL_TAG_RELATIONS_SERVICES",
    LOCAL_URL_GENERATOR_SERVICES: "LOCAL_URL_GENERATOR_SERVICES",
    GLOBAL_URL_GENERATOR_SERVICES: "GLOBAL_URL_GENERATOR_SERVICES",
    LOCAL_URL_CLASSIFIER_SERVICES: "LOCAL_URL_CLASSIFIER_SERVICES",
    GLOBAL_URL_CLASSIFIER_SERVICES: "GLOBAL_URL_CLASSIFIER_SERVICES",
    LOCAL_PARSER_SERVICES: "LOCAL_PARSER_SERVICES",
    GLOBAL_PARSER_SERVICES: "GLOBAL_PARSER_SERVICES",
    SETTINGS: "SETTINGS",
    ADVANCED_SETTINGS: "ADVANCED_SETTINGS",
});

/**
 * @typedef {(typeof PERMISSIONS)[keyof typeof PERMISSIONS]} PermissionType
 * @typedef {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15} PermissionInt
 */

export const PERMISSION_BITS = Object.freeze({
    CREATE: 8,
    READ: 4,
    UPDATE: 2,
    DELETE: 1
});
export const METHOD_TO_PERMISSION_BIT = Object.freeze({
    "GET": PERMISSION_BITS.READ,
    "POST": PERMISSION_BITS.UPDATE,
    "PUT": PERMISSION_BITS.CREATE,
    "DELETE": PERMISSION_BITS.DELETE
});

/** @typedef {"GET" | "POST" | "PUT" | "DELETE"} HTTPMethod */

export class User {
    #name;
    #createdDate;
    #userManagementPermission;
    #localFileServicesPermission;
    #globalFileServicesPermission;
    #localRatingServicesPermission;
    #globalRatingServicesPermission;
    #localTagServicesPermission;
    #globalTagServicesPermission;
    #localTagRelationsServicesPermission;
    #globalTagRelationsServicesPermission;
    #localUrlGeneratorServicesPermission;
    #globalUrlGeneratorServicesPermission;
    #localUrlClassifierServicesPermission;
    #globalUrlClassifierServicesPermission;
    #localParserServicesPermission;
    #globalParserServicesPermission;
    #settingsPermission;
    #advancedSettingsPermission;
    /** @type {Page[]} */
    #pages;
    /** @type {Service[]} */
    #services;

    /**
     * 
     * @param {DBJoinedUser} json 
     */
    constructor(json) {
        this.#name = json.User_Name;
        this.#createdDate = json.User_Created_Date;
        this.#userManagementPermission = json.User_Management_Permission;
        this.#localFileServicesPermission = json.Local_File_Services_Permission;
        this.#globalFileServicesPermission = json.Global_File_Services_Permission;
        this.#localRatingServicesPermission = json.Local_Rating_Services_Permission;
        this.#globalRatingServicesPermission = json.Global_Rating_Services_Permission;
        this.#localTagServicesPermission = json.Local_Tag_Services_Permission;
        this.#globalTagServicesPermission = json.Global_Tag_Services_Permission;
        this.#localTagRelationsServicesPermission = json.Local_Tag_Relations_Services_Permission;
        this.#globalTagRelationsServicesPermission = json.Global_Tag_Relations_Services_Permission;
        this.#localUrlGeneratorServicesPermission = json.Local_URL_Generator_Services_Permission;
        this.#globalUrlGeneratorServicesPermission = json.Global_URL_Generator_Services_Permission;
        this.#localUrlClassifierServicesPermission = json.Local_URL_Classifier_Services_Permission;
        this.#globalUrlClassifierServicesPermission = json.Global_URL_Classifier_Services_Permission;
        this.#localParserServicesPermission = json.Local_Parser_Services_Permission;
        this.#globalParserServicesPermission = json.Global_Parser_Services_Permission;
        this.#settingsPermission = json.Settings_Permission;
        this.#advancedSettingsPermission = json.Advanced_Settings_Permission;
        this.#pages = json['pages'] ?? [];
        this.#services = json['services'] ?? [];
    }

    /** @returns {TagService[]} */
    get tagServices() {
        return this.#services.filter(service => (service instanceof LocalTagService));
    }

    /**
     * 
     * @param {HTTPMethod} method 
     * @param {PermissionType | PermissionType[]} permissionTypes
     */
    hasPermissions(method, permissionTypes) {
        const permissionBitToCheck = METHOD_TO_PERMISSION_BIT[method];
        if (!(permissionTypes instanceof Array)) {
            permissionTypes = [permissionTypes];
        }

        for (const permissionType of permissionTypes) {
            if ((this.getPermission(permissionType) & permissionBitToCheck) === 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * 
     * @param {PermissionType} permissionType
     * @returns {PermissionInt}
     */
    getPermission(permissionType) {
        if (permissionType === PERMISSIONS.NONE) {
            return 15;
        } else if (permissionType === PERMISSIONS.USER_MANAGEMENT) {
            return this.#userManagementPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_FILE_SERVICES) {
            return this.#localFileServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_FILE_SERVICES) {
            return this.#globalFileServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_RATING_SERVICES) {
            return this.#localRatingServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_RATING_SERVICES) {
            return this.#globalRatingServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_TAG_SERVICES) {
            return this.#localTagServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_TAG_SERVICES) {
            return this.#globalTagServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_TAG_RELATIONS_SERVICES) {
            return this.#localTagRelationsServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_TAG_RELATIONS_SERVICES) {
            return this.#globalTagRelationsServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_URL_GENERATOR_SERVICES) {
            return this.#localUrlGeneratorServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_URL_GENERATOR_SERVICES) {
            return this.#globalUrlGeneratorServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_URL_CLASSIFIER_SERVICES) {
            return this.#localUrlClassifierServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_URL_CLASSIFIER_SERVICES) {
            return this.#globalUrlClassifierServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_PARSER_SERVICES) {
            return this.#localParserServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_PARSER_SERVICES) {
            return this.#globalParserServicesPermission;
        } else if (permissionType === PERMISSIONS.SETTINGS) {
            return this.#settingsPermission;
        } else if (permissionType === PERMISSIONS.ADVANCED_SETTINGS) {
            return this.#advancedSettingsPermission;
        }
    }

    /**
     * @returns {DBJoinedUser}
     */
    toJSON() {
        return {
            User_Name: this.#name,
            User_Created_Date: this.#createdDate,
            Local_File_Services_Permission: this.#localFileServicesPermission,
            Global_File_Services_Permission: this.#globalFileServicesPermission,
            Local_Rating_Services_Permission: this.#localRatingServicesPermission,
            Global_Rating_Services_Permission: this.#globalRatingServicesPermission,
            Local_Tag_Services_Permission: this.#localTagServicesPermission,
            Global_Tag_Services_Permission: this.#globalTagServicesPermission,
            Local_Tag_Relations_Services_Permission: this.#localTagRelationsServicesPermission,
            Global_Tag_Relations_Services_Permission: this.#globalTagRelationsServicesPermission,
            Local_URL_Generator_Services_Permission: this.#localUrlGeneratorServicesPermission,
            Global_URL_Generator_Services_Permission: this.#globalUrlGeneratorServicesPermission,
            Local_URL_Classifier_Services_Permission: this.#localUrlClassifierServicesPermission,
            Global_URL_Classifier_Services_Permission: this.#globalUrlClassifierServicesPermission,
            Local_Parser_Services_Permission: this.#localParserServicesPermission,
            Global_Parser_Services_Permission: this.#globalParserServicesPermission,
            Settings_Permission: this.#settingsPermission,
            Advanced_Settings_Permission: this.#advancedSettingsPermission,
        }
    }

    static EMPTY_USER = new User({});
}