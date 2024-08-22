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

const {
  getPostAdditionalValue,
  withPostfindDetail,
} = require("../../utils/utils");
// 创建帖子
Router.post("/creatdPost", multiple, async (req, res) => {
  if (
    (!req.files || !req.files.length) &&
    (!req.body.content || !req.body.content.length)
  ) {
    return res.customErrorSend("缺少必要参数！");
  }
  try {
    let postId = await createPost(req.files, req.user, req.body);

    res.customSend(postId);
  } catch (err) {
    console.log(err);
    res.customErrorSend(err);
  }
});

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

  post.set("weight", getPostAdditionalValue(images.length, text?.length || 0)); // 初始权重

  let singlePost = await post.save(null, { useMasterKey: true });

  const wallQuery = new Parse.Query("PostWall");
  const contentQuery = new Parse.Query("PostContent");
  if (singlePost.get("wallId")) {
    let afterWall = await wallQuery.get(singlePost.get("wallId"));
    afterWall.set("belongId", singlePost.id);
    afterWall.save(null, { useMasterKey: true }).catch((err) => {
      console.log("set wall belongId", err);
    });
  }
  if (singlePost.get("contentId")) {
    let afterContent = await contentQuery.get(singlePost.get("contentId"));
    afterContent.set("belongId", singlePost.id);
    afterContent.save(null, { useMasterKey: true }).catch((err) => {
      console.log("set content belongId", err);
    });
  }
  console.log(singlePost.id);

  return singlePost.id;
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
Router.get(
  "/getAllPost",
  validateParams(
    Joi.object({
      pageSize: Joi.number().max(20),
      page: Joi.number(),
    }).unknown()
  ),
  async (req, res) => {
    // 计算跳过的记录数和限制返回的记录数
    const { page = 1, pageSize = 10 } = req.query;

    const isLogin = !!req.user;

    // 计算需要跳过的数据量
    const skip = (page - 1) * pageSize;

    const postQuery = new Parse.Query(Post);

    postQuery.skip(isLogin ? skip : skip > 20 ? 20 : skip);
    postQuery.limit(parseInt(pageSize));
    postQuery.descending("createdAt");
    if (req.query.userId) {
      postQuery.equalTo("creator", req.query.userId);
    } else {
      postQuery.descending("weight"); // 确保排序唯一
      const pageView = Parse.Object.extend("PostBrowseHistory");
      const pageViewQuery = new Parse.Query(pageView);
      pageViewQuery.equalTo("creatorId", req.user?.id);
      let pageViewRecord = await pageViewQuery.findAll({ useMasterKey: true });

      postQuery.notContainedIn(
        "objectId",
        pageViewRecord.map((item) => item.get("postId"))
      );
    }
    const postResult = await postQuery.find({ useMasterKey: true }); // 按创建时间降序排序

    let postRecords = [];
    let postsLength = postResult.length;
    for (let i = 0; i < postsLength; i++) {
      postRecords.push(await withPostfindDetail(postResult[i], req.user?.id));
    }
    const total = await postQuery.count({ useMasterKey: true });
    res.customSend({
      nextPage: page * pageSize < total,
      isLogin,
      records: postRecords
        .sort((a, b) => b.weight - a.weight)
        .map(({ weight, ...rest }) => rest),
      total,
    });
  }
);

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

      res.customSend(await withPostfindDetail(singlePost, req.user.id));
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
    const userId = req.query.id || req.user.id;
    // 计算需要跳过的数据量
    const skip = (page - 1) * pageSize;
    const postQuery = new Parse.Query(Post);
    postQuery.limit(parseInt(pageSize));
    postQuery.skip(skip);
    postQuery.equalTo("creator", userId);
    postQuery.descending("createdAt");
    const postResult = await postQuery.find();
    const total = await postQuery.count({ useMasterKey: true });
    let records = [];
    for (let i = 0; i < postResult.length; i++) {
      records.push(await withPostfindDetail(postResult[i], req.user.id));
    }
    res.customSend({ records, nextPage: page * pageSize < total });
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});
Router.get(
  "/keyWord",
  validateParams(
    Joi.object({
      keyWord: Joi.string().required(),
      pageSize: Joi.number().max(20),
      page: Joi.number(),
    }).unknown()
  ),
  async (req, res) => {
    try {
      // 计算跳过的记录数和限制返回的记录数
      const { page = 1, pageSize = 10 } = req.query;
      // 计算需要跳过的数据量
      const skip = (page - 1) * pageSize;
      let keyWord = req.query.keyWord;

      const characters = keyWord.split("");

      characters.push(keyWord);

      const regexPattern = characters.join("|");
      const postContentQuery = new Parse.Query("PostContent");
      postContentQuery.skip(skip);
      postContentQuery.limit(parseInt(pageSize));
      postContentQuery.matches("content", regexPattern);
      const total = await postContentQuery.count({ useMasterKey: true });
      const record = await postContentQuery.find({ useMasterKey: true });
      let recordLength = record.length;
      let result = [];
      for (let i = 0; i < recordLength; i++) {
        const postQuery = new Parse.Query(Post);
        const singlePost = await postQuery.get(record[i].get("belongId"));
        result.push(await withPostfindDetail(singlePost, req.user.id));
      }

      res.customSend({ total: result.length, result });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
module.exports = Router;
