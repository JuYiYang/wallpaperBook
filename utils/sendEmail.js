const nodemailer = require("nodemailer");

const baseOption = {
  from: "juyiyang@qq.com", //发件人
  subject: "Wallpaper Book Support", //标题
};
//开启一个 SMTP 连接池
const transport = nodemailer.createTransport({
  host: "smtp.qq.com", //QQ邮箱的 smtp 服务器地址
  secure: true, //使用 SSL 协议
  secureConnection: true, //是否使用对 https 协议的安全连接
  port: 465, //QQ邮件服务所占用的端口
  auth: {
    user: "juyiyang@qq.com", //开启 smtp 服务的发件人邮箱，用于发送邮件给其他人
    pass: "euncyecbonondbgg", //SMTP 服务授权码
  },
});

const sendEmailVerifyLink = async (to, link) => {
  await transport.sendMail({
    ...baseOption,
    to,
    html: `<table role="presentation" style="border-collapse:collapse;background:#ffffff;width:100%;border-radius:2px">
  <tbody>
    <tr>
      <td
        style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px;box-sizing:border-box;padding:40px 48px 0">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0"
          style="border-collapse:collapse;width:100%">
          <tbody>
            <tr>
              <td
                style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0"
                  style="border-collapse:collapse;width:100%;margin-bottom:48px;line-height:24px">
                  <tbody>
                    <tr>
                      <td
                        style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px;vertical-align:top;min-width:88px;width:30%">
                        <img
                          src="https://ci3.googleusercontent.com/meips/ADKq_NaIPF9qkVHyiBG9Ym31vX-Gk0n_NU3UfVDOA90F9kQt2vJZgf2EZlmkuGlh33NDcET95xKpWbw6W1dHdewCVJ_N4mCzMe68mwBt_ZlYPeUfHVELqa1VXO5C_Q90Xq9M17rTAxevyiqP_jn03u8FkV3E65S9jfo=s0-d-e1-ft#https://s0.wp.com/wp-content/mu-plugins/html-emails/themes/gravatar/img/logo_gravatar@2x.png?v=1"
                          width="27" height="27" alt="logo_gravatar@2x.png"
                          style="border:none;max-width:100%;width:27px;height:27px;display:block" class="CToWUd"
                          data-bit="iit">
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h1
                  style="color:#00101c;margin:0 0 24px;font-size:40px;font-weight:900;letter-spacing:-0.01em;line-height:1.15;margin-bottom:40px">
                  请确认您的电子邮件地址以完成注册</h1>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0"
                  style="border-collapse:collapse;width:100%">
                  <tbody>
                    <tr>
                      <td
                        style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px">
                        <p
                          style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px;font-weight:400;margin:0;line-height:1.7;padding:0;color:#00101c;margin-bottom:24px">
                          感谢加入 <b>Wallpaper Book</b>。 我们需要确认您的电子邮件地址。 请点击下方链接。 </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px">
                        <p
                          style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px;font-weight:400;margin:0;line-height:1.7;padding:0;color:#00101c;margin-bottom:24px">
                          如果您未请求此电子邮件，请忽略它。 </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px">
                        <a href="${link}" rel="noopener"
                          style="margin-bottom:24px;background-color:#7822f5;font-size:16px;font-family:Helvetica Arial sans-serif;font-weight:600;text-decoration:none;padding:13px 24px;color:#fff;border-radius:4px;display:inline-block"
                          target="_blank">
                          <span>继续以使用 Wallpaper Book</span>

                        </a>

                      </td>
                    </tr>
                    <tr>
                      <td
                        style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px">
                        <p
                          style="font-family:-apple-system system-ui blinkmacsystemfont &quot;Segoe UI&quot; Roboto Oxygen-Sans Ubuntu Cantarell &quot;Helvetica Neue&quot; sans-serif;font-size:16px;font-weight:400;margin:0;line-height:1.7;padding:0;color:#00101c;margin-bottom:24px">
                          出于安全性考虑，此链接将仅激活 30 分钟。 </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>`,
  });
  transport.close();
};

module.exports = {
  transport,
  baseOption,
  sendEmailVerifyLink,
};
