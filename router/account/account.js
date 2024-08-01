const dayjs = require("dayjs");
const express = require("express");
const Parse = require("parse/node");
const fs = require("fs-extra");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");
const Router = express.Router();

// 查询用户信息
Router.get("/info", async (req, res) => {
  const {
    sessionToken,
    className,
    __type,
    ACL,
    createdAt,
    updatedAt,
    ...userInfo
  } = req.user.toJSON();

  const UserMilestone = Parse.Object.extend("UserMilestone");
  const query = new Parse.Query(UserMilestone);
  query.equalTo("creatorId", userInfo.objectId);
  let milestone = await query.first({ useMasterKey: true });
  const milestoneInfo = milestone.toJSON();
  delete milestoneInfo.createdAt;
  delete milestoneInfo.updatedAt;
  delete milestoneInfo.objectId;
  delete milestoneInfo.creatorId;
  res.customSend({
    ...userInfo,
    ...milestoneInfo,
    last_login_at: req.user.get("last_login_at"),
  });
});

// 修改用户信息
Router.put("/info", async (req, res) => {
  try {
    const safeField = [
      "nickName",
      "birthday",
      "sex",
      "avatar",
      "motto",
      "preference",
    ];
    console.log(req.body);
    const currentUser = Parse.User.current();
    for (const key in req.body) {
      let val = req.body[key];
      if (safeField.includes(key)) {
        if (val || (typeof val === String && val.length)) {
          currentUser.set(key, val);
        }
      }
    }
    const UserMilestone = Parse.Object.extend("UserMilestone");
    const query = new Parse.Query(UserMilestone);
    query.equalTo("creatorId", req.user.id);
    query
      .first({ useMasterKey: true })
      .then((info) => {
        if (info.get("firstSetting")) return;
        info.set("firstSetting", true);
        info.save(null, { useMasterKey: true }).catch((err) => {
          console.log("保存fristSetting失败", err);
        });
      })
      .catch((err) => {
        console.log("设置fristSetting失败", err);
      });

    await currentUser.save(null, { useMasterKey: true });
    res.customSend("success");
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});
// 头像
Router.put(
  "/updateAvatar",
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../../upload", "avatar");
        // 检查目录是否存在
        fs.ensureDirSync(uploadDir);
        // 目录存在或已成功创建，调用回调函数
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const name = crypto.randomBytes(12).toString("hex");
        const fileExtension = path.extname(file.originalname);
        cb(null, `${name}${fileExtension}`);
      },
    }),
  }).single("avatar"),
  async (req, res) => {
    try {
      const fileUrl = `${process.env.DOMAINNAME}/avatar/${req.file.filename}`;
      const currentUser = Parse.User.current();
      currentUser.set("avatar", fileUrl);
      await currentUser.save(null, { useMasterKey: true });
      res.customSend("success");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

// 下载记录
Router.post(
  "/addDownloadRecord",
  validateParams(
    Joi.object({
      wallId: Joi.required(),
      timeSpent: Joi.required(),
    }).unknown(true)
  ),
  async (req, res) => {
    try {
      const DownloadRecord = Parse.Object.extend("DownloadRecord");
      const query = new Parse.Query(DownloadRecord);
      query.descending("downloadTime");
      query.limit(1);
      const latestDownload = await query.first({ useMasterKey: true });
      const currentTime = dayjs().valueOf();
      let downloadType = 1; // 1 正常下载 ，2，三十分钟重复下载不扣除次数，
      if (latestDownload) {
        const oldDownloadTime = latestDownload.get("downloadTime");
        if (oldDownloadTime) {
          const minute = dayjs(currentTime).diff(oldDownloadTime, "minute");
          downloadType = minute >= 30 ? 2 : 1;
          console.log("最新的下载时间:", oldDownloadTime, minute);
        }
      }
      // 限制结果数量为 1

      const newDownloadRecord = new DownloadRecord();
      // 设置下载记录的相关字段
      newDownloadRecord.set("userId", req.user.id);
      newDownloadRecord.set("wallId", req.body.wallId);
      newDownloadRecord.set("timeSpent", req.body.timeSpent);
      newDownloadRecord.set("downloadTime", dayjs().valueOf());
      newDownloadRecord.set("type", downloadType);
      newDownloadRecord.set("ip", req.body.ip);
      // 保存下载记录
      await newDownloadRecord.save(null, { useMasterKey: true });
      res.customSend("success");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

// 查询个人中心信息
Router.get("/getUserImpact", async (req, res) => {
  const userId = req.query.id || req.user.id;
  try {
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, {
      useMasterKey: true,
    });

    const FollowQuery = new Parse.Query("Following");
    FollowQuery.equalTo("creatorId", userId);

    const beFollowQuery = new Parse.Query("Following");
    beFollowQuery.equalTo("followId", userId);

    const followingQuery = new Parse.Query("Following");
    followingQuery.equalTo("creatorId", req.user.id);
    followingQuery.equalTo("followId", userId);
    let follow = await followingQuery.first({ useMasterKey: true });

    const follows = await FollowQuery.count({ useMasterKey: true });
    const beFollows = await beFollowQuery.count({ useMasterKey: true });

    const postQuery = new Parse.Query("Post");
    postQuery.equalTo("creator", userId);
    const postResult = await postQuery.find({ useMasterKey: true });

    let likes = 0;
    for (let i = 0; i < postResult.length; i++) {
      let item = postResult[i];
      const postLikeQuery = new Parse.Query("PostLike");
      postLikeQuery.equalTo("postId", item.id);
      likes += await postLikeQuery.count({ useMasterKey: true });
    }
    res.customSend({
      avatar: user.get("avatar"),
      motto: user.get("motto"),
      id: user.id,
      username: user.get("nickName"),
      follows,
      follow: !!follow,
      beFollows,
      likes,
    });
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});
module.exports = Router;
