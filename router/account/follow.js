const express = require("express");
const Parse = require("parse/node");
const Router = express.Router();

Router.put("/", async (req, res) => {
  if (!req.body.id) {
    return res.customErrorSend("Error");
  }
  try {
    const userQuery = new Parse.Query(Parse.User);

    // 查询当前用户是否存在
    const user = await userQuery.get(req.body.id, { useMasterKey: true });

    const query = new Parse.Query("Following");
    query.equalTo("creatorId", req.user.id);
    query.equalTo("followId", req.body.id);
    let record = await query.first({ useMasterKey: true });

    if (record) {
      await record.destroy({ useMasterKey: true });
      res.customSend(null, "unfollow success");
    } else {
      const Following = Parse.Object.extend("Following");
      const following = new Following();
      following.set("creatorId", req.user.id);
      following.set("followId", req.body.id);
      await following.save(null, { useMasterKey: true });
      res.customSend(null, "follow success!");
    }
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

module.exports = Router;
