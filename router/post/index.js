const express = require("express");
const Router = express.Router();

const Post = require("./post"); // Router

const Comment = require("./comment"); // Router

const Like = require("./like"); // Router

Router.use(Post);
Router.use(Comment);
Router.use(Like);

module.exports = Router;
