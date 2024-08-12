const express = require("express");
const Joi = require("joi");
const dayjs = require("dayjs");
const { validateParams } = require("../../utils/middlewares");

const Router = express.Router();

// 浏览记录
Router.put(
  "/browse",
  validateParams(
    Joi.object({
      ids: Joi.required(),
    })
  ),
  async (req, res) => {
    if (!req?.user) {
      return res.customSend();
    }
    try {
      let paramsIds = req.body.ids.split(",");

      const PostBrowseHistory = Parse.Object.extend("PostBrowseHistory");
      let satisfactory = [];
      for (let i = 0; i < paramsIds.length; i++) {
        let item = paramsIds[i];
        const query = new Parse.Query(PostBrowseHistory);
        query.equalTo("creatorId", req.user.id);
        query.equalTo("postId", item);
        const singleBrowseHistory = await query.first({ useMasterKey: true });
        // 如果没有则直接添加
        if (!singleBrowseHistory) {
          satisfactory.push(item);
          continue;
        }
        // 判断是否在一小时以内
        if (
          dayjs().diff(singleBrowseHistory.get("createdAt"), "minute") >= 60
        ) {
          satisfactory.push(item);
          continue;
        }
      }

      for (let i = 0; i < satisfactory.length; i++) {
        let item = satisfactory[i];
        const browseHistory = new PostBrowseHistory();
        browseHistory.set("creatorId", req.user.id);
        browseHistory.set("postId", item);
        browseHistory
          .save(null, { useMasterKey: true })
          .catch((err) => console.log("browseHistorySave ", userId, item, err));
      }

      res.customSend();
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);

module.exports = Router;
