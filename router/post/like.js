const express = require("express");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");
const { batchFetchDetails } = require("../../utils/utils");

const Router = express.Router();

// 点赞帖子
Router.put(
  "/likePost",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const Post = Parse.Object.extend("Post");
      const postQuery = new Parse.Query(Post);

      // 查找帖子是否存在
      const singlePost = await postQuery.get(req.body.id, {
        useMasterKey: true,
      });
      const postLike = Parse.Object.extend("PostLike");
      const query = new Parse.Query(postLike);
      query.equalTo("creatorId", req.user.id);
      query.equalTo("postId", req.body.id);
      const reocrds = await query.find({ useMasterKey: true });
      if (reocrds.length > 0) {
        await Parse.Object.destroyAll(reocrds);
        singlePost.increment("likeCount", -1);
        await singlePost.save(null, { useMasterKey: true });
        res.customSend("cancel");
        return;
      }
      const like = new postLike();
      like.set("wallId", singlePost.get("wallId"));
      like.set("contentId", singlePost.get("contentId"));
      like.set("creatorId", req.user.id);
      like.set("username", req.user.get("nickName"));
      like.set("avatar", req.user.get("avatar"));
      like.set("postId", req.body.id);
      singlePost.increment("likeCount");

      await singlePost.save(null, { useMasterKey: true });
      await like.save(null, { useMasterKey: true });
      res.customSend("Success!");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

// 查询用户点赞的帖子
Router.get("/getMyLikePost", async (req, res) => {
  try {
    // 计算跳过的记录数和限制返回的记录数
    const { page = 1, pageSize = 10 } = req.query;
    const userId = req.query.id || req.user.id;

    // 计算需要跳过的数据量
    const skip = (page - 1) * pageSize;
    const postLike = Parse.Object.extend("PostLike");
    const query = new Parse.Query(postLike);
    query.equalTo("creatorId", userId);
    query.limit(parseInt(pageSize));
    query.skip(skip);
    query.descending("createdAt");
    const record = await query.find({ useMasterKey: true });
    const total = await query.count({ useMasterKey: true });

    let records = [];
    for (let i = 0; i < record.length; i++) {
      let item = record[i];
      //原帖信息
      const postQuery = new Parse.Query("Post");
      postQuery.equalTo("objectId", item.get("postId"));
      let postInfo = await postQuery.first({ useMasterKey: true });
      if (!postInfo) {
        const postLike = Parse.Object.extend("PostLike");
        const query = new Parse.Query(postLike);
        query.equalTo("creatorId", userId);
        query.equalTo("postId", item.get("postId"));
        const reocrds = await query.find({ useMasterKey: true });
        if (reocrds.length > 0) {
          Parse.Object.destroyAll(reocrds).then((res) => {
            console.log("点赞记录帖子信息丢失，已清除", reocrds);
          });
        }
        continue;
      }
      records.push(postInfo);
    }
    let finalRecords = await batchFetchDetails(records, userId);
    res.customSend({
      records: finalRecords.map((item) => {
        item.postId = item.id;
        return item;
      }),
      total,
    });
  } catch (error) {
    console.log(error);
    res.customErrorSend(error.message, error.code);
  }
});

// 点赞评论
Router.put(
  "/likeComment",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const PostComment = Parse.Object.extend("PostComment");
      const PostCommentQuery = new Parse.Query(PostComment);
      // 查找评论是否存在
      const singleComment = await PostCommentQuery.get(req.body.id, {
        useMasterKey: true,
      });

      const postCommentLike = Parse.Object.extend("PostCommentLike");
      const query = new Parse.Query(postCommentLike);
      query.equalTo("creatorId", req.user.id);
      query.equalTo("commentId", singleComment.id);
      const likeRecord = await query.find({ useMasterKey: true });

      if (likeRecord.length > 0) {
        await Parse.Object.destroyAll(likeRecord);
        singleComment.increment("likeCount", -1);
        await singleComment.save(null, { useMasterKey: true });
        res.customSend("cancel");
        return;
      }

      const like = new postCommentLike();
      like.set("creatorId", req.user.id);
      like.set("username", req.user.get("nickName"));
      like.set("avatar", req.user.get("avatar"));
      like.set("commentId", req.body.id);
      singleComment.increment("likeCount");
      await singleComment.save(null, { useMasterKey: true });
      await like.save(null, { useMasterKey: true });
      res.customSend("Success!");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

module.exports = Router;
