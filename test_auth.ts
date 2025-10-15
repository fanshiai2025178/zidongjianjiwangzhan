import { Signer } from "@volcengine/openapi";

async function testVolcengineAuth() {
  // 使用环境变量中的AK/SK
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID;
  const secretKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY;
  const endpointId = process.env.VOLCENGINE_KEYWORD_ENDPOINT_ID; // 使用关键词提取端点测试

  console.log("=== 火山引擎ARK API认证测试 ===");
  console.log("Access Key ID:", accessKeyId?.substring(0, 20) + "...");
  console.log("Secret Key:", secretKey?.substring(0, 20) + "...");
  console.log("Endpoint ID:", endpointId);
  console.log("");

  if (!accessKeyId || !secretKey || !endpointId) {
    console.error("错误：缺少必要的环境变量");
    process.exit(1);
  }

  const requestBody = JSON.stringify({
    model: endpointId,
    messages: [
      {
        role: "user",
        content: "你好，请回复'测试成功'"
      }
    ],
    temperature: 0.7,
  });

  const requestData = {
    region: "cn-beijing",
    method: "POST",
    pathname: "/api/v3/chat/completions",
    params: {},
    headers: {
      "Content-Type": "application/json",
    },
    body: requestBody,
  };

  console.log("步骤1：准备请求数据");
  console.log("- URL:", "https://ark.cn-beijing.volces.com/api/v3/chat/completions");
  console.log("- Method:", requestData.method);
  console.log("- Region:", requestData.region);
  console.log("");

  console.log("步骤2：使用AK/SK进行签名");
  const signer = new Signer(requestData, "ark");
  signer.addAuthorization({ accessKeyId, secretKey, sessionToken: "" });
  console.log("- 签名完成");
  console.log("- Headers:", JSON.stringify(requestData.headers, null, 2));
  console.log("");

  console.log("步骤3：发起HTTP请求");
  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: requestData.headers as Record<string, string>,
      body: requestBody,
    });

    console.log("- HTTP状态码:", response.status);
    console.log("- 响应Headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log("");

    const responseText = await response.text();
    console.log("步骤4：响应内容");
    console.log(responseText);
    console.log("");

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("✅ 认证成功！");
      console.log("模型回复:", data.choices?.[0]?.message?.content || "无内容");
    } else {
      console.log("❌ 认证失败");
      console.log("错误详情:", responseText);
    }
  } catch (error) {
    console.error("请求异常:", error);
  }
}

testVolcengineAuth();
