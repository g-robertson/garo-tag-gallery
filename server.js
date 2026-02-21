import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
import sqlite3 from 'better-sqlite3';
import migrate from "./src/migrations/migrate.js";
import { Users } from './src/db/user.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { appendFileSync, mkdirSync, readdirSync } from 'fs';
import PerfTags from './src/perf-binding/perf-tags.js';
import { randomBytes } from 'crypto';
import { rootedPath } from './src/util.js';
import multer from 'multer';
import { FileStorage } from './src/db/file-storage.js';
import { DATABASE_DIR, dbrun, PARTIAL_ZIPS_FOLDER, TMP_FOLDER } from './src/db/db-util.js';
import { JobManager } from './src/db/job-manager.js';
import { Mutex } from "async-mutex";
import { readdir } from 'fs/promises';
import { CursorManager, getCursorAsPath } from './src/db/cursor-manager.js';
import PerfImg from './src/perf-binding/perf-img.js';
import { NOT_A_PARTIAL_UPLOAD } from './src/api/client-get/non-partial-upload-cursor.js';
import { checkPermissions } from './src/api/check-permissions.js';
/** @import {User} from "./src/client/js/user.js" */
/** @import {APIEndpoint} from "./src/api/api-types.js" */

const ONE_YEAR = 86400000 * 365;

mkdirSync(DATABASE_DIR, {recursive: true});
mkdirSync(PARTIAL_ZIPS_FOLDER, {recursive: true});
mkdirSync(TMP_FOLDER, {recursive: true});


