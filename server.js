import { GoogleGenAI } from "@google/genai";
import express from 'express';
const ai = new GoogleGenAI({ apiKey: "AIzaSyDP7o1OSxj_9yrD1IIA4TM_ti-i32f9gqA" });
const app = express();
app.get('/:prompt', async (req, res) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro-exp-03-25",
    contents: req.params.prompt,
  });
  res.send(response.text);
});
const PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 3000);
app.listen(PORT, (err) => {});
