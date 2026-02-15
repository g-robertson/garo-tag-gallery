import { mapNullCoalesce } from "../client/js/client-util.js";
import { SYSTEM_LOCAL_TAG_SERVICE } from "../client/js/defaults.js";
import { SYSTEM_GENERATED, localTagsPKHash, mapLookupNameToPreInsertSystemTag, normalPreInsertLocalTag } from "../client/js/tags.js";
import { PERMISSIONS, User } from "../client/js/user.js";
import {asyncDataSlicer, dball, dballselect, dbBeginTransaction, dbEndTransaction, dbget, dbrun, dbsqlcommand, dbtuples, dbvariablelist} from "./db-util.js";
import { Services, ServicesUsersPermissions, userSelectAllSpecificTypedServicesHelper } from "./services.js";

/** @import {DBService} from "./services.js" */
/** @import {Databases} from "./db-util.js" */

/**
 * @param {PreInsertLocalTag & {Tag_ID: bigint}} systemTag 
 */
export function insertSystemTag(systemTag) {
    return [
        dbsqlcommand(`
            INSERT INTO Tags(
                Tag_ID
            ) VALUES (
                $systemTagID
            );
        `, {
            $systemTagID: Number(systemTag.Tag_ID),
        }),
        dbsqlcommand(`
            INSERT INTO Local_Tags(
                Tag_ID,
                Local_Tag_Service_ID,
                Lookup_Name,
                Source_Name,
                Local_Tags_PK_Hash,
                Display_Name
            ) VALUES (
                $systemTagID,
                $systemLocalTagServiceID,
                $systemTagLookupName,
                $systemTagSourceName,
                $systemTagPKHash,
                $systemTagDisplayName
            );
        `, {
            $systemTagID: Number(systemTag.Tag_ID),
            $systemLocalTagServiceID: SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID,
            $systemTagLookupName: systemTag.Lookup_Name,
            $systemTagSourceName: systemTag.Source_Name,
            $systemTagPKHash: localTagsPKHash(systemTag.Lookup_Name, systemTag.Source_Name),
            $systemTagDisplayName: systemTag.Display_Name,
        })
    ];
}

/**
 * @typedef {Object} DBLocalTagService
 * @property {number} Local_Tag_Service_ID
 * @property {number} Tag_Service_ID
 * @property {number} User_Editable
 */

/**
 * @typedef {DBLocalTagService & DBService} DBJoinedLocalTagService
 */
/** @typedef {DBJoinedLocalTagService & {Permissions: Set<string>}} DBPermissionedLocalTagService */

