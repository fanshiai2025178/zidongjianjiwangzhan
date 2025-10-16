const BASE_URL = "http://localhost:5000";

async function testAPI(name: string, url: string, data: any) {
  console.log(`\n✨ Testing ${name}...`);
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ ${name} - SUCCESS`);
    console.log("Response preview:", JSON.stringify(result).substring(0, 200) + "...");
    return result;
  } catch (error) {
    console.error(`❌ ${name} - FAILED:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function runTests() {
  console.log("🚀 Starting Prompt Optimization API tests...\n");
  console.log("Using API Keys:");
  console.log("- VOLCENGINE_OPTIMIZE_API_KEY:", process.env.VOLCENGINE_OPTIMIZE_API_KEY);
  console.log("- VOLCENGINE_ACCESS_KEY:", process.env.VOLCENGINE_ACCESS_KEY?.substring(0, 20) + "...");

  try {
    // Test 1: Single prompt optimization (text-to-video mode)
    await testAPI(
      "Single Prompt Optimization (Text-to-Video)",
      "/api/prompts/optimize",
      {
        description: "A young woman walking on a beach at sunset, wearing a white dress, gentle breeze",
        generationMode: "text-to-video",
        aspectRatio: "16:9"
      }
    );

    // Test 2: Single prompt optimization (text-to-image mode)
    await testAPI(
      "Single Prompt Optimization (Text-to-Image)",
      "/api/prompts/optimize",
      {
        description: "A serene mountain landscape with snow-capped peaks, morning light, dramatic clouds",
        generationMode: "text-to-image-to-video",
        aspectRatio: "9:16"
      }
    );

    // Test 3: Batch prompt optimization
    await testAPI(
      "Batch Prompt Optimization",
      "/api/prompts/batch-optimize",
      {
        segments: [
          { 
            id: 1, 
            sceneDescription: "A girl smiling happily in a garden full of colorful flowers" 
          },
          { 
            id: 2, 
            sceneDescription: "The sun setting over the ocean with orange and purple sky" 
          }
        ],
        generationMode: "text-to-image-to-video",
        aspectRatio: "16:9"
      }
    );

    console.log("\n🎉 All Prompt Optimization API tests completed successfully!");
    console.log("✅ 提示词优化功能已成功集成！");
    console.log("\n📝 功能概览：");
    console.log("   - 单个提示词优化 API: /api/prompts/optimize");
    console.log("   - 批量提示词优化 API: /api/prompts/batch-optimize");
    console.log("   - 专用火山引擎DeepSeek端点");
    console.log("   - Bearer Token认证");
    console.log("   - 文生视频/文生图差异化优化策略");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

runTests();
