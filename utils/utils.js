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
  let contentId = singlePost.get("contentId");

  // 图
  const wallQuery = new Parse.Query("PostWall");
  wallQuery.containedIn("objectId", wallId.split(","));

  // 文
  const contentQuery = new Parse.Query("PostContentInfo");
  contentQuery.equalTo("objectId", contentId);

  // 当前用户是否点赞
  const postLikeQuery = new Parse.Query("PostLike");
  postLikeQuery.equalTo("creatorId", currentUsreId);
  postLikeQuery.equalTo("postId", singlePost.id);

  // 查询用户是否关注
  const followingQuery = new Parse.Query("Following");
  followingQuery.equalTo("creatorId", currentUsreId);
  followingQuery.equalTo("followId", singlePost.get("creator"));

  let follow = await followingQuery.first({ useMasterKey: true });
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

  return {
    id: singlePost.id,
    follow: !!follow,
    createdAt: singlePost.get("customCreatedAt") || singlePost.get("createdAt"),

    maxPostHeight: singlePost.get("maxPostHeight"),
    content: content?.get("content"),
    walls: userWalls,
    isLike: !!likes.length,
    weight: singlePost.get("weight"),
    userInfo: {
      avatar: singlePost.get("creatorAvatar"),
      username: singlePost.get("creatorName"),
      id: singlePost.get("creator"),
    },
    likeCount: singlePost.get("likeCount") || 0,
    colletCount: Math.floor(Math.random() * 50 + 1),
    commentCount: singlePost.get("commentCount") || 0,
  };
};

module.exports = {
  getRandomIntInRange,
  getPostAdditionalValue,
  withPostfindDetail,
};
