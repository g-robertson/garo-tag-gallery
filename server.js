import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
const app = express();
app.use(cookieParser());
app.use(express.json());

const port = 3000;

app.use(serveStatic("dist", {index: ["index.htm", "index.html"]}));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});