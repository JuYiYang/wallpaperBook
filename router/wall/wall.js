// 审核状态
// 来源库
// 来源库id

// 图片地址
// 发布人信息

// 关联帖子id
// 点赞数
// 收藏数
// 浏览量 // 半小时内计算一次
const express = require("express");
const Joi = require("joi");
const { authenticateMiddleware } = require("../../utils/middlewares");
const { multiple } = require("../../utils//saveFile");
const Router = express.Router();

const Wall = Parse.Object.extend("Wall");
Router.post(
  "/creatdWall",
  authenticateMiddleware,
  multiple,
  async (req, res) => {
    try {
      if (!req.files.length) {
        return res.customErrorSend("请上传图片", 500);
      }
      const wall = new Wall();
      wall.set("creatorId", req.user.id);
      wall.set(
        "path",
        req.files
          .map((image) => process.env.IMAGEPREFIX + "/static/" + image.filename)
          .join(",")
      );

      wall.set("username", req.body.virtualName || req.user.get("nickName"));
      wall.set("avatar", req.body.virtualAvatar || req.user.get("avatar"));
      wall.set("postId", "");
      wall.set("frequency", req.body.frequency || 1);
      wall.set("source", "custom");
      wall.set("sourceId", "");
      wall.set("sourcePath", "");
      const afterInfo = await wall.save(null, { useMasterKey: true });
      res.customSend(afterInfo.id);
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

module.exports = Router;
