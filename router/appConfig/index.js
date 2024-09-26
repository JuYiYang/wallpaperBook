const express = require("express");
const Router = express.Router();

const homeConfig = require("./home"); // Router

Router.use(homeConfig);

module.exports = Router;
