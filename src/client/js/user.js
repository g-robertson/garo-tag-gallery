import {bjsonStringify} from "./client-util.js"
/** @import {DBJoinedUser} from "../../db/user.js" */

export const PERMISSIONS = Object.freeze({
    NONE: "NONE",
    USER_MANAGEMENT: "USER_MANAGEMENT",
    LOCAL_TAGGABLE_SERVICES: "LOCAL_TAGGABLE_SERVICES",
    GLOBAL_TAGGABLE_SERVICES: "GLOBAL_TAGGABLE_SERVICES",
    LOCAL_METRIC_SERVICES: "LOCAL_METRIC_SERVICES",
    GLOBAL_METRIC_SERVICES: "GLOBAL_METRIC_SERVICES",
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
    IS_ADMIN: "IS_ADMIN"
});

/**
 * @typedef {(typeof PERMISSIONS)[keyof typeof PERMISSIONS]} PermissionType
 * @typedef {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15} PermissionInt
 */

export const PERMISSION_BITS = Object.freeze({
    ALL: 15,
    CREATE: 8,
    READ: 4,
    UPDATE: 2,
    DELETE: 1,
    NONE: 0
});
export const METHOD_TO_PERMISSION_BIT = Object.freeze({
    "GET": PERMISSION_BITS.READ,
    "POST": PERMISSION_BITS.UPDATE,
    "PUT": PERMISSION_BITS.CREATE,
    "DELETE": PERMISSION_BITS.DELETE
});

/** @typedef {"GET" | "POST" | "PUT" | "DELETE"} HTTPMethod */

export class User {
    #id;
    #name;
    #isAdmin = false;
    #createdDate;
    #localTaggableServices;
    #localTagServices;
    #localMetricServices;

    #userManagementPermission;
    #localFileServicesPermission;
    #globalFileServicesPermission;
    #localMetricServicesPermission;
    #globalMetricServicesPermission;
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
    #sudo = false;

    /**
     * 
     * @param {DBJoinedUser} json 
     */
    constructor(json) {
        this.#id = json.User_ID;
        this.#name = json.User_Name;
        this.#createdDate = json.User_Created_Date;
        this.#isAdmin = json.Is_Administrator;
        this.#localTagServices = json.Local_Tag_Services;
        this.#localTaggableServices = json.Local_Taggable_Services;
        this.#localMetricServices = json.Local_Metric_Services;
        this.#userManagementPermission = json.User_Management_Permission;
        this.#localFileServicesPermission = json.Local_Taggable_Services_Permission;
        this.#globalFileServicesPermission = json.Global_Taggable_Services_Permission;
        this.#localMetricServicesPermission = json.Local_Metric_Services_Permission;
        this.#globalMetricServicesPermission = json.Global_Metric_Services_Permission;
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
    }

    id() {
        return this.#id;
    }

    name() {
        return this.#name;
    }

    isAdmin() {
        return this.#isAdmin;
    }

    isSudo() {
        return this.#sudo;
    }

    /**
     * @param {boolean} value 
     */
    setSudo(value) {
        this.#sudo = value;
    }

    localTagServices() {
        return this.#localTagServices;
    }

    /**
     * @param {ReturnType<typeof this.localTagServices>} localTagServices 
     */
    setLocalTagServices(localTagServices) {
        this.#localTagServices = localTagServices;
    }

    localTaggableServices() {
        return this.#localTaggableServices;
    }

    /**
     * @param {ReturnType<typeof this.localTaggableServices>} localTaggableServices 
     */
    setLocalTaggableServices(localTaggableServices) {
        this.#localTaggableServices = localTaggableServices;
    }

    localMetricServices() {
        return this.#localMetricServices;
    }

    /**
     * @param {ReturnType<typeof this.localMetricServices>} localMetricServices 
     */
    setLocalMetricServices(localMetricServices) {
        this.#localMetricServices = localMetricServices;
    }

    /**
     * @param {HTTPMethod | PermissionInt} permissionBitsToCheck 
     * @param {PermissionType | PermissionType[]} permissionTypes
     */
    hasPermissions(permissionBitsToCheck, permissionTypes) {
        if (this.#sudo) {
            return true;
        }

        if (typeof permissionBitsToCheck !== "number") {
            permissionBitsToCheck = METHOD_TO_PERMISSION_BIT[permissionBitsToCheck];
        }
        
        if (!(permissionTypes instanceof Array)) {
            permissionTypes = [permissionTypes];
        }

        for (const permissionType of permissionTypes) {
            if ((this.getPermission(permissionType) & permissionBitsToCheck) !== permissionBitsToCheck) {
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
        } else if (permissionType === PERMISSIONS.IS_ADMIN) {
            return this.#isAdmin ? 15 : 0;  
        } else if (permissionType === PERMISSIONS.USER_MANAGEMENT) {
            return this.#userManagementPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_TAGGABLE_SERVICES) {
            return this.#localFileServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_TAGGABLE_SERVICES) {
            return this.#globalFileServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_METRIC_SERVICES) {
            return this.#localMetricServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_METRIC_SERVICES) {
            return this.#globalMetricServicesPermission;
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
            User_ID: this.#id,
            User_Name: this.#name,
            User_Created_Date: this.#createdDate,
            Is_Administrator: this.#isAdmin,
            Local_Tag_Services: this.#localTagServices,
            Local_Taggable_Services: this.#localTaggableServices,
            Local_Metric_Services: this.#localMetricServices,
            Local_Taggable_Services_Permission: this.#localFileServicesPermission,
            Global_Taggable_Services_Permission: this.#globalFileServicesPermission,
            Local_Metric_Services_Permission: this.#localMetricServicesPermission,
            Global_Metric_Services_Permission: this.#globalMetricServicesPermission,
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
        };
    }

    static EMPTY_USER = new User({});
}