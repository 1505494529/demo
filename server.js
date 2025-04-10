import { GoogleGenAI } from "@google/genai";
import express from 'express';
const ai = new GoogleGenAI({ apiKey: "AIzaSyDP7o1OSxj_9yrD1IIA4TM_ti-i32f9gqA" });
const app = express();
// --- 定义路由 ---

// 根路由 - 提供基本信息和使用说明
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(
    'LeanCloud App with Gemini Streaming Endpoint (Hardcoded Key) is running.\n' +
    '访问 /stream-gemini?prompt=你的问题 来获取流式响应。\n' +
    '例如: /stream-gemini?prompt=给我讲个笑话'
  );
});

// Gemini 流式调用 API 端点
app.get('/stream-gemini', async (req, res) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "你好",
  });
  res.send(response.text);
});

// --- 启动服务器 ---
// 从环境变量获取 LeanCloud 指定的端口，提供默认端口 3000 用于本地测试
const PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 3000);

// 监听端口并启动 HTTP 服务
app.listen(PORT, (err) => {
  if (err) {
    // 如果启动失败，打印错误并退出
    console.error('启动服务器失败:', err);
    process.exit(1); // 可以考虑退出进程
  } else {
    // 启动成功，打印监听的端口和 API 端点信息
    console.log(`Node 应用正在监听端口: ${PORT}`);
    console.log(`Gemini 流式 API 端点位于: /stream-gemini`);
    console.log(`根路径提示信息位于: /`);
  }
});
