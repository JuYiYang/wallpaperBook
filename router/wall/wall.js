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
const fs = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
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
      let fileNames = [];
      for (let i = 0; i < req.files.length; i++) {
        let image = req.files[i];
        // 读取文件内容
        const fileBuffer = await fs.readFile(image.path);

        // 计算 MD5 值
        const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
        const extension = path.extname(image.originalname);
        const newFilename = `${hash}${extension}`;
        const newPath = path.join(image.destination, newFilename);
        // 重命名文件
        await fs.rename(image.path, newPath);
        let visitPath = process.env.DOMAINNAME + "/static/" + newFilename;
        wall.set("creatorId", req.user.id);
        wall.set("path", visitPath);
        wall.set("username", req.body.virtualName || req.user.get("nickName"));
        wall.set("avatar", req.body.virtualAvatar || req.user.get("avatar"));
        wall.set("postId", "");
        wall.set("frequency", req.body.frequency || 1);
        wall.set("source", "custom");
        wall.set("sourceId", "");
        wall.set("size", req.body?.size || "0x0");
        wall.set("sourcePath", "");
        await wall.save(null, { useMasterKey: true });
        fileNames.push(visitPath);
      }

      res.customSend(fileNames);
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

module.exports = Router;
