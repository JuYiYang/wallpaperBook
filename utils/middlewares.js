// 自定义响应方法
exports.responseMiddleware = (req, res, next) => {
  res.customSend = (data, msg) => {
    const response = {
      data,
      msg,
      code: 200,
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
let notAuthPath = ["/getAllPost", "/browse"];

exports.auth = (req, res, next) => {
  const sessionToken = req.headers.authorization;

  req.user = null;
  // if (!sessionToken && !notAuthPath.includes(req.path)) {
  //   next();
  //   return;
  // }
  Parse.User.become(sessionToken)
    .then((user) => {
      // 身份验证成功
      req.user = user;
      next();
    })
    .catch((err) => {
      next();
    });
};
// 身份验证中间件
exports.authenticateMiddleware = (req, res, next) => {
  const sessionToken = req.headers.authorization;
  if (!sessionToken && !notAuthPath.includes(req.path)) {
    return res.customErrorSend("Invalid session token", 401);
  }
  if (notAuthPath.includes(req.path)) {
    next();
    return;
  }

  if (req.user !== null) {
    next();
    return;
  }

  return res.customErrorSend("Invalid identity information", 401);
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

exports.logUserActivity = (req, res, next) => {
  const deviceId = req.headers["uid"] || null;
  const browserFingerprint = req.headers["browser-fingerprint"] || null;
  const method = req.method;
  const endpoint = req.originalUrl;

  if (endpoint.includes(["keepAlive"])) {
    next();
    return;
  }
  const queryParams = req.query;
  const body = req.body;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const user = req?.user?.id;
  let obj = {
    user,
    deviceId,
    browserFingerprint,
    method,
    endpoint,
    queryParams,
    body,
    ip,
  };

  const Log = Parse.Object.extend("Log");
  const log = new Log();
  for (const key in obj) {
    log.set(key, obj[key]);
  }
  log.save(null, { useMasterKey: true }).catch((err) => {
    console.log("log 保存失败----", err, obj);
  });

  next();
};
