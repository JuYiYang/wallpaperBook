const COS = require("cos-nodejs-sdk-v5");

const cos = new COS({
  SecretId: process.env.SecretId,
  SecretKey: process.env.SecretKey,
});

exports.getTtemporaryImgLink = (Key) => {
  return cos.getObjectUrl({
    Bucket: "tokyo-1307889358", // 填入您自己的存储桶，必须字段
    Region: "ap-tokyo",
    Key, // 存储在桶里的对象键（例如1.jpg，a/b/test.txt），支持中文，必须字
    Sign: true,
    Expires: 3600, // 单位秒
  });
};
// module.exports = cos;
