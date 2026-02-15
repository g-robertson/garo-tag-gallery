/** @import {DBJoinedUser} from "../../db/user.js" */

import getMe from "../../api/client-get/me.js";
import { State } from "./state.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "./defaults.js";

export const SCOPES = /** @type {const} */ ({
    LOCAL_TAG_SERVICES: "LTS",
    LOCAL_TAGGABLE_SERVICES: "LTgbS",
    LOCAL_METRIC_SERVICES: "LMS",
    LOCAL_URL_GENERATOR_SERVICES: "LUGS"
});
/** @typedef {(typeof SCOPES)[keyof typeof SCOPES]} PermissionObjectScope */

/** @type {undefined} */
export const SYSTEM_USER_ID = undefined;

/**
 * @typedef {Object} Permission
 * @property {string} name
 * @property {PermissionObjectScope[]} objectScopes
 **/
export const PERMISSIONS = /** @type {const} */ ({
    ADMINISTRATIVE: {
        CREATE_LOCAL_TAG_SERVICE: {
            name: "A.CLTS",
            objectScopes: []
        },
        UPDATE_LOCAL_TAG_SERVICE: {
            name: "A.ULTS",
            objectScopes: []
        },
        DELETE_LOCAL_TAG_SERVICE: {
            name: "A.DLTS",
            objectScopes: []
        },
        CREATE_LOCAL_TAGGABLE_SERVICE: {
            name: "A.CLTgbS",
            objectScopes: []
        },
        UPDATE_LOCAL_TAGGABLE_SERVICE: {
            name: "A.ULTgbS",
            objectScopes: []
        },
        DELETE_LOCAL_TAGGABLE_SERVICE: {
            name: "A.DLTgbS",
            objectScopes: []
        },
        CREATE_LOCAL_METRIC_SERVICE: {
            name: "A.CLMS",
            objectScopes: []
        },
        UPDATE_LOCAL_METRIC_SERVICE: {
            name: "A.ULMS",
            objectScopes: []
        },
        DELETE_LOCAL_METRIC_SERVICE: {
            name: "A.DLMS",
            objectScopes: []
        },
        CREATE_URL_GENERATOR_SERVICE: {
            name: "A.CUGS",
            objectScopes: []
        },
        UPDATE_URL_GENERATOR_SERVICE: {
            name: "A.UUGS",
            objectScopes: []
        },
        DELETE_URL_GENERATOR_SERVICE: {
            name: "A.DUGS",
            objectScopes: []
        },
        IMPORT: {
            name: "A.Import",
            objectScopes: []
        }
    },
    LOCAL_TAG_SERVICES: {
        CREATE_TAGS: {
            name: "LTS.CT",
            objectScopes: [SCOPES.LOCAL_TAG_SERVICES]
        },
        READ_TAGS: {
            name: "LTS.RT",
            objectScopes: [SCOPES.LOCAL_TAG_SERVICES]
        },
        APPLY_TAGS: {
            name: "LTS.AT",
            objectScopes: [SCOPES.LOCAL_TAG_SERVICES]
        },
        DELETE_TAGS: {
            name: "LTS.DT",
            objectScopes: [SCOPES.LOCAL_TAG_SERVICES]
        }
    },
    LOCAL_TAGGABLE_SERVICES: {
        CREATE_TAGGABLES: {
            name: "LTgbS.CT",
            objectScopes: [SCOPES.LOCAL_TAGGABLE_SERVICES]
        },
        READ_TAGGABLES: {
            name: "LTgbS.RT",
            objectScopes: [SCOPES.LOCAL_TAGGABLE_SERVICES]
        },
        UPDATE_TAGGABLES: {
            name: "LTgbS.UT",
            objectScopes: [SCOPES.LOCAL_TAGGABLE_SERVICES]
        },
        TRASH_TAGGABLES: {
            name: "LTgbS.TT",
            objectScopes: [SCOPES.LOCAL_TAGGABLE_SERVICES]
        },
    },
    LOCAL_METRIC_SERVICES: {
        CREATE_METRIC: {
            name: "LMS.CM",
            objectScopes: [SCOPES.LOCAL_METRIC_SERVICES]
        },
        READ_METRIC: {
            name: "LMS.RM",
            objectScopes: [SCOPES.LOCAL_METRIC_SERVICES]
        },
        UPDATE_METRIC: {
            name: "LMS.UM",
            objectScopes: [SCOPES.LOCAL_METRIC_SERVICES]
        },
        DELETE_METRIC: {
            name: "LMS.DM",
            objectScopes: [SCOPES.LOCAL_METRIC_SERVICES]
        },
        APPLY_METRIC: {
            name: "LMS.AM",
            objectScopes: [SCOPES.LOCAL_METRIC_SERVICES]
        },
    },
    LOCAL_URL_GENERATOR_SERVICES: {
        CREATE_URL_GENERATOR: {
            name: "LUGS.CUG",
            objectScopes: [SCOPES.LOCAL_URL_GENERATOR_SERVICES]
        }
    }
});

