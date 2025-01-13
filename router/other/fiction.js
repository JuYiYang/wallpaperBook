const express = require("express");

const fs = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
const Router = express.Router();
const FILES_DIR = path.join("D:/browserDownload/fiction");

const FileClass = Parse.Object.extend("Fiction");

const ENCRYPTION_KEY = Buffer.from("1234567890abcdef", "utf8"); // 2 字节密钥

// IV 必须是 16 字节
const IV = crypto.randomBytes(16); // 16 字节的随机 IV

// 加密函数
function encrypt(text) {
  const cipher = crypto.createCipheriv("aes-128-cbc", ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${IV.toString("hex")}:${encrypted}`;
}

// 解密函数
function decrypt(encryptedText) {
  const [iv, encrypted] = encryptedText.split(":");

  const decipher = crypto.createDecipheriv(
    "aes-128-cbc",
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function generateFileId(fileName) {
  return crypto.createHash("md5").update(fileName).digest("hex");
}

function calculateFileMd5(content) {
  return crypto.createHash("md5").update(content).digest("hex");
}

Router.get("/save", async (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.flushHeaders(); // 立即刷新头部

  const files = fs
    .readdirSync(FILES_DIR)
    .filter((file) => file.endsWith(".txt"));
  for (const file of files) {
    const filePath = path.join(FILES_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");
    const fileMd5 = calculateFileMd5(content);
    // 检查是否有相同的 MD5 值
    const query = new Parse.Query("Fiction");
    query.equalTo("md5", fileMd5);
    const exists = await query.find({ useMasterKey: true });
    let encrtcontent = encrypt(content);
    if (encrtcontent.length > 17825794) {
      res.write(`data: 文件 ${file} ${encrtcontent.length}\n\n`);
      continue;
    }
    if (!exists.length) {
      const fileRecord = new FileClass();
      fileRecord.set("fileId", generateFileId(file));
      fileRecord.set("fileName", encrypt(file)); // 加密文件名
      fileRecord.set("content", encrtcontent); // 加密文件内容
      fileRecord.set("md5", fileMd5); // 保存 MD5 值

      await fileRecord.save(null, { useMasterKey: true });
      // 发送 SSE 消息
      res.write(`data: 文件 ${file} 已保存到数据库\n\n`);
    } else {
      // 发送重复文件的 SSE 消息
      // res.write(`data: 文件 ${file} 已存在，跳过保存\n\n`);
    }
  }

  // 发送完成标志
  res.write("data: 文件保存处理完成\n\n");
  res.end(); // 关闭连接
});

Router.get("/", async (req, res) => {
  const query = new Parse.Query("Fiction");
  query.select("fileName");
  const files = await query.findAll({ useMasterKey: true });

  let html = "<ul>";
  files.forEach((file) => {
    let fileName = decrypt(file.get("fileName"));
    html += `<li><a style="color:#0142f1;" href="/fiction/file/${file.id}">${fileName}</a></li>`;
  });
  html += "</ul>";
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>文件列表</title>
    </head>
    <body>
      <h1>文本文件列表</h1>
      ${html}
    </body>
    </html>
  `);
});

Router.get("/file/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;

    const query = new Parse.Query("Fiction");
    query.select("fileName", "content");
    const fiction = await query.get(fileId, { useMasterKey: true });
    let fileName = decrypt(fiction.get("fileName"));
    let data = decrypt(fiction.get("content"));
    res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>小说预览 </title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        h1 {
          color: #0056b3;
        }
        pre {
          background-color: #fff;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          white-space: pre-wrap;
          word-wrap: break-word;
          max-width: 100%;
          letter-spacing:0.5px;
          line-height: 28px;
          overflow-x: auto;
        }
        a {
          color: #007bff;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>${fileName}</h1>
      <pre>${data}</pre>
      <br>
      <a href="/fiction">返回文件列表</a>
    </body>
    </html>
  `);
  } catch (err) {
    res.send(`<h1>not</h1>`);
  }
});
module.exports = Router;
