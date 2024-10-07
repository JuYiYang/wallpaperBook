const fs = require("fs-extra");
const { getTtemporaryImgLink } = require("./cos");
const path = require("path");
/**
 * 生成一个在 min 和 max 之间的随机整数
 * @param {number} min - 范围的最小值（包含）
 * @param {number} max - 范围的最大值（不包含）
 * @returns {number} - 生成的随机整数
 */
function getRandomIntInRange(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 生成根据文字数量/图片数量的随机初始权重
 * @param {number} numImages - 图片的数量
 * @param {number} numWords - 文字的长度
 * @returns {number} - 生成的随机整数
 */
function getPostAdditionalValue(numImages, numWords) {
  // 基础值
  const baseMin = 1000;

  // 计算图片相关的增量
  const imageFactor = numImages * (50 + 50 * (numImages / 10));

  // 计算文字相关的增量
  const wordStep = 10;
  const wordFactor = Math.floor(numWords / 10) * wordStep;

  const baseMax = baseMin + imageFactor + wordFactor;

  // 生成并返回随机权重
  return getRandomIntInRange(baseMin, baseMax);
}
/**
 * 根据post信息查询关联的图文
 * @param {Object} singlePost - 帖子
 * @param {String?} currentUsreId - 用户id
 * @returns {Object} - 整合后的post
 */
const withPostfindDetail = async (singlePost, currentUsreId) => {
  let wallId = singlePost.get("wallId") || "";

  // 被点赞内容的 ID
  let contentId = singlePost.get("contentId") || "";

  // 图
  const wallQuery = new Parse.Query("PostWall");
  wallQuery.containedIn("objectId", wallId.split(","));

  // 文
  const contentQuery = new Parse.Query("PostContent");
  contentQuery.equalTo("objectId", contentId);

  // 当前用户是否点赞
  const postLikeQuery = new Parse.Query("PostLike");
  postLikeQuery.equalTo("creatorId", currentUsreId);
  postLikeQuery.equalTo("postId", singlePost.id);

  // 查询用户是否关注
  const followingQuery = new Parse.Query("Following");
  followingQuery.equalTo("creatorId", currentUsreId);
  followingQuery.equalTo("followId", singlePost.get("creator"));

  // 查询用户是否关注
  // const recommendedQuery = new Parse.Query("Following");
  // followingQuery.equalTo("creatorId", currentUsreId);
  // followingQuery.equalTo("followId", singlePost.get("creator"));

  let follow = await followingQuery.first({ useMasterKey: true });
  let content = await contentQuery.first({ useMasterKey: true });
  let walls = await wallQuery.find({ useMasterKey: true });
  let likes = await postLikeQuery.find({ useMasterKey: true });
  let userWalls = [];
  for (let j = 0; j < walls.length; j++) {
    userWalls.push({
      id: walls[j].id,
      createdAt: walls[j].get("createdAt"),
      url: getTtemporaryImgLink("images/" + walls[j].get("imageName")),
    });
  }

  return {
    id: singlePost.id,
    follow: !!follow,
    createdAt: singlePost.get("customCreatedAt") || singlePost.get("createdAt"),
    maxPostHeight: singlePost.get("maxPostHeight"),
    content: content?.get("content"),
    walls: userWalls,
    isLike: !!likes.length,
    recommended: false,
    weight: singlePost.get("weight"),
    userInfo: {
      avatar: singlePost.get("creatorAvatar"),
      username: singlePost.get("creatorName"),
      id: singlePost.get("creator"),
    },
    likeCount: singlePost.get("likeCount") || 0,
    // colletCount: Math.floor(Math.random() * 50 + 1),
    commentCount: singlePost.get("commentCount") || 0,
  };
};
/**
 * 根据postId删除所有有关信息
 * @param {String|Object} post - 帖子id
 */
const delPostInfo = async (post) => {
  let info;
  if (typeof post === "string") {
    const postSql = new Parse.Query("Post");
    postSql.equalTo("objectId", post);
    let singlePost = postSql.first({ useMasterKey: true });
    if (!singlePost) {
      throw new Error("帖子不存在");
    }
    info = singlePost;
  } else {
    info = post;
  }

  let contentId = info.get("contentId");
  let wallId = info.get("wallId");

  if (contentId) {
    const postContentSql = new Parse.Query("PostContent");
    postContentSql.equalTo("objectId", contentId);
    let postContent = await postContentSql.first({ useMasterKey: true });
    if (!postContent) {
      // throw new Error("文 不存在", contentId);
      console.log("文 不存在", contentId);
    } else {
      await postContent.destroy({ useMasterKey: true });
      console.log("文已删除");
    }
  }

  if (wallId) {
    const postWallSql = new Parse.Query("PostWall");
    postWallSql.containedIn("objectId", wallId.split(","));
    let postWall = await postWallSql.findAll({ useMasterKey: true });
    if (postWall?.length) {
      // throw new Error("图 不存在", wallId);
      console.log("图 不存在", wallId);
    } else {
      let wallUrls = postWall.get("imageUrl").split(",");

      for (let index = 0; index < wallUrls.length; index++) {
        const element = wallUrls[index];
        const url = element.match(/\/static\/(.+)/)[1];
        let filePath = path.join(__dirname, "../upload", "images", url);
        // fs.remove(filePath)
        //   .then(() => {
        //     console.log("文件已成功删除", url);
        //   })
        //   .catch((err) => {
        //     console.error("删除文件时出错:", err);
        //   });
      }

      await postWall.destroy({ useMasterKey: true });
    }
  }
  await info.destroy({ useMasterKey: true });
  console.log(info.id, "已删除");
};

/**
 * 比较两个字符串的相似度
 * @param {String} str1 - str1
 * @param {String?} str2 - str2
 * @returns {Number} - 相似度
 */
const calculateSimilarity = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;

  const dp = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(null));

  for (let i = 0; i <= len1; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= len1; i += 1) {
    for (let j = 1; j <= len2; j += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // 删除
        dp[i][j - 1] + 1, // 插入
        dp[i - 1][j - 1] + indicator // 替换
      );
    }
  }

  const distance = dp[len1][len2];
  const similarity = 1 - distance / Math.max(len1, len2); // 计算相似度，范围为 0 到 1

  return similarity;
};

module.exports = {
  getRandomIntInRange,
  getPostAdditionalValue,
  withPostfindDetail,
  delPostInfo,
  calculateSimilarity,
};
