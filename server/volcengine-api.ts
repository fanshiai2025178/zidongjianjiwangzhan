import crypto from "crypto";

interface VolcengineConfig {
  accessKey: string;
  secretKey: string;
  endpointId: string;
  region?: string;
}

/**
 * 火山引擎API签名工具
 */
class VolcengineSignature {
  private config: VolcengineConfig;

  constructor(config: VolcengineConfig) {
    this.config = config;
  }

  /**
   * 生成火山引擎API签名
   */
  private sign(
    method: string,
    path: string,
    query: Record<string, string>,
    headers: Record<string, string>,
    body: string
  ): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const date = timestamp.slice(0, 8);

    // 规范化请求
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
      .join("\n");

    const signedHeaders = Object.keys(headers)
      .sort()
      .map((key) => key.toLowerCase())
      .join(";");

    const canonicalQueryString = Object.keys(query)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join("&");

    const hashedPayload = crypto
      .createHash("sha256")
      .update(body)
      .digest("hex");

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      "",
      signedHeaders,
      hashedPayload,
    ].join("\n");

    const hashedCanonicalRequest = crypto
      .createHash("sha256")
      .update(canonicalRequest)
      .digest("hex");

    const credentialScope = `${date}/${this.config.region || "cn-beijing"}/ml_maas/request`;
    const stringToSign = [
      "HMAC-SHA256",
      timestamp,
      credentialScope,
      hashedCanonicalRequest,
    ].join("\n");

    const kDate = crypto
      .createHmac("sha256", this.config.secretKey)
      .update(date)
      .digest();
    const kRegion = crypto
      .createHmac("sha256", kDate)
      .update(this.config.region || "cn-beijing")
      .digest();
    const kService = crypto
      .createHmac("sha256", kRegion)
      .update("ml_maas")
      .digest();
    const kSigning = crypto
      .createHmac("sha256", kService)
      .update("request")
      .digest();

    const signature = crypto
      .createHmac("sha256", kSigning)
      .update(stringToSign)
      .digest("hex");

    const authorization = `HMAC-SHA256 Credential=${this.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      "X-Date": timestamp,
      Authorization: authorization,
    };
  }

  /**
   * 调用火山引擎API
   */
  async call(messages: Array<{ role: string; content: string }>, temperature = 0.7): Promise<string> {
    const host = "maas-api.ml-platform-cn-beijing.volces.com";
    const path = "/api/v1/chat";
    const method = "POST";

    const body = JSON.stringify({
      endpoint_id: this.config.endpointId,
      messages: messages,
      temperature: temperature,
    });

    const headers: Record<string, string> = {
      Host: host,
      "Content-Type": "application/json",
    };

    const signHeaders = this.sign(method, path, {}, headers, body);

    const response = await fetch(`https://${host}${path}`, {
      method: method,
      headers: {
        ...headers,
        ...signHeaders,
      },
      body: body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Volcengine API error: ${error}`);
    }

    const result = await response.json();
    
    // 火山引擎返回格式
    if (result.error) {
      throw new Error(`Volcengine API error: ${result.error.message}`);
    }

    // 提取回复内容
    return result.choices?.[0]?.message?.content || "";
  }
}

/**
 * 调用火山引擎DeepSeek API
 * 专门用于批量生成描述词
 */
export async function callVolcengineDeepSeek(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY;
  const secretKey = process.env.VOLCENGINE_SECRET_KEY;
  const endpointId = process.env.VOLCENGINE_ENDPOINT_ID;

  if (!accessKey || !secretKey || !endpointId) {
    throw new Error("Volcengine credentials are not configured");
  }

  const volcengine = new VolcengineSignature({
    accessKey,
    secretKey,
    endpointId,
    region: "cn-beijing",
  });

  const messages = [
    {
      role: "system",
      content: systemPrompt || "你是一个专业的AI助手。",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  return await volcengine.call(messages, 0.7);
}

/**
 * 专门的翻译API
 * 使用火山引擎DeepSeek翻译端点（Bearer Token认证）
 * 负责所有中英文互译工作
 */
export async function translateText(
  sourceText: string,
  translationType: "description" | "keywords" | "segments" = "description",
  direction: "zh-to-en" | "en-to-zh" = "zh-to-en"
): Promise<string> {
  // 翻译端点ID（与其他API配置模式一致，使用*_API_KEY存储端点ID）
  const endpointId = process.env.VOLCENGINE_TRANSLATE_API_KEY;
  // 使用统一的火山引擎ACCESS_KEY作为Bearer Token
  const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
  
  if (!endpointId || !apiKey) {
    throw new Error("Volcengine Translate API credentials are not configured");
  }

  let systemPrompt = "";
  let userPrompt = "";

  if (direction === "zh-to-en") {
    // 中文翻译为英文
    systemPrompt = translationType === "keywords"
      ? "你是一个专业的中英翻译专家。"
      : "You are a professional translator. Translate the following Chinese AI video/image generation prompt to English. Keep the technical terms and maintain the same structure and details. Output only the English translation without any additional explanation.";

    userPrompt = translationType === "keywords"
      ? `请将以下中文关键词翻译为英文，保持逗号分隔格式。只输出翻译后的英文关键词，不要任何解释。

