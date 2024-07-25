const global_parse__config = {
  appId: "mebius",
  masterKey: "mebius",
  databaseURI: "mongodb://127.0.0.1:27017", // 你的 MongoDB 连接字符串
  serverURL: "http://localhost:1337/parse",
  sessionLength: 60 * 60 * 24 * 7,
  publicServerURL: "http://localhost:1337/upload",
};

module.exports = global_parse__config;
