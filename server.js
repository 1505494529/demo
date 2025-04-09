'use strict';

// --- 依赖引入 ---
const express = require('express');
//const AV = require('leanengine'); // LeanCloud SDK
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Gemini SDK

// --- 初始化 Gemini ---

// !!! 极度不安全的做法：直接硬编码 API 密钥 !!!
// !!! 警告：将 API 密钥提交到 Git 仓库会永久暴露它 !!!
// !!! 你已明确要求这样做，请自行承担所有安全风险 !!!
const apiKey = "AIzaSyDP7o1OSxj_9yrD1IIA4TM_ti-i32f9gqA"; // <--- 你的 API 密钥直接放在这里

let genAI;
let geminiModel;

// 检查 apiKey 是否提供
if (!apiKey) {
  console.error(
    '严重错误：API Key 为空。请在 server.js 中直接设置 apiKey 变量。Gemini 功能将不可用。'
  );
} else {
  try {
      // 使用硬编码的 API Key 初始化 Gemini 客户端
      genAI = new GoogleGenerativeAI(apiKey);
      // 选择要使用的 Gemini 模型 (例如 'gemini-pro', 'gemini-1.5-flash', 等)
      // 建议查看 Google AI 文档了解最新和最适合你需求的模型
      geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
      console.log('Gemini AI Client Initialized (using hardcoded key - UNSAFE!).');
  } catch (initError) {
      console.error("初始化 GoogleGenerativeAI 时失败:", initError);
      // 确保在初始化失败时，模型对象为 null 或 undefined
      geminiModel = null;
  }
}


// --- 创建 Express 应用 ---
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
  // 1. 检查 Gemini 模型是否成功初始化
  if (!geminiModel) {
      // 如果模型未初始化，返回服务不可用错误
      return res.status(503).type('text/plain').send('Gemini service is not available (Initialization failed or API key missing/invalid).');
  }

  // 2. 从 URL 查询参数中获取 'prompt'
  const prompt = req.query.prompt;

  // 3. 检查 prompt 是否存在
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    // 如果 prompt 无效或缺失，返回客户端错误
    return res.status(400).type('text/plain').send('错误: URL 查询参数 "prompt" 是必须的且不能为空。');
  }

  // 打印收到的请求日志
  console.log(`收到流式请求, prompt: "${prompt}"`);

  try {
    // 4. 设置 HTTP 响应头以支持流式传输 (SSE - Server-Sent Events 是一种选择，但这里用简单的 text/plain 流)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // 禁止缓存，确保客户端总是获取实时数据
    res.setHeader('Cache-Control', 'no-cache');
    // 保持连接打开以进行流式传输
    res.setHeader('Connection', 'keep-alive');
    // Transfer-Encoding: chunked 会由 Node.js 自动处理，当使用 res.write 时

    // 5. 调用 Gemini SDK 的流式生成方法
    const result = await geminiModel.generateContentStream([prompt]); // 可以传入字符串数组或对象数组

    // 6. 异步迭代处理返回的数据流
    for await (const chunk of result.stream) {
      // 检查模型是否返回了函数调用请求（如果你的模型配置支持）
      if (chunk.functionCalls && chunk.functionCalls()) {
          console.warn('检测到函数调用，在此示例中跳过输出。');
          // 在生产应用中，你可能需要解析并执行这些函数调用，然后将结果返回给模型
          continue; // 跳过这个数据块，不写入响应
      }

      // 提取当前数据块中的文本部分
      const chunkText = chunk.text();

      // 确保有文本内容再写入
      if (chunkText) {
        // 7. 将每个文本块写入到 HTTP 响应流中
        res.write(chunkText);
      }
    }

    // 8. 当 Gemini 的流结束后，结束 HTTP 响应
    res.end();
    console.log(`流式传输完成, prompt: "${prompt}"`);

  } catch (error) {
    // 9. 捕获并处理在调用 Gemini 或流式传输过程中可能发生的错误
    console.error(`Gemini 流式处理出错, prompt "${prompt}":`, error);

    // 检查响应头是否已发送，决定如何报告错误
    if (!res.headersSent) {
      // 如果还没开始发送数据，可以设置一个标准的错误状态码和消息
      res.status(500).type('text/plain').send(`从 Gemini 生成内容时出错: ${error.message}`);
    } else {
      // 如果流已经开始，客户端可能已经接收到部分数据
      // 尝试在流末尾写入错误信息（可能失败，如果客户端已断开）
      try {
        res.write(`\n\n--- 发生错误: ${error.message} ---\n`);
      } catch (writeError) {
          // 如果连错误信息都无法写入，仅在服务器端记录
          console.error("无法将错误信息写入响应流:", writeError);
      }
      // 无论如何都要结束响应
      res.end();
    }
  }
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
