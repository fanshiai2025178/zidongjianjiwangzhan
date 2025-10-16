async function testBearerAuth(apiKey: string, description: string) {
  console.log(`\n=== ${description} ===`);
  console.log("API Key:", apiKey);
  
  const endpointId = process.env.VOLCENGINE_KEYWORD_API_KEY || "";
  
  const requestBody = JSON.stringify({
    model: endpointId,
    messages: [{ role: "user", content: "请回复'测试成功'" }],
    temperature: 0.7,
  });

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: requestBody,
  });

  console.log("状态码:", response.status);
  const text = await response.text();
  
  if (response.ok) {
    console.log("✅ 成功！");
    const data = JSON.parse(text);
    console.log("AI回复:", data.choices?.[0]?.message?.content);
    return true;
  } else {
    console.log("❌ 失败");
    console.log("响应:", text.substring(0, 200));
    return false;
  }
}

async function main() {
  console.log("=== 测试Bearer Token认证方式 ===");
  
  // 测试1：UUID格式的ACCESS_KEY
  const test1 = await testBearerAuth(
    process.env.VOLCENGINE_ACCESS_KEY || "",
    "测试1：VOLCENGINE_ACCESS_KEY作为Bearer token"
  );
  
  // 测试2：UUID格式的SECRET_KEY  
  const test2 = await testBearerAuth(
    process.env.VOLCENGINE_SECRET_KEY || "",
    "测试2：VOLCENGINE_SECRET_KEY作为Bearer token"
  );
  
  console.log("\n=== 结果 ===");
  console.log("测试1:", test1 ? "✅" : "❌");
  console.log("测试2:", test2 ? "✅" : "❌");
}

main();
