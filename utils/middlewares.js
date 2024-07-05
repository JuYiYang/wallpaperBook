const geoip = require("geoip-lite");
// 自定义响应方法
exports.responseMiddleware = (req, res, next) => {
  const defaultConfig = {
    data: null,
    msg: null,
  };
  res.customSend = (data) => {
    const response = {
      ...defaultConfig,
      code: 200,
      data,
    };
    res.json(response);
  };
  res.customErrorSend = (msg, code = 500, data) => {
    res.json({ msg, code, data });
  };
  next();
};

exports.crossDomainMiddlewar = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
};

// 身份验证中间件

exports.authenticateMiddleware = (req, res, next) => {
  const sessionToken = req.headers.authorization;
  if (!sessionToken) {
    return res.customErrorSend("Invalid session token", 401);
  }

  // 使用 session token 进行身份验证
  Parse.User.become(sessionToken)
    .then((user) => {
      // 身份验证成功
      req.user = user;
      next();
    })
    .catch((error) => {
      // 身份验证失败
      return res.customErrorSend("Invalid identity information", 401);
    });
};

exports.validateParams = (schema) => {
  return (req, res, next) => {
    if (req.method === "GET") {
      data = req.query;
    } else {
      data = req.body;
    }

    const { error, value } = schema.validate(data);
    if (error) {
      return res.customErrorSend(error.details[0].message);
    }
    next();
  };
};
