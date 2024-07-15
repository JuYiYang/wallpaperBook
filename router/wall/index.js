const express = require("express");
const Router = express.Router();

const Wall = require("./wall"); // Router
const WallLike = require("./like"); // Router

Router.use(Wall);
Router.use(WallLike);

module.exports = Router;
