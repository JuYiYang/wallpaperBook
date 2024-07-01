const express = require("express");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");

const Router = express.Router();

// 评论帖子
Router.post(
  "/addComment",
  validateParams(
    Joi.object({
      comment: Joi.required(),
      parentId: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const PostComment = Parse.Object.extend("PostComment");
      const Post = Parse.Object.extend("Post");
      const postQuery = new Parse.Query(Post);
      const commentQuery = new Parse.Query(PostComment);
      postQuery.equalTo("objectId", req.body.parentId);
      commentQuery.equalTo("objectId", req.body.parentId);
      const result = await Promise.all([
        postQuery.first({ useMasterKey: true }),
        commentQuery.first({ useMasterKey: true }),
      ]);
      if (!result[0] && !result[1]) {
        return res.customErrorSend(
          `failed. The target does not exist or has been deleted `
        );
      }
      const postQuery2 = new Parse.Query(Post);
      postQuery2.equalTo(
        "objectId",
        result[0] ? result[0].id : result[1].get("postId")
      );
      const singlePost = await postQuery2.first({ useMasterKey: true });
      const Comment = new PostComment();
      Comment.set("creatorId", req.user.id);
      Comment.set("username", req.user.get("username"));
      Comment.set("avatar", req.user.get("avatar"));
      Comment.set("parentId", req.body.parentId);
      Comment.set("likeCount", 0);
      Comment.set("postId", result[0] ? result[0].id : result[1].get("postId"));
      Comment.set("vestIn", result[0] ? 0 : 1); // 0 帖子 1评论
      Comment.set("comment", req.body.comment);
      singlePost.increment("commentCount");
      const afterInfo = await Comment.save(null, { useMasterKey: true });
      await singlePost.save(null, { useMasterKey: true });
      res.customSend(afterInfo.id);
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

// 删除评论
Router.delete(
  "/delPostComment",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const Post = Parse.Object.extend("Post");
      const PostComment = Parse.Object.extend("PostComment");
      const commentQuery = new Parse.Query(PostComment);
      const postQuery = new Parse.Query(Post);
      const comment = await commentQuery.get(req.body.id);
      const singlePost = await postQuery.get(comment.get("postId"));
      if (comment.get("creatorId") === req.user.id) {
        singlePost.increment("commentCount", -1);
        await comment.destroy();
        await singlePost.save(null, { useMasterKey: true });
        res.customSend("cancel");
      } else {
        res.customErrorSend("not authority");
      }
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
// 查询所有的评论
Router.get(
  "/getPostComment",
  validateParams(
    Joi.object({
      id: Joi.required(),
      page: Joi.any(),
      pageSize: Joi.any(),
    })
  ),
  async (req, res) => {
    try {
      // 计算跳过的记录数和限制返回的记录数
      const { page = 1, pageSize = 10 } = req.query;

      // 计算需要跳过的数据量
      const skip = (page - 1) * pageSize;

      const Post = Parse.Object.extend("Post");
      const post = new Parse.Query(Post);
      await post.get(req.query.id);

      const PostComment = Parse.Object.extend("PostComment");
      const PostCommentQuery = new Parse.Query(PostComment);
      PostCommentQuery.limit(parseInt(pageSize));
      PostCommentQuery.skip(skip);
      PostCommentQuery.equalTo("postId", req.query.id);
      PostCommentQuery.descending("createdAt");
      PostCommentQuery.descending("likeCount");
      // ascending 升序
      const PostCommentResult = await PostCommentQuery.find();

      const total = await PostCommentQuery.count({ useMasterKey: true });
      let records = [];
      for (let i = 0; i < PostCommentResult.length; i++) {
        let item = PostCommentResult[i];
        const postCommentLike = Parse.Object.extend("PostCommentLike");
        const query = new Parse.Query(postCommentLike);
        query.equalTo("creatorId", req.user.id);
        query.equalTo("commentId", item.id);
        const likeRecord = await query.find({ useMasterKey: true });
        records.push({
          id: item.id,
          userLike: !!likeRecord.length,
          avatar: item.get("avatar"),
          parentId: item.get("parentId"),
          postId: item.get("postId"),
          username: item.get("username"),
          comment: item.get("comment"),
          likeCount: item.get("likeCount") || 0,
          createdAt: item.get("createdAt"),
        });
      }
      res.customSend({
        records,
        total,
        nextPage: page * pageSize < total,
      });
    } catch (error) {
      res.customErrorSend(error);
    }
  }
);

module.exports = Router;
