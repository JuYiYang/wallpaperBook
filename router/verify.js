const express = require("express");
const dayjs = require("dayjs");
const crypto = require("crypto");
const Router = express.Router();
const path = require("path");
const fs = require("fs");
const { authenticateMiddleware } = require("../utils/middlewares");
const { getTempCosToken } = require("../utils/cos");
Router.get("/tempLinkToken/:token", async (req, res) => {
  let token = req.params.token;
  try {
    if (!token || !token.length || token.length < 40) {
      return res.customErrorSend(
        "Verify that the link does not exist or has expired",
        500
      );
    }

    const VerifyEmail = Parse.Object.extend("VerifyEmail");

    const query = new Parse.Query(VerifyEmail);

    query.equalTo("token", token);

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

    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo("email", linkInfo.get("email"));
    let isUser = await userQuery.first({ useMasterKey: true });
    if (isUser) {
      return res.customErrorSend("mailbox has been registered");
    }

    res.set({
      "Content-Type": "text/html; charset=utf-8", // 指定内容类型为 HTML，并设置字符集为 UTF-8
      "Cache-Control": "no-cache", // 禁用缓存
    });
    res.send(
      `<a href="wallpaperbook://verifyEmail?token=${linkInfo.get(
        "token"
      )}&email=${linkInfo.get(
        "email"
      )}" style="font-size:188px;font-weight:bold;">/点击去往APP激活/</a>`
    );
    // res.customSend({ success: linkInfo, timeDiff });
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

Router.post("/tempUploadToken", authenticateMiddleware, async (req, res) => {
  const bucket = req.body.bucketName || "images";
  try {
    const result = await getTempCosToken([
      {
        action: [
          //简单上传操作
          "name/cos:PutObject",
          //表单上传对象
          "name/cos:PostObject",
          //分块上传：初始化分块操作
          "name/cos:InitiateMultipartUpload",
          //分块上传：List 进行中的分块上传
          "name/cos:ListMultipartUploads",
          //分块上传：List 已上传分块操作
          "name/cos:ListParts",
          //分块上传：上传分块操作
          "name/cos:UploadPart",
          //分块上传：完成所有分块上传操作
          "name/cos:CompleteMultipartUpload",
          //取消分块上传操作
          "name/cos:AbortMultipartUpload",
        ],
        effect: "allow",
        resource: [
          "qcs::cos:ap-tokyo:uid/1307889358:tokyo-1307889358/" + bucket + "/*",
        ],
      },
    ]);
    const data = JSON.parse(result);
    if (!data?.credentials) throw Error();
    res.customSend({
      expiredTime: data.expiredTime,
      startTime: data.startTime,
      ...data.credentials,
    });
  } catch (err) {
    res.customErrorSend(err);
  }
});

Router.get("/adRewards", async (req, res) => {
  try {
    const { signature, key_id: keyId, user_id, timestamp } = req.query;

    if (!user_id) {
      return res.customErrorSend();
    }

    // 验证时间戳
    // const currentTime = Date.now();
    // if (Math.abs(currentTime - timestamp) > 600000) {
    //   // 10分钟以内
    //   return res.customErrorSend("过期");
    // }
    const publicKeyMap = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../config/admob_public_keys.json"),
        "utf8"
      )
    );

    const publicKey = publicKeyMap[keyId];
    if (!publicKey) {
      return res.customErrorSend(`No public key found for keyId: ${keyId}`);
    }
    let data = "";
    const sortedKeys = Object.keys(req.query).filter(
      (key) => !["signature", "key_id"].includes(key)
    );
    // 排序
    for (const key of sortedKeys) {
      data += `${data.length ? "&" : ""}${key}=${req.query[key]}`;
    }
    const isVerified = crypto.verify(
      "sha256", // 使用 SHA-256 作为哈希算法
      Buffer.from(data, "utf-8"), // 将待验证数据转换为 Buffer
      crypto.createPublicKey(publicKey), // 加载公钥
      Buffer.from(signature, "base64") // 将签名转换为 Buffer
    );
    if (!isVerified) {
      return res.customSend(isVerified);
    }
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(user_id, {
      useMasterKey: true,
    });
    user.set("downloadFrequency", user.get("downloadFrequency") + 1);
    await user.save(null, { useMasterKey: true });
    console.log(user.get("nickName"), "获得了广告收益");

    res.customSend("success");
  } catch (err) {
    res.customErrorSend(err);
  }
});

module.exports = Router;
