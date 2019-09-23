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
const mime = require("./config/mime");
const { createGzip, createDeflate } = require("zlib");

const compress = /\.(html|js|css|md)/;
const handleCompress = (rs, req, res) => {
  // 第一步读取浏览器支持的压缩方式
  const acceptEncoding = req.headers["accept-encoding"];

  if (!acceptEncoding || !acceptEncoding.match(/\b(gzip|deflate)\b/)) {
    return rs;
  } else if (acceptEncoding.match(/\bgzip\b/)) {
    res.setHeader("Content-Encoding", "gzip");
    return rs.pipe(createGzip());
  } else if (acceptEncoding.match(/\bdeflate\b/)) {
    res.setHeader("Content-Encoding", "deflate");
    return rs.pipe(createDeflate());
  }
};

const exportStats = async function(filePath, res, req) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      const contentType = mime(filePath);
      // 路径为文件
      res.statusCode = 200;
      res.setHeader("Content-Type", contentType);
      let rs = fs.createReadStream(filePath);
      if (filePath.match(compress)) {
        rs = handleCompress(rs, req, res);
      }
      rs.pipe(res);
    } else if (stats.isDirectory()) {
      // 路径为文件夹，我们输出文件列表
      const files = await readdir(filePath);
      // 要传入到模板中的数据
      const data = {
        title: path.basename(filePath),
        dir: req.url === "/" ? "" : req.url,
        prev: {
          path: path.dirname(req.url), // 计算出上一层的路径
          icon: conf.dirIcon // 统一使用文件夹icon
        },
        files: files.map(file => {
          // 简单判断：当文件名有.的我们认为是文件，没有.的我们认为是文件夹
          return {
            file: file,
            icon: file.includes(".") ? conf.fileIcon : conf.dirIcon
          };
        })
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(template(data));
    }
  } catch (e) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
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
