const express = require("express");
const Parse = require("parse/node");
const Joi = require("joi");
const {
  validateParams,
  authenticateMiddleware,
} = require("../../utils/middlewares");
const Router = express.Router();

Router.put(
  "/updateLike",
  authenticateMiddleware,
  validateParams(
    Joi.object({
      wallId: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const Wall = Parse.Object.extend("Wall");
      await new Parse.Query(Wall).get(req.body.wallId, {
        useMasterKey: true,
      });
      const Like = Parse.Object.extend("WallLike");
      const query = new Parse.Query(Like);
      query.equalTo("creatorId", req.user.id);
      const reocrds = await query.find({
        useMasterKey: true,
      });
      if (reocrds.length > 0) {
        await Parse.Object.destroyAll(reocrds);
        res.customSend("cancel");
        return;
      }
      const like = new Like();
      like.set("creatorId", req.user.id);
      like.set("wallId", req.body.wallId);
      await like.save(null, { useMasterKey: true });
      res.customSend("Success!");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

Router.get("/likes", authenticateMiddleware, async (req, res) => {
  // 计算跳过的记录数和限制返回的记录数
  const { page = 1, pageSize = 10 } = req.query;

  // 计算需要跳过的数据量
  const skip = (page - 1) * pageSize;

  // 创建收藏夹查询
  const Like = Parse.Object.extend("WallLike");
  const likeQuery = new Parse.Query(Like);

  // 查询当前用户的点赞记录
  likeQuery.equalTo("creatorId", req.user.id); // 假设 creatorId 是点赞对象中保存用户 ID 的字段
  // 设置分页参数
  likeQuery.limit(parseInt(pageSize));
  likeQuery.skip(skip);

  try {
    const results = await likeQuery.find();

    // 找到点赞记录
    const likeRecords = results.map((like) => ({
      id: like.id, // 点赞记录的 objectId
      wallId: like.get("wallId"), // 被点赞内容的 ID
      createdAt: like.createdAt, // 点赞时间
    }));

    res.customSend(likeRecords); // 返回点赞记录给客户端
  } catch (error) {
    // 处理异常情况
    res.customErrorSend(error.message, error.code);
  }
});
module.exports = Router;
