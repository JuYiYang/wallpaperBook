const express = require("express");
const Router = express.Router();
// 获取轮播图配置
Router.get("/slideshow", async (req, res) => {
  res.customSend({
    type: "isLiner",
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
        bottomLiner:
          "http://192.168.31.88:1337/static/beb10fa247eb3fb55821559eadd2c029.jpg",
        url: "http://192.168.31.88:1337/static/%E6%9C%AA%E6%A0%87%E9%A2%98-2.png",
      },
      {
        id: "",
        title: "",
        bottomLiner:
          "http://192.168.31.88:1337/static/0b4e851a33acc134fbb4a6e908093e35.jpg",
        url: "http://192.168.31.88:1337/static/%E6%9C%AA%E6%A0%87%E9%A2%98-1.png",
      },
      // {
      //   id: "",
      //   title: "",
      //   url: "http://192.168.31.88:1337/static/0b4e851a33acc134fbb4a6e908093e35.jpg",
      //   bottomLiner: "",
      // },
    ],
  });
});
module.exports = Router;