async function main() {
    const dbs = {
        inTransaction: 0,
        sqlite3: new sqlite3(path.join(DATABASE_DIR, "garo.db")),
        sqlMutex: new Mutex(),
        sqlTransactionMutex: new Mutex(),
        // .\perf\perftags\perftags.exe database/perftags-write-input.txt database/perftags-write-output.txt database/perftags-read-input.txt database/perftags-read-output.txt database/perftags
        perfTags: new PerfTags(
            `perf/perftags/${PerfTags.EXE_NAME}`,
            path.join(DATABASE_DIR, "perftags-write-input.txt"),
            path.join(DATABASE_DIR, "perftags-write-output.txt"),
            path.join(DATABASE_DIR, "perftags-read-input.txt"),
            path.join(DATABASE_DIR, "perftags-read-output.txt"),
            path.join(DATABASE_DIR, "perftags"),
            "archive-commands"
        ),
        perfImg: new PerfImg(
            `perf/perfimg/${PerfImg.EXE_NAME}`,
            path.join(DATABASE_DIR, "perfimg-write-input.txt"),
            path.join(DATABASE_DIR, "perfimg-write-output.txt")
        ),
        fileStorage: new FileStorage(path.join(DATABASE_DIR, "file-storage")),
        jobManager: new JobManager(),
        cursorManager: new CursorManager()
    };

    dbs.perfTags.__addStderrListener((data) => {
        appendFileSync(path.join(DATABASE_DIR, "perftags-stderr.log"), data);
    });
    dbs.perfImg.__addStderrListener((data) => {
        appendFileSync(path.join(DATABASE_DIR, "perfimg-stderr.log"), data);
    });
    //await dbs.fileStorage.extractAllTo(path.join(PARTIAL_ZIPS_FOLDER, "hydrus import from laptop/export-path/hydrus export"));
    //await dbs.fileStorage.extractAllTo(path.join(PARTIAL_ZIPS_FOLDER, "hydrus import small/export-path/hydrus export 1024"));

    await dbrun(dbs, "PRAGMA foreign_keys = OFF;");
    await dbrun(dbs, "PRAGMA journal_mode = WAL;");
    await dbrun(dbs, "PRAGMA synchronous = NORMAL;");
    await dbrun(dbs, "PRAGMA cache_size = 250000;");
    await dbrun(dbs, "PRAGMA mmap_size = 100000000;");

    await migrate(dbs);

    console.log(`The default administrator user access key is: ${(await Users.selectDefaultAdminUser(dbs))['Access_Key']}`);

    const app = express();
    app.use(cookieParser());
    app.use(express.json({limit: "1MB"}));
    app.use(express.urlencoded({extended: true}));

    // normalize url by removing query string, and body by making it {} when not there
    app.use((req, res) => {
        req.body ??= {};
        let searchParamsStart = req.url.indexOf("?");
        if (searchParamsStart === -1) {
            searchParamsStart = req.url.length;
        }
        req.normalizedUrl = req.url.slice(0, searchParamsStart);
        req.next();
    });


    // Get user from access key cookie
    app.use((req, res) => {
        const accessKey = req.cookies['access-key'];
        if (accessKey !== undefined) {
            Users.selectByAccessKey(dbs, accessKey).then(user => {
                if (user !== undefined) {
                    req.user = user;
                    req.userAccessKey = accessKey;
                }
                req.next();
            })
        } else {
            req.next();
        }
    })

    // If no user, send access key submission page, and accept POST for access key submission
    app.use((req, res) => {
        if (req.user !== undefined) {
            req.next();
            return;
        }

        if (req.url === "/accessKeySubmission" && req.method === "POST") {
            const newAccessKey = req.body?.accessKey;
            if (newAccessKey !== undefined) {
                    res.cookie("access-key", newAccessKey, {"httpOnly": true, "sameSite": true, maxAge: ONE_YEAR});
                    res.redirect("/");
            }
        } else {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            res.sendFile("dist/access-key-page.html", {root: __dirname });
        }
    });

    // Generate API mapping
    /** @type {Map<string, APIEndpoint>} */
    const apis = new Map();
    const apiDirs = ["api/get", "api/post"];
    for (const apiDir of apiDirs) {
        for (const apiFile of readdirSync(`src/${apiDir}`)) {
            const apiPath = `./src/${apiDir}/${apiFile}`;
            /** @type {APIEndpoint} */
            const apiEndpoint = await import(apiPath);
            if (typeof apiEndpoint.default !== "function") {
                throw `Importing ${apiPath}: API endpoints must default export the function used to call them`;
            }
            if (typeof apiEndpoint.getPermissions !== "function") {
                throw `Importing ${apiPath}: API endpoints must have an export to get permissions with signature getPermissions(dbs, req, res)`;
            }
            if (typeof apiEndpoint.validate !== "function") {
                throw `Importing ${apiPath}: API endpoints must have an export to check if the request has a valid body with signature validate(dbs, req, res)`;
            }

            apis.set(`/${apiDir}/${apiFile.slice(0, -3)}`, apiEndpoint);
        }
    }

    app.use((req, res) => {
        let contentLength = parseInt(req.headers['content-length']);
        if (isNaN(contentLength)) {
            contentLength = 0;
        }
        
        if (contentLength > 50000000) {
            console.log(`Received request of length ${contentLength}`);
        }
        // TODO: check if user has available transfer bytes to perform this request
        req.next();
    });
    

    app.use(multer({storage: multer.diskStorage({
        destination: function(req, file, cb) {
            cb(null, TMP_FOLDER)
        },
        filename: function(req, file, cb) {
            const uniqueSuffix = randomBytes(16).toString("hex");
            cb(null, `${file.originalname}_${uniqueSuffix}.tmp`);
        }
    })}).any());

    
    // prep partial file paths for api if remaining partial pieces finished is on
    app.use(async (req, res) => {
        if (req.body.remainingPartialPiecesFinished === "on") {
            const partialUploadSelection = req.body.partialUploadSelection;
            if (partialUploadSelection === undefined) {
                return res.status(400).send("Partial upload folder was not provided for a partial file upload");
            }

            let uploadPath = "";
            if (partialUploadSelection === NOT_A_PARTIAL_UPLOAD) {
                uploadPath = getCursorAsPath(dbs.cursorManager.getCursorForUser(req.user.id(), req.body.pathCursorID));
                if (uploadPath === undefined) {
                    return res.status(400).send("Non partial upload did not have a path for the path cursor provided");
                }
            } else {
                const partialUploadRootedPath = rootedPath(PARTIAL_ZIPS_FOLDER, path.join(PARTIAL_ZIPS_FOLDER, partialUploadSelection));
                if (!partialUploadRootedPath.isRooted) {
                    return res.status(400).send("Partial upload folder was not rooted in partial zips folder");
                }

                uploadPath = partialUploadRootedPath.safePath;
            }

            req.uploadPath = uploadPath;
            let filePaths = [];
            try {
                filePaths = await readdir(uploadPath);
            } catch (e) {
                return res.status(400).send(`No directory found with uploadPath '${uploadPath}' provided`);
            }
            req.filePaths = filePaths.map(uploadFileName => {
                const uploadFilePath = rootedPath(req.uploadPath, path.join(uploadPath, uploadFileName));
                if (!uploadFilePath.isRooted) {
                        return res.status(400).send("Partial upload file path was not rooted in partial zips folder");
                }

                return uploadFilePath.safePath;
            });
        }

        req.next();
    });

    // Limit page access by 403ing those the user does not have permissions for, get the api to call into the request
    app.use(async (req, res) => {
        /** @type {User} */
        const user = req.user;
        // Allow for admins to override missing permissions by sudo
        if (user.isAdmin() && req.cookies['sudo'] !== undefined) {
            user.setSudo(true);
        }

        if (req.normalizedUrl.startsWith("/api/")) {
            const methodPath = req.normalizedUrl.slice("/api".length);
            
            const api = apis.get(req.normalizedUrl);
            if (api === undefined) {
                return res.redirect("/404");
            }

            if ((methodPath.startsWith("/get/") && req.method !== "GET") ||
                (methodPath.startsWith("/post/") && req.method !== "POST") ||
                (methodPath.startsWith("/put/") && req.method !== "PUT") ||
                (methodPath.startsWith("/delete/") && req.method !== "DELETE")
            ) {
                return res.status(400).send("Invalid method path was provided");
            }

            const validationResult = await api.validate(dbs, req, res);
            if (typeof validationResult === "string") {
                return res.status(400).send(validationResult);
            } else {
                req.body = validationResult;
            }

            const permissionsRequired = await api.getPermissions(dbs, req, res);
            const permissionResult = await checkPermissions(dbs, req, res, permissionsRequired);
            if (!permissionResult.success) {
                return res.status(403).send(permissionResult.message);
            }

            req.apiToCall = api.default;
            req.next();
        } else {
            req.next();
        }
    });

    app.use((req, res) => {
        if (req.apiToCall !== undefined) {
            req.apiToCall(dbs, req, res);
        } else {
            req.next();
        }
    });

    app.use((req, res) => {
        if (req.url === "/400") {
            res.status(400);
        } else if (req.url === "/401") {
            res.status(401);
        } else if (req.url === "/403") {
            res.status(403);
        }

        req.next();
    });

    app.use("/images-database", serveStatic(dbs.fileStorage.directory()));

    app.use(serveStatic("dist", {index: ["index.htm", "index.html"], extensions: ['html', 'htm']}));

    app.listen(process.env.PORT, () => {
        console.log(`Example app listening on port ${process.env.PORT}`);
    });
}

main();