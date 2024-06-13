const express = require("express");
const config = require("./config");

const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
// 自定义中间件
app.use(responseMiddleware);
app.use(crossDomainMiddlewar);

app.listen(config.prot, () => {
  console.log(`${config.prot}已启动`);
});
