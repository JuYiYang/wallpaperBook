const COS = require("cos-nodejs-sdk-v5");
const STS = require("qcloud-cos-sts");
const cos = new COS({
  SecretId: process.env.SecretId,
  SecretKey: process.env.SecretKey,
});

exports.getTtemporaryImgLink = (Key) => {
  return cos.getObjectUrl({
    Bucket: "tokyo-1307889358", // 填入您自己的存储桶，必须字段
    Region: "ap-tokyo",
    Key,
    Sign: true,
    Expires: 3600, // 单位秒
  });
};
/**
 * 发放Cos临时TOken
 * @param {List} statement - 所需权限组
 * @returns {Object} - 临时Toekn
 */
const getTempCosToken = (statement) => {
  return new Promise((resolve, reject) => {
    var config = {
      bucket: "tokyo-1307889358", // 填入您自己的存储桶，必须字段
      region: "ap-tokyo",
      durationSeconds: 1800,
      secretId: process.env.SecretId, // 固定密钥
      secretKey: process.env.SecretKey, // 固定密钥
    };

    // 获取临时密钥
    var shortBucketName = config.bucket.substring(
      0,
      config.bucket.lastIndexOf("-")
    );
    var appId = config.bucket.substring(1 + config.bucket.lastIndexOf("-"));

    var policy = {
      version: "2.0",
      statement: statement || [
        {
          action: [
            //简单上传操作
            "name/cos:PutObject",
            //表单上传对象
            "name/cos:PostObject",
            //分块上传：初始化分块操作
            "name/cos:InitiateMultipartUpload",
            //分块上传：List 进行中的分块上传
            "name/cos:ListMultipartUploads",
            //分块上传：List 已上传分块操作
            "name/cos:ListParts",
            //分块上传：上传分块操作
            "name/cos:UploadPart",
            //分块上传：完成所有分块上传操作
            "name/cos:CompleteMultipartUpload",
            //取消分块上传操作
            "name/cos:AbortMultipartUpload",
          ],
          effect: "allow",
          resource: [
            "qcs::cos:ap-tokyo:uid/1307889358:tokyo-1307889358/images/*",
          ],
        },

        {
          action: [
            //下载操作
            "name/cos:GetObject",
          ],
          effect: "allow",
          resource: [
            "qcs::cos:ap-tokyo:uid/1307889358:tokyo-1307889358/avatar/*",
          ],
        },
      ],
    };
    STS.getCredential(
      {
        secretId: config.secretId,
        secretKey: config.secretKey,
        proxy: config.proxy,
        durationSeconds: config.durationSeconds,
        endpoint: config.endpoint,
        policy: policy,
      },
      function (err, tempKeys) {
        if (err) {
          reject(err);
          return;
        }
        var result = JSON.stringify(err || tempKeys) || "";
        resolve(result);
      }
    );
  });
};
exports.getTempCosToken = getTempCosToken;
// module.exports = cos;
