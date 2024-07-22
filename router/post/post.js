const express = require("express");
const fs = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
const Joi = require("joi");
const { multiple } = require("../../utils//saveFile");
const { validateParams } = require("../../utils/middlewares");

const Router = express.Router();
const Post = Parse.Object.extend("Post");
const PostWall = Parse.Object.extend("PostWall");
const PostContentInfo = Parse.Object.extend("PostContent");

// 创建帖子
Router.post(
  "/creatdPost",
  multiple,

  async (req, res) => {
    if (
      (!req.files || !req.files.length) &&
      (!req.body.content || !req.body.content.length)
    ) {
      return res.customErrorSend("缺少必要参数！");
    }
    try {
      await createPost(req.files, req.user, req.body);
      res.customSend("success");
    } catch (err) {
      console.log(err);
      res.customErrorSend(err);
    }
  }
);

const createPost = async (images, user, body) => {
  const imageIds = [];
  let imageSizes = body.imageSizes ? JSON.parse(body.imageSizes) : [];
  let maxPostHeight = 0;
  for (let i = 0; i < images.length; i++) {
    let image = images[i];
    // 读取文件内容
    const fileBuffer = await fs.readFile(image.path);

    // 计算 MD5 值
    const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const extension = path.extname(image.originalname);
    const newFilename = `${hash}${extension}`;
    const newPath = path.join(image.destination, newFilename);
    // 重命名文件
    await fs.rename(image.path, newPath);
    const wallInfo = new PostWall();
    if (imageSizes.length)
      maxPostHeight = Math.max(maxPostHeight, imageSizes[i].height);
    let filePath = process.env.DOMAINNAME + "/static/" + newFilename;
    // 设置图片信息
    wallInfo.set("imageName", newFilename); // 图片名称包含后缀
    wallInfo.set("imageUrl", filePath); // 图片可访问路径
    wallInfo.set("imageSize", image.size); // 字节大小
    wallInfo.set(
      "imageDimensions",
      imageSizes.length
        ? `${imageSizes[i].width}x${imageSizes[i].height}`
        : "0x0"
    ); // 图片的尺寸 200x200 保留
    wallInfo.set("mimetype", image.mimetype); // 图片类型
    wallInfo.set("type", 1); // 图片展示类型（壁纸，表情包，头像） 保留
    wallInfo.set("creator", user.id);
    const saveImageInfo = await wallInfo.save(null, { useMasterKey: true });
    imageIds.push(saveImageInfo.id); // 创建人
  }
  const post = new Post();
  const text = body.content;
  if (text && text.length) {
    const postContentInfo = new PostContentInfo();
    postContentInfo.set("content", text);
    postContentInfo.set("creator", user.id);
    const contentInfo = await postContentInfo.save(null, {
      useMasterKey: true,
    });
    post.set("contentId", contentInfo.id);
  }

  post.set("wallId", imageIds.join(","));
  post.set("maxPostHeight", maxPostHeight + "");
  post.set("creator", user.id);
  post.set("likeCount", 0);
  post.set("commentCount", 0);
  post.set("creatorAvatar", user.get("avatar"));
  post.set("creatorName", user.get("nickName"));

  return await post.save(null, { useMasterKey: true });
};

// 删除帖子
Router.delete(
  "/del",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const postQuery = new Parse.Query(Post);
      const singlePost = await postQuery.get(req.body.id);

      if (singlePost.get("creator") !== req.user.id) {
        return res.customErrorSend("暂无权限");
      }

      await singlePost.destroy();
      res.customSend("success");
    } catch (error) {
      res.customErrorSend("帖子不存在或权限不足");
    }
  }
);

