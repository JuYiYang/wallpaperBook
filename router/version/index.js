const express = require("express");
const Router = express.Router();
const path = require("path");
// 提供 APK 文件下载的路由
Router.get("/download-apk", async (req, res) => {
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="wallpaperbook.apk"'
  );
  const apkPath = path.join(
    "Y:",
    "wall",
    "wallpaperbook",
    "build",
    "app",
    "outputs",
    "flutter-apk",
    "app-release.apk"
  ); // APK 文件的实际路径
  try {
    res.download(apkPath, "wallpaperbook.apk");
  } catch (err) {
    res.customErrorSend(err);
  }
});

Router.get("/checkVersion", (req, res) => {
  const v = req.query?.v;
  // if (!v) {
  //   return res.customErrorSend();
  // }

  const currentVersion = "1.0.3";

  res.customSend(v === currentVersion);
});

module.exports = Router;
