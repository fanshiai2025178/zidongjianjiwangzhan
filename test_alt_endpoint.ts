import { Signer } from "@volcengine/openapi";

async function testWithEndpoint(endpointId: string, name: string) {
  console.log(`\n=== 测试 ${name} ===`);
  console.log("Endpoint ID:", endpointId);
  
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID || "";
  const secretKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY || "";

  const requestBody = JSON.stringify({
    model: endpointId,
    messages: [{ role: "user", content: "测试" }],
    temperature: 0.7,
  });

  const requestData = {
    region: "cn-beijing",
    method: "POST",
    pathname: "/api/v3/chat/completions",
    params: {},
    headers: { "Content-Type": "application/json" },
    body: requestBody,
  };

  const signer = new Signer(requestData, "ark");
  signer.addAuthorization({ accessKeyId, secretKey, sessionToken: "" });

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: requestData.headers as Record<string, string>,
    body: requestBody,
  });

  console.log("状态码:", response.status);
  const text = await response.text();
  console.log("响应:", text.substring(0, 200));
}

async function main() {
  // 测试两个endpoint ID
  await testWithEndpoint(
    process.env.VOLCENGINE_KEYWORD_API_KEY || "",
    "关键词端点 (ep-20251016063909-7l6gr)"
  );
  
  await testWithEndpoint(
    process.env.VOLCENGINE_DEEPSEEK_API_KEY || "",
    "描述词端点 (ep-20251016061331-8bgnk)"
  );
  
  // 也测试一下不存在的endpoint
  await testWithEndpoint(
    "ep-test-invalid",
    "无效端点（用于对比）"
  );
}

main();
