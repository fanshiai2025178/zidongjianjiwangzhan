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
  console.log("🚀 Starting API tests with Bearer Token authentication...\n");
  console.log("Using API Keys:");
  console.log("- VOLCENGINE_ACCESS_KEY:", process.env.VOLCENGINE_ACCESS_KEY?.substring(0, 20) + "...");
  console.log("- VOLCENGINE_DEEPSEEK_API_KEY:", process.env.VOLCENGINE_DEEPSEEK_API_KEY);
  console.log("- VOLCENGINE_KEYWORD_API_KEY:", process.env.VOLCENGINE_KEYWORD_API_KEY);

  try {
    // Test 1: Single description generation
    await testAPI(
      "Single Description Generation",
      "/api/descriptions/generate",
      {
        text: "一个女孩在海边散步",
        language: "Chinese",
        generationMode: "text-to-image-to-video",
        aspectRatio: "16:9"
      }
    );

    // Test 2: Batch description generation
    await testAPI(
      "Batch Description Generation",
      "/api/descriptions/batch-generate",
      {
        segments: [
          { id: 1, text: "女孩微笑着" },
          { id: 2, text: "太阳落山了" }
        ],
        generationMode: "text-to-image-to-video",
        aspectRatio: "16:9"
      }
    );

    // Test 3: Single keyword extraction
    await testAPI(
      "Single Keyword Extraction",
      "/api/keywords/extract",
      {
        description: "A young woman with long black hair walking on a beach at sunset, wearing a white dress, gentle breeze, warm golden light"
      }
    );

    // Test 4: Batch keyword extraction
    await testAPI(
      "Batch Keyword Extraction",
      "/api/keywords/batch-extract",
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
        ]
      }
    );

    console.log("\n🎉 All API tests completed successfully!");
    console.log("✅ Bearer Token authentication is working correctly for all endpoints!");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

runTests();
