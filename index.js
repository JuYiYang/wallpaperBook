const express = require("express");
const path = require("path");

const ParseServer = require("parse-server").ParseServer;
const config = require("./config/config");

const bodyParser = require("body-parser");

const app = express();
app.use("/static", express.static(path.join(__dirname, "upload", "images")));
const { Account, Login, Role, Post } = require("./router/index");

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
app.use("/Post", authenticateMiddleware, Post);
// app.use("/like", authenticateMiddleware, Like);

app.listen(config.prot, () => {
  console.log(`${config.prot}已启动`);
});
