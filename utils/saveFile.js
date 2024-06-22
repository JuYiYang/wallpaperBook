const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
//自定义中间件
const uploadHandler = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../upload", "images");

      // 检查目录是否存在
      fs.access(uploadDir, fs.constants.F_OK, (err) => {
        if (err) {
          // 如果目录不存在，则创建它
          fs.mkdirSync(uploadDir, { recursive: true }); // recursive: true 允许创建嵌套目录
        }
        // 目录存在或已成功创建，调用回调函数
        cb(null, uploadDir);
      });
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname); // 获取原始文件的后缀名
      cb(null, `${uuidv4()}${extension}`);
    }, // 使用自定义的文件名函数
  }),
});

exports.single = uploadHandler.single("file");
exports.multiple = uploadHandler.array("files", 10);
