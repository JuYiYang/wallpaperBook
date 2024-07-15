const dayjs = require("dayjs");
const express = require("express");
const Parse = require("parse/node");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");
const Router = express.Router();

// 查询用户信息
Router.get("/info", async (req, res) => {
  const { sessionToken, className, __type, ACL, ...userInfo } =
    req.user.toJSON();
  res.customSend({
    ...userInfo,
    last_login_at: req.user.get("last_login_at"),
  });
});

// 修改用户信息
Router.put("/info", async (req, res) => {
  try {
    const safeField = ["nickName", "birthday", "sex", "motto", "preference"];
    const currentUser = Parse.User.current();
    for (const key in req.body) {
      let val = req.body[key];
      if (safeField.includes(key)) {
        currentUser.set(key, val);
      }
    }
    await currentUser.save(null, { useMasterKey: true });
    res.customSend("success");
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

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

module.exports = Router;
