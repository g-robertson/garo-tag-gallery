/** @import {DBJoinedUser} from "../../db/user.js" */

import getMe from "../../api/client-get/me.js";
import { State } from "../page/pages.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "./tags.js";

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
    /** @type {State<DBJoinedUser['Local_Tag_Services']} */
    #localTagServices = new State();
    #localTaggableServices;
    #localURLGeneratorServices;
    /** @type {State<DBJoinedUser['Local_Metric_Services']} */
    #localMetricServices = new State();

    #pages;

    #userManagementPermission;
    #localFileServicesPermission;
    #globalFileServicesPermission;
    #localMetricServicesPermission;
    #globalMetricServicesPermission;
    #localTagServicesPermission;
    #globalTagServicesPermission;
    #localTagRelationsServicesPermission;
    #globalTagRelationsServicesPermission;
    #localURLGeneratorServicesPermission;
    #globalURLGeneratorServicesPermission;
    #localURLClassifierServicesPermission;
    #globalURLClassifierServicesPermission;
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
        this.#id = json.User_ID ?? -1;
        this.#name = json.User_Name ?? "";
        this.#createdDate = json.User_Created_Date ?? 0;
        this.#isAdmin = json.Is_Administrator ?? false;
        this.#localTagServices.set(json.Local_Tag_Services ?? []);
        this.#localTaggableServices = json.Local_Taggable_Services ?? [];
        this.#localMetricServices.set(json.Local_Metric_Services ?? []);
        this.#localURLGeneratorServices = json.Local_URL_Generator_Services ?? [];

        this.#pages = json.JSON_Pages;
        this.#userManagementPermission = json.User_Management_Permission ?? 0;
        this.#localFileServicesPermission = json.Local_Taggable_Services_Permission ?? 0;
        this.#globalFileServicesPermission = json.Global_Taggable_Services_Permission ?? 0;
        this.#localMetricServicesPermission = json.Local_Metric_Services_Permission ?? 0;
        this.#globalMetricServicesPermission = json.Global_Metric_Services_Permission ?? 0;
        this.#localTagServicesPermission = json.Local_Tag_Services_Permission ?? 0;
        this.#globalTagServicesPermission = json.Global_Tag_Services_Permission ?? 0;
        this.#localTagRelationsServicesPermission = json.Local_Tag_Relations_Services_Permission ?? 0;
        this.#globalTagRelationsServicesPermission = json.Global_Tag_Relations_Services_Permission ?? 0;
        this.#localURLGeneratorServicesPermission = json.Local_URL_Generator_Services_Permission ?? 0;
        this.#globalURLGeneratorServicesPermission = json.Global_URL_Generator_Services_Permission ?? 0;
        this.#localURLClassifierServicesPermission = json.Local_URL_Classifier_Services_Permission ?? 0;
        this.#globalURLClassifierServicesPermission = json.Global_URL_Classifier_Services_Permission ?? 0;
        this.#localParserServicesPermission = json.Local_Parser_Services_Permission ?? 0;
        this.#globalParserServicesPermission = json.Global_Parser_Services_Permission ?? 0;
        this.#settingsPermission = json.Settings_Permission ?? 0;
        this.#advancedSettingsPermission = json.Advanced_Settings_Permission ?? 0;
    }

    static EmptyUser() {
        return new User({});
    }
    static #Gl_User = User.EmptyUser();

    static Global() {
        return this.#Gl_User;
    }

    /**
     * @param {User} newUser 
     */
    static makeGlobal(newUser) {
        const oldGlobal = User.#Gl_User;
        User.#Gl_User = newUser;
        User.#Gl_User.#localTagServices.consumeCallbacks(oldGlobal.#localTagServices);
        User.#Gl_User.#localMetricServices.consumeCallbacks(oldGlobal.#localMetricServices);
    }

    static async refreshGlobal() {
        const user = await getMe();
        User.makeGlobal(user);
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

    /**
     * @param {() => void} callback 
     * @param {(() => void)[]} addCleanupTo
     */
    addOnLocalTagServicesUpdatedCallback(callback, addCleanupTo) {
        return this.#localTagServices.addOnUpdateCallback(callback, {addCleanupTo});
    }

    localTagServices() {
        return this.#localTagServices.get();
    }

    localTagServicesRef() {
        return this.#localTagServices.asConst();
    }

    /**
     * @param {DBJoinedUser['Local_Tag_Services']} localTagServices 
     */
    static #transformLocalTagServicesAvailable(localTagServices) {
        return [SYSTEM_LOCAL_TAG_SERVICE].concat(
            localTagServices.filter(localTagService => (localTagService.Permission_Extent & PERMISSION_BITS.READ) === PERMISSION_BITS.READ)
        );
    }

    localTagServicesAvailable() {
        return User.#transformLocalTagServicesAvailable(this.localTagServices());
    }

    /**
     * @param {(() => void)[]} addToCleanup 
     */
    localTagServicesAvailableRef(addToCleanup) {
        return this.#localTagServices.asTransform(User.#transformLocalTagServicesAvailable, addToCleanup);
    }

    /**
     * @param {DBJoinedUser['Local_Tag_Services']} localTagServices 
     */
    setLocalTagServices(localTagServices) {
        this.#localTagServices.set(localTagServices);
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
        return this.#localMetricServices.get();
    }

    localMetricServicesRef() {
        return this.#localMetricServices.asConst();
    }

    /**
     * @param {ReturnType<typeof this.localMetricServices>} localMetricServices 
     */
    setLocalMetricServices(localMetricServices) {
        this.#localMetricServices.set(localMetricServices);
    }

    localURLGeneratorServices() {
        return this.#localURLGeneratorServices;
    }

    /**
     * @param {ReturnType<typeof this.localURLGeneratorServices>} localURLGeneratorServices 
     */
    setLocalURLGeneratorServices(localURLGeneratorServices) {
        this.#localURLGeneratorServices = localURLGeneratorServices;
    }

    pages() {
        return this.#pages;
    }

    /**
     * @param {ReturnType<typeof this.pages>} pages 
     */
    setPages(pages) {
        this.#pages = pages;
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
            return this.#localURLGeneratorServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_URL_GENERATOR_SERVICES) {
            return this.#globalURLGeneratorServicesPermission;
        } else if (permissionType === PERMISSIONS.LOCAL_URL_CLASSIFIER_SERVICES) {
            return this.#localURLClassifierServicesPermission;
        } else if (permissionType === PERMISSIONS.GLOBAL_URL_CLASSIFIER_SERVICES) {
            return this.#globalURLClassifierServicesPermission;
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

            Local_Tag_Services: this.#localTagServices.get(),
            Local_Taggable_Services: this.#localTaggableServices,
            Local_Metric_Services: this.#localMetricServices.get(),
            Local_URL_Generator_Services: this.#localURLGeneratorServices,

            JSON_Pages: this.#pages,

            Local_Taggable_Services_Permission: this.#localFileServicesPermission,
            Global_Taggable_Services_Permission: this.#globalFileServicesPermission,
            Local_Metric_Services_Permission: this.#localMetricServicesPermission,
            Global_Metric_Services_Permission: this.#globalMetricServicesPermission,
            Local_Tag_Services_Permission: this.#localTagServicesPermission,
            Global_Tag_Services_Permission: this.#globalTagServicesPermission,
            Local_Tag_Relations_Services_Permission: this.#localTagRelationsServicesPermission,
            Global_Tag_Relations_Services_Permission: this.#globalTagRelationsServicesPermission,
            Local_URL_Generator_Services_Permission: this.#localURLGeneratorServicesPermission,
            Global_URL_Generator_Services_Permission: this.#globalURLGeneratorServicesPermission,
            Local_URL_Classifier_Services_Permission: this.#localURLClassifierServicesPermission,
            Global_URL_Classifier_Services_Permission: this.#globalURLClassifierServicesPermission,
            Local_Parser_Services_Permission: this.#localParserServicesPermission,
            Global_Parser_Services_Permission: this.#globalParserServicesPermission,
            Settings_Permission: this.#settingsPermission,
            Advanced_Settings_Permission: this.#advancedSettingsPermission,
        };
    }
}