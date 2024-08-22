const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const FormData = require("form-data");
const fs = require("fs-extra");
const dayjs = require("dayjs");
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
const reqDuiTangData = async (query, sendEvent, current) => {
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
        duiTangData.set(key, item[key]);
      }
      await duiTangData.save(null, { useMasterKey: true });
    }
    if (!!next_start && next_start > 0) {
      console.log(next_start);
      let ms = 1500;
      sendEvent({ next_start, ms });
      timer = setTimeout(
        () =>
          reqDuiTangData(
            {
              ...query,
              start: next_start,
            },
            sendEvent,
            current
          ),
        ms
      );
    } else {
      // return 0;
      await startKeywordRequests(current + 1, sendEvent);
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
    console.log(err);
    await startKeywordRequests(current + 1, sendEvent);
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

  const current = parseInt(req.query.current) || 0;
  await startKeywordRequests(current, sendEvent);
  req.on("close", () => {
    console.log("断开");
    // clearInterval(interval);
    clearTimeout(timer);
  });
});

const startKeywordRequests = async (current, sendEvent) => {
  if (current >= keyWords.length) {
    sendEvent({ msg: "所有关键词已完成" });
    return;
  }

  console.log("当前关键词：" + keyWords[current]);
  try {
    await reqDuiTangData(
      {
        kw: keyWords[current],
        start: 0, // Starting point for each keyword
      },
      sendEvent,
      current
    );
  } catch (err) {
    console.log(err);
    sendEvent({ err });
  }
};
Router.get("/downloadDuiTang", async (req, res) => {
  const uploadDir = path.join("D:", "wallNetwork");
  let isClose = false;
  let current = 82221;
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
  dtQuery.limit(total);
  dtQuery.skip(1);

  const records = await dtQuery.find();
  sendEvent({ length: records.length, total });

  for (current; current < records.length; current++) {
    if (isClose) break;
    let item = records[current];
    let imageUrl = item.get("photo").path;
    let fileExtension = path.extname(imageUrl); // 获取文件扩展名
    // 请求图片文件
    if (fileExtension.indexOf("_") > 0) {
      fileExtension = fileExtension.split("_")[0];
    }
    const response = await axios
      .get(imageUrl, { responseType: "arraybuffer" })
      .catch((err) => {
        console.log(current, "err", item.toJSON());
      });
    if (!response || !response?.data) {
      console.log("jump", current);

      continue;
    }
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
    await wall.save(null, { useMasterKey: true });
    await delay(700);
    sendEvent({
      current,
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
Router.post("/redBook", async (req, res) => {
  const RedBookPost = Parse.Object.extend("redBookPost");
  if (!req.body?.data?.items && !req.body?.data?.notes) {
    console.log("数据缺失", req.body);
    res.customSend();
    return;
  }
  const record = req.body.data.items || req.body.data.notes;
  console.log(req.body.data.cursor_score || record.length);

  for (let i = 0; i < record.length; i++) {
    let item = record[i];
    const dtQuery = new Parse.Query(RedBookPost);
    dtQuery.equalTo("source_id", item["id"]);
    let history = await dtQuery.find({ useMasterKey: true });
    if (history.length) {
      console.log("jump 重复", history[0].id);
      continue;
    }
    let redBookPost = new RedBookPost();
    for (let key in item) {
      if (key == "id") {
        redBookPost.set("source_id", item[key]);
        continue;
      }
      redBookPost.set(key, item[key]);
    }
    let afterInfo = await redBookPost.save(null, { useMasterKey: true });
    console.log("保存", afterInfo.id);
  }
  res.customSend();
});

Router.get("/redBook", async (req, res) => {
  const RedBookPost = Parse.Object.extend("redBookPost");

  const { page = 1, pageSize = 10 } = req.query;
  // 计算需要跳过的数据量
  const skip = (page - 1) * pageSize;

  const dtQuery = new Parse.Query(RedBookPost);

  const total = await dtQuery.count({ useMasterKey: true });
  dtQuery.skip(skip);

  dtQuery.limit(parseInt(pageSize));
  const record = await dtQuery.find({ useMasterKey: true });
  let html = "";
  let src = "";
  record.forEach((item) => {
    let url = item.get("note_card").cover.url_default;
    src += `${url};`;
    html += ` <a href="${url}" target="_blank"><img src='${url}'/ style="width:200px;height:200px;object-fit: cover;"></a>`;
  });

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`<html> 
    <meta name="referrer" content="never">
    <div style="    display: flex;
    flex-wrap: wrap;
    gap: 10px;">
  ${html}</div>
    </html>`);
});
function generateRandomEmail() {
  const domains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "qq.com",
    "163.com",
    "126.com",
    "sina.com",
    "sohu.com",
    "yeah.net",
  ];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  const randomUsername = Math.random().toString(36).substring(2, 10);
  return `${randomUsername}@${randomDomain}`;
}

function generatePassword() {
  return Math.random().toString(36).substring(2, 12);
}

async function generateAccount() {
  const RedBookPost = Parse.Object.extend("redBookPost");

  const dtQuery = new Parse.Query(RedBookPost);
  dtQuery.doesNotExist("postId");
  const total = await dtQuery.count({ useMasterKey: true });
  console.log("总计数据", total);
  dtQuery.limit(total);
  const record = await dtQuery.find({ useMasterKey: true });
  const User = Parse.Object.extend("_User");
  console.log(record.length);

  for (let i = 0; i < record.length; i++) {
    let item = record[i];
    if (!item.get("note_card") && !item.get("cover")) {
      console.log("数据缺失,原source_id", item.get("source_id"));
      item
        .destroy()
        .then((res) => console.log("删除成功", item.get("source_id")));
      continue;
    }

    let user = item.get("note_card")?.user || item.get("user");
    const userSql = new Parse.Query(User);
    userSql.equalTo("otherId", user.user_id);
    const results = await userSql.find({ useMasterKey: true });
    if (results.length) {
      // console.log(
      //   "第" + i + "条数据id重复",
      //   results.map((item) => item.id)
      // );

      continue;
    }
    let password = generatePassword();
    let email = generateRandomEmail();
    let query = {
      email,
      password,
      avatar: user.avatar,
      source_id: user.user_id,
      username: user.nickname,
    };
    try {
      const user = new Parse.User();

      user.set("email", query.email);
      user.set("username", query.email);
      user.set("plainPassword", query.password);
      user.set("password", query.password);
      user.set("avatar", query.avatar);
      user.set("nickName", query.username);
      user.set("downloadFrequency", 0);
      user.set("otherId", user.user_id);
      user.set("source", "virtualBook");
      await user.signUp(null, { useMasterKey: true });
      console.log("已完成保存用户：", i);
    } catch (err) {
      console.log(err, query);
    }
  }
}
async function generateAvatar() {
  const { fileTypeFromBuffer } = await import("file-type");
  const User = Parse.Object.extend("_User");
  const userSql = new Parse.Query(User);
  const total = await userSql.count({ useMasterKey: true });
  userSql.limit(total);
  const results = await userSql.find({ useMasterKey: true });
  const uploadDir = path.join(__dirname, "../upload", "avatar");
  fs.ensureDirSync(uploadDir);
  for (let i = 0; i < results.length; i++) {
    let item = results[i];
    let imageUrl = item.get("avatar");
    if (imageUrl.includes("192.168.31.88:1337")) {
      // console.log("已经是本地头像");
      continue;
    }
    const response = await axios
      .get(imageUrl, { responseType: "arraybuffer" })
      .catch((err) => {
        console.log(i, imageUrl, item.toJSON());
      });
    if (!response || !response?.data) {
      console.log("jump", i);

      continue;
    }
    const fileBuffer = Buffer.from(response.data, "binary");
    const type = await fileTypeFromBuffer(fileBuffer);

    const hash = crypto.createHash("md5").update(fileBuffer).digest("hex");
    const fileName = `${hash}.${type.ext}`;
    const filePath = path.join(uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      console.log("头像hash一样");
    } else {
      await fs.writeFile(filePath, fileBuffer);
    }

    item.set("avatar", `${process.env.DOMAINNAME}/avatar/${fileName}`);
    await item.save(null, { useMasterKey: true });
  }
  console.log("保存完毕");
}
function getRandomISODateWithinLastYear() {
  // 当前日期
  const now = dayjs();

  // 一年前的日期
  const oneYearAgo = dayjs().subtract(1, "year");

  // 计算时间差（毫秒）
  const timeDifference = now.valueOf() - oneYearAgo.valueOf();

  // 生成一个介于 0 到 timeDifference 之间的随机时间差
  const randomTimeDifference = Math.floor(Math.random() * timeDifference);

  // 将随机时间差添加到 oneYearAgo 日期上
  const randomDate = oneYearAgo.add(randomTimeDifference, "millisecond");

  // // 返回 ISO 8601 格式的日期字符串
  // return randomDate.toISOString();
  // 返回 YYYY-MM-DD HH:mm:ss 格式的日期字符串
  return randomDate.format("YYYY-MM-DD HH:mm:ss");
}
async function generatePost() {
  const RedBookPost = Parse.Object.extend("redBookPost");
  const redBookPostSql = new Parse.Query(RedBookPost);
  redBookPostSql.limit(10000000);
  // 排除有 postId 字段的记录
  redBookPostSql.doesNotExist("postId");
  const postRecord = await redBookPostSql.find({ useMasterKey: true });
  console.log("共有推文：", postRecord.length);
  for (let i = 0; i < postRecord.length; i++) {
    let singlePost = postRecord[i];

    if (!singlePost.get("note_card")?.cover && !singlePost.get("cover")) {
      console.log("数据缺失", singlePost.id);
      continue;
    }

    let type = singlePost.get("note_card")?.type || singlePost.get("type");
    if (type === "video") {
      // console.log("帖子类型为video:", singlePost.id);
      continue;
    }
    let cover = singlePost.get("note_card")?.cover || singlePost.get("cover");

    let user = singlePost.get("note_card")?.user || singlePost.get("user");
    let url = cover.url_default;
    let display_title =
      singlePost.get("display_title") ||
      singlePost.get("note_card").display_title;

    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer", // 获取原始二进制数据
      });

      // 将响应数据转换为 Buffer
      const imageBuffer = Buffer.from(response.data, "binary");
      if (!response || !response?.data) {
        console.log("jump", i);
        continue;
      }
      const User = Parse.Object.extend("_User");
      const userSql = new Parse.Query(User);
      userSql.equalTo("otherId", user.user_id);
      const currentUser = await userSql.first({ useMasterKey: true });
      const loginUser = await Parse.User.logIn(
        currentUser.get("username"),
        currentUser.get("plainPassword")
      ); // 假设你已经登录用户
      const sessionToken = loginUser.getSessionToken();

      // 创建 FormData 实例
      const form = new FormData();
      form.append("files", imageBuffer, {
        filename: "example.jpg",
      });
      form.append("content", display_title || "");
      axios
        .post("http://192.168.31.88:1337/post/creatdPost", form, {
          headers: {
            Authorization: sessionToken,
            ...form.getHeaders(), // 添加 FormData 的 headers
          },
        })
        .then((res) => {
          let postId = res.data.data;
          singlePost.set("postId", postId);
          singlePost
            .save(null, { useMasterKey: true })
            .then(() => console.log("保存成功", postId, i))
            .catch((err) => console.log("err si", err));
        });
    } catch (err) {
      // singlePost.destroy({ useMasterKey: true });
      console.log(err, i, singlePost.get("id"));

      // console.log(i, singlePost.get("id"), err.response, "err jump");
    }
  }
  console.log("保存完毕post");
}

