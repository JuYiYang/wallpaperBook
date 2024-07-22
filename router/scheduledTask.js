const cron = require("node-cron");

// cron.schedule("5 * * * * *", );
const c = async () => {
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
  const likeWeight = 0.4;
  const commentWeight = 0.1;
  const viewWeight = 0.1;
  const recommendWeight = 0.5;
  const randomFactor = 0.08;
  return parseFloat(
    (
      likeCount * likeWeight +
      commentCount * commentWeight +
      viewCount * viewWeight +
      (isRecommended ? recommendWeight : 0)
    ).toFixed(4)
  );
}

setTimeout(() => c(), 100);
