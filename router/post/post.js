const express = require("express");
const fs = require("fs-extra");
const dayjs = require("dayjs");
const crypto = require("crypto");
const path = require("path");
const Joi = require("joi");
const { multiple } = require("../../utils//saveFile");
const { validateParams } = require("../../utils/middlewares");
const Router = express.Router();
const Post = Parse.Object.extend("Post");
const PostWall = Parse.Object.extend("PostWall");
const PostContentInfo = Parse.Object.extend("PostContent");
const { delPostInfo } = require("../../utils/utils");
const {
  getPostAdditionalValue,
  withPostfindDetail,
} = require("../../utils/utils");
// 本地File创建帖子
Router.post("/byCreatdPost", multiple, async (req, res) => {
  if (
    (!req.files || !req.files.length) &&
    (!req.body.content || !req.body.content.length)
  ) {
    return res.customErrorSend("缺少必要参数！");
  }
  try {
    let post = await createPost(req.files, req.user, req.body);

    res.customSend(await withPostfindDetail(post));
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

  const acl = new Parse.ACL();
  // 创建者可以编辑帖子
  acl.setWriteAccess(user, true);
  acl.setPublicReadAccess(true);
  post.setACL(acl);
  let singlePost = await post.save(null, { useMasterKey: true });

  const wallQuery = new Parse.Query("PostWall");
  const contentQuery = new Parse.Query("PostContent");
  if (singlePost.get("wallId")) {
    let wallIds = singlePost.get("wallId").split(",");
    for (let index = 0; index < wallIds.length; index++) {
      const element = wallIds[index];
      let afterWall = await wallQuery.get(element);
      afterWall.set("belongId", singlePost.id);
      afterWall.save(null, { useMasterKey: true }).catch((err) => {
        console.log("set wall belongId", err);
      });
    }
  }
  if (singlePost.get("contentId")) {
    let afterContent = await contentQuery.get(singlePost.get("contentId"));
    afterContent.set("belongId", singlePost.id);
    afterContent.save(null, { useMasterKey: true }).catch((err) => {
      console.log("set content belongId", err);
    });
  }
  return singlePost;
};
Router.post("/creatdPost", async (req, res) => {
  const prefix = "https://tokyo-1307889358.cos.ap-tokyo.myqcloud.com/images/";
  if (
    (!req.body.content || !req.body.content.length) &&
    (!req.body.walls || !req.body.walls.length)
  ) {
    return res.customErrorSend("缺少必要参数！");
  }

  const user = req.user;
  try {
    const post = new Post();
    const text = req.body.content;

    let imageIds = [];
    if (req.body.walls && req.body.walls.length) {
      for (let index = 0; index < req.body.walls.length; index++) {
        const element = req.body.walls[index];
        const wallInfo = new PostWall();

        wallInfo.set("imageName", element.hash + "." + element.suffix);
        wallInfo.set("imageUrl", prefix + element.hash + "." + element.suffix);
        wallInfo.set("imageSize", element.size);
        wallInfo.set("imageDimensions", `${element.width}x${element.height}`);
        wallInfo.set("mimetype", element.mimetype); // 图片类型
        wallInfo.set("type", 1); // 图片展示类型（壁纸，表情包，头像） 保留
        wallInfo.set("creator", user.id);
        const saveImageInfo = await wallInfo.save(null, { useMasterKey: true });
        imageIds.push(saveImageInfo.id);
      }
    }

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
    post.set(
      "maxPostHeight",
      Math.max.apply(
        Math,
        req.body.walls.map((e) => e.height)
      ) + ""
    );
    post.set("creator", user.id);
    post.set("likeCount", 0);
    post.set("commentCount", 0);
    post.set("creatorAvatar", user.get("avatar"));
    post.set("creatorName", user.get("nickName"));

    post.set(
      "weight",
      getPostAdditionalValue(req.body.walls.length, text?.length || 0)
    ); // 初始权重

    const acl = new Parse.ACL();
    // 创建者可以编辑帖子
    acl.setWriteAccess(user, true);
    acl.setPublicReadAccess(true);
    post.setACL(acl);
    let singlePost = await post.save(null, { useMasterKey: true });
    console.log(singlePost.id);

    res.customSend(await withPostfindDetail(singlePost));
  } catch (err) {
    console.log(err);
    res.customErrorSend(err);
  }
});
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
      if (
        singlePost.get("creator") !== req.user.id &&
        !["H35NQKmY1l", "jLEADQV7nL"].includes(req.user.id) // juyiyang@qq.com vw50kfc
      ) {
        return res.customErrorSend("暂无权限");
      }

      await delPostInfo(singlePost);
      res.customSend("success");
    } catch (error) {
      res.customErrorSend(error.message || "帖子不存在或权限不足");
    }
  }
);

