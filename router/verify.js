const express = require("express");
const dayjs = require("dayjs");

const Router = express.Router();
const { authenticateMiddleware } = require("../utils/middlewares");
const { getTempCosToken } = require("../utils/cos");
Router.get("/:token", async (req, res) => {
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
module.exports = Router;
