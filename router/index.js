const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const ParseServer = require("parse-server").ParseServer;

const config = require("../config/config");
const {
  responseMiddleware,
  crossDomainMiddlewar,
  authenticateMiddleware,
} = require("../utils/middlewares");

const Account = require("./account/account");

const Login = require("./account/login");

const Role = require("./account/role");

const Follow = require("./account/follow");

const Post = require("./post/index");
const Wall = require("./wall/index");

const Reptile = require("./reptile_duitang");
// const Collect = require("./wall/collect");
const VerifyEmail = require("./verifyEmail");
const Hot = require("./search/hot");

const Version = require("./version");

const Router = express.Router();

Router.use(bodyParser.json({ limit: "10mb" }));
// 自定义中间件
Router.use(responseMiddleware);
Router.use(crossDomainMiddlewar);

Router.use(
  "/static",
  express.static(path.join(__dirname, "../upload", "images"))
);
const fs = require("fs");

Router.use(
  "/avatar",
  express.static(path.join(__dirname, "../upload", "avatar"))
);
const fg = path.join("C:", "/Users/20319/OneDrive/p/nana");
Router.use("/public", express.static(fg));
// 列出目录内容
Router.get("/list", (req, res) => {
  fs.readdir(fg, (err, files) => {
    if (err) {
      return res.status(500).send(err);
    }

    // 过滤出 .mp4 文件
    let videoFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".mp4"
    );

    let videoList = videoFiles
      .map((file, index) => {
        let set = ` <a href="/public/${file}"><li style="list-style:none; margin-bottom: 20px; cursor: pointer;">${file}</li> </a>`;
        return (
          set ||
          `
        <li style="list-style:none; margin-bottom: 20px; cursor: pointer;" onclick="playVideo(${index})">
          <video id="video${index}" preload="auto" onloadeddata="setCover(this)"  controls style="width:100%; max-width:100%;">
            <source src="/public/${file}" type="video/mp4">
            您的浏览器不支持 video 标签。
          </video>
          <p>${file}</p>
        </li>`
        );
      })
      .join("");

    res.send(`
    <ul style="padding:0;">${videoList}</ul>
    <script>
      function playVideo(index) {
        var video = document.getElementById('video' + index);
        if (video) {
          video.play();
        }
      }

         function setCover(that) {//加载完成事件，调用函数
	        var canvas = document.createElement("canvas");//canvas画布
	        canvas.width = that.videoWidth
	        canvas.height = that.videoHeight
	        canvas.getContext('2d').drawImage(that, 0, 0, canvas.width, canvas.height);//画图
	        that.setAttribute("poster", canvas.toDataURL("image/png"));
 		}
    </script>
  `);
  });
});

const api = new ParseServer(config);
(async () => await api.start())();

// 将 Parse API 挂载到 /parse 路径
Router.use("/parse", api.app);

Router.use("/account", Login);
Router.use("/wall", Wall);
Router.use("/version", Version);
Router.use("/reptile", Reptile);
Router.use("/verify", VerifyEmail);

Router.use("/hot", Hot);
Router.use("/account", authenticateMiddleware, Account);
Router.use("/role", authenticateMiddleware, Role);
Router.use("/post", authenticateMiddleware, Post);
Router.use("/follow", authenticateMiddleware, Follow);

Router.use("*", (req, res) => {
  // res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  res.status(404).send(req.baseUrl);
});

module.exports = Router;
