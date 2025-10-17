import fetch from 'node-fetch';

const JUGUANG_API_KEY = process.env.JUGUANG_API_KEY;
const JUGUANG_API_URL = "https://ai.juguang.chat";

async function testJuguangImageGeneration() {
  console.log("=== 测试聚光图片生成API ===\n");
  
  const testPrompt = "A beautiful sunset over the ocean";
  
  console.log("测试提示词:", testPrompt);
  console.log("API URL:", JUGUANG_API_URL);
  console.log("模型: gemini-2.5-flash-image-preview\n");
  
  const requestBody = {
    model: "gemini-2.5-flash-image-preview",
    contents: [
      {
        parts: [
          {
            text: testPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "image/png"
    }
  };
  
  console.log("请求体:", JSON.stringify(requestBody, null, 2));
  console.log("\n发送请求...\n");
  
  try {
    const response = await fetch(`${JUGUANG_API_URL}/v1beta/models/gemini-2.5-flash-image-preview:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JUGUANG_API_KEY || ''}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log("响应状态:", response.status, response.statusText);
    console.log("响应头:", Object.fromEntries(response.headers.entries()));
    console.log("\n");
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log("❌ 请求失败");
      console.log("错误响应:", JSON.stringify(data, null, 2));
      return;
    }
    
    console.log("✅ 请求成功");
    console.log("完整响应:", JSON.stringify(data, null, 2));
    
    // 检查是否有图片数据
    const parts = data.candidates?.[0]?.content?.parts || [];
    console.log("\n响应Parts数量:", parts.length);
    
    parts.forEach((part, index) => {
      console.log(`Part ${index}:`, Object.keys(part));
      if (part.text) {
        console.log(`  - text (前100字符):`, part.text.substring(0, 100));
      }
      if (part.inlineData) {
        console.log(`  - inlineData.mimeType:`, part.inlineData.mimeType);
        console.log(`  - inlineData.data长度:`, part.inlineData.data?.length || 0);
      }
    });
    
    const imagePart = parts.find(p => p.inlineData?.data);
    if (imagePart) {
      console.log("\n✅ 找到图片数据！");
      console.log("MIME类型:", imagePart.inlineData.mimeType);
      console.log("Base64数据长度:", imagePart.inlineData.data.length);
    } else {
      console.log("\n❌ 未找到图片数据");
    }
    
  } catch (error) {
    console.log("❌ 发生异常");
    console.error("错误详情:", error);
  }
}

testJuguangImageGeneration();
