const cron = require("node-cron");
const dayjs = require("dayjs");
const updateWeight = async () => {
  let startTime = dayjs();
  console.log(
    "开始更新帖子权重,开始时间为:",
    startTime.format("YYYY-MM-DD HH:mm:ss")
  );

  try {
    const postQuery = new Parse.Query("Post");
    postQuery.limit(1000000000);
    // postQuery.skip(20);
    // postQuery.equalTo("objectId", "qiBrak9URL");
    const posts = await postQuery.find({ useMasterKey: true });

    for (let post of posts) {
      await updatePostWeight(post.id);
    }
    let closeTime = dayjs();
    let elapsedTime = closeTime.diff(startTime); // 7
    console.log(
      `帖子权重更新完成,更新结束时间为:${closeTime.format(
        "YYYY-MM-DD HH:mm:ss"
      )} 累计更新${posts.length}条数据,共耗时:${elapsedTime}ms`
    );
  } catch (error) {
    console.error("更新帖子权重时发生错误:", error);
  }
};
async function updatePostWeight(postId) {
  const postQuery = new Parse.Query("Post");
  const post = await postQuery.get(postId, { useMasterKey: true });

  const id = post.id;
  let likeCount = post.get("likeCount") || 0;
  // 一级评论
  let commentCount = post.get("commentCount") || 0;

  const browseQuery = new Parse.Query("PostBrowseHistory");
  browseQuery.equalTo("postId", id);
  const browseCount = (await browseQuery.count({ useMasterKey: true })) || 0;

  const isRecommended = post.get("isRecommended") || false;

  let postCreateTime = dayjs(
    post.get("customCreatedAt") || post.get("createdAt")
  );

  // 时间衰减   30天衰减一半
  let decayFactor = 0.5 ** (dayjs().diff(postCreateTime, "day") / 30);
  // 初始权重
  let initWweight = post.get("weight");
  // 实时权重 点赞 评论 浏览器 是否推荐（后台）
  const weight = calculateWeight(
    likeCount,
    commentCount,
    browseCount,
    isRecommended
  );
  post.set("weight", (initWweight + weight) * decayFactor);
  await post.save(null, { useMasterKey: true });
}

function calculateWeight(likeCount, commentCount, viewCount, isRecommended) {
  const likeWeight = 1; // 喜欢数权重
  const commentWeight = 8; // 评论数权重
  const viewWeight = 0.5; // 浏览量权重
  const recommendWeight = 100; // 推荐权重
  return parseFloat(
    (
      likeCount * likeWeight +
      commentCount * commentWeight +
      viewCount * viewWeight +
      (isRecommended ? recommendWeight : 0)
    ).toFixed(4)
  );
}

const updateUserInfo = async () => {
  const updateUserInfoQuery = new Parse.Query("UpdateUserInfoRecord");
  updateUserInfoQuery.notEqualTo("isSync", true);
  const updates = await updateUserInfoQuery.find({ useMasterKey: true });
  if (updates.length <= 0) {
    console.log("当前时间段没有可同步用户信息任务");
    return;
  }
  const deduplicatedData = updates.reduce((acc, current) => {
    const existing = acc.find(
      (item) => item.get("userId") === current.get("userId")
    );
    if (existing) {
      const existingTime = new Date(existing.get("createdAt"));
      const currentTime = new Date(current.get("createdAt"));
      if (currentTime > existingTime) {
        existing.time = current.get("createdAt");
        existing.destroy({ useMasterKey: true });
      }
    } else {
      acc.push(current);
    }
    return acc;
  }, []);
  for (let i = 0; i < deduplicatedData.length; i++) {
    let userId = deduplicatedData[i].get("userId");

    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo("objectId", userId);
    let user = await userQuery.first({ useMasterKey: true });
    // 帖子 一二级评论
    const postQuery = new Parse.Query("Post");
    postQuery.equalTo("creator", userId);
    let postRecord = await postQuery.find({ useMasterKey: true });
    for (let post_i = 0; post_i < postRecord.length; post_i++) {
      let post = postRecord[post_i];
      post.set("creatorName", user.get("nickName"));
      post.set("creatorAvatar", user.get("avatar"));
      post
        .save(null, { useMasterKey: true })
        // .then(() => console.log("Post -- 同步用户信息 -- success"))
        .catch((err) => console.log("Post -- 同步用户信息 -- error", err));
    }
    const PostComment = Parse.Object.extend("PostComment");
    const commentQuery = new Parse.Query(PostComment);
    commentQuery.equalTo("creatorId", userId);
    let commentRecord = await commentQuery.find({ useMasterKey: true });
    for (let comment_i = 0; comment_i < commentRecord.length; comment_i++) {
      let element = commentRecord[comment_i];
      element.set("username", user.get("nickName"));
      element.set("avatar", user.get("avatar"));
      element
        .save(null, { useMasterKey: true })
        // .then(() => console.log("PostComment -- 同步用户信息 -- success"))
        .catch((err) =>
          console.log("PostComment -- 同步用户信息 -- error", err)
        );
    }
    const replyCommentQuery = new Parse.Query("PostReplyComment");
    replyCommentQuery.equalTo("creatorId", userId);
    let replyRecord = await replyCommentQuery.find({ useMasterKey: true });
    for (let reply_i = 0; reply_i < replyRecord.length; reply_i++) {
      let element = replyRecord[reply_i];
      element.set("username", user.get("nickName"));
      element.set("avatar", user.get("avatar"));
      element
        .save(null, { useMasterKey: true })
        // .then(() => console.log("PostReplyComment -- 同步用户信息 -- success"))
        .catch((err) =>
          console.log("PostReplyComment -- 同步用户信息 -- error", err)
        );
    }
    deduplicatedData[i].set("isSync", true);
    deduplicatedData[i].save(null, { useMaterKey: true });
  }
};
// cron.schedule("*/10 * * * *", updateWeight);
// cron.schedule("0 0 2 * * *", updateUserInfo);
// setTimeout(updateUserInfo, 1200);
setTimeout(updateWeight, 1200);
