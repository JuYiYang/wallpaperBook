const cron = require("node-cron");
const dayjs = require("dayjs");
const updateWeight = async () => {
  console.log("开始更新帖子权重");

  try {
    const postQuery = new Parse.Query("Post");
    // postQuery.equalTo("objectId", "MUnmu0FKWy");
    const posts = await postQuery.find({ useMasterKey: true });

    for (let post of posts) {
      await updatePostWeight(post.id);
    }

    console.log("帖子权重更新完成");
  } catch (error) {
    console.error("更新帖子权重时发生错误:", error);
  }
};
async function updatePostWeight(postId) {
  const postQuery = new Parse.Query("Post");
  const post = await postQuery.get(postId);

  const id = post.id;
  // const postLikeQuery = new Parse.Query("PostLike");
  // postLikeQuery.equalTo("postId", id);
  // const likeCount = await postLikeQuery.count({ useMasterKey: true });
  let likeCount = post.get("likeCount") || 0;
  // 一级评论
  // const PostCommentQuery = new Parse.Query("PostComment");
  // PostCommentQuery.equalTo("postId", id);
  // const commentCount = await PostCommentQuery.count({ useMasterKey: true });
  let commentCount = post.get("commentCount") || 0;

  const browseQuery = new Parse.Query("PostBrowseHistory");
  browseQuery.equalTo("postId", id);
  const browseCount = (await browseQuery.count({ useMasterKey: true })) || 0;
  // const collectCount = post.get("collectCount") || 0;
  const isRecommended = post.get("isRecommended") || false;
  const weight = calculateWeight(
    likeCount,
    commentCount,
    browseCount,
    isRecommended
  );
  post.set("weight", weight);
  await post.save(null, { useMasterKey: true });
}

function calculateWeight(likeCount, commentCount, viewCount, isRecommended) {
  const likeWeight = 0.4; // 喜欢数权重
  const commentWeight = 0.1; // 评论数权重
  const coefficient = 1; // 固定权重
  const viewWeight = 0.1; // 浏览量权重
  const recommendWeight = 0.5; // 推荐权重
  return parseFloat(
    (
      coefficient +
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
    console.log("当前时间段没有可同步任务");
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
cron.schedule("0 15 * * * *", updateWeight);
// cron.schedule("0 0 2 * * *", updateUserInfo);
setTimeout(updateUserInfo, 1200);
// setTimeout(updateWeight, 120);
