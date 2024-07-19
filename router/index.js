const Account = require("./account/account");

const Login = require("./account/login");

const Role = require("./account/role");

const Post = require("./post/index");
const Wall = require("./wall/index");

const Reptile = require("./reptile_duitang");
// const Collect = require("./wall/collect");
const VerifyEmail = require("./verifyEmail");
module.exports = {
  Role,
  Login,
  Account,
  Wall,
  Post,
  Reptile,
  VerifyEmail,
  // Collect,
};
