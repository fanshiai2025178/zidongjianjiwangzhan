interface JuguangMessage {
  parts: {
    text: string;
  }[];
}

interface JuguangResponse {
  candidates: {
    content: {
      parts: {
        text?: string;
        inlineData?: {
          data: string;
          mimeType: string;
        };
      }[];
    };
  }[];
}

export async function callJuguangAPI(
  userPrompt: string, 
  systemPrompt: string = "You are a helpful assistant."
): Promise<string> {
  const apiKey = process.env.JUGUANG_API_KEY;
  
  if (!apiKey) {
    throw new Error("JUGUANG_API_KEY is not configured");
  }

  // 合并系统提示和用户提示
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

  console.log("[Juguang] Calling API with prompt:", fullPrompt.substring(0, 100) + "...");

  try {
    const response = await fetch("https://ai.juguang.chat/v1beta/models/gemini-2.5-flash-preview:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Juguang] API error:", errorData);
      throw new Error(`Juguang API error: ${JSON.stringify(errorData)}`);
    }

    const data: JuguangResponse = await response.json();
    const result = data.candidates[0]?.content?.parts[0]?.text || "";
    
    console.log("[Juguang] Response received:", result.substring(0, 100) + "...");
    
    return result;
  } catch (error) {
    console.error("[Juguang] Error:", error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateImageWithJuguang(prompt: string, retries: number = 3): Promise<string> {
  const apiKey = process.env.JUGUANG_API_KEY;
  
  if (!apiKey) {
    throw new Error("JUGUANG_API_KEY is not configured");
  }

  console.log("[Juguang Image] Generating image with prompt:", prompt);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[Juguang Image] Retry attempt ${attempt}/${retries}`);
        // 等待一秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const response = await fetch("https://ai.juguang.chat/v1beta/models/gemini-2.5-flash-image-preview:generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Juguang Image] API error:", errorData);
        throw new Error(`Juguang Image API error: ${JSON.stringify(errorData)}`);
      }

      const data: JuguangResponse = await response.json();
      
      // 查找包含图片数据的part
      const parts = data.candidates[0]?.content?.parts || [];
      
      // 方法1：查找inlineData格式的图片
      const imagePart = parts.find(part => part.inlineData?.data);
      if (imagePart) {
        const imageBase64 = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const dataUrl = `data:${mimeType};base64,${imageBase64}`;
        console.log(`[Juguang Image] Image generated successfully (inlineData format, attempt ${attempt}/${retries})`);
        return dataUrl;
      }
      
      // 方法2：从Markdown文本中提取data URL
      const textPart = parts.find(p => p.text);
      if (textPart?.text) {
        // 匹配Markdown格式: ![image](data:image/png;base64,...)
        const markdownMatch = textPart.text.match(/!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/);
        if (markdownMatch && markdownMatch[1]) {
          const dataUrl = markdownMatch[1];
          console.log(`[Juguang Image] Image generated successfully (Markdown format, attempt ${attempt}/${retries})`);
          return dataUrl;
        }
        
        // 如果没找到Markdown格式，直接查找data URL
        const dataUrlMatch = textPart.text.match(/(data:image\/[^;]+;base64,[^\s)]+)/);
        if (dataUrlMatch && dataUrlMatch[1]) {
          const dataUrl = dataUrlMatch[1];
          console.log(`[Juguang Image] Image generated successfully (plain data URL, attempt ${attempt}/${retries})`);
          return dataUrl;
        }
      }
      
      // 如果所有方法都失败
      console.warn(`[Juguang Image] No image data found (attempt ${attempt}/${retries})`);
      console.warn(`[Juguang Image] Response has ${parts.length} parts`);
      console.warn(`[Juguang Image] Parts structure:`, parts.map(p => Object.keys(p)));
      
      if (textPart?.text) {
        console.warn(`[Juguang Image] Text content (first 200 chars):`, textPart.text.substring(0, 200));
      }
      
      if (attempt === retries) {
        throw new Error("No image data found in response after all retries");
      }
      continue; // 重试
    } catch (error) {
      console.error(`[Juguang Image] Error on attempt ${attempt}:`, error);
      
      if (attempt === retries) {
        throw new Error(`Failed to generate image after ${retries} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  throw new Error("Failed to generate image: unexpected error");
}
