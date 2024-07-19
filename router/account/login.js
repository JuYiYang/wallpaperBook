const express = require("express");
const Parse = require("parse/node");
const crypto = require("crypto");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");
const { sendEmailVerifyLink } = require("../../utils/sendEmail");
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
    try {
      const query = new Parse.Query(Parse.User);
      query.equalTo("username", req.body.account);
      const user = await query.first({ useMasterKey: true });
      //单一会话
      await invalidateUserSessions(user);

      const userLogin = await Parse.User.logIn(
        req.body.account,
        req.body.password
      );
      user.set("last_login_at", new Date());
      user.save(null, { useMasterKey: true });
      res.customSend({ token: userLogin.getSessionToken() });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);
const invalidateUserSessions = async (user) => {
  if (user) {
    const sessionQuery = new Parse.Query(Parse.Session);
    sessionQuery.equalTo("user", user);
    const sessions = await sessionQuery.find({ useMasterKey: true });
    const promises = sessions.map((session) => {
      session.destroy({ useMasterKey: true });
    });
    await Promise.all(promises);
  } else {
    console.log("用户不存在");
  }
};
Router.post(
  "/register",
  validateParams(
    Joi.object({
      password: Joi.string().min(6).required(),
      email: Joi.string().email().required(),
    }).unknown(true)
  ),
  async (req, res) => {
    const query = req.body;
    // 注册
    const user = new Parse.User();
    user.set("email", query.email);
    user.set("username", query.email);
    user.set("username", query.email);
    user.set("plainPassword", query.password);
    user.set("password", query.password);
    user.set("downloadFrequency", 0);
    user.set(
      "avatar",
      query.avatar ||
        "https://api.dicebear.com/9.x/pixel-art/png?seed=" +
          (Math.random() * 1000).toFixed()
    );
    user.set("nickName", query.username || "momo");
    try {
      const userAfter = await user.signUp(null, { useMasterKey: true });
      const UserMilestone = Parse.Object.extend("UserMilestone");
      const userMilestone = new UserMilestone();
      userMilestone.set("creatorId", userAfter.id);
      userMilestone.set("firstSetting", false);
      userMilestone.set("firstPost", false);
      userMilestone.set("firstComment", false);
      userMilestone.set("firstCollect", false);
      userMilestone
        .save(null, { useMasterKey: true })
        .then(() => console.log("UserMilestone ", userAfter.id, "success"))
        .catch((err) => console.log("UserMilestone ", userAfter.id, err));
      res.customSend({ success: "Success!" });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

Router.post(
  "/sendLoginLink",
  validateParams(
    Joi.object({
      email: Joi.string().email().required(),
    })
  ),
  async (req, res) => {
    try {
      let verifyToken = crypto.randomBytes(64).toString("hex");
      await sendEmailVerifyLink(
        req.body.email,
        "http://192.168.1.106:1337/verify/" + verifyToken
      );
      const VerifyEmail = Parse.Object.extend("VerifyEmail");
      const verifyEmail = new VerifyEmail();
      verifyEmail.set("token", verifyToken); // token
      verifyEmail.set("email", req.body.email); // 注册邮箱
      verifyEmail.set("expired", 10); // 分钟
      await verifyEmail.save(null, { useMasterKey: true });
      res.customSend({ success: "success" });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

module.exports = Router;
