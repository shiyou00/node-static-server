const yargs = require("yargs");
const Server = require("./app");

const argv = yargs
  .usage("anywhere [options]")
  .options("p", {
    alias: "port",
    describe: "端口号",
    default: 9527
  })
  .version()
  .alias("v", "version")
  .help().argv;
const server = new Server(argv);
server.start();
