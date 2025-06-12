import {mkdirSync, readFileSync, writeFileSync} from "fs";
import { dirname } from "path";

const FILES_TO_MOVE = ["400.html", "403.html", "404.html", "access-key-page.html", "assets/video.png"];
for (const file of FILES_TO_MOVE) {
    mkdirSync(dirname(`dist/${file}`), {recursive: true});
    writeFileSync(`dist/${file}`, readFileSync(`src/client/${file}`));
}