const express = require("express");
const ParseServer = require("parse-server").ParseServer;
const config = require("./config");

const bodyParser = require("body-parser");

const app = express();
const { Account, Login, Role, Collect, Like } = require("./router/index");

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
app.use("/collect", authenticateMiddleware, Collect);
app.use("/like", authenticateMiddleware, Like);

app.listen(config.prot, () => {
  console.log(`${config.prot}已启动`);
});
