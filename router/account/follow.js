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

  try {
    const userQuery = new Parse.Query(Parse.User);

    await userQuery.get(req.query.id, { useMasterKey: true });

    const query = new Parse.Query("Following");
    query.equalTo("creatorId", req.query.id);
    let follows = await query.find({ useMasterKey: true });

    let record = [];
    let len = follows.length;
    for (let i = 0; i < len; i++) {
      console.log(follows[i].get("followId"));
      let singleUserQuery = new Parse.Query(Parse.User);
      singleUserQuery.equalTo("objectId", follows[i].get("followId"));
      let singleUser = await singleUserQuery.first({
        useMasterKey: true,
      });
      if (!singleUser) continue;

      record.push({
        avatar: singleUser.get("avatar"),
        id: singleUser.id,
        nickName: singleUser.get("nickName"),
      });
    }

    res.customSend(record);
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

module.exports = Router;
