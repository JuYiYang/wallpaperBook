const global_parse__config = {
  appId: "mebius",
  masterKey: "mebius",
  // databaseURI:
  //   "mongodb+srv://juyiyang6:WgOWMRrhBCGU3sBJ@wallpaperbook-tokyo.uyksh.mongodb.net/wallpaperbook?retryWrites=true&w=majority&appName=wallpaperbook-tokyo/",
  databaseURI: "mongodb://127.0.0.1:27017",
  serverURL: "http://localhost:1337/parse",
  sessionLength: 60 * 60 * 24 * 7,
  publicServerURL: "http://localhost:1337/upload",
};

module.exports = global_parse__config;
