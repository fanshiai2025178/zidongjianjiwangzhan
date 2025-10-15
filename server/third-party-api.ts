// 第三方 API 调用（OpenAI 兼容格式）
// 支持使用 API 代理服务调用 Gemini 等模型

const API_BASE_URL = "https://ai.da520.online/v1";

/**
 * 调用第三方 API 生成文本内容（OpenAI 格式）
 * @param prompt 用户提示词
 * @param systemPrompt 系统提示词
 * @returns 生成的文本内容
 */
export async function callThirdPartyAPI(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.THIRD_PARTY_API_KEY;
  if (!apiKey) {
    throw new Error("THIRD_PARTY_API_KEY is not configured");
  }

  try {
    const messages: any[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }
    
    messages.push({
      role: "user",
      content: prompt
    });

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash-exp",
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Third-party API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Third-party API error:", error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 使用第三方 API 生成图片
 * @param prompt 图片描述提示词
 * @returns 生成的图片 URL
 */
export async function generateImageWithThirdPartyAPI(prompt: string): Promise<string> {
  const apiKey = process.env.THIRD_PARTY_API_KEY;
  if (!apiKey) {
    throw new Error("THIRD_PARTY_API_KEY is not configured");
  }

  try {
    console.log("[Third-party Image] Generating image with prompt:", prompt.substring(0, 100) + "...");
    
    const response = await fetch(`${API_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash-preview-image-generation",
        prompt: prompt,
        n: 1,
        response_format: "url",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Third-party API error: ${error}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url || data.url;
    
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    console.log("[Third-party Image] Image generated successfully");
    return imageUrl;
  } catch (error) {
    console.error("[Third-party Image] Error:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
