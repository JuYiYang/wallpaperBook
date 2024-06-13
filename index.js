const express = require("express");
const config = require("./config");

app.listen(config.prot, () => {
  console.log(`${config.prot}已启动`);
});
