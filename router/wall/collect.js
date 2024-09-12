const express = require("express");
const Parse = require("parse/node");
const Joi = require("joi");
const { validateParams } = require("../utils/middlewares");
const Router = express.Router();

Router.post(
  "/cratedFavorite",
  validateParams(
    Joi.object({
      favoriteName: Joi.string().min(4).required(),
    })
  ),
  async (req, res) => {
    const { favoriteName } = req.body; // 收藏夹名称

    const Favorites = Parse.Object.extend("Favorites");
    const favorites = new Favorites();

    favorites.set("name", favoriteName);
    favorites.set("creatorId", req.user.id);

    try {
      await favorites.save(null, { useMasterKey: true });
      res.customSend({ success: "Favorites created successfully!" });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

Router.delete(
  "/delFavorites",
  validateParams(
    Joi.object({
      favoriteId: Joi.required(),
    })
  ),
  async (req, res) => {
    try {
      const { favoriteId: id } = req.body; // 从请求参数中获取要删除的收藏夹 ID

      // 创建收藏夹查询
      const Favorites = Parse.Object.extend("Favorites");
      const favoritesQuery = new Parse.Query(Favorites);

      // 设置查询条件为当前用户是创建者，并且 ID 匹配
      favoritesQuery.equalTo("objectId", id);
      favoritesQuery.equalTo("creatorId", req.user.id);
      // 执行查询
      const favoriteToDelete = await favoritesQuery.first({
        useMasterKey: true,
      });

      if (!favoriteToDelete) {
        // 如果未找到匹配的收藏夹，则返回错误
        return res.customErrorSend("Favorite not found or permission denied.");
      }

      // 调用 destroy 方法删除对象
      await favoriteToDelete.destroy({ useMasterKey: true });

      // 返回成功消息
      res.customSend({ message: "Favorite deleted successfully!" });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

Router.put(
  "/updateFavorites",
  validateParams(
    Joi.object({
      favoriteId: Joi.required(),
      favoriteName: Joi.string().min(4).required(),
    })
  ),
  async (req, res) => {
    try {
      const { favoriteId: id, favoriteName } = req.body; // 从请求体中获取新的收藏夹名称

      // 创建收藏夹查询
      const Favorites = Parse.Object.extend("Favorites");
      const favoritesQuery = new Parse.Query(Favorites);

      // 设置查询条件为当前用户是创建者，并且 ID 匹配
      favoritesQuery.equalTo("objectId", id);
      favoritesQuery.equalTo("creatorId", req.user.id);

      // 执行查询
      const favoriteToUpdate = await favoritesQuery.first({
        useMasterKey: true,
      });

      if (!favoriteToUpdate) {
        // 如果未找到匹配的收藏夹，则返回错误
        return res.customErrorSend("Favorite not found or permission denied.");
      }

      // 更新收藏夹名称
      favoriteToUpdate.set("name", favoriteName);
      await favoriteToUpdate.save(null, { useMasterKey: true });

      // 返回成功消息和更新后的收藏夹信息
      res.customSend({
        message: "Favorite updated successfully!",
      });
    } catch (error) {
      res.customErrorSend(error.message, error.code, error);
    }
  }
);

Router.get("/getFavorites", async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

    // 计算需要跳过的数据量
    const skip = (page - 1) * pageSize;
    // 创建收藏夹查询
    const Favorites = Parse.Object.extend("Favorites");
    const favoritesQuery = new Parse.Query(Favorites);

    // 设置查询条件为当前用户是创建者
    favoritesQuery.equalTo("creatorId", req.user.id);

    // 设置分页参数
    favoritesQuery.limit(parseInt(pageSize));
    favoritesQuery.skip(skip);
    // 执行查询
    const userFavorites = await favoritesQuery.find();
    // 返回查询结果
    res.customSend(userFavorites);
  } catch (error) {
    res.customErrorSend(error.message, error.code, error);
  }
});

module.exports = Router;
