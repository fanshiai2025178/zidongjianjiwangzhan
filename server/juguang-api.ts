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
      
      // 查找包含图片数据的part（可能不在第一个位置）
      const parts = data.candidates[0]?.content?.parts || [];
      const imagePart = parts.find(part => part.inlineData?.data);
      const imageBase64 = imagePart?.inlineData?.data;
      
      if (!imageBase64) {
        console.warn(`[Juguang Image] No image data in response (attempt ${attempt}/${retries})`);
        console.warn(`[Juguang Image] Response has ${parts.length} parts`);
        console.warn(`[Juguang Image] Parts structure:`, parts.map(p => Object.keys(p)));
        if (attempt === retries) {
          throw new Error("No image data in response after all retries");
        }
        continue; // 重试
      }

      // 将base64转换为data URL
      const mimeType = imagePart?.inlineData?.mimeType || "image/png";
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      console.log(`[Juguang Image] Image generated successfully (attempt ${attempt}/${retries})`);
      
      return dataUrl;
    } catch (error) {
      console.error(`[Juguang Image] Error on attempt ${attempt}:`, error);
      
      if (attempt === retries) {
        throw new Error(`Failed to generate image after ${retries} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  throw new Error("Failed to generate image: unexpected error");
}
