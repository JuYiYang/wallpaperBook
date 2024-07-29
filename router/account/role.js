const express = require("express");
const Parse = require("parse/node");

const Router = express.Router();

Router.get("/getUserRole", async (req, res) => {
  const userQuery = new Parse.Query(Parse.User);
  userQuery
    .get(req.user.id, { useMasterKey: true })
    .then((user) => {
      // 查询与用户相关联的角色对象
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo("users", user);
      roleQuery
        .find()
        .then((roles) => {
          if (roles.length > 0) {
            // 用户绑定了角色
            res.customSend(roles);
          } else {
            res.customErrorSend("User is not bound to any role");
          }
        })
        .catch((error) => {
          res.customErrorSend("Error querying roles", 500, error);
        });
    })
    .catch((error) => {
      res.customErrorSend("Error querying user", 500, error);
    });
});

Router.post("/addUserRole", async (req, res) => {
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("objectId", req.user.id);
  userQuery
    .first({ useMasterKey: true })
    .then((user) => {
      if (user) {
        // 获取角色对象
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo("name", req.body.roleName);
        roleQuery
          .first({ useMasterKey: true })
          .then((role) => {
            if (role) {
              // 将用户添加到角色中
              role.getUsers().add(user);
              // 保存角色
              role
                .save()
                .then((savedRole) => {
                  res.customSend(savedRole);
                })
                .catch((error) => {
                  res.customErrorSend("Error adding user to role, 500, error");
                });
            } else {
              res.customErrorSend("Role not found");
            }
          })
          .catch((error) => {
            res.customErrorSend("Error querying role", 500, error);
          });
      } else {
        res.customErrorSend("User not found");
      }
    })
    .catch((error) => {
      res.customErrorSend("Error querying user", 500, error);
    });
});

Router.post("/setRoleRights", async (req, res) => {
  const acl = new Parse.ACL();
  const roleName = req.body.roleName;
  const className = req.body.className;
  // 设置角色的读取和写入权限
  // 如果你的角色名为 "likeRole"，则设置角色的读写权限
  acl.setRoleReadAccess(roleName, true); // 允许角色读取对象
  acl.setRoleWriteAccess(roleName, true); // 允许角色写入对象

  // 创建数据对象并设置 ACL
  const Like = Parse.Object.extend(className);
  const likeObject = new Like();
  likeObject.setACL(acl);

  // 保存数据对象到 Parse 服务器
  likeObject
    .save(null, { useMasterKey: true })
    .then((object) => {
      res.customSend(object);
    })
    .catch((error) => {
      res.customErrorSend(error.message, error.code);
    });
});

module.exports = Router;
