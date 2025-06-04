import {readFileSync, writeFileSync} from "fs";

const FILES_TO_MOVE = ["400.html", "403.html", "404.html", "access-key-page.html"];
for (const file of FILES_TO_MOVE) {
    writeFileSync(`dist/${file}`, readFileSync(`src/client/${file}`));
}