// 查询帖子
Router.get("/getAllPost", async (req, res) => {
  // 计算跳过的记录数和限制返回的记录数
  const { page = 1, pageSize = 10 } = req.query;

  // 计算需要跳过的数据量
  const skip = (page - 1) * pageSize;

  const postQuery = new Parse.Query(Post);
  postQuery.skip(skip);
  postQuery.limit(parseInt(pageSize));
  postQuery.descending("createdAt");
  postQuery.descending("weight");
  const postResult = await postQuery.find(); // 按创建时间降序排序

  let postRecords = [];
  for (let i = 0; i < postResult.length; i++) {
    let singlePost = postResult[i];
    let wallId = singlePost.get("wallId") || "";
    // 被点赞内容的 ID
    let contentId = singlePost.get("contentId");
    // 图
    const wallQuery = new Parse.Query(PostWall);
    wallQuery.containedIn("objectId", wallId.split(","));
    // 文
    const contentQuery = new Parse.Query(PostContentInfo);
    contentQuery.equalTo("objectId", contentId);

    // 当前用户是否点赞
    const postLike = Parse.Object.extend("PostLike");
    const postLikeQuery = new Parse.Query(postLike);
    postLikeQuery.equalTo("creatorId", req.user.id);
    postLikeQuery.equalTo("postId", singlePost.id);

    let content = await contentQuery.first({ useMasterKey: true });
    let walls = await wallQuery.find({ useMasterKey: true });
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
      content: content?.get("content"),
      walls: userWalls,
      isLike: !!likes.length,
      userInfo: {
        avatar: singlePost.get("creatorAvatar"),
        username: singlePost.get("creatorName"),
        id: singlePost.get("creator"),
      },
      collet: Math.floor(Math.random() * 50 + 1),
      comment: singlePost.get("commentCount") || 0,
    });
  }
  const total = await postQuery.count({ useMasterKey: true });
  res.customSend({
    nextPage: page * pageSize < total,
    records: postRecords,
  });
});

// 查询帖子详情
Router.get(
  "/getSinglePostInfo",
  validateParams(
    Joi.object({
      id: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const postQuery = new Parse.Query(Post);
      const singlePost = await postQuery.get(req.query.id);

      let wallId = singlePost.get("wallId") || "";
      // 被点赞内容的 ID
      let contentId = singlePost.get("contentId");

      const wallQuery = new Parse.Query(PostWall);
      wallQuery.containedIn("objectId", wallId.split(","));

      const contentQuery = new Parse.Query(PostContentInfo);
      contentQuery.equalTo("objectId", contentId);
      let content = await contentQuery.first({ useMasterKey: true });
      let walls = await wallQuery.find({ useMasterKey: true });

      res.customSend({
        id: singlePost.id,
        userInfo: {
          avatar: singlePost.get("creatorAvatar"),
          username: singlePost.get("creatorName"),
          id: singlePost.get("creator"),
        },
        colletCount: Math.floor(Math.random() * 50 + 1),
        commentCount: singlePost.get("commentCount") || 0,
        content: content?.get("content"),
        likeCount: singlePost.get("likeCount") || 0,
        createdAt: singlePost.get("createdAt"),
        walls: walls.map((item) => {
          return {
            id: item.id,
            createdAt: item.get("createdAt"),
            url: item.get("imageUrl"),
          };
        }),
      });
    } catch (error) {
      res.customErrorSend(error);
    }
  }
);

// 查询当前用户创建的帖子
Router.get("/myPost", async (req, res) => {
  try {
    // 计算跳过的记录数和限制返回的记录数
    const { page = 1, pageSize = 10 } = req.query;

    // 计算需要跳过的数据量
    const skip = (page - 1) * pageSize;
    const postQuery = new Parse.Query(Post);
    postQuery.limit(parseInt(pageSize));
    postQuery.skip(skip);
    postQuery.equalTo("creator", req.user.id);
    postQuery.descending("createdAt");
    const postResult = await postQuery.find();
    const total = await postQuery.count({ useMasterKey: true });
    let records = [];
    for (let i = 0; i < postResult.length; i++) {
      let item = postResult[i];
      const PostWall = Parse.Object.extend("PostWall");
      const PostContentInfo = Parse.Object.extend("PostContent");
      // 图
      const wallQuery = new Parse.Query(PostWall);
      wallQuery.containedIn("objectId", item.get("wallId").split(","));
      // 文
      const contentQuery = new Parse.Query(PostContentInfo);
      contentQuery.equalTo("objectId", item.get("contentId"));
      let content = await contentQuery.first({ useMasterKey: true });
      let walls = await wallQuery.find({ useMasterKey: true });
      records.push({
        id: item.id,
        likeCount: item.get("likeCount"),
        commentCount: item.get("commentCount"),
        createdAt: item.get("createdAt"),
        postId: item.get("postId"),
        content: content.get("content"),
        walls: walls.map((wall) => {
          return {
            id: wall.id,
            createdAt: wall.get("createdAt"),
            url: wall.get("imageUrl"),
          };
        }),
      });
    }
    res.customSend({ records, nextPage: page * pageSize < total });
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});
module.exports = Router;