中文关键词：
${sourceText}`
      : `Translate this Chinese prompt to English:\n\n${sourceText}`;
  } else {
    // 英文翻译为中文
    systemPrompt = "你是一个专业的英中翻译助手。";
    
    if (translationType === "segments") {
      // 智能分段的批量翻译
      userPrompt = `请将以下英文文本片段翻译成中文，保持原意和专业性。直接返回JSON数组格式，每个元素包含id和translation字段：\n\n${sourceText}`;
    } else {
      userPrompt = `请将以下英文翻译为中文，保持原意：\n\n${sourceText}`;
    }
  }

  const requestBody = JSON.stringify({
    model: endpointId,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    temperature: 0.3,
  });

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: requestBody,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Volcengine Translate API error: ${error}`);
  }

  const data = await response.json();
  const translatedText = data.choices?.[0]?.message?.content || sourceText;
  
  return translatedText.trim();
}

/**
 * 专门的风格识别API
 * 使用火山引擎 Doubao 多模态端点（Bearer Token认证）
 * 负责识别人物形象、风格参考图片或预设风格
 */
export async function analyzeStyle(
  analysisType: "character" | "style" | "preset",
  imageBase64OrPresetInfo: string
): Promise<string> {
  // 使用 Doubao 多模态端点进行图片识别
  const endpointId = process.env.VOLCENGINE_DOUBAO_API_KEY;
  // 使用统一的火山引擎ACCESS_KEY作为Bearer Token
  const apiKey = process.env.VOLCENGINE_ACCESS_KEY;
  
  if (!endpointId || !apiKey) {
    throw new Error("Volcengine Doubao API credentials are not configured");
  }

  console.log(`[Style Analysis] Using Doubao multimodal endpoint: ${endpointId}`);

  let userPrompt = "";
  let messages: any[] = [];

  switch (analysisType) {
    case "character":
      userPrompt = `请仔细分析这张人物形象图片，提供详细的描述，包括：
1. 人物的外貌特征（性别、年龄段、发型、肤色等）
2. 服装风格和配饰
3. 整体气质和形象定位

请用简洁专业的语言描述，不超过150字。用于后续AI视频生成的人物一致性参考。`;
      
      // 多模态消息格式（图片 + 文本）
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64OrPresetInfo.startsWith('data:') 
                  ? imageBase64OrPresetInfo 
                  : `data:image/jpeg;base64,${imageBase64OrPresetInfo}`
              }
            }
          ]
        }
      ];
      break;

    case "style":
      userPrompt = `请仔细分析这张风格参考图片，提供详细的描述，包括：
1. 整体艺术风格（如写实、动漫、复古、未来科幻等）
2. 色彩基调和氛围（如冷色调、暖色调、高饱和度等）
3. 构图特点和视觉元素
4. 光影处理方式

请用简洁专业的语言描述，不超过150字。用于后续AI视频生成的风格一致性参考。`;
      
      // 多模态消息格式（图片 + 文本）
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64OrPresetInfo.startsWith('data:') 
                  ? imageBase64OrPresetInfo 
                  : `data:image/jpeg;base64,${imageBase64OrPresetInfo}`
              }
            }
          ]
        }
      ];
      break;

    case "preset":
      // 预设风格分析仅使用文本
      userPrompt = `请详细解析"${imageBase64OrPresetInfo}"这种视觉风格，提供专业的描述，包括：
1. 该风格的核心视觉特征
2. 典型的色彩运用和光影处理
3. 常见的构图和镜头语言
4. 适合表现的场景和情感

请用简洁专业的语言描述，不超过150字。用于指导AI视频生成的风格表现。`;
      
      // 纯文本消息格式
      messages = [
        {
          role: "user",
          content: userPrompt
        }
      ];
      break;
  }

  const requestBody = JSON.stringify({
    model: endpointId,
    messages: messages,
    temperature: 0.5,
  });

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: requestBody,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Volcengine Doubao API error: ${error}`);
  }

  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content || "";
  
  return analysis.trim();
}
