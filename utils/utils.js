const fs = require("fs-extra");
const { getTtemporaryImgLink, getLocalImgLink } = require("./cos");
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
const withPostfindDetail = async (singlePost, currentUserId) => {
  // 提取必要的字段
  const wallId = singlePost.get("wallId") || "";
  const contentId = singlePost.get("contentId") || "";
  const creatorId = singlePost.get("creator");

  // 构建查询
  const wallQuery = new Parse.Query("PostWall");
  wallQuery.containedIn("objectId", wallId.split(","));
  wallQuery.select("imageName", "createdAt", "objectId");

  const contentQuery = new Parse.Query("PostContent");
  contentQuery.equalTo("objectId", contentId);
  contentQuery.select("content");

  const postLikeQuery = new Parse.Query("PostLike");
  postLikeQuery.equalTo("creatorId", currentUserId);
  postLikeQuery.equalTo("postId", singlePost.id);
  postLikeQuery.select("objectId");

  const followingQuery = new Parse.Query("Following");
  followingQuery.equalTo("creatorId", currentUserId);
  followingQuery.equalTo("followId", creatorId);
  followingQuery.select("objectId");
  // 并行查询
  const [followResult, walls, content, likes] = await Promise.all([
    followingQuery.first({ useMasterKey: true }),
    wallQuery.find({ useMasterKey: true }),
    contentQuery.first({ useMasterKey: true }),
    postLikeQuery.find({ useMasterKey: true }),
  ]);

  // 处理墙数据
  const userWalls = walls.map((wall) => ({
    id: wall.id,
    createdAt: wall.get("createdAt"),
    url: getLocalImgLink(wall.get("imageName")),
  }));
  // 返回数据
  return {
    id: singlePost.id,
    follow: !!followResult,
    createdAt: singlePost.get("customCreatedAt") || singlePost.get("createdAt"),
    maxPostHeight: singlePost.get("maxPostHeight") || 0,
    content: content?.get("content") || "",
    walls: userWalls,
    isLike: likes.length > 0,
    recommended: false,
    weight: singlePost.get("weight") || 0,
    userInfo: {
      avatar: getLocalImgLink(singlePost.get("creatorAvatar"), "avatar"),
      username: singlePost.get("creatorName") || "Unknown",
      id: creatorId,
    },
    likeCount: singlePost.get("likeCount") || 0,
    commentCount: singlePost.get("commentCount") || 0,
  };
};
/**
 * 根据posts信息查询关联的图文
 * @param {Array} posts - 帖子集合
 * @param {String?} currentUsreId - 用户id
 * @returns {Object} - 整合后的post
 */
const batchFetchDetails = async (posts, currentUserId) => {
  // 提取所有 wallId 和 contentId

  const wallIds = [
    ...new Set(posts.map((post) => post.get("wallId").split(",")).flat()),
  ];
  const contentIds = [
    ...new Set(posts.map((post) => post.get("contentId")).filter(Boolean)),
  ];

  // 批量查询
  const wallQuery = new Parse.Query("PostWall");
  wallQuery.containedIn("objectId", wallIds);
  wallQuery.select("imageName", "createdAt", "objectId");
  const allWalls = await wallQuery.findAll({ useMasterKey: true });

  const contentQuery = new Parse.Query("PostContent");
  contentQuery.containedIn("objectId", contentIds);
  contentQuery.select("content");
  const allContents = await contentQuery.find({ useMasterKey: true });

  const postLikeQuery = new Parse.Query("PostLike");
  postLikeQuery.containedIn(
    "postId",
    posts.map((post) => post.id)
  );
  postLikeQuery.equalTo("creatorId", currentUserId);
  const allLikes = await postLikeQuery.find({ useMasterKey: true });

  const followingQuery = new Parse.Query("Following");
  followingQuery.equalTo("creatorId", currentUserId);
  followingQuery.containedIn(
    "followId",
    posts.map((post) => post.get("creator"))
  );
  const allFollows = await followingQuery.find({ useMasterKey: true });

  // 转换为 Map 提高访问速度
  const wallMap = new Map(allWalls.map((wall) => [wall.id, wall]));
  const contentMap = new Map(
    allContents.map((content) => [content.id, content])
  );

  const likeSet = new Set(allLikes.map((like) => like.get("postId")));
  const followSet = new Set(allFollows.map((follow) => follow.get("followId")));

  // 构建返回结果
  let t = posts.map((post) => {
    const wallId = post.get("wallId") || "";
    const contentId = post.get("contentId") || "";

    return {
      id: post.id,
      follow: followSet.has(post.get("creator")),
      createdAt: post.get("customCreatedAt") || post.get("createdAt"),
      maxPostHeight: post.get("maxPostHeight"),
      content: contentMap.get(contentId)?.get("content") || "",
      walls: (wallId.split(",") || [])
        .map((id) => {
          const wall = wallMap.get(id);
          return wall
            ? {
                id: wall.id,
                createdAt: wall.get("createdAt"),
                url: getLocalImgLink(wall.get("imageName")),
              }
            : null;
        })
        .filter(Boolean),
      isLike: likeSet.has(post.id),
      recommended: false,
      weight: post.get("weight"),
      userInfo: {
        avatar: getLocalImgLink(post.get("creatorAvatar"), "avatar"),
        username: post.get("creatorName"),
        id: post.get("creator"),
      },
      likeCount: post.get("likeCount") || 0,
      commentCount: post.get("commentCount") || 0,
    };
  });
  return t;
  // if (wallIds.length > 10) {
  console.warn("wallIds 超过 1000，建议分批查询", wallIds.length);
  // }
  try {
    let a = t.filter((item) => item.walls.length <= 0);
    console.log(a.length, "未查询到wall");
    // a.forEach((item) => {
    let wallIdas = [
      ...new Set(
        a.map((item) => {
          let wa = posts.find((post) => post.id === item.id);

          return wa.get("wallId").split(",").flat();
        })
      ),
    ];
    // console.log(item.id);
    console.log(wallIdas, "-------");
  } catch (err) {
    console.log(err);
  }
  // });
  return t;
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

const getLocalIP = () => {
  let os = require("os");
  const osType = os.type(); //系统类型
  const netInfo = os.networkInterfaces(); //网络信息
  let ip = "";
  if (osType === "Windows_NT") {
    for (let dev in netInfo) {
      for (let j = 0; j < netInfo[dev].length; j++) {
        if (netInfo[dev][j].family === "IPv4") {
          if (netInfo[dev][j].address !== "127.0.0.1")
            ip = netInfo[dev][j].address;
          break;
        }
      }
    }
  } else if (osType === "Linux") {
    ip = netInfo.eth0[0].address;
  } else if (osType === "Darwin") {
    // mac操作系统
    // ip = netInfo.eth0[0].address;
  } else {
    // 其他操作系统
  }

  return ip;
};

module.exports = {
  getRandomIntInRange,
  getLocalIP,
  getPostAdditionalValue,
  withPostfindDetail,
  batchFetchDetails,
  delPostInfo,
  calculateSimilarity,
};
