const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const ParseServer = require("parse-server").ParseServer;

const config = require("../config/config");
const {
  responseMiddleware,
  crossDomainMiddlewar,
  authenticateMiddleware,
  logUserActivity,
  auth,
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
const Verify = require("./verify");
const Hot = require("./search/hot");

const Version = require("./version");

const Fiction = require("./other/fiction");

const Router = express.Router();

Router.use(bodyParser.json({ limit: "10mb" }));
// 自定义中间件
Router.use(responseMiddleware);
Router.use(crossDomainMiddlewar);
if (process.env.NODE_ENV === "development") {
  Router.use(
    "/images",
    express.static(path.join("D:/wallpaperbook__static/images"))
  );

  Router.use(
    "/wall",
    express.static(path.join("D:/wallpaperbook__static/wallNetwork"))
  );
  Router.use(
    "/avatar",
    express.static(path.join("D:/wallpaperbook__static/avatar"))
  );
}
config.databaseURI = process.env.DATABASEURL;
const api = new ParseServer(config);
(async () => await api.start())();

// 将 Parse API 挂载到 /parse 路径
Router.use("/parse", api.app);
Router.use(auth);
Router.use(logUserActivity);

Router.use("/fiction", Fiction);
Router.use("/account", Login);
Router.use("/wall", Wall);
Router.use("/version", Version);
Router.use("/reptile", Reptile);
Router.use("/verify", Verify);

Router.use("/hot", Hot);
Router.use("/account", authenticateMiddleware, Account);
Router.use("/role", authenticateMiddleware, Role);
Router.use("/post", authenticateMiddleware, Post);
Router.use("/follow", authenticateMiddleware, Follow);

Router.use("/config", Config);
Router.use("/privacyPolicy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "privacyPolicy.html"));
});
Router.use("/deletingAccount", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "deletingAccount.html"));
});
Router.use("/keepAlive", (req, res) => {
  res.status(200).send("1");
});
Router.use("*", (req, res) => {
  // res.status(200).sendFile(path.join(__dirname, "../public", "404.html"));
  res.status(404).send(req.baseUrl);
});

module.exports = Router;
