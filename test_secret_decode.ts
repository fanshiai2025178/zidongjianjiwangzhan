import { Signer } from "@volcengine/openapi";

async function testWithSecret(secretKey: string, description: string) {
  console.log(`\n=== ${description} ===`);
  console.log("Secret Key (前30字符):", secretKey.substring(0, 30) + "...");
  console.log("Secret Key 长度:", secretKey.length);
  
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID || "";
  const endpointId = process.env.VOLCENGINE_KEYWORD_API_KEY || "";

  const requestBody = JSON.stringify({
    model: endpointId,
    messages: [{ role: "user", content: "测试" }],
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
  if (response.ok) {
    console.log("✅ 成功！");
    const data = await response.json();
    console.log("响应:", data);
    return true;
  } else {
    const text = await response.text();
    console.log("❌ 失败:", text.substring(0, 150));
    return false;
  }
}

async function main() {
  const secretKeyBase64 = process.env.VOLCENGINE_SECRET_ACCESS_KEY || "";
  
  // 测试1：原始Base64值（不解码）
  const test1 = await testWithSecret(secretKeyBase64, "测试1：原始值（不解码）");
  
  // 测试2：Base64解码后的值
  const secretKeyDecoded = Buffer.from(secretKeyBase64, 'base64').toString('utf-8');
  const test2 = await testWithSecret(secretKeyDecoded, "测试2：Base64解码后");
  
  // 测试3：尝试二次Base64解码（以防万一）
  try {
    const secretKeyDoubleDecoded = Buffer.from(secretKeyDecoded, 'base64').toString('utf-8');
    const test3 = await testWithSecret(secretKeyDoubleDecoded, "测试3：二次Base64解码");
  } catch (e) {
    console.log("\n测试3：二次解码失败（预期内）");
  }
  
  console.log("\n=== 结果总结 ===");
  console.log("测试1（原始值）:", test1 ? "✅" : "❌");
  console.log("测试2（解码后）:", test2 ? "✅" : "❌");
}

main();
