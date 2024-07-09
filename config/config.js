const global_parse__config = {
  appId: "mebius",
  masterKey: "mebius",
  databaseURI: "mongodb://127.0.0.1:27017", // 你的 MongoDB 连接字符串
  serverURL: "http://localhost:1337/parse",
  enableForPublic: true, //启用匿名用户文件上传
  enableForAnonymousUser: true, //为经过身份验证的用户启用文件上传
  enableForAuthenticatedUser: true, //启用公开文件上传功能，即所有人
  prot: 1337,
  sessionLength: 60 * 60 * 24 * 7,
  publicServerURL: "http://localhost:1337/upload",
};

module.exports = global_parse__config;
