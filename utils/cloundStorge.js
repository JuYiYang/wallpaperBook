const { Storage } = require("@google-cloud/storage");
const path = require("path");

// 假设你的服务账户 JSON 文件名为 'service-account-key.json'
// const serviceKey = path.join(__dirname, "../config/cloundConfig.json");

const storage = new Storage({
  keyFilename: "BHmsPdyUDbRPWp1gY8exgUij0PBMCxDhMjx3M0v9",
  projectId: "wallpapaer__book",
});

const bucketName = "wallpapaer__book";

module.exports = {
  storage,
  bucketName,
};
