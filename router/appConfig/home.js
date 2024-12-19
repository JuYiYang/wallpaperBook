const express = require("express");
const { getLocalImgLink } = require("../../utils/cos");
const Router = express.Router();
// 获取轮播图配置
Router.get("/slideshow", async (req, res) => {
  res.customSend({
    type: "isnLiner", // isLiner需要底部图片
    records: [
      // {
      //   id: "",
      //   title: "探索宇宙",
      //   url: "http://192.168.31.88:1337/static/91d6277a8c8b1c73f4af5c4eff39f503.jpg",
      //   bottomLiner: "",
      // },
      {
        id: "",
        title: "",
        url: getLocalImgLink("beb10fa247eb3fb55821559eadd2c029.jpg"),
        bottomLiner: getLocalImgLink("%E6%9C%AA%E6%A0%87%E9%A2%98-2.png"),
      },
      {
        id: "",
        title: "",
        url: getLocalImgLink("0b4e851a33acc134fbb4a6e908093e35.jpg"),
        bottomLiner: getLocalImgLink("%E6%9C%AA%E6%A0%87%E9%A2%98-1.png"),
      },
      //
    ],
  });
});
module.exports = Router;
