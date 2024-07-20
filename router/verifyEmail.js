const express = require("express");
const dayjs = require("dayjs");
const Router = express.Router();

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
        "Verify that the link does not exist or has expired",
        500
      );
    }
    let timeDiff = dayjs().diff(linkInfo.get("createdAt"), "minute", true);

    if (timeDiff >= linkInfo.get("expired")) {
      return res.customErrorSend(
        "Verify that the link does not exist or has expired",
        500
      );
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
      )}" style="font-size:188px;font-weight:bold;">/33333/</a>`
    );
    // res.customSend({ success: linkInfo, timeDiff });
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

module.exports = Router;
