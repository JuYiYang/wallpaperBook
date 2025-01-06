const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
//自定义中间件
const uploadHandler = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join("D:/wallpaperbook__static/images");
      // 检查目录是否存在
      fs.ensureDirSync(uploadDir);
      // 目录存在或已成功创建，调用回调函数
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
});

exports.single = uploadHandler.single("file");
exports.multiple = uploadHandler.array("files", 99);
exports.uploadHandler = uploadHandler;
