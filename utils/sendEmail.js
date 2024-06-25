const nodemailer = require("nodemailer");

const baseOption = {
  from: "juyiyang@qq.com", //发件人
  to: "2105675362@qq.com", //收件人
  subject: "Wallpaper Book Support", //标题
  html: `<table width="100%" border="0" cellspacing="0" cellpadding="0" class="m_-8657828899758325709em_full_wrap" align="center" bgcolor="#ffffff"><tbody><tr><td align="center" valign="top" class="m_-8657828899758325709em_aside5"><table align="center" width="650" border="0" cellspacing="0" cellpadding="0" class="m_-8657828899758325709em_main_table" style="width: 650px; table-layout: fixed;"><tbody><tr><td align="center" valign="top" style="padding: 0px 25px; background-color: rgb(255, 255, 255);" class="m_-8657828899758325709em_aside10"><table width="100%" border="0" cellspacing="0" cellpadding="0" align="center"><tbody><tr><td height="45" style="height: 45px;" class="m_-8657828899758325709em_h20"></td></tr><tr><td height="14" style="height: 14px; font-size: 0px; line-height: 0px;"></td></tr><tr><td height="26" style="height: 26px;" class="m_-8657828899758325709em_h20"></td></tr><tr><td class="m_-8657828899758325709em_grey" align="left" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; margin: 16px 0px; line-height: 26px; color: rgb(102, 102, 102);"><h3 style="color: rgb(5, 29, 57);">帐户验证</h3><p style="margin: 16px 0px;">你好，</p><p style="margin: 16px 0px;">感谢您选择 Wallpaper Book！请点击下面的链接确认您的电子邮件地址。我们会不时通过电子邮件向您通报重要更新，因此我们有必要保留最新的电子邮件地址。 </p></td></tr><tr><td align="left" valign="top" style="padding: 16px 0px;"><table width="275" style="width: 275px; background-color: rgb(67, 155, 115); border-radius: 4px;" border="0" cellspacing="0" cellpadding="0" align="center"><tbody><tr><td class="m_-8657828899758325709em_white" height="42" align="center" valign="middle" style="font-family: Arial, sans-serif; font-size: 16px; margin: 16px 0px; color: rgb(255, 255, 255); font-weight: bold; height: 42px;"> <a href="https://signup.Wallpaper Book.com/activate/0c3607502e0cb00135e0fc4fa8dbe062" style="text-decoration: none; color: rgb(255, 255, 255); line-height: 42px; display: block;" target="_blank">确认你的邮件地址</a></td></tr></tbody></table></td></tr><tr><td class="m_-8657828899758325709em_grey" align="left" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; margin: 16px 0px; line-height: 26px; color: rgb(102, 102, 102);"><p>如果您没有注册 Wallpaper Book 帐户，您可以忽略这封电子邮件。</p><p>祝您电子邮件愉快！</p><p> Wallpaper Book 团队</p></td></tr><tr><td height="26" style="height: 26px;" class="m_-8657828899758325709em_h20"></td></tr><tr><td align="left" valign="top"><table width="250" style="width: 250px; background-color: rgb(67, 155, 115); border-radius: 4px;" border="0" cellspacing="0" cellpadding="0" align="left"></table></td></tr><tr><td height="25" style="height: 25px;" class="m_-8657828899758325709em_h20"></td></tr><tr><td class="m_-8657828899758325709em_grey" align="center" valign="top" style="font-family: Arial, sans-serif; font-size: 16px; margin: 16px 0px; line-height: 26px; color: rgb(102, 102, 102);"><br class="m_-8657828899758325709em_hide"></td></tr><tr><td height="44" style="height: 44px;" class="m_-8657828899758325709em_h20"></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>`, //正文，可使用 HTML 格式进行渲染
};
//开启一个 SMTP 连接池
const transport = nodemailer.createTransport({
  host: "smtp.qq.com", //QQ邮箱的 smtp 服务器地址
  secure: true, //使用 SSL 协议
  secureConnection: false, //是否使用对 https 协议的安全连接
  port: 465, //QQ邮件服务所占用的端口
  auth: {
    user: "juyiyang@qq.com", //开启 smtp 服务的发件人邮箱，用于发送邮件给其他人
    pass: "euncyecbonondbgg", //SMTP 服务授权码
  },
});

module.exports = {
  transport,
  baseOption,
};