export class LocalTagServices {
    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagIDs
     */
    static async selectManyByLocalTagIDs(dbs, localTagIDs) {
        /** @type {number} */
        const localTagIDsPresent = (await dbget(dbs, `
                SELECT COUNT(1) AS Count
                FROM Local_Tags
                WHERE Local_Tag_ID IN ${dbvariablelist(localTagIDs.length)}
            `, localTagIDs
        )).Count;

        /** @type {DBJoinedLocalTagService[]} */
        const localTagServices = (await dballselect(dbs, `
            SELECT DISTINCT LTS.*, S.*
              FROM Local_Tag_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID
              JOIN Local_Tags LT ON LTS.Local_Tag_Service_ID = LT.Local_Tag_Service_ID
              WHERE LT.Local_Tag_ID IN ${dbvariablelist(localTagIDs.length)}
            `, localTagIDs
        ));

        return {
            allLocalTagsExist: localTagIDsPresent === localTagIDs.length,
            localTagServices
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagServiceID 
     * @returns {Promise<DBJoinedLocalTagService[]>}
     */
    static async selectManyByIDs(dbs, localTagServiceIDs) {
        return await dballselect(dbs, `
            SELECT *
              FROM Local_Tag_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID
              WHERE LTS.Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)};
            `, localTagServiceIDs
        );
    }
     
    /**
     * @param {Databases} dbs 
     * @param {number} localTagServiceID 
     */
    static async selectByID(dbs, localTagServiceID) {
        return (await LocalTagServices.selectManyByIDs(dbs, [localTagServiceID]))[0];
    }
    
    /**
     * @param {Databases} dbs 
     * @returns {Promise<DBJoinedLocalTagService[]>}
     */
    static async selectAll(dbs) {
        return await dballselect(dbs, `
            SELECT *
              FROM Local_Tag_Services LTS
              JOIN Services S ON LTS.Service_ID = S.Service_ID;
        `);
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user
     * @param {string[]} permissionsToCheck
     * @param {number[]} localTagServiceIDs
     * @returns {Promise<DBPermissionedLocalTagService[]>}
     */
    static async userSelectManyByIDs(dbs, user, permissionsToCheck, localTagServiceIDs) {
        if (user.isSudo() || user.hasPermissions(permissionsToCheck)) {
            return await LocalTagServices.selectManyByIDs(dbs, localTagServiceIDs);
        }

        return await dballselect(dbs, `
            SELECT LTS.*, S.*
            FROM Local_Tag_Services LTS
            JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
            JOIN Services S ON LTS.Service_ID = S.Service_ID
            WHERE (
                SELECT COUNT(1)
                FROM Services_Users_Permissions SUP
                WHERE LTS.Service_ID = SUP.Service_ID
                AND SUP.User_ID = ?
                AND SUP.Permission IN ${dbvariablelist(permissionsToCheck.length)}
            ) = ?
            AND LTS.Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)};
        `, [
            user.id(),
            permissionsToCheck,
            permissionsToCheck.length,
            ...localTagServiceIDs
        ]);
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]} permissionsToCheck 
     * @param {number} localTagServiceID 
     */
    static async userSelectByID(dbs, user, permissionsToCheck, localTagServiceID) {
        return (await LocalTagServices.userSelectManyByIDs(dbs, user, permissionsToCheck, [localTagServiceID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {User} user 
     * @param {string[]} permissionsToCheck 
     */
    static async userSelectAll(dbs, user, permissionsToCheck) {
        const userSelectedPermissionedLocalTagServices = await userSelectAllSpecificTypedServicesHelper(
            dbs,
            user,
            LocalTagServices.selectAll,
            async () => {
                return await dballselect(dbs, `
                    SELECT LTS.Local_Tag_Service_ID, SUP.Permission
                      FROM Local_Tag_Services LTS
                      JOIN Services_Users_Permissions SUP ON LTS.Service_ID = SUP.Service_ID
                     WHERE SUP.User_ID = $userID;
                `, {$userID: user.id()});
            },
            "Local_Tag_Service_ID",
            permissionsToCheck
        );

        return userSelectedPermissionedLocalTagServices.filter(dbLocalTagService => dbLocalTagService.User_Editable !== 0);
    }
    
    /**
     * @param {Databases} dbs
     * @param {number} userID
     * @param {string} serviceName
     */
    static async userInsert(dbs, userID, serviceName) {
        dbs = await dbBeginTransaction(dbs);

        const serviceID = await Services.insert(dbs, serviceName);
        await ServicesUsersPermissions.insertMany(dbs, serviceID, userID, Object.values(PERMISSIONS.LOCAL_TAG_SERVICES).map(permission => permission.name));

        /** @type {number} */
        const localTagServiceID = (await dbget(dbs, `
            INSERT INTO Local_Tag_Services(
                Service_ID
            ) VALUES (
                $serviceID
            ) RETURNING Local_Tag_Service_ID;
        `, {
            $serviceID: serviceID
        })).Local_Tag_Service_ID;

        await dbEndTransaction(dbs);

        return localTagServiceID;
    }
    
    /**
     * @param {Databases} dbs
     * @param {number} localTagServiceID
     * @param {string} serviceName
     */
    static async update(dbs, localTagServiceID, serviceName) {
        const localTagService = await LocalTagServices.selectByID(dbs, localTagServiceID);
        await Services.update(dbs, localTagService.Service_ID, serviceName);

        return localTagServiceID;
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localTagServiceID 
     */
    static async deleteByID(dbs, localTagServiceID) {
        dbs = await dbBeginTransaction(dbs);

        const localTagService = await LocalTagServices.selectByID(dbs, localTagServiceID);
        await Services.deleteByID(dbs, localTagService.Service_ID);

        const localTagServiceTags = await LocalTags.selectManyByLocalTagServiceID(dbs, localTagServiceID);
        await LocalTags.deleteMany(dbs, localTagServiceTags);
        await dbrun(dbs, "DELETE FROM Local_Tag_Services WHERE Local_Tag_Service_ID = $localTagServiceID;", { $localTagServiceID: localTagServiceID });

        await dbEndTransaction(dbs);
    }
}

/**
 * @typedef {Object} UserFacingLocalTag
 * @property {number} Local_Tag_ID
 * @property {number} Local_Tag_Service_ID
 * @property {bigint} Tag_ID
 * @property {string} Lookup_Name
 * @property {string} Source_Name
 * @property {string} Display_Name
 */

/**
 * @typedef {Object} UserFacingLocalTagGroup
 * @property {string[]} Namespaces
 * @property {string} Client_Display_Name
 * @property {string} Lookup_Name
 * @property {number} Tag_Count
 * @property {UserFacingLocalTag[]} tags
 */

/**
 * @param {Databases} dbs
 * @param {Omit<UserFacingLocalTag, "Namespaces" | "Client_Display_Name">[]} dbUserFacingLocalTags
 * @param {string=} tagCountSearchCriteria
 */
async function mapUserFacingLocalTags(dbs, dbUserFacingLocalTags, tagCountSearchCriteria) {
    dbUserFacingLocalTags = dbUserFacingLocalTags.map(dbUserFacingLocalTag => ({
        ...dbUserFacingLocalTag,
        Display_Name: dbUserFacingLocalTag.Display_Name,
        Tag_ID: BigInt(dbUserFacingLocalTag.Tag_ID)
    }));

    /** @type {Map<bigint, string[]} */
    const tagsNamespaces = new Map(dbUserFacingLocalTags.map(dbUserFacingLocalTag => [dbUserFacingLocalTag.Tag_ID, []]));
    for (const {Tag_ID, Namespace_Name} of await TagsNamespaces.selectManyMappedByTagIDs(dbs, dbUserFacingLocalTags.map(tag => tag.Tag_ID))) {
        tagsNamespaces.get(Tag_ID).push(Namespace_Name);
    }

    /** @type {Map<string, UserFacingLocalTagGroup>} */
    const userFacingTagGroups = new Map();
    for (const dbUserFacingLocalTag of dbUserFacingLocalTags) {
        const Namespaces = tagsNamespaces.get(dbUserFacingLocalTag.Tag_ID);
        let Client_Display_Name = dbUserFacingLocalTag.Display_Name;
        if (Namespaces.length === 1) {
            Client_Display_Name = `${Namespaces[0]}:${Client_Display_Name}`;
        } else if (Namespaces.length > 1) {
            Client_Display_Name = `multi-namespaced:${Client_Display_Name}`;
        }

        const tagGroupName = `${Namespaces.join('\x01')}\x02${dbUserFacingLocalTag.Lookup_Name}`;
        const tagGroup = mapNullCoalesce(userFacingTagGroups, tagGroupName, {
            Namespaces,
            Client_Display_Name,
            Lookup_Name: dbUserFacingLocalTag.Lookup_Name,
            tags: []
        });
        
        tagGroup.tags.push(dbUserFacingLocalTag);
    }

    const tagGroups = [...userFacingTagGroups.values()];
    const tagGroupTagIDs = tagGroups.map(tagGroup => tagGroup.tags.map(tag => tag.Tag_ID));
    const {tagGroupsTaggableCounts} = await dbs.perfTags.readTagGroupsTaggableCounts(tagGroupTagIDs, tagCountSearchCriteria);

    return tagGroups.map((tagGroup, index) => ({
        ...tagGroup,
        Tag_Count: tagGroupsTaggableCounts[index]
    }));
}

export class UserFacingLocalTags {
    /**
     * @param {Databases} dbs 
     * @param {bigint[]} taggableIDs 
     * @param {number[]} localTagServiceIDs 
     * @param {string=} tagCountSearchCriteria
     */
    static async selectMappedByTaggableIDs(dbs, taggableIDs, localTagServiceIDs, tagCountSearchCriteria) {
        /** @type {Map<bigint, Awaited<ReturnType<UserFacingLocalTags.selectManyByTagIDs>>>} */
        const taggablesUserFacingLocalTags = new Map(taggableIDs.map(taggableID => [taggableID, []]));
        if (localTagServiceIDs.length === 0) {
            return taggablesUserFacingLocalTags;
        }
        const {taggablePairings} = await dbs.perfTags.readTaggablesTags(taggableIDs, dbs.inTransaction);
        /** @type {Set<bigint>} */
        const allTagIDs = new Set();
        for (const tagIDs of taggablePairings.values()) {
            for (const tagID of tagIDs) {
                allTagIDs.add(tagID);
            }
        }
        
        const userFacingLocalTags = await UserFacingLocalTags.selectManyByTagIDs(dbs, allTagIDs, localTagServiceIDs, tagCountSearchCriteria);
        const userFacingLocalTagsMap = new Map();
        for (const userFacingLocalTag of userFacingLocalTags) {
            for (const tag of userFacingLocalTag.tags) {
                userFacingLocalTagsMap.set(tag.Tag_ID, userFacingLocalTag);
            }
        }

        for (const [taggableID, tagIDs] of taggablePairings) {
            taggablesUserFacingLocalTags.set(taggableID, [...new Set(tagIDs.map(
                tagID => userFacingLocalTagsMap.get(tagID)
            ).filter(tag => tag !== undefined))]);
        }

        return taggablesUserFacingLocalTags;
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} namespaceIDs 
     * @param {number[]} localTagServiceIDs 
     */
    static async selectManyByNamespaceIDs(dbs, namespaceIDs, localTagServiceIDs) {
        /** @type {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} */
        const dbUserFacingLocalTags = await dballselect(dbs, `
            SELECT LT.Tag_ID, LT.Local_Tag_ID, LT.Display_Name, LT.Lookup_Name, LT.Source_Name, LT.Local_Tag_Service_ID
              FROM Local_Tags LT
              JOIN Tags T ON LT.Tag_ID = T.Tag_ID
              JOIN Tags_Namespaces TN ON T.Tag_ID = TN.Tag_ID
             WHERE LT.Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
               AND TN.Namespace_ID IN ${dbvariablelist(namespaceIDs.length)}
            ;`, [...localTagServiceIDs, ...namespaceIDs]
        );

        return await mapUserFacingLocalTags(dbs, dbUserFacingLocalTags);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {number} namespaceID
     * @param {number[]} localTagServiceIDs 
     */
    static async selectManyByNamespaceID(dbs, namespaceID, localTagServiceIDs) {
        return await UserFacingLocalTags.selectManyByNamespaceIDs(dbs, [namespaceID], localTagServiceIDs);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagServiceIDs
     * @param {string=} tagCountSearchCriteria
     */
    static async selectManyByLocalTagServiceIDs(dbs, localTagServiceIDs, tagCountSearchCriteria) {
        /** @type {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} */
        const dbUserFacingLocalTags = await dballselect(dbs, `
            SELECT Tag_ID, Local_Tag_ID, Display_Name, Lookup_Name, Source_Name, Local_Tag_Service_ID
              FROM Local_Tags
             WHERE Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
            ;`, localTagServiceIDs
        );

        return await mapUserFacingLocalTags(dbs, dbUserFacingLocalTags, tagCountSearchCriteria);
    }

    /**
     * @param {Databases} dbs 
     * @param {Iterable<bigint>} tagIDsIterable 
     * @param {number[]} localTagServiceIDs
     * @param {string=} tagCountSearchCriteria
     * @returns {ReturnType<typeof mapUserFacingLocalTags>}
     */
    // TODO: this could be sped up by using a select all with limit cache if the count of tag id's is not too many but not too few (ie. 10K < x < 10M)
    static async selectManyByTagIDs(dbs, tagIDsIterable, localTagServiceIDs, tagCountSearchCriteria) {
        const tagIDs = [...tagIDsIterable].map(tagID => Number(tagID));

        if (tagIDs.length === 0 || localTagServiceIDs.length === 0) {
            return [];
        }
        if (tagIDs.length > 10000) {
            const slices = await asyncDataSlicer(tagIDs, 10000, (sliced) => UserFacingLocalTags.selectManyByTagIDs(dbs, sliced, localTagServiceIDs, tagCountSearchCriteria));
            return slices.flat();
        }

        /** @type {Omit<UserFacingLocalTag, "Namespaces" | "Tag_Name">[]} */
        const dbUserFacingLocalTags = await dballselect(dbs, `
            SELECT Tag_ID, Local_Tag_ID, Display_Name, Lookup_Name, Source_Name, Local_Tag_Service_ID
              FROM Local_Tags
            WHERE Tag_ID IN ${dbvariablelist(tagIDs.length)}
            AND Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
        `, [...tagIDs, ...localTagServiceIDs]);
        return await mapUserFacingLocalTags(dbs, dbUserFacingLocalTags, tagCountSearchCriteria);
    }
};

/**
 * @typedef {Object} DBTag
 * @property {bigint} Tag_ID
 * @property {number} Tag_Created_Date
 */

/**
 * @param {DBTag} dbTag
 */
function mapDBTag(dbTag) {
    return {
        ...dbTag,
        Tag_ID: BigInt(dbTag.Tag_ID)
    };
}

export class Tags {
    /**
     * @param {Databases} dbs
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static async uniqueInsertTagPairingsToTaggables(dbs, tagPairings) {
        const ok = await dbs.perfTags.insertTagPairings(tagPairings, dbs.inTransaction);
        if (!ok) {
            console.log(dbs.perfTags);
            throw "Perf tags failed to insert tag pairings";
        }
    }

    /**
     * @param {Databases} dbs
     * @param {Map<bigint, bigint[]>} tagPairings 
     */
    static async deleteTagPairingsFromTaggables(dbs, tagPairings) {
        const ok = await dbs.perfTags.deleteTagPairings(tagPairings, dbs.inTransaction);
        if (!ok) {
            console.log(dbs.perfTags);
            throw "Perf tags failed to insert tag pairings";
        }
    }

    /**
     * @param {Databases} dbs 
     * @param {number} amount 
     */
    static async insertMany(dbs, amount) {
        const now = Math.floor(Date.now() / 1000);
        const nows = [];
        for (let i = 0; i < amount; ++i) {
            nows.push(now);
        }

        /** @type {DBTag[]} */
        const dbTags = await dball(dbs, `INSERT INTO Tags(Tag_Created_Date) VALUES ${dbtuples(amount, 1)} RETURNING *;`, nows);
        return dbTags.map(mapDBTag);
    }

    /**
     * @param {Databases} dbs 
     */
    static async insert(dbs) {
        return (await Tags.insertMany(dbs, 1))[0];
    }
}


/**
 * @typedef {Object} PreInsertLocalTag
 * @property {string} Lookup_Name
 * @property {string} Source_Name
 * @property {string} Display_Name
 */

/**
 * @typedef {Object} DBLocalTag
 * @property {number} Local_Tag_ID
 * @property {string} Local_Tags_PK_Hash
 * @property {bigint} Tag_ID
 * @property {number} Local_Tag_Service_ID
 * @property {string} Lookup_Name
 * @property {string} Source_Name
 * @property {string} Display_Name
 */

/**
 * @param {DBLocalTag} dbLocalTag 
 * @returns 
 */
function mapDBLocalTag(dbLocalTag) {
    return {
        ...dbLocalTag,
        Tag_ID: BigInt(dbLocalTag.Tag_ID)
    }
}


export class LocalTags {
    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, string>} taggableToSystemTagLookupNameMap 
     */
    static async createTagPairingsFromTaggableToSystemTagLookupNameMap(dbs, taggableToSystemTagLookupNameMap) {
        const systemTagsMap = new Map((await LocalTags.uniqueInsertManySystemTags(dbs, [...taggableToSystemTagLookupNameMap.values()])).map(systemTag => [
            systemTag.Lookup_Name, systemTag
        ]));

        /** @type {Map<bigint, bigint[]>} */
        const tagPairings = new Map();
        for (const [taggableID, systemTagLookupName] of taggableToSystemTagLookupNameMap) {
            mapNullCoalesce(tagPairings, systemTagsMap.get(systemTagLookupName).Tag_ID, []).push(taggableID);
        }
        return tagPairings;
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} tagIDs 
     */
    static async selectManyByTagIDs(dbs, tagIDs) {
        if (tagIDs.length === 0) {
            return [];
        }

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `SELECT * FROM Local_Tags WHERE Tag_ID IN ${dbvariablelist(tagIDs.length)}`, tagIDs.map(tagID => Number(tagID)));
        return dbLocalTags.map(mapDBLocalTag);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} localTagIDs 
     */
    static async selectManyByIDs(dbs, localTagIDs) {
        if (localTagIDs.length === 0) {
            return [];
        }

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `SELECT * FROM Local_Tags WHERE Local_Tag_ID IN ${dbvariablelist(localTagIDs.length)}`, localTagIDs);
        return dbLocalTags.map(mapDBLocalTag);
    }
    /**
     * @param {Databases} dbs 
     * @param {number} localTagID 
     */
    static async selectByID(dbs, localTagID) {
        return (await LocalTags.selectManyByIDs(dbs, [localTagID]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {number} localTagServiceID 
     */
    static async selectManyByLocalTagServiceID(dbs, localTagServiceID) {
        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `SELECT * FROM Local_Tags WHERE Local_Tag_Service_ID = $localTagServiceID`, { $localTagServiceID: localTagServiceID});
        return dbLocalTags.map(mapDBLocalTag);
    }

    /**
     * @param {Databases} dbs 
     * @param {{Lookup_Name: string, Source_Name: string}[]} tagLookups 
     * @param {number} localTagServiceID
     */
    static async selectManyByFullLookups(dbs, tagLookups, localTagServiceID) {
        if (tagLookups.length === 0) {
            return [];
        }

        const tagPKHashes = tagLookups.map(tagLookup => localTagsPKHash(tagLookup.Lookup_Name, tagLookup.Source_Name));

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `SELECT * FROM Local_Tags WHERE Local_Tag_Service_ID = ? AND Local_Tags_PK_Hash IN ${dbvariablelist(tagPKHashes.length)};`, [localTagServiceID, ...tagPKHashes]);
        return dbLocalTags.map(mapDBLocalTag);
    }
    
    /**
     * @param {Databases} dbs 
     * @param {string[]} lookupNames 
     * @param {number[]} localTagServiceIDs
     */
    static async selectManyByLookupNames(dbs, lookupNames, localTagServiceIDs) {
        if (lookupNames.length === 0 || localTagServiceIDs.length === 0) {
            return [];
        }

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dballselect(dbs, `
            SELECT *
              FROM Local_Tags
             WHERE Local_Tag_Service_ID IN ${dbvariablelist(localTagServiceIDs.length)}
               AND Lookup_Name IN ${dbvariablelist(lookupNames.length)};`,
            [...localTagServiceIDs, ...lookupNames]
        );
        return dbLocalTags.map(mapDBLocalTag);
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} lookupNames 
     */
    static async selectManySystemTagsByLookupNames(dbs, lookupNames) {
        return await LocalTags.selectManyByFullLookups(dbs, lookupNames.map(mapLookupNameToPreInsertSystemTag), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalTag[]} localTags 
     * @param {number} localTagServiceID
     * @returns {Promise<DBLocalTag[]>}
     */
    static async insertMany(dbs, localTags, localTagServiceID) {
        if (typeof localTagServiceID !== "number") {
            throw "Tag insert call had non-numeric local tag service ID";
        }

        if (localTags.length === 0) {
            return [];
        }
        if (localTags.length > 2000) {
            dbs = await dbBeginTransaction(dbs);
            const slices = await asyncDataSlicer(localTags, 2000, (sliced) => LocalTags.insertMany(dbs, sliced, localTagServiceID));
            await dbEndTransaction(dbs);
            return slices.flat();
        }

        const tags = await Tags.insertMany(dbs, localTags.length);

        const tagInsertionParams = [];
        for (let i = 0; i < localTags.length; ++i) {
            const localTag = localTags[i];
            tagInsertionParams.push(Number(tags[i].Tag_ID));
            tagInsertionParams.push(localTagServiceID);
            tagInsertionParams.push(localTag.Lookup_Name);
            tagInsertionParams.push(localTag.Source_Name);
            tagInsertionParams.push(localTagsPKHash(localTag.Lookup_Name, localTag.Source_Name));
            tagInsertionParams.push(localTag.Display_Name);
        }

        /** @type {DBLocalTag[]} */
        const dbLocalTags = await dball(dbs, `
            INSERT INTO Local_Tags(
                Tag_ID,
                Local_Tag_Service_ID,
                Lookup_Name,
                Source_Name,
                Local_Tags_PK_Hash,
                Display_Name
            ) VALUES ${dbtuples(localTags.length, 6)} RETURNING *;
            `, tagInsertionParams
        );
        return dbLocalTags.map(mapDBLocalTag);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalTag} localTag
     * @param {number} localTagServiceID
     */
    static async insert(dbs, localTag, localTagServiceID) {
        return (await LocalTags.insertMany(dbs, [localTag], localTagServiceID))[0];
    }


    /**
     * @param {Databases} dbs 
     * @param {string[]} lookupNames
     */
    static async insertManySystemTags(dbs, lookupNames) {
        return (await LocalTags.insertMany(dbs, lookupNames.map(mapLookupNameToPreInsertSystemTag), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID));
    }

    /**
     * @param {Databases} dbs 
     * @param {string} lookupName
     */
    static async insertSystemTag(dbs, lookupName) {
        return (await LocalTags.insertManySystemTags(dbs, [lookupName]))[0];
    }

    /**
     * @param {Databases} dbs 
     * @param {PreInsertLocalTag[]} localTags
     * @param {number} localTagServiceID
     */
    static async uniqueInsertMany(dbs, localTags, localTagServiceID) {
        if (localTags.length === 0) {
            return [];
        }
        // dedupe
        localTags = [...(new Map(localTags.map(tag => [localTagsPKHash(tag.Lookup_Name, tag.Source_Name), tag]))).values()];

        const dbLocalTags = await LocalTags.selectManyByFullLookups(dbs, localTags, localTagServiceID);
        const dbLocalTagsExisting = new Set(dbLocalTags.map(dbTag => dbTag.Local_Tags_PK_Hash));
        const tagsToInsert = localTags.filter(localTag => !dbLocalTagsExisting.has(localTagsPKHash(localTag.Lookup_Name, localTag.Source_Name)));
        const insertedDBTags = await LocalTags.insertMany(dbs, tagsToInsert, localTagServiceID); 

        return dbLocalTags.concat(insertedDBTags);
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} lookupNames
     */
    static async uniqueInsertManySystemTags(dbs, lookupNames) {
        return await LocalTags.uniqueInsertMany(dbs, lookupNames.map(mapLookupNameToPreInsertSystemTag), SYSTEM_LOCAL_TAG_SERVICE.Local_Tag_Service_ID);
    }

    /**
     * @param {Databases} dbs 
     * @param {DBLocalTag[]} localTags
     */
    static async deleteMany(dbs, localTags) {
        if (localTags.length === 0) {
            return;
        }

        if (localTags.length > 10000) {
            dbs = await dbBeginTransaction(dbs);
            await asyncDataSlicer(localTags, 10000, (sliced) => LocalTags.deleteMany(dbs, sliced));
            await dbEndTransaction(dbs);
        }

        dbs = await dbBeginTransaction(dbs);

        await dbs.perfTags.deleteTags(localTags.map(localTag => localTag.Tag_ID), dbs.inTransaction);
        await dbrun(dbs, `DELETE FROM Local_Tags WHERE Local_Tag_ID IN ${dbvariablelist(localTags.length)}`, localTags.map(localTag => localTag.Local_Tag_ID));
        await dbrun(dbs, `DELETE FROM Tags WHERE Tag_ID IN ${dbvariablelist(localTags.length)}`, localTags.map(localTag => Number(localTag.Tag_ID)));

        await dbEndTransaction(dbs);
    }
    /**
     * @param {Databases} dbs 
     * @param {DBLocalTag} localTag 
     */
    static async delete(dbs, localTag) {
        return await LocalTags.deleteMany(dbs, [localTag]);
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} lookupNames
     */
    static async deleteManySystemTags(dbs, lookupNames) {
        const systemTags = await LocalTags.selectManySystemTagsByLookupNames(dbs, lookupNames);
        await LocalTags.deleteMany(dbs, systemTags);
    }
    /**
     * @param {Databases} dbs 
     * @param {string} lookupName
     */
    static async deleteSystemTag(dbs, lookupName) {
        await LocalTags.deleteManySystemTags(dbs, [lookupName]);
    }
};

/**
 * @typedef {Object} PreInsertTagNamespace
 * @property {bigint} Tag_ID
 * @property {number} Namespace_ID
 * 
 * @typedef {PreInsertTagNamespace & { Tags_Namespaces_PK_Hash: string }} PreparedPreInsertTagNamespace
 * @typedef {PreparedPreInsertTagNamespace & { Tags_Namespace_ID: number }} DBTagNamespace
 */

/**
 * @param {DBTagNamespace} dbTagNamespace 
 */
function mapDBTagNamespace(dbTagNamespace) {
    return {
        ...dbTagNamespace,
        Tag_ID: BigInt(dbTagNamespace.Tag_ID)
    };
}

export class TagsNamespaces {
    /**
     * @param {PreInsertTagNamespace} preInsertTagNamespace
     */
    static preparePreInsert(preInsertTagNamespace) {
        return {
            ...preInsertTagNamespace,
            Tags_Namespaces_PK_Hash: `${preInsertTagNamespace.Tag_ID}\x01${preInsertTagNamespace.Namespace_ID}`
        };
    }

    /**
     * @param {Databases} dbs 
     * @param {bigint[]} tagIDs
     * @returns {Promise<{Namespace_Name: string, Tag_ID: bigint}[]>}
     */
    static async selectManyMappedByTagIDs(dbs, tagIDs) {
        if (tagIDs.length === 0) {
            return [];
        }

        if (tagIDs.length > 10000) {
            const slices = await asyncDataSlicer(tagIDs, 10000, (sliced) => TagsNamespaces.selectManyMappedByTagIDs(dbs, sliced));
            return slices.flat();
        }
        
        return (await dballselect(dbs, `
            SELECT N.Namespace_Name, TN.Tag_ID
              FROM Tags_Namespaces TN
              JOIN Namespaces N ON TN.Namespace_ID = N.Namespace_ID
             WHERE TN.Tag_ID IN ${dbvariablelist(tagIDs.length)}`,
            tagIDs.map(tagID => Number(tagID))
        )).map(result => ({
            ...result,
            Tag_ID: BigInt(result.Tag_ID)
        }));
    }
    
    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertTagNamespace[]} tagsNamespaces 
     */
    static async selectMany(dbs, tagsNamespaces) {
        if (tagsNamespaces.length === 0) {
            return [];
        }

        /** @type {DBTagNamespace[]} */
        const dbTagsNamespaces = await dballselect(dbs,
            `SELECT * FROM Tags_Namespaces WHERE Tags_Namespaces_PK_Hash IN ${dbvariablelist(tagsNamespaces.length)};`,
            tagsNamespaces.map(tagNamespace => tagNamespace.Tags_Namespaces_PK_Hash)
        );
        return dbTagsNamespaces.map(mapDBTagNamespace);
    }

    /**
     * @param {Databases} dbs 
     * @param {number[]} namespaceIDs
     */
    static async selectManyByNamespaceIDs(dbs, namespaceIDs) {
        if (namespaceIDs.length === 0) {
            return [];
        }

        /** @type {DBTagNamespace[]} */
        const dbTagsNamespaces = await dballselect(dbs,
            `SELECT * FROM Tags_Namespaces WHERE Namespace_ID IN ${dbvariablelist(namespaceIDs.length)};`,
            namespaceIDs
        );
        return dbTagsNamespaces.map(mapDBTagNamespace);
    }

    /**
     * @param {Databases} dbs 
     * @param {PreparedPreInsertTagNamespace[]} tagsNamespaces 
     */
    static async insertMany(dbs, tagsNamespaces) {
        if (tagsNamespaces.length === 0) {
            return [];
        }

        const tagsNamespacesInsertionParams = [];
        for (const tagNamespace of tagsNamespaces) {
            tagsNamespacesInsertionParams.push(Number(tagNamespace.Tag_ID));
            tagsNamespacesInsertionParams.push(tagNamespace.Namespace_ID);
            tagsNamespacesInsertionParams.push(tagNamespace.Tags_Namespaces_PK_Hash);
        }

        const insertedDBTagNamespaces = await dball(dbs, `
            INSERT INTO Tags_Namespaces(
                Tag_ID,
                Namespace_ID,
                Tags_Namespaces_PK_Hash
            ) VALUES ${dbtuples(tagsNamespaces.length, 3)} RETURNING *;
            `, tagsNamespacesInsertionParams
        );
        return insertedDBTagNamespaces.map(mapDBTagNamespace);
    }

    /**
     * @param {Databases} dbs 
     * @param {Map<bigint, Iterable<string>>} tagNamespacePairings 
     */
    static async uniqueInsertMany(dbs, tagNamespacePairings) {
        if (tagNamespacePairings.size === 0) {
            return [];
        }

        /** @type {Set<string>} */
        const allNamespaces = new Set();

        for (const Namespace_Names of tagNamespacePairings.values()) {
            for (const Namespace_Name of Namespace_Names) {
                allNamespaces.add(Namespace_Name);
            }
        }
        const namespaceMap = new Map((await Namespaces.uniqueInsertMany(dbs, [...allNamespaces])).map(dbNamespace => [
            dbNamespace.Namespace_Name,
            dbNamespace.Namespace_ID
        ]));

        /** @type {PreparedPreInsertTagNamespace[]} */
        let preparedTagsNamespaces = [];
        for (const [Tag_ID, Namespace_Names] of tagNamespacePairings) {
            for (const Namespace_Name of Namespace_Names) {
                preparedTagsNamespaces.push(TagsNamespaces.preparePreInsert({
                    Tag_ID,
                    Namespace_ID: namespaceMap.get(Namespace_Name)
                }));
            }
        }

        // dedupe
        preparedTagsNamespaces = [...(new Map(preparedTagsNamespaces.map(preparedTagNamespace => [preparedTagNamespace.Tags_Namespaces_PK_Hash, preparedTagNamespace]))).values()];

        const dbTagsNamespaces = await TagsNamespaces.selectMany(dbs, preparedTagsNamespaces);
        const dbTagsNamespacesExisting = new Set(dbTagsNamespaces.map(dbTagNamespace => dbTagNamespace.Tags_Namespaces_PK_Hash));
        const tagsNamespacesToInsert = preparedTagsNamespaces.filter(tagNamespace => !dbTagsNamespacesExisting.has(tagNamespace.Tags_Namespaces_PK_Hash));
        const insertedDBTagNamespaces = await TagsNamespaces.insertMany(dbs, tagsNamespacesToInsert);

        return dbTagsNamespaces.concat(insertedDBTagNamespaces);
    }
}

/**
 * @typedef {Object} DBNamespace
 * @property {number} Namespace_ID
 * @property {string} Namespace_Name
 * @property {number} Namespace_Created_Date
 */

export class Namespaces {
    /**
     * @param {Databases} dbs 
     * @param {string[]} namespaces 
     */
    static async selectMany(dbs, namespaces) {
        if (namespaces.length === 0) {
            return [];
        }

        /** @type {DBNamespace[]} */
        const dbNamespaces = await dballselect(dbs, `SELECT * FROM Namespaces WHERE Namespace_Name IN ${dbvariablelist(namespaces.length)};`, namespaces);
        return dbNamespaces;
    }

    /**
     * @param {Databases} dbs 
     */
    static async selectAll(dbs) {
        /** @type {DBNamespace[]} */
        const dbNamespaces = await dballselect(dbs, `SELECT * FROM Namespaces;`);
        return dbNamespaces;
    }

    /**
     * @param {Databases} dbs 
     * @param {string[]} namespaces 
     */
    static async insertMany(dbs, namespaces) {
        if (namespaces.length === 0) {
            return [];
        }

        /** @type {DBNamespace[]} */
        const insertedDBNamespaces = await dball(dbs, `
            INSERT INTO Namespaces(
                Namespace_Name
            ) VALUES ${dbtuples(namespaces.length, 1)} RETURNING *;
            `, namespaces
        );
        return insertedDBNamespaces;
    }

    /**
     * @param {Databases} dbs
     * @param {string[]} namespaces 
     */
    static async uniqueInsertMany(dbs, namespaces) {
        if (namespaces.length === 0) {
            return [];
        }
        // dedupe
        namespaces = [...new Set(namespaces)];

        const dbNamespaces = await Namespaces.selectMany(dbs, namespaces);
        const dbNamespacesExisting = new Set(dbNamespaces.map(dbNamespace => dbNamespace.Namespace_Name));
        const namespacesToInsert = namespaces.filter(namespace => !dbNamespacesExisting.has(namespace));
        const insertedDBNamespaces = await Namespaces.insertMany(dbs, namespacesToInsert);

        return dbNamespaces.concat(insertedDBNamespaces);
    }
}