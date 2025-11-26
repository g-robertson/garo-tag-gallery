import {cpSync, rmSync} from "fs";

rmSync("node_modules/static-react", {recursive: true, force: true});
cpSync("src/static-react", "node_modules/static-react", {recursive: true, force: true});
cpSync("node_modules/static-react/jsx-runtime.js", "node_modules/static-react/jsx-dev-runtime.js");