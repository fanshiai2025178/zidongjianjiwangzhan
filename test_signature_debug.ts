import { Signer } from "@volcengine/openapi";
import crypto from "crypto";

const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID || "";
const secretKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY || "";
const endpointId = process.env.VOLCENGINE_KEYWORD_API_KEY || "";

console.log("=== 签名调试信息 ===\n");
console.log("1. 凭据信息：");
console.log("   Access Key ID:", accessKeyId);
console.log("   Secret Key:", secretKey);
console.log("   Endpoint ID:", endpointId);
console.log("");

const requestBody = JSON.stringify({
  model: endpointId,
  messages: [{ role: "user", content: "测试" }],
});

console.log("2. 请求体：");
console.log("   ", requestBody);
console.log("");

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

console.log("3. 签名前的请求数据：");
console.log("   ", JSON.stringify(requestData, null, 2));
console.log("");

const signer = new Signer(requestData, "ark");
signer.addAuthorization({ accessKeyId, secretKey, sessionToken: "" });

console.log("4. 签名后的Headers：");
console.log("   ", JSON.stringify(requestData.headers, null, 2));
console.log("");

// 计算body hash验证
const bodyHash = crypto.createHash("sha256").update(requestBody).digest("hex");
console.log("5. Body SHA256 Hash:", bodyHash);
console.log("");

// 发起请求
console.log("6. 发起请求到: https://ark.cn-beijing.volces.com/api/v3/chat/completions");

fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
  method: "POST",
  headers: requestData.headers as Record<string, string>,
  body: requestBody,
}).then(async (response) => {
  console.log("\n7. 响应信息：");
  console.log("   状态码:", response.status);
  console.log("   响应Headers:", Object.fromEntries(response.headers.entries()));
  const text = await response.text();
  console.log("   响应Body:", text);
});
