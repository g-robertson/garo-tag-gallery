import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
import sqlite3 from 'sqlite3';
import migrate from "./src/migrations/migrate.js";
import { Users } from './src/db/user.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { appendFileSync, mkdirSync, readdirSync } from 'fs';
import { PERMISSIONS } from './src/client/js/user.js';
import PerfTags from './src/perf-tags-binding/perf-tags.js';
import { randomBytes } from 'crypto';
import { rootedPath } from './src/util.js';
import multer from 'multer';
import { FileStorage } from './src/db/file-storage.js';
import { dbrun } from './src/db/db-util.js';
import { JobManager } from './src/db/job-manager.js';
import { Mutex } from "async-mutex";
import { readdir } from 'fs/promises';
/** @import {User} from "./src/client/js/user.js" */
/** @import {APIEndpoint} from "./src/api/api-types.js" */

const ONE_YEAR = 86400000 * 365;

mkdirSync("database", {recursive: true});
mkdirSync("partial-zips", {recursive: true});
mkdirSync("tmp", {recursive: true});

async function main() {
  const dbs = {
    sqlite3: new sqlite3.Database("database/garo.db", err => {
      if (err) {
        throw `Database failed to initialize: ${err.message}`;
      }
    }),
    sqlMutex: new Mutex(),
    sqlTransactionMutex: new Mutex(),
    // .\perf\perftags.exe database/perf-write-input.txt database/perf-write-output.txt database/perf-read-input.txt database/perf-read-output.txt database/perf-tags
    perfTags: new PerfTags(
      `perf/${PerfTags.EXE_NAME}`,
      "database/perf-write-input.txt",
      "database/perf-write-output.txt",
      "database/perf-read-input.txt",
      "database/perf-read-output.txt",
      "database/perf-tags",
      "archive-commands"
    ),
    fileStorage: new FileStorage("database/file-storage"),
    jobManager: new JobManager()
  };

  dbs.perfTags.__addStderrListener((data) => {
    appendFileSync("database/perf-tags-stderr.log", data);
  });
  //await dbs.fileStorage.extractAllTo("./partial-zips/hydrus import from laptop/export-path/hydrus export");
  //await dbs.fileStorage.extractAllTo("./partial-zips/hydrus import small/export-path/hydrus export");

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
  app.use(express.urlencoded());

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
  const VALID_PERMISSIONS = Object.values(PERMISSIONS);
  for (const apiDir of apiDirs) {
    for (const apiFile of readdirSync(`src/${apiDir}`)) {
      const apiPath = `./src/${apiDir}/${apiFile}`;
      /** @type {APIEndpoint} */
      const api = await import(apiPath);
      let permissionsRequired = api.PERMISSIONS_REQUIRED
      if (!(permissionsRequired instanceof Array)) {
        permissionsRequired = [permissionsRequired];
      }

      const BAD_PERMISSION_IMPORT_ERROR = `Importing ${apiPath}: PERMISSIONS_REQUIRED is a required export for API endpoints and must be of type {
        PERMISSION_TYPE: PermissionType
        PERMISSION_BITS: PermissionInt
      }[]`;
      for (const permissionRequired of permissionsRequired) {
        const {TYPE, BITS} = permissionRequired;
        if (VALID_PERMISSIONS.indexOf(TYPE) === -1) {
          throw BAD_PERMISSION_IMPORT_ERROR;
        }
        if (!Number.isSafeInteger(BITS) || BITS < 0 || BITS > 15) {
          throw BAD_PERMISSION_IMPORT_ERROR;
        }
      }
      if (permissionsRequired.length === 0) {
        throw BAD_PERMISSION_IMPORT_ERROR;
      }
      if (typeof api.default !== "function") {
        throw `Importing ${apiPath}: API endpoints must default export the function used to call them`;
      }
      if (typeof api.checkPermission !== "function") {
        throw `Importing ${apiPath}: API endpoints must have an export to check permissions with signature checkPermission(dbs, req, res)`;
      }
      if (typeof api.validate !== "function") {
        throw `Importing ${apiPath}: API endpoints must have an export to check if the request has a valid body with signature validate(dbs, req, res)`;
      }

      apis.set(`/${apiDir}/${apiFile.slice(0, -3)}`, {
        ...api,
        permissionsRequired
      });
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
      cb(null, "./tmp")
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = randomBytes(16).toString("hex");
      cb(null, `${file.originalname}_${uniqueSuffix}.tmp`);
    }
  })}).any());

  
  // prep partial file paths for api if remaining partial pieces finished is on
  app.use(async (req, res) => {
    if (req.body.remainingPartialPiecesFinished === "on") {
      const partialUploadFolder = req.body.partialUploadSelection;
      if (partialUploadFolder === undefined) {
          return res.redirect("/400");
      }

      const partialUploadRootedPath = rootedPath("./partial-zips", path.join("./partial-zips", partialUploadFolder));
      if (!partialUploadRootedPath.isRooted) {
          return res.redirect("/400");
      }

      const partialUploadPath = partialUploadRootedPath.safePath;
      req.partialUploadPath = partialUploadPath;
      let filePaths = [];
      try {
        filePaths = await readdir(partialUploadPath);
      } catch (e) {
        return res.redirect("/400");
      }
      req.partialFilePaths = filePaths.map(partialUploadFileName => {
        const partialUploadFilePath = rootedPath("./partial-zips", path.join(partialUploadPath, partialUploadFileName));
        if (!partialUploadFilePath.isRooted) {
            return res.redirect("/400");
        }

        return partialUploadFilePath.safePath;
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
        return res.redirect("/400");
      }

      let canPerformAction = false;
      const validationResult = await api.validate(dbs, req, res);
      if (typeof validationResult === "string") {
        return res.status(400).send(validationResult);
      } else {
        req.body = validationResult;
      }
      let userHasGlobalPermissions = true;
      for (const {TYPE, BITS} of api.permissionsRequired) {
        userHasGlobalPermissions &&= user.hasPermissions(BITS, TYPE);
      }
      canPerformAction ||= userHasGlobalPermissions;
      canPerformAction ||= await api.checkPermission(dbs, req, res);

      if (!canPerformAction) {
        return res.redirect("/403");
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

  const port = 3000;
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

main();