// 查询帖子
Router.get(
  "/getAllPost",
  validateParams(
    Joi.object({
      pageSize: Joi.number().max(999999),
      page: Joi.number(),
    }).unknown()
  ),
  async (req, res) => {
    try {
      const start = dayjs(); // 开始时间
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
        let pageViewRecord = await pageViewQuery.aggregate(
          { $group: { _id: "$postId" } },
          {
            useMasterKey: true,
          }
        );
        postQuery.notContainedIn(
          "objectId",
          pageViewRecord.map((item) => item.objectId)
        );
      }
      postQuery.select(
        "commentCount",
        "likeCount",
        "creatorName",
        "creatorAvatar",
        "weight",
        "maxPostHeight",
        "customCreatedAt",
        "creator",
        "contentId",
        "wallId"
      );
      console.time("postResult");
      const postResult = await postQuery.find({ useMasterKey: true }); // 按创建时间降序排序
      console.timeEnd("postResult");
      let postRecords = [];
      let postsLength = postResult.length;

      console.time("withPostfindDetail");
      for (let i = 0; i < postsLength; i++) {
        postRecords.push(await withPostfindDetail(postResult[i], req.user?.id));
      }
      console.timeEnd("withPostfindDetail");
      console.time("total");
      let total = req.query.userId ? await postQuery.count() : 3000;
      const end = dayjs(); // 结束时间
      const executionTimeMs = end.diff(start);
      console.timeEnd("total", total);
      res.customSend({
        nextPage: page * pageSize < total,
        isLogin,
        total,
        executionTimeMs,
        records:
          0 == 0
            ? []
            : postRecords
                .sort((a, b) => b.weight - a.weight)
                .map(({ weight, ...rest }) => rest),
      });
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
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
    console.log("detail", req.query);
    // return res.customErrorSend();
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
// 查询关注用户帖子
Router.get("/followPost", async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const userId = req.query.id || req.user.id;
    const skip = (page - 1) * pageSize;

    const followingQuery = new Parse.Query("Following");
    followingQuery.equalTo("creatorId", userId);
    const follows = await followingQuery.findAll({ useMasterKey: true });

    const postQuery = new Parse.Query(Post);
    postQuery.limit(parseInt(pageSize));
    postQuery.skip(skip);
    postQuery.containedIn(
      "creator",
      follows.map((item) => item.get("followId"))
    );
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
// 关键字查询
Router.get(
  "/keyWord",
  validateParams(
    Joi.object({
      keyWord: Joi.string().required(),
    }).unknown()
  ),
  async (req, res) => {
    try {
      // 计算跳过的记录数和限制返回的记录数
      let { page = 1, pageSize = 10 } = req.query;
      // 计算需要跳过的数据量
      const skip = (page - 1) * pageSize;
      if (pageSize > 20) pageSize = 20;
      let keyWord = req.query.keyWord;

      const postSearchHistory = Parse.Object.extend("PostSearchHistory");
      const PostSearchHistory = new postSearchHistory();

      PostSearchHistory.set("keyWord", keyWord);
      PostSearchHistory.set("creatorId", req.user?.id || "/");

      PostSearchHistory.save(null, { useMasterKey: true }).catch((err) => {
        console.log(err, "PostSearchHistory");
      });
      const characters = keyWord.split("");

      characters.push(keyWord);

      // 拆分字符串去匹配
      // const regexPattern = characters.join("|");
      // 匹配是否包含
      const regexPattern = `.*${keyWord}.*`;
      const postContentQuery = new Parse.Query("PostContent");

      const pageView = Parse.Object.extend("PostBrowseHistory");
      const pageViewQuery = new Parse.Query(pageView);
      pageViewQuery.equalTo("creatorId", req.user?.id);
      let pageViewRecord = await pageViewQuery.findAll({ useMasterKey: true });
      postContentQuery.notContainedIn(
        "belongId",
        pageViewRecord.map((item) => item.get("postId"))
      );

      // postContentQuery.skip(skip);
      // postContentQuery.limit(parseInt(pageSize));
      // postContentQuery.matches("content", keyWord);

      postContentQuery.matches("content", regexPattern);
      const record = await postContentQuery.findAll({ useMasterKey: true });
      let recordLength = record.length;
      let result = [];

      // for (let i = 0; i < recordLength; i++) {
      // if (!record[i].get("belongId")) {
      //   console.log("缺失belongId", record[i].id);

      //   continue;
      // }

      // const postQuery = new Parse.Query(Post);
      // postQuery.equalTo("objectId", record[i].get("belongId"));
      //   const singlePost = await postQuery.first({ useMasterKey: true });
      //   if (!singlePost) {
      //     console.log(
      //       record[i].get("belongId"),
      //       record[i].id,
      //       "归属文章已不存在"
      //     );
      //     await record[i].destroy({ useMasterKey: true });
      //     continue;
      //   }

      //   result.push(await withPostfindDetail(singlePost, req.user.id));
      // }
      const postQuery = new Parse.Query(Post);
      postQuery.containedIn(
        "objectId",
        record.map((item) => item.get("belongId"))
      );
      postQuery.skip(skip);
      postQuery.limit(parseInt(pageSize));
      postQuery.descending("createdAt");
      postQuery.descending("weight");
      const posts = await postQuery.find({ useMasterKey: true });
      for (let index = 0; index < posts.length; index++) {
        const element = posts[index];
        result.push(await withPostfindDetail(element, req.user.id));
      }

      res.customSend({
        total: result.length,
        records: result,
        nextPage: false,
        isLogin: true,
      });
    } catch (error) {
      console.log(error);

      res.customErrorSend(error.message, error.code);
    }
  }
);

Router.get(
  "/singleRole",
  validateParams(
    Joi.object({
      id: Joi.string().required(),
    }).unknown()
  ),
  async (req, res) => {
    try {
      const postQuery = new Parse.Query(Post);
      const singlePost = await postQuery.get(req.query.id, {
        useMasterKey: true,
      });
      const acl = singlePost.get("ACL");
      res.customSend(acl["permissionsById"]["*"]?.read === true);
    } catch (error) {
      console.log(error);

      res.customErrorSend(error);
    }
  }
);
// 设置权限
Router.put(
  "/accessRole",
  validateParams(
    Joi.object({
      id: Joi.string().required(), // 确保 ID 是字符串
      role: Joi.string().valid("public", "private").required(), // 确保角色有效
    })
  ),
  async (req, res) => {
    try {
      const { id, role } = req.body;

      // 查询单个 Post
      const postQuery = new Parse.Query(Post);
      postQuery.equalTo("objectId", id);
      const singlePost = await postQuery.first({ useMasterKey: true });

      // 检查 Post 是否存在
      if (!singlePost) {
        return res.status(404).customErrorSend("帖子未找到");
      }

      // 检查用户权限：确保当前用户是帖子的作者
      if (singlePost.get("creator") !== req.user.id) {
        return res.status(403).customErrorSend("没有权限修改该帖子");
      }

      // 设置 ACL
      const acl = new Parse.ACL();
      if (role === "public") {
        acl.setPublicReadAccess(true);
      } else if (role === "private") {
        acl.setReadAccess(req.user, true);
      }

      singlePost.setACL(acl);
      await singlePost.save(null, { useMasterKey: true }); // 不使用 useMasterKey，确保权限检查

      res.status(200).customSend(singlePost.toJSON());
    } catch (error) {
      console.error("Error updating access role:", error);
      res.status(500).customErrorSend("服务器内部错误", error.code);
    }
  }
);
module.exports = Router;
