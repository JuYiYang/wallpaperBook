const express = require("express");
require("dotenv").config();
require("./router/scheduledTask");
require("./utils/cos");
const app = express();

const routes = require("./router/index");

app.set("trust proxy", ["loopback", "192.168.0.0/24"]);

app.use(routes);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // 可选择重启服务或记录日志
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  // 可选择重启服务或记录日志
});

app.listen(process.env.PORT, () => {
  console.log(`${process.env.PORT}已启动`);
});
// parse-dashboard --config ./config/parse-dashboard-config.json
