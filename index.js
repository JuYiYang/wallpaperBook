const express = require("express");
const path = require("path");

const ParseServer = require("parse-server").ParseServer;
const config = require("./config/config");
require("dotenv").config();
require("./router/scheduledTask");
const bodyParser = require("body-parser");

const app = express();

app.use("/static", express.static(path.join(__dirname, "upload", "images")));

app.set("trust proxy", ["loopback", "192.168.0.0/24"]);

const {
  Account,
  Login,
  Role,
  Post,
  Reptile,
  Wall,
  VerifyEmail,
} = require("./router/index");
const {
  responseMiddleware,
  crossDomainMiddlewar,
  authenticateMiddleware,
} = require("./utils/middlewares");

app.use(bodyParser.json());
// 自定义中间件
app.use(responseMiddleware);
app.use(crossDomainMiddlewar);

const api = new ParseServer(config);
(async () => await api.start())();

// 将 Parse API 挂载到 /parse 路径
app.use("/parse", api.app);

app.use("/account", Login);
app.use("/account", authenticateMiddleware, Account);
app.use("/role", authenticateMiddleware, Role);
app.use("/post", authenticateMiddleware, Post);
app.use("/wall", Wall);
app.use("/reptile", Reptile);
app.use("/verify", VerifyEmail);
app.use("*", (req, res) => {
  // res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  res.status(404).send("/warning");
});
// app.use("/like", authenticateMiddleware, Like);

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
