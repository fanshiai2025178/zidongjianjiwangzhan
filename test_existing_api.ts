import { callVolcengineDeepSeek } from "./server/volcengine-api";

async function testExistingAPI() {
  console.log("=== 测试项目现有的火山引擎API实现 ===");
  console.log("ACCESS_KEY:", process.env.VOLCENGINE_ACCESS_KEY?.substring(0, 20) + "...");
  console.log("SECRET_KEY:", process.env.VOLCENGINE_SECRET_KEY?.substring(0, 20) + "...");
  console.log("ENDPOINT_ID:", process.env.VOLCENGINE_ENDPOINT_ID);
  console.log("");
  
  try {
    const result = await callVolcengineDeepSeek("请回复'测试成功'", "你是一个测试助手");
    console.log("✅ 测试成功！");
    console.log("AI回复:", result);
  } catch (error) {
    console.log("❌ 测试失败");
    console.error("错误:", error);
  }
}

testExistingAPI();