async function generatePostLike() {
  const redPostQuery = new Parse.Query("redBookPost");
  redPostQuery.limit(100000);
  redPostQuery.exists("postId");
  redPostQuery.doesNotExist("isLikeSync");
  const redPosts = await redPostQuery.find({ useMasterKey: true });
  console.log(redPosts.length, "待同步点赞帖子total");

  for (let i = 0; i < redPosts.length; i++) {
    let item = redPosts[i];
    let postId = item.get("postId");

    const postQuery = new Parse.Query("Post");
    postQuery.equalTo("objectId", postId);
    const singlePost = await postQuery.first({ useMasterKey: true });
    if (!singlePost) {
      console.log(postId, "帖子不存在");

      continue;
    }

    let likeCount = Number(
      item.get("note_card")?.interact_info.liked_count ||
        item.get("interact_info")?.liked_count
    );
    let maxWidth =
      item.get("note_card")?.cover.width || item.get("cover")?.width;
    let maxHeight =
      item.get("note_card")?.cover.height || item.get("cover")?.height;
    singlePost.set("likeCount", likeCount);
    singlePost.set("customCreatedAt", getRandomISODateWithinLastYear());
    singlePost.set("maxWidth", maxWidth);
    singlePost.set("maxHeight", maxHeight);
    await singlePost.save(null, { useMasterKey: true });
    item.set("isLikeSync", true);
    await item.save(null, { useMasterKey: true });
    console.log(postId, "已同步", likeCount, maxWidth, maxHeight);
  }
  console.log("同步完毕:", redPosts.length);
}

