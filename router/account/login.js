const express = require("express");
const Parse = require("parse/node");
const dayjs = require("dayjs");
const crypto = require("crypto");
const Joi = require("joi");
const { OAuth2Client } = require("google-auth-library");
const { validateParams } = require("../../utils/middlewares");
const { sendEmailVerifyLink } = require("../../utils/sendEmail");

const client = new OAuth2Client({ clientId: process.env.GOOGLEAUTHCLIENT });
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
      // await invalidateUserSessions(user);

      const userLogin = await Parse.User.logIn(
        req.body.account,
        req.body.password
      );
      user.set("last_login_at", new Date());
      user.save(null, { useMasterKey: true });
      res.customSend({ token: userLogin.getSessionToken() });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
// 账户密码注册
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
      createdUserMilestone(userAfter.id);
      res.customSend({ success: "Success!" });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
// Google login
Router.post("/googleSignIn", async (req, res) => {
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: [process.env.GOOGLEAUTHCLIENT],
    });
    const payload = ticket.getPayload();
    if (dayjs().isAfter(dayjs.unix(payload.exp))) {
      return res.customErrorSend("Faild information has expired");
    }
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo("googleId", payload.sub);
    let userRecord = await userQuery.first({ useMasterKey: true });
    if (!userRecord) {
      let password = crypto.randomBytes(5).toString("hex");
      const user = new Parse.User();
      user.set("email", payload.email);
      user.set("username", payload.email);
      user.set("plainPassword", password);
      user.set("password", password);
      user.set("autoPassword", true);
      user.set("downloadFrequency", 0);
      user.set("avatar", payload.picture);
      user.set("nickName", payload.name);
      user.set("googleId", payload.sub);
      user.set("source", "google");
      userRecord = await user.signUp(null, { useMasterKey: true });
    }
    const userLogin = await Parse.User.logIn(
      userRecord.get("username"),
      userRecord.get("plainPassword")
    );
    userRecord.set("last_login_at", new Date());
    userRecord.save(null, { useMasterKey: true });
    createdUserMilestone(userLogin.id);
    res.customSend({ token: userLogin.getSessionToken() });
  } catch (error) {
    console.error("Google login failure", error);
    res.customErrorSend("Google login failure");
  }
});
// 发送邮箱链接
Router.post(
  "/sendLoginLink",
  validateParams(
    Joi.object({
      email: Joi.string().email().required(),
    })
  ),
  async (req, res) => {
    try {
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo("email", req.body.email);
      let userRecord = await userQuery.first({ useMasterKey: true });

      if (userRecord) {
        res.customErrorSend("该邮箱已被注册！", 500);
        return;
      }

      let verifyToken = crypto.randomBytes(64).toString("hex");
      let link = process.env.DOMAINNAME + "/verify/" + verifyToken;
      await sendEmailVerifyLink(req.body.email, link);
      const VerifyEmail = Parse.Object.extend("VerifyEmail");
      const verifyEmail = new VerifyEmail();
      verifyEmail.set("token", verifyToken); // token
      verifyEmail.set("email", req.body.email); // 注册邮箱
      verifyEmail.set("expired", 10); // 分钟
      verifyEmail.set("isInvalid", true); // 是否有效
      await verifyEmail.save(null, { useMasterKey: true });
      res.customSend({ success: "success", link });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
// 激活账号
Router.post(
  "/activeAccount",
  validateParams(
    Joi.object({
      secret: Joi.required(),
      email: Joi.required(),
      password: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      let params = req.body;
      const VerifyEmail = Parse.Object.extend("VerifyEmail");

      const query = new Parse.Query(VerifyEmail);

      query.equalTo("token", params.secret);
      const linkInfo = await query.first({ useMasterKey: true });
      if (!linkInfo) {
        return res.customErrorSend(
          "Verify that the link does not exist or has expired"
        );
      }
      let timeDiff = dayjs().diff(linkInfo.get("createdAt"), "minute", true);
      if (timeDiff >= linkInfo.get("expired")) {
        return res.customErrorSend(
          "Verify that the link does not exist or has expired"
        );
      }

      if (!linkInfo.get("isInvalid")) {
        return res.customErrorSend("Have been used");
      }

      if (linkInfo.get("email") !== params.email) {
        return res.customErrorSend("mismatch");
      }

      const user = new Parse.User();

      user.set("email", params.email);
      user.set("username", params.email);
      user.set("plainPassword", params.password);
      user.set("password", params.password);
      user.set("downloadFrequency", 0);
      user.set(
        "avatar",
        "https://api.dicebear.com/9.x/pixel-art/png?seed=" +
          (Math.random() * 1000).toFixed()
      );
      user.set("nickName", "momo");
      const userAfter = await user.signUp(null, { useMasterKey: true });

      createdUserMilestone(userAfter.id);
      linkInfo.set("isInvalid", false);
      linkInfo
        .save(null, { useMasterKey: true })
        .catch((err) => console.log("失效验证链接error", err));
      res.customSend({ success: "success!" });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
// 单一会话
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

// 创建里程碑表
const createdUserMilestone = async (userId) => {
  const UserMilestone = Parse.Object.extend("UserMilestone");
  const query = new Parse.Query(UserMilestone);
  query.equalTo("creatorId", userId);
  const record = await query.find({ useMasterKey: true });
  if (record.length) {
    console.log(userId, "重复创建里程碑");
    return;
  }
  const userMilestone = new UserMilestone();
  userMilestone.set("creatorId", userId);
  userMilestone.set("firstSetting", false);
  userMilestone.set("firstPost", false);
  userMilestone.set("firstComment", false);
  userMilestone.set("firstCollect", false);
  userMilestone
    .save(null, { useMasterKey: true })
    .catch((err) => console.log("UserMilestone ", userId, err));
};

module.exports = Router;
