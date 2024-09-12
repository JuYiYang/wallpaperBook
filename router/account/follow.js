const express = require("express");
const Parse = require("parse/node");
const Router = express.Router();

Router.put("/", async (req, res) => {
  if (!req.body.id || req.body.id === req.user.id) {
    return res.customErrorSend("Error");
  }

  try {
    const userQuery = new Parse.Query(Parse.User);

    // 查询当前用户是否存在
    await userQuery.get(req.body.id, { useMasterKey: true });

    const query = new Parse.Query("Following");
    query.equalTo("creatorId", req.user.id);
    query.equalTo("followId", req.body.id);
    let record = await query.first({ useMasterKey: true });

    if (record) {
      await record.destroy({ useMasterKey: true });
      res.customSend(false, "unfollow success");
    } else {
      const Following = Parse.Object.extend("Following");
      const following = new Following();
      following.set("creatorId", req.user.id);
      following.set("followId", req.body.id);
      await following.save(null, { useMasterKey: true });
      res.customSend(true, "follow success!");
    }
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});
// 查询用户的关注列表
Router.get("/list", async (req, res) => {
  if (!req.query.id) {
    return res.customErrorSend("Error");
  }
  const { page = 1, pageSize = 10 } = req.query;
  // 计算需要跳过的数据量
  const skip = (page - 1) * pageSize;
  try {
    const userQuery = new Parse.Query(Parse.User);

    await userQuery.get(req.query.id, { useMasterKey: true });

    const query = new Parse.Query("Following");
    if (req.query.beFollow === "1") {
      query.equalTo("followId", req.query.id);
    } else {
      query.equalTo("creatorId", req.query.id);
    }
    query.limit(parseInt(pageSize));
    query.descending("createdAt");
    query.skip(skip);
    let follows = await query.find({ useMasterKey: true });
    let total = await query.count({ useMasterKey: true });
    let record = [];
    let len = follows.length;
    for (let i = 0; i < len; i++) {
      let singleUserQuery = new Parse.Query(Parse.User);
      singleUserQuery.equalTo(
        "objectId",
        req.query.beFollow === "1"
          ? follows[i].get("creatorId")
          : follows[i].get("followId")
      );
      let singleUser = await singleUserQuery.first({
        useMasterKey: true,
      });
      if (!singleUser) continue;
      const isFollowQuery = new Parse.Query("Following");
      isFollowQuery.equalTo("creatorId", req.user.id);
      isFollowQuery.equalTo(
        "followId",
        req.query.beFollow === "1"
          ? follows[i].get("creatorId")
          : follows[i].get("followId")
      );
      let isFollow = await isFollowQuery.first({ useMasterKey: true });
      record.push({
        avatar: singleUser.get("avatar"),
        motto: singleUser.get("motto") || "",
        id: singleUser.id,
        follow: !!isFollow,
        nickName: singleUser.get("nickName") || singleUser.get("username"),
      });
    }
    res.customSend({ record, total });
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

// setTimeout(async () => {
//   let singleUserQuery = new Parse.Query(Parse.User);
//   const result = await singleUserQuery.find({ useMasterKey: true });
//   let userId = "0xAsbT9BZU";
//   for (let i = 0; i < result.length; i++) {
//     if (result[i].id == userId) continue;
//     const Following = Parse.Object.extend("Following");
//     const following = new Following();
//     following.set("creatorId", result[i].id);
//     following.set("followId", userId);
//     following.set("creatorId", userId);
//     following.set("followId", result[i].id);
//     await following.save(null, { useMasterKey: true });
//   }
// }, 2000);

module.exports = Router;
