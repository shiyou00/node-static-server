const http = require("http");
const conf = require("./config/defaultConfig");
const path = require("path");
const fs = require("fs");
const promisify = require("util").promisify;
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const Handlebars = require("handlebars");
const tplPath = path.join(__dirname, "./template/dir.tpl");
const source = fs.readFileSync(tplPath);
const template = Handlebars.compile(source.toString());

const exportStats = async function(filePath, res, req) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      // 路径为文件
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      fs.createReadStream(filePath).pipe(res);
    } else if (stats.isDirectory()) {
      // 路径为文件夹，我们输出文件列表
      const files = await readdir(filePath);
      // 要传入到模板中的数据
      const data = {
        title: path.basename(filePath),
        dir: req.url,
        files
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(template(data));
    }
  } catch (e) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end(`${filePath} 不存在\n${e}`);
  }
};

const server = http.createServer((req, res) => {
  const filePath = path.join(conf.root, req.url); // 当前目录的绝对路径 + 访问的url路径
  exportStats(filePath, res, req);
});

server.listen(conf.port, conf.hostname, () => {
  console.info(`Server running at http://${conf.hostname}:${conf.port}`);
});
