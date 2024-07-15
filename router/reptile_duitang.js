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
      sendEvent({ next_start, ms: 5000 });
      timer = setTimeout(
        () =>
          reqDuiTangData(
            {
              ...query,
              start: next_start,
            },
            sendEvent
          ),
        5000
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
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // 确保响应头被立即发送

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const DuiTangData = Parse.Object.extend("DuiTangData");

  const dtQuery = new Parse.Query(DuiTangData);
  const total = await dtQuery.count();
  dtQuery.limit(40);
  dtQuery.skip(2);
  const records = await dtQuery.find();
  fs.ensureDirSync(uploadDir);
  sendEvent({ length: records.length, total, records });
  for (let i = 0; i < records.length; i++) {
    let imageUrl = records[i].get("photo").path;
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
      sendEvent({ skipped: true, imageUrl, id: records[i].id, fileExtension });
      continue;
    }
    // 保存文件
    await fs.writeFile(filePath, fileBuffer);
    await delay(1700);
    sendEvent({
      imageUrl,
      fileExtension,
      id: records[i].id,
      msg: "保存成功！",
    });
  }
  res.end();
  req.on("close", () => {
    console.log("断开");
  });
});

const delay = (ms = 5000) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
module.exports = Router;
