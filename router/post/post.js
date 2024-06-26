const { multiple } = require("../../utils//saveFile");
const express = require("express");
const Joi = require("joi");
const { validateParams } = require("../../utils/middlewares");

const Router = express.Router();
const Post = Parse.Object.extend("Post");
const PostWall = Parse.Object.extend("PostWall");
const PostContentInfo = Parse.Object.extend("PostContent");

// 创建帖子
Router.post("/creatdPost", multiple, async (req, res) => {
  if (
    (!req.files || !req.files.length) &&
    (!req.body.content || !req.body.content.length)
  ) {
    return res.customErrorSend("缺少必要参数！");
  }

  try {
    await createPost(
      req.files,
      req.body.content,
      req.user.id,
      req.body.maxPostHeight
    );
    res.customSend("success");
  } catch (err) {
    res.customErrorSend(err);
  }
});
const createPost = async (images, text, creatorId, h) => {
  const imageIds = [];
  for (const image of images) {
    const wallInfo = new PostWall();
    let filePath = "http://192.168.1.106:1337" + "/static/" + image.filename;
    // 设置图片信息
    wallInfo.set("imageName", image.filename); // 图片名称包含后缀
    wallInfo.set("imageUrl", filePath); // 图片可访问路径
    wallInfo.set("imageSize", image.size); // 字节大小
    wallInfo.set("imageDimensions", "0x0"); // 图片的尺寸 200x200 保留
    wallInfo.set("mimetype", image.mimetype); // 图片类型
    wallInfo.set("type", 1); // 图片展示类型（壁纸，表情包，头像） 保留
    wallInfo.set("creator", creatorId);
    const saveImageInfo = await wallInfo.save(null, { useMasterKey: true });
    imageIds.push(saveImageInfo.id); // 创建人
  }
  const post = new Post();

  if (text && text.length) {
    const postContentInfo = new PostContentInfo();
    postContentInfo.set("content", text);
    postContentInfo.set("creator", creatorId);
    const contentInfo = await postContentInfo.save(null, {
      useMasterKey: true,
    });
    post.set("contentId", contentInfo.id);
  }
  post.set("wallId", imageIds.join(","));
  post.set("maxPostHeight", h);
  post.set("creator", creatorId);
  post.set("likeCount", 0);
  post.set("commentCount", 0);
  console.log(post);
  // 可以添加其他属性，如发布时间等
  await post.save(null, { useMasterKey: true });
};

// 查询帖子
Router.get("/getAllPost", async (req, res) => {
  // 计算跳过的记录数和限制返回的记录数
  const { page = 1, pageSize = 10 } = req.query;

  // 计算需要跳过的数据量
  const skip = (page - 1) * pageSize;

  // 创建收藏夹查询
  const postQuery = new Parse.Query(Post);
  postQuery.limit(parseInt(pageSize));
  postQuery.skip(skip);
  const postResult = await postQuery.find();

  let postRecords = [];
  for (let i = 0; i < postResult.length; i++) {
    let singlePost = postResult[i];
    let wallId = singlePost.get("wallId") || "";
    // 被点赞内容的 ID
    let contentId = singlePost.get("contentId");

    const wallQuery = new Parse.Query(PostWall);
    wallQuery.containedIn("objectId", wallId.split(","));

    const contentQuery = new Parse.Query(PostContentInfo);
    contentQuery.equalTo("objectId", contentId);

    const userQuery = new Parse.Query(Parse.User);
    let a = await singlePost.get("creator");
    userQuery.equalTo("objectId", a);

    const postLike = Parse.Object.extend("PostLike");
    const postLikeQuery = new Parse.Query(postLike);
    const totalLikesQuery = new Parse.Query("PostLike");
    postLikeQuery.equalTo("creatorId", req.user.id);
    postLikeQuery.equalTo("postId", singlePost.id);
    totalLikesQuery.equalTo("postId", singlePost.id);

    let content = await contentQuery.first({ useMasterKey: true });
    let walls = await wallQuery.find({ useMasterKey: true });
    let user = await userQuery.first({ useMasterKey: true });
    let likes = await postLikeQuery.find({ useMasterKey: true });
    let userWalls = [];
    for (let j = 0; j < walls.length; j++) {
      userWalls.push({
        id: walls[j].id,
        createdAt: walls[j].get("createdAt"),
        url: walls[j].get("imageUrl"),
      });
    }

    postRecords.push({
      id: singlePost.id,
      createdAt: singlePost.get("createdAt"),
      like: singlePost.get("likeCount") || 0,
      maxPostHeight: singlePost.get("maxPostHeight"),
      content: content.get("content"),
      walls: userWalls,
      isLike: !!likes.length,
      userInfo: user
        ? {
            avatar: user.get("avatar"),
            username: user.get("nickName") || user.get("username"),
            id: user.id,
          }
        : {},
      collet: Math.floor(Math.random() * 50 + 1),
      comment: Math.floor(Math.random() * 10 + 1),
    });
  }

  res.customSend({
    pageSize,
    page: skip,
    total: await postQuery.count({ useMasterKey: true }),
    records: postRecords,
  });
});
// 点赞帖子
Router.get(
  "/likePost",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const postQuery = new Parse.Query(Post);

      // 查找帖子是否存在
      await postQuery.get(req.query.id, {
        useMasterKey: true,
      });
      const postLike = Parse.Object.extend("PostLike");
      const query = new Parse.Query(postLike);
      query.equalTo("creatorId", req.user.id);
      query.equalTo("postId", req.query.id);
      const reocrds = await query.find({ useMasterKey: true });
      const post = new Post();

      if (reocrds.length > 0) {
        await Parse.Object.destroyAll(reocrds);
        post.increment("likeCount", -1);
        await post.save(null, { useMasterKey: true });
        res.customSend("cancel");
        return;
      }

      const like = new postLike();
      like.set("creatorId", req.user.id);
      like.set("username", req.user.get("username"));
      like.set("avatar", req.user.get("avatar"));
      like.set("postId", req.query.id);
      post.increment("likeCount");
      await like.save(null, { useMasterKey: true });
      await post.save(null, { useMasterKey: true });
      res.customSend("Success!");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
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
      const postQuery = new Parse.Query(Post);
      const commentQuery = new Parse.Query(PostComment);
      postQuery.equalTo("objectId", req.body.parentId);
      commentQuery.equalTo("objectId", req.body.parentId);
      const result = await Promise.all([
        postQuery.find({ useMasterKey: true }),
        commentQuery.find({ useMasterKey: true }),
      ]);
      if (!result[0].length && !result[1].length) {
        return res.customErrorSend(
          `failed. The target does not exist or has been deleted `
        );
      }
      const Comment = new PostComment();
      Comment.set("creatorId", req.user.id);
      Comment.set("username", req.user.get("username"));
      Comment.set("avatar", req.user.get("avatar"));
      Comment.set("parentId", req.body.parentId);
      Comment.set("vestIn", result[0].length ? 0 : 1); // 0 帖子 1评论
      Comment.set("comment", req.body.comment);
      await Comment.save(null, { useMasterKey: true });
      res.customSend("Success!");
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

Router.delete(
  "/delPostComment",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const PostComment = Parse.Object.extend("PostComment");
      const commentQuery = new Parse.Query(PostComment);
      const comment = await commentQuery.get(req.body.id);
      if (comment.get("creatorId") === req.user.id) {
        await comment.destroy();
        res.customSend("cancel");
      } else {
        res.customErrorSend("not authority");
      }
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
module.exports = Router;
