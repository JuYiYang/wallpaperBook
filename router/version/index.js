const express = require("express");
const Router = express.Router();
const path = require("path");
const { getTempCosToken } = require("../../utils/cos");
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
Router.post("/download-apk-temp-token", async (req, res) => {
  const result = await getTempCosToken([
    {
      action: [
        //下载操作
        "name/cos:GetObject",
      ],
      effect: "allow",
      resource: ["qcs::cos:ap-tokyo:uid/1307889358:tokyo-1307889358/doc/*"],
    },
  ]);
  const data = JSON.parse(result);
  if (!data?.credentials) throw Error();
  res.customSend({
    expiredTime: data.expiredTime,
    startTime: data.startTime,
    ...data.credentials,
  });
});
Router.get("/checkVersion", (req, res) => {
  const v = req.query?.v;
  // if (!v) {
  //   return res.customErrorSend();
  // }

  const currentVersion = "1.0.12";

  res.customSend(v === currentVersion);
});

module.exports = Router;
