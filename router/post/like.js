const express = require("express");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");

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
      like.set("creatorId", req.user.id);
      like.set("username", req.user.get("username"));
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
      like.set("username", req.user.get("username"));
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
