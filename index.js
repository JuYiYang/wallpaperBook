const express = require("express");
const ParseServer = require("parse-server").ParseServer;
const config = require("./config");

const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
// 自定义中间件
app.use(responseMiddleware);
app.use(crossDomainMiddlewar);

const api = new ParseServer(config);
(async () => await api.start())();

// 将 Parse API 挂载到 /parse 路径
app.use("/parse", api.app);

app.listen(config.prot, () => {
  console.log(`${config.prot}已启动`);
});
