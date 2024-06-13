const express = require("express");
const Parse = require("parse/node");

const Joi = require("joi");
const { validateParams } = require("../utils/middlewares");
const Router = express.Router();
Parse.User.enableUnsafeCurrentUser();

Router.post(
  "/login",
  validateParams(
    Joi.object({
      account: Joi.string().required(),
      password: Joi.string().required(),
    }).unknown(true)
  ),
  async (req, res) => {
    const query = req.body;
    try {
      const userLogin = await Parse.User.logIn(query.account, query.password);
      res.customSend({ token: userLogin.getSessionToken() });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

Router.post(
  "/register",
  validateParams(
    Joi.object({
      username: Joi.string().required(),
      password: Joi.string().min(6).required(),
      email: Joi.string().email().required(),
    }).unknown(true)
  ),
  async (req, res) => {
    const query = req.body;
    // 注册
    const user = new Parse.User();
    for (let key in query) {
      user.set(key, query[key]);
    }
    user.set("downloadFrequency", 0);
    user.set("nickName", query.username);
    try {
      await user.signUp(null, { useMasterKey: true });
      res.customSend({ success: "Success!" });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

module.exports = Router;