export class User {
    #id;
    #name;
    #isAdmin = false;
    #createdDate;
    /** @type {State<DBJoinedUser['Local_Tag_Services']} */
    #localTagServices = new State();
    /** @type {State<DBJoinedUser['Local_Taggable_Services']} */
    #localTaggableServices = new State();
    #localURLGeneratorServices;
    /** @type {State<DBJoinedUser['Local_Metric_Services']} */
    #localMetricServices = new State();

    #pages;

    #permissions;
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
        this.#localTaggableServices.set(json.Local_Taggable_Services ?? []);
        this.#localMetricServices.set(json.Local_Metric_Services ?? []);
        this.#localURLGeneratorServices = json.Local_URL_Generator_Services ?? [];

        this.#pages = json.JSON_Pages;
        this.#permissions = new Set(json.Permissions);
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
        User.#Gl_User.#localTagServices.consume(oldGlobal.#localTagServices);
        User.#Gl_User.#localTaggableServices.consume(oldGlobal.#localTaggableServices);
        User.#Gl_User.#localMetricServices.consume(oldGlobal.#localMetricServices);
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

    localTagServicesState() {
        return this.#localTagServices.asConst();
    }

    /**
     * @param {DBJoinedUser['Local_Tag_Services']} localTagServices 
     */
    static #transformLocalTagServicesAvailable(localTagServices) {
        return [SYSTEM_LOCAL_TAG_SERVICE].concat(
            localTagServices.filter(localTagService => localTagService.Permissions.has(PERMISSIONS.LOCAL_TAG_SERVICES.READ_TAGS.name))
        );
    }

    localTagServicesAvailable() {
        return User.#transformLocalTagServicesAvailable(this.localTagServices());
    }

    /**
     * @param {(() => void)[]} addToCleanup 
     */
    localTagServicesAvailableState(addToCleanup) {
        return this.#localTagServices.asTransform(User.#transformLocalTagServicesAvailable, addToCleanup);
    }

    /**
     * @param {DBJoinedUser['Local_Tag_Services']} localTagServices 
     */
    setLocalTagServices(localTagServices) {
        this.#localTagServices.set(localTagServices);
    }

    localTaggableServices() {
        return this.#localTaggableServices.get();
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

    localMetricServicesState() {
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
     * @param {Permission | Permission[]} permissionsToCheck 
     */
    hasPermissions(permissionsToCheck) {
        if (!(permissionsToCheck instanceof Array)) {
            permissionsToCheck = [permissionsToCheck];
        }

        if (this.#sudo) {
            return true;
        }

        for (const permissionToCheck of permissionsToCheck) {
            if (!this.#permissions.has(permissionToCheck.name)) {
                return false;
            }
        }

        return true;
    }

    permissions() {
        return this.#permissions;
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
            Permissions: [...this.#permissions]
        };
    }
}