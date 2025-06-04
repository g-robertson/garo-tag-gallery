import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
import sqlite3 from 'sqlite3';
import migrate from "./src/migrations/migrate.js";
import { getDefaultAdminUser, getUserByAccessKey } from './src/db/user.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, renameSync } from 'fs';
import { PERMISSIONS } from './src/client/js/user.js';
import PerfTags from './src/perf-tags-binding/perf-tags.js';
import { randomBytes } from 'crypto';
import { rootedPath } from './src/util.js';
import multer from 'multer';
/** @import {User} from "./src/client/js/user.js" */
/** @import {APIEndpoint} from "./src/api/api-types.js" */

const ONE_YEAR = 86400000 * 365;

async function main() {
  const sqlite3Db = new sqlite3.Database("database/garo.db", err => {
    if (err) {
      throw `Database failed to initialize: ${err.message}`;
    }
  });
  const perfTags = new PerfTags("perf/perftags.exe");

  const dbs = {
    sqlite3: sqlite3Db,
    perfTags
  };

  await new Promise(resolve => dbs.sqlite3.run("PRAGMA foreign_keys = OFF;", () => resolve()));
  await new Promise(resolve => dbs.sqlite3.run("PRAGMA journal_mode = WAL;", () => resolve()));
  await new Promise(resolve => dbs.sqlite3.run("PRAGMA synchronous = NORMAL;", () => resolve()));
  await new Promise(resolve => dbs.sqlite3.run("PRAGMA cache_size = 250000;", () => resolve()));
  await new Promise(resolve => dbs.sqlite3.run("PRAGMA mmap_size=100000000;", () => resolve()));

  await migrate(dbs);

  console.log(`The default administrator user access key is: ${(await getDefaultAdminUser(dbs))['Access_Key']}`);

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
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
      getUserByAccessKey(dbs, accessKey).then(user => {
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
          console.log("cookie???", newAccessKey);
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

      for (const permissionRequired of permissionsRequired) {
        if (VALID_PERMISSIONS.indexOf(permissionRequired) === -1) {
          throw `Importing ${apiPath}: PERMISSIONS_REQUIRED is a required export for API endpoints and must be a member of the PERMISSIONS object`;
        }
      }
      if (permissionsRequired.length === 0) {
        throw `Importing ${apiPath}: PERMISSIONS_REQUIRED is a required export for API endpoints and must be a member of the PERMISSIONS object`;
      }
      if (typeof api.default !== "function") {
        throw `Importing ${apiPath}: API endpoints must default export the function used to call them`;
      }
      if (typeof api.checkPermission !== "function") {
        throw `Importing ${apiPath}: API endpoints must have an export to check permissions with signature checkPermission(dbs, req, res)`;
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


  // Limit page access by 403ing those the user does not have permissions for, get the api to call into the request
  app.use((req, res) => {
    /** @type {User} */
    const user = req.user;
    
    // Allow for admins to override missing permissions by sudo
    const sudo = req.body.sudo;
    let canPerformAction = false;
    if (req.user.Is_Administrator && sudo === true) {
      canPerformAction = true;
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

      canPerformAction ||= user.hasPermissions(req.method, api.PERMISSIONS_REQUIRED);
      canPerformAction ||= api.checkPermission(dbs, req, res);

      if (!canPerformAction) {
        return res.redirect("/403");
      }

      req.apiToCall = api.default;
      req.next();
    } else {
      req.next();
    }
  });

  // prep partial file paths for api if remaining partial pieces finished is on
  app.use((req, res) => {
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
      req.partialFilePaths = readdirSync(partialUploadPath).map(partialUploadFileName => {
        const partialUploadFilePath = rootedPath("./partial-zips", path.join(partialUploadPath, partialUploadFileName));
        if (!partialUploadFilePath.isRooted) {
            return res.redirect("/400");
        }

        return partialUploadFilePath.safePath;
      });
    }

    req.next();
  });

  app.use((req, res) => {
    if (req.apiToCall !== undefined) {
      req.apiToCall(dbs, req, res);
    } else {
      req.next();
    }
  });

  app.use(serveStatic("dist", {index: ["index.htm", "index.html"], extensions: ['html', 'htm']}));

  const port = 3000;
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

main();