const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs-extra");
const path = require("path");

const Router = express.Router();
const keyWords = [
  "爱豆",
  "壁纸",
  "头像",
  "表情",
  "影视",
  "动漫",
  "动图",
  "素材",
  "萌宠",
  "绘画",
  "手工",
  "穿搭",
  "美妆",
  "婚礼",
  "美食",
  "家居",
  "旅行",
  "摄影",
  "植物",
  "生活百科",
  "人文艺术",
  "设计",
  "古风",
];
let timer;
const Wall = Parse.Object.extend("Wall");
const uploadDir = path.join(__dirname, "../upload", "network");
const reqDuiTangData = async (query, sendEvent) => {
  const ReptileRecord = Parse.Object.extend("ReptileRecord");
  const reptileRecord = new ReptileRecord();
  const DuiTangData = Parse.Object.extend("DuiTangData");

  const dtQuery = new Parse.Query(DuiTangData);
  console.log(query);
  try {
    const { data } = await axios.get(
      "https://www.duitang.com/napi/blog/list/by_search/",
      {
        params: {
          ...query,
          include_fields:
            "like_count,sender,album,msg,reply_count,top_comments",
          _: Date.now(),
        },
      }
    );
    const result = data.data;
    const next_start = result.next_start;
    sendEvent({ result });
    // 设置字段值
    reptileRecord.set(
      "req_path",
      "https://www.duitang.com/napi/blog/list/by_search/"
    );
    reptileRecord.set("req_source", "duitang");
    reptileRecord.set("req_data_count", result.object_list.length);
    reptileRecord.set("req_data_start", query.next_start);
    reptileRecord.set("req_status", "成功");
    reptileRecord.set("req_query", query);
    reptileRecord.set("key", query.kw);
    reptileRecord.set("req_status_desc", "");

    for (let i = 0; i < result.object_list.length; i++) {
      let item = result.object_list[i];
      dtQuery.equalTo("source_id", item["id"]);
      let history = await dtQuery.find({ useMasterKey: true });
      if (history.length) {
        sendEvent({ m: "跳过" });
        continue;
      }
      let duiTangData = new DuiTangData();
      for (let key in item) {
        if (key == "id") {
          duiTangData.set("source_id", item[key]);
          continue;
        }
        // if (key == "favorite_count") {
        //   let value = parseInt(item[key]);
        //   duiTangData.set("favorite_count", Number.isNaN(value) ? 0 : value);
        //   continue;
        // }
        // if (key == "buyable") {
        //   // let value = parseInt(item[key]);
        //   duiTangData.set("favorite_count", String(item[key]));
        //   continue;
        // }

        // if (
        //   typeof item[key] == "number" &&
        //   !["oriAddDatetime", "add_datetime_ts", "sender_id"].includes(key)
        // ) {
        //   duiTangData.set(key, String(item[key]));
        //   continue;
        // }
        duiTangData.set(key, item[key]);
      }
      await duiTangData.save(null, { useMasterKey: true });
    }
    if (!!next_start && next_start > 0) {
      console.log(next_start);
      let ms = 3000;
      sendEvent({ next_start, ms });
      timer = setTimeout(
        () =>
          reqDuiTangData(
            {
              ...query,
              start: next_start,
            },
            sendEvent
          ),
        ms
      );
    } else {
      return 0;
    }
  } catch (err) {
    console.log(err);
    reptileRecord.set(
      "req_path",
      "https://www.duitang.com/napi/blog/list/by_search/"
    );
    reptileRecord.set("req_source", "duitang");
    reptileRecord.set("req_data_count", 0);
    reptileRecord.set("req_data_start", query.next_start);
    reptileRecord.set("req_status", "失败");
    reptileRecord.set("req_status_desc", String(err));
    reptileRecord.save(null, { useMasterKey: true });
    sendEvent({ msg: err });
    // return query.next_start;
  } finally {
    reptileRecord.save(null, { useMasterKey: true });
  }
};

Router.get("/duitang", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // 确保响应头被立即发送

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let next_start = req.query.next_start;
  let current = req.query.current;
  if (current > keyWords.length - 1) {
    sendEvent({ l: keyWords.length, c: current, a: keyWords[current] });
    res.end();
    return;
  }
  console.log("当前值：" + keyWords[current]);
  try {
    // for (let i = 0; i < keyWords.length; i++) {
    await reqDuiTangData(
      {
        kw: keyWords[current],
        start: next_start,
      },
      sendEvent
    );
    // await delay();
    sendEvent({ msg: "已完成" + keyWords[current] });
    // }
  } catch (err) {
    console.log(err);
    sendEvent({ err });
  }
  // sendEvent({ me: count });
  // res.end();
  // console.log(result);
  // const interval = setInterval(() => {
  //   sendEvent({ message: "Hello from the server!", timestamp: new Date() });
  // }, 1000);

  // feeds.forEach((element) => {
  //   sendEvent(element);
  // });

  req.on("close", () => {
    console.log("断开");
    // clearInterval(interval);
    clearTimeout(timer);
  });
});

Router.get("/downloadDuiTang", async (req, res) => {
  let isClose = false;
  let current = 0;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // 确保响应头被立即发送

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  req.on("close", () => {
    isClose = true;
    console.log("断开", current);
  });
  const DuiTangData = Parse.Object.extend("DuiTangData");

  const dtQuery = new Parse.Query(DuiTangData);
  const total = await dtQuery.count();
  fs.ensureDirSync(uploadDir);
  dtQuery.limit(1);
  dtQuery.skip(1);

  const records = await dtQuery.find();
  sendEvent({ length: records.length, total, records });

  for (current; current < records.length; current++) {
    if (isClose) break;
    let item = records[current];
    let imageUrl = item.get("photo").path;
    let fileExtension = path.extname(imageUrl); // 获取文件扩展名
    // 请求图片文件
    if (fileExtension.indexOf("_") > 0) {
      fileExtension = fileExtension.split("_")[0];
    }
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(response.data, "binary");

    // 计算 MD5 值
    const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const fileName = `${hash}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      sendEvent({ skipped: true, imageUrl, id: item.id, fileExtension });
      continue;
    }

    // 保存文件
    await fs.writeFile(filePath, fileBuffer);
    const wall = new Wall();
    wall.set("creatorId", "reptile");
    wall.set("path", process.env.DOMAINNAME + "/static/" + fileName);
    wall.set("username", "");
    wall.set("avatar", "");
    wall.set("postId", "");
    wall.set("frequency", 1);
    wall.set("source", "DuiTangData");
    wall.set("sourceId", item.id);
    wall.set("sourcePath", imageUrl);
    const afterInfo = await wall.save(null, { useMasterKey: true });
    await delay(700);
    sendEvent({
      imageUrl,
      afterInfo,
      fileExtension,
      id: item.id,
      msg: "保存成功！",
    });
  }
  res.end();
});
Router.get("/getReptileRecord", async (req, res) => {
  // 计算跳过的记录数和限制返回的记录数
  const { page = 1, pageSize = 5 } = req.query;

  // 计算需要跳过的数据量
  const skip = (page - 1) * pageSize;

  const ReptileRecord = Parse.Object.extend("ReptileRecord");

  const query = new Parse.Query(ReptileRecord);
  query.skip(skip);
  query.limit(parseInt(pageSize));
  const total = await query.count({ useMasterKey: true });
  const records = await query.find();
  res.customSend({
    records,
    total,
  });
});
const delay = (ms = 3000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
module.exports = Router;
