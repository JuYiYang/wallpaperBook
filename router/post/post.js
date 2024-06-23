const { multiple } = require("../../utils//saveFile");
const express = require("express");
const Router = express.Router();

const Post = Parse.Object.extend("Post");
const PostWall = Parse.Object.extend("PostWall");
const PostContentInfo = Parse.Object.extend("PostContent");

Router.post("/getPost", (req, res) => {});

Router.post("/creatdPost", multiple, async (req, res) => {
  if (
    (!req.files || !req.files.length) &&
    (!req.body.content || !req.body.content.length)
  ) {
    return res.customErrorSend("缺少必要参数！");
  }

  try {
    await createPost(req.files, req.body.content, req.user.id);
    res.customSend("success");
  } catch (err) {
    res.customErrorSend(err);
  }
});

const createPost = async (images, text, creatorId) => {
  const imageIds = [];
  for (const image of images) {
    const wallInfo = new PostWall();
    let filePath = "http://192.168.1.106:1337" + "/static/" + image.filename;
    // 设置图片信息
    wallInfo.set("imageName", image.filename); // 图片名称包含后缀
    wallInfo.set("imageUrl", filePath); // 图片可访问路径
    wallInfo.set("imageSize", image.size); // 字节大小
    wallInfo.set("imageDimensions", "0x0"); // 图片的尺寸 200x200 保留
    wallInfo.set("mimetype", image.mimetype); // 图片类型
    wallInfo.set("type", 1); // 图片展示类型（壁纸，表情包，头像） 保留
    wallInfo.set("creator", creatorId);
    const saveImageInfo = await wallInfo.save(null, { useMasterKey: true });
    console.log(saveImageInfo);
    imageIds.push(saveImageInfo.id); // 创建人
  }
  const post = new Post();
  post.set("wallId", imageIds.join(","));
  if (text && text.length) {
    const postContentInfo = new PostContentInfo();
    postContentInfo.set("content", text);
    postContentInfo.set("creator", creatorId);
    const contentInfo = await postContentInfo.save(null, {
      useMasterKey: true,
    });
    post.set("contentId", contentInfo.id);
  }

  post.set("creator", creatorId);
  // 可以添加其他属性，如发布时间等
  await post.save(null, { useMasterKey: true });
};

module.exports = Router;
