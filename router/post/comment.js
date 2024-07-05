const express = require("express");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");

const Router = express.Router();

// 评论
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
      // 查找对应帖子
      const Post = Parse.Object.extend("Post");
      const postQuery = new Parse.Query(Post);
      const singlePost = await postQuery.get(req.body.parentId, {
        useMasterKey: true,
      });
      // 创建评论对象
      const PostComment = Parse.Object.extend("PostComment");
      const Comment = new PostComment();

      Comment.set("creatorId", req.user.id);
      Comment.set("username", req.user.get("username"));
      Comment.set("avatar", req.user.get("avatar"));
      Comment.set("likeCount", 0); // 喜欢数
      Comment.set("replyCount", 0); // 回复数
      Comment.set("postId", req.body.parentId);
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
// 回复评论
Router.post(
  "/replyComment",
  validateParams(
    Joi.object({
      comment: Joi.required(),
      postId: Joi.required(),
      replyId: Joi.required(),
      parentId: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      // 查找对应帖子
      const Post = Parse.Object.extend("Post");
      const postQuery = new Parse.Query(Post);
      const singlePost = await postQuery.get(req.body.postId, {
        useMasterKey: true,
      });
      // 查找对应父级评论
      const PostComment = Parse.Object.extend("PostComment");
      const commentQuery = new Parse.Query(PostComment);
      const parentComment = await commentQuery.get(req.body.parentId, {
        useMasterKey: true,
      });
      // 创建评论对象
      const PostReplyComment = Parse.Object.extend("PostReplyComment");

      // 查找对应回复评论
      const replyCommentQuery = new Parse.Query(PostReplyComment);
      const replyInfo = await replyCommentQuery.get(req.body.replyId, {
        useMasterKey: true,
      });

      const replyComment = new PostReplyComment();

      replyComment.set("creatorId", req.user.id);
      replyComment.set("username", req.user.get("username"));
      replyComment.set("avatar", req.user.get("avatar"));
      replyComment.set("likeCount", 0);
      replyComment.set("postId", req.body.postId);
      replyComment.set("parentId", req.body.parentId);
      replyComment.set("replyInfo", {
        replyCommentId: req.body.replyId,
        username: replyInfo.get("username"),
        id: replyInfo.get("creatorId"),
      });
      replyComment.set("comment", req.body.comment);
      const afterInfo = await replyComment.save(null, { useMasterKey: true });
      singlePost.increment("commentCount");
      parentComment.increment("replyCount");

      singlePost
        .save(null, { useMasterKey: true })
        .then((res) => console.log("callback 回复评论增加帖子评论数 success"))
        .catch((err) => console.log("callback 回复评论加帖子评论数 err", err));

      parentComment
        .save(null, { useMasterKey: true })
        .then((res) => console.log("callback 回复评论增加回复数 success"))
        .catch((err) => console.log("callback 回复评论增加回复数 error", err));

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
        if (comment.get("vestIn") === 1) {
          const parentCommentQuery = new Parse.Query(PostComment);
          parentCommentQuery
            .get(comment.get("parentId"))
            .then((data) => {
              data.increment("replyCount", -1);
              console.log("cb 删除评论 减少replyCount次数成功：");
              data.save(null, { useMasterKey: true });
            })
            .catch((err) => {
              console.log("cb 删除评论 减少replyCount次数失败：", err);
            });
        }
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
      let replyTotal = 0;
      let records = [];
      for (let i = 0; i < PostCommentResult.length; i++) {
        let item = PostCommentResult[i];

        const PostReplyComment = Parse.Object.extend("PostReplyComment");
        const replyCommentQuery = new Parse.Query(PostReplyComment);
        replyCommentQuery.equalTo("parentId", item.id);
        replyTotal += await PostCommentQuery.count({ useMasterKey: true });

        const postCommentLike = Parse.Object.extend("PostCommentLike");
        const query = new Parse.Query(postCommentLike);
        query.equalTo("creatorId", req.user.id);
        query.equalTo("commentId", item.id);
        const likeRecord = await query.find({ useMasterKey: true });

        records.push({
          id: item.id,
          userLike: !!likeRecord.length,
          avatar: item.get("avatar"),
          username: item.get("username"),
          comment: item.get("comment"),
          replyChildren: [],
          replyCount: item.get("replyCount"),
          likeCount: item.get("likeCount") || 0,
          createdAt: item.get("createdAt"),
        });
      }
      res.customSend({
        records,
        total: total + replyTotal,
        nextPage: page * pageSize < total,
      });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
// 查询二级评论
Router.get(
  "/getReplyComment",
  validateParams(
    Joi.object({
      id: Joi.required(),
      page: Joi.any(),
      pageSize: Joi.any(),
    })
  ),
  async (req, res) => {
    // 计算跳过的记录数和限制返回的记录数
    const { page = 1, pageSize = 10 } = req.query;

    // 计算需要跳过的数据量
    const skip = (page - 1) * pageSize;

    const PostReplyComment = Parse.Object.extend("PostReplyComment");
    const commentQuery = new Parse.Query(PostReplyComment);
    commentQuery.limit(parseInt(pageSize));
    commentQuery.skip(skip);
    commentQuery.equalTo("parentId", req.query.id);
    commentQuery.descending("createdAt");
    commentQuery.descending("likeCount");
    const total = await commentQuery.count({ useMasterKey: true });
    const commentResult = await commentQuery.find();

    let records = [];
    for (let i = 0; i < commentResult.length; i++) {
      let item = commentResult[i];
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
        username: item.get("nickName") ?? item.get("username"),
        comment: item.get("comment"),
        likeCount: item.get("likeCount") || 0,
        replyInfo: item.get("replyInfo"),
        createdAt: item.get("createdAt"),
      });
    }
    res.customSend({
      records,
      total,
      nextPage: page * pageSize < total,
    });
  }
);
module.exports = Router;

// parentComentQuery
// .get(req.body.parentId)
// .then((data) => {
//   data.increment("replyCount");
//   data
//     .save(null, { useMasterKey: true })
//     .then((e) =>
//       console.log("cb 设置一级评论replyCount成功", data.id)
//     )
//     .catch((e) => {
//       console.log(error, "cb 设置一级评论replyCount失败", data.id);
//     });
// })
// .catch((error) => {
//   console.log(error, "cb 设置一级评论replyCount失败");
// });
