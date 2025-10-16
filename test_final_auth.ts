import { Signer } from "@volcengine/openapi";

async function testAuth(
  name: string,
  accessKeyId: string,
  secretKey: string,
  endpointId: string
) {
  console.log(`\n=== ${name} ===`);
  console.log("Access Key ID:", accessKeyId.substring(0, 30) + "...");
  console.log("Secret Key:", secretKey.substring(0, 30) + "...");
  console.log("Endpoint ID:", endpointId);

  const requestBody = JSON.stringify({
    model: endpointId,
    messages: [
      {
        role: "user",
        content: "请回复'测试成功'"
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

  const signer = new Signer(requestData, "ark");
  signer.addAuthorization({ accessKeyId, secretKey, sessionToken: "" });

  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: requestData.headers as Record<string, string>,
      body: requestBody,
    });

    console.log("HTTP状态码:", response.status);
    
    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("✅ 认证成功！");
      console.log("AI回复:", data.choices?.[0]?.message?.content || "无内容");
      return true;
    } else {
      console.log("❌ 认证失败");
      console.log("错误响应:", responseText);
      return false;
    }
  } catch (error) {
    console.error("请求异常:", error);
    return false;
  }
}

async function runTests() {
  console.log("=== 火山引擎ARK API认证最终测试 ===\n");
  
  // 测试1：正确的AK/SK（原始值，不解码）
  const test1Success = await testAuth(
    "测试1：正确的AK/SK（原始值）",
    process.env.VOLCENGINE_ACCESS_KEY_ID || "",
    process.env.VOLCENGINE_SECRET_ACCESS_KEY || "",
    process.env.VOLCENGINE_KEYWORD_API_KEY || ""
  );
  
  // 测试2：UUID格式的凭据
  const test2Success = await testAuth(
    "测试2：UUID格式的凭据",
    process.env.VOLCENGINE_ACCESS_KEY || "",
    process.env.VOLCENGINE_SECRET_KEY || "",
    process.env.VOLCENGINE_KEYWORD_API_KEY || ""
  );
  
  console.log("\n=== 测试总结 ===");
  console.log("测试1（正确AK/SK）:", test1Success ? "✅ 成功" : "❌ 失败");
  console.log("测试2（UUID凭据）:", test2Success ? "✅ 成功" : "❌ 失败");
}

runTests();
