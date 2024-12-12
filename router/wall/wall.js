// 审核状态
// 来源库
// 来源库id

// 图片地址
// 发布人信息

// 关联帖子id
// 点赞数
// 收藏数
// 浏览量 // 半小时内计算一次
const express = require("express");
const fs = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
const { authenticateMiddleware } = require("../../utils/middlewares");
const { multiple } = require("../../utils//saveFile");
const {
  getTtemporaryImgLink,
  getLocalImgLink,
  getTempCosToken,
} = require("../../utils/cos");
const Router = express.Router();

const Wall = Parse.Object.extend("Wall");
Router.post(
  "/creatdWall",
  authenticateMiddleware,
  multiple,
  async (req, res) => {
    try {
      if (!req.files.length) {
        return res.customErrorSend("请上传图片", 500);
      }
      const wall = new Wall();
      let fileNames = [];
      for (let i = 0; i < req.files.length; i++) {
        let image = req.files[i];
        // 读取文件内容
        const fileBuffer = await fs.readFile(image.path);

        // 计算 MD5 值
        const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
        const extension = path.extname(image.originalname);
        const newFilename = `${hash}${extension}`;
        const newPath = path.join(image.destination, newFilename);
        // 重命名文件
        await fs.rename(image.path, newPath);
        let visitPath = process.env.DOMAINNAME + "/static/" + newFilename;
        wall.set("creatorId", req.user.id);
        wall.set("path", visitPath);
        wall.set("username", req.body.virtualName || req.user.get("nickName"));
        wall.set("avatar", req.body.virtualAvatar || req.user.get("avatar"));
        wall.set("postId", "");
        wall.set("frequency", req.body.frequency || 1);
        wall.set("source", "custom");
        wall.set("sourceId", "");
        wall.set("size", req.body?.size || "0x0");
        wall.set("sourcePath", "");
        await wall.save(null, { useMasterKey: true });
        fileNames.push(visitPath);
      }

      res.customSend(fileNames);
    } catch (error) {
      res.customErrorSend(error.message, error.code);
    }
  }
);
Router.post("/downloadWall", authenticateMiddleware, async (req, res) => {
  const downloadFrequency = req.user.get("downloadFrequency");
  const wallId = req.body.id;
  const WallDownloadHistory = Parse.Object.extend("WallDownloadHistory");
  let wallFrequency = -1;
  try {
    if (downloadFrequency <= 0) {
      throw Error("You did not download the available number of times");
    }
    const WallQuery = new Parse.Query("Wall");
    const wall = await WallQuery.get(wallId);

    wallFrequency = wall.get("frequency");

    if (downloadFrequency - wallFrequency < 0) {
      throw Error("You don't have enough download times left.");
    }

    req.user.set("downloadFrequency", downloadFrequency - wallFrequency);
    await req.user.save(null, { useMasterKey: true });
    const downloadHistory = new WallDownloadHistory();
    downloadHistory.set("created", req.user.id);
    downloadHistory.set("wall", wallId);
    downloadHistory.set("wallCount", wallFrequency); // 壁纸当前消耗次数
    downloadHistory.set("userCount", downloadFrequency); //  用户当前剩余次数
    downloadHistory.set("actualCost", wallFrequency); // 实际花费
    downloadHistory.set("status", 1); // 0error 1 success
    await downloadHistory.save(null, { useMasterKey: true });
    const result = await getTempCosToken([
      {
        action: [
          //下载操作
          "name/cos:GetObject",
        ],
        effect: "allow",
        resource: ["qcs::cos:ap-tokyo:uid/1307889358:tokyo-1307889358/wall/*"],
      },
    ]);
    const data = JSON.parse(result);
    if (!data?.credentials) throw Error();
    res.customSend({
      expiredTime: data.expiredTime,
      startTime: data.startTime,
      ...data.credentials,
    });
  } catch (error) {
    const downloadHistory = new WallDownloadHistory();
    downloadHistory.set("created", req.user.id);
    downloadHistory.set("wall", wallId);
    downloadHistory.set("wallCount", wallFrequency); // 壁纸当前消耗次数
    downloadHistory.set("userCount", downloadFrequency); //  用户当前剩余次数
    downloadHistory.set("actualCost", 0); // 实际花费
    downloadHistory.set("status", 0); // 0error 1 success
    res.customErrorSend(error.message, error.code);
  }
});

Router.get("/getAllWall", async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const wallQuery = new Parse.Query("Wall");

  const skip = (page - 1) * pageSize;
  wallQuery.skip(skip);
  wallQuery.limit(parseInt(pageSize));
  wallQuery.descending("createdAt");
  const wallResult = await wallQuery.find({ useMasterKey: true });
  let wallRecords = [];
  let wallLength = wallResult.length;
  for (let i = 0; i < wallLength; i++) {
    let item = wallResult[i];
    wallRecords.push({
      id: item.id,
      avatar: item.get("avatar"),
      username: item.get("username"),
      likeCount: 1000,
      isLike: true,
      frequency: item.get("frequency"),
      url: item.get("sourcePath"),
    });
  }
  res.customSend({
    records: wallRecords,
  });
});

// 浏览记录
Router.put("/browse", async (req, res) => {
  if (!req?.user || !req.body?.length) {
    return res.customSend();
  }
  try {
    let paramsIds = req.body.ids.split(",");

    const WallBrowseHistory = Parse.Object.extend("WallBrowseHistory");
    let satisfactory = [];
    for (let i = 0; i < paramsIds.length; i++) {
      let item = paramsIds[i];
      const query = new Parse.Query(WallBrowseHistory);
      query.equalTo("creatorId", req.user.id);
      query.equalTo("wallId", item);
      query.descending("createdAt");
      const singleBrowseHistory = await query.first({ useMasterKey: true });

      // 如果没有则直接添加
      if (!singleBrowseHistory) {
        satisfactory.push(item);
        continue;
      }
      // 判断是否在一小时以内
      if (dayjs().diff(singleBrowseHistory.get("createdAt"), "minute") >= 60) {
        satisfactory.push(item);
        continue;
      }
    }

    for (let i = 0; i < satisfactory.length; i++) {
      let item = satisfactory[i];
      const browseHistory = new PostBrowseHistory();
      browseHistory.set("creatorId", req.user.id);
      browseHistory.set("wallId", item);
      browseHistory
        .save(null, { useMasterKey: true })
        .catch((err) =>
          console.log("browseWallHistorySave ", userId, item, err)
        );
    }

    res.customSend();
  } catch (error) {
    res.customErrorSend(error.message, error.code);
  }
});

module.exports = Router;
