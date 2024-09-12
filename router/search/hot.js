const express = require("express");
const Router = express.Router();

Router.get("/getHots", async (req, res) => {
  let hotKey = [
    "为什么老一辈人厌恶游戏?",
    "如何看待“宁交十个祁同伟，也不交一个侯亮平”的说法？",
    "JS 执行 100 万个函数， 还能保证浏览器不卡？",
    "为什么在班里放民谣和摇滚会被同学嘲笑？",
    "关于马化腾，有哪些有趣的故事？",
    "如果苹果和腾讯互相封杀，结果会怎样？",
    "为什么猎豹比一般的猫科动物更为亲人一点？",
    "网络作者为什么不能被别人知道真实身份？",
    "在你心中谁最适合出演《三体》中的程心?",
    "为什么感觉国产车突然崛起了？",
  ];
  res.customSend(
    hotKey.map((intro) => {
      return {
        intro,
        jump: "/search",
        id: String(Date.now()),
      };
    })
  );
});
Router.get("/keyWord", async (req, res) => {
  const query = new Parse.Query("PostSearchHistory");
  const result = await query.aggregate([
    { $unwind: "$keyWord" }, // 展开数组中的每个元素
    { $group: { _id: "$keyWord" } }, // 按类别进行分组并统计出现次数
    { $sort: { count: -1 } },
    { $limit: 5 }, // 按出现次数降序排序
  ]);

  res.customSend(result.map((item) => item.objectId));
});
module.exports = Router;
