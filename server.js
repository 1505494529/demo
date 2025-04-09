'use strict';

const express = require('express');
const AV = require('leanengine'); // 引入 LeanEngine SDK (即使没直接用 AV 对象，最好也引入)

// 创建 Express 应用实例
const app = express();

// 定义根路由 ('/') 的 GET 请求处理器
app.get('/', (req, res) => {
  // 当访问应用根路径时，返回简单文本
  res.send('Hello from LeanCloud via Git Deploy!');
});

// 获取 LeanCloud 云引擎提供的端口号
// LeanCloud 会通过环境变量 LEANCLOUD_APP_PORT 或 PORT 注入端口
const PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 3000);

// 启动服务器并监听指定端口
app.listen(PORT, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
  } else {
    console.log('Node app is running on port:', PORT);
    // 通常在这里可以加载云函数和 Hook 定义，但这个简单例子不需要
    // require('./cloud'); // 例如：如果你的云函数/Hook 在 cloud.js 中
  }
});
