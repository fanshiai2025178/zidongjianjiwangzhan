import { Signer } from "@volcengine/openapi";

async function testWithAlternateKeys() {
  // 尝试使用UUID格式的密钥
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY;
  const secretKey = process.env.VOLCENGINE_SECRET_KEY;
  const endpointId = process.env.VOLCENGINE_KEYWORD_API_KEY;

  console.log("=== 测试UUID格式的密钥 ===");
  console.log("Access Key:", accessKeyId);
  console.log("Secret Key:", secretKey);
  console.log("Endpoint ID:", endpointId);
  
  if (!accessKeyId || !secretKey || !endpointId) {
    console.error("缺少环境变量");
    return;
  }

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
  console.log("响应:", await response.text());
}

testWithAlternateKeys();
