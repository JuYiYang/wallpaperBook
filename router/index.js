const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const ParseServer = require("parse-server").ParseServer;

const config = require("../config/config");
const {
  responseMiddleware,
  crossDomainMiddlewar,
  authenticateMiddleware,
} = require("../utils/middlewares");

const Account = require("./account/account");

const Login = require("./account/login");

const Role = require("./account/role");

const Follow = require("./account/follow");

const Post = require("./post/index");
const Wall = require("./wall/index");

const Config = require("./appConfig/index");

const Reptile = require("./reptile_duitang");
// const Collect = require("./wall/collect");
const VerifyEmail = require("./verifyEmail");
const Hot = require("./search/hot");

const Version = require("./version");

const Router = express.Router();

Router.use(bodyParser.json({ limit: "10mb" }));
// 自定义中间件
Router.use(responseMiddleware);
Router.use(crossDomainMiddlewar);

Router.use(
  "/static",
  express.static(path.join(__dirname, "../upload", "images"))
);

Router.use(
  "/avatar",
  express.static(path.join(__dirname, "../upload", "avatar"))
);

const api = new ParseServer(config);
(async () => await api.start())();

// 将 Parse API 挂载到 /parse 路径
Router.use("/parse", api.app);

Router.use("/account", Login);
Router.use("/wall", Wall);
Router.use("/version", Version);
Router.use("/reptile", Reptile);
Router.use("/verify", VerifyEmail);

Router.use("/hot", Hot);
Router.use("/account", authenticateMiddleware, Account);
Router.use("/role", authenticateMiddleware, Role);
Router.use("/post", authenticateMiddleware, Post);
Router.use("/follow", authenticateMiddleware, Follow);

Router.use("/config", Config);
Router.use("/privacyPolicy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "privacyPolicy.html"));
});
Router.use("*", (req, res) => {
  // res.status(404).sendFile(path.join(__dirname, "../public", "404.html"));
  res.status(404).send(req.baseUrl);
});

module.exports = Router;
