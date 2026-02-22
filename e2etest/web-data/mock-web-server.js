import http from "http"
import { readFile } from "fs/promises";

let watcherGalleryReturn = 0;

const server = http.createServer(async (req, res) => {
    if (req.url === "watcher-gallery") {
        req.url = `__watcher-gallery-${watcherGalleryReturn}`;
        ++watcherGalleryReturn;
    }

    res.writeHead(200);
    res.write(await readFile(req.url));
    res.end();
});

server.listen(3009)

console.log("Mock web server listening on port 3009");