async function excludeTypeVideoPost() {
  const redPostQuery = new Parse.Query("redBookPost");
  redPostQuery.limit(100000);
  redPostQuery.exists("postId");
  const redPosts = await redPostQuery.find({ useMasterKey: true });
  console.log(redPosts.length, "video类型帖子");

  for (let i = 0; i < redPosts.length; i++) {
    let item = redPosts[i];
    let postId = item.get("postId");

    const postQuery = new Parse.Query("Post");
    postQuery.equalTo("objectId", postId);
    const singlePost = await postQuery.first({ useMasterKey: true });
    if (!singlePost) {
      console.log(postId, "帖子不存在");
      continue;
    }
    await singlePost.destroy({ useMasterKey: true });
  }
  console.log("删除完毕:", redPosts.length);
}
async function setBelongIdPost() {
  const postQuery = new Parse.Query("Post");
  postQuery.limit(10000000000);
  const posts = await postQuery.find({ useMasterKey: true });
  for (let i = 0; i < posts.length; i++) {
    let singlePost = posts[i];
    const wallQuery = new Parse.Query("PostWall");
    const contentQuery = new Parse.Query("PostContent");
    if (singlePost.get("wallId")) {
      let afterWall = await wallQuery.get(singlePost.get("wallId"));
      afterWall.set("belongId", singlePost.id);
      await afterWall.save(null, { useMasterKey: true });
    }
    if (singlePost.get("contentId")) {
      let afterContent = await contentQuery.get(singlePost.get("contentId"));

      afterContent.set("belongId", singlePost.id);

      await afterContent.save(null, { useMasterKey: true });
    }
    console.log("current 已经完成", i, singlePost.id);
  }
  console.log("全部完毕");
}
// setTimeout(() => setBelongIdPost(), 1000);
// setTimeout(async () => {
// await generateAccount();
// await generateAvatar();
// await generatePost();
// await generatePostLike()
// }, 1000);
// setTimeout(() => generatePostLike(), 1000);
// setTimeout(() => excludeTypeVideoPost(), 1000);
module.exports = Router;
