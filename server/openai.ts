interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface OpenAIImageResponse {
  data: {
    url: string;
  }[];
}

export async function callOpenAI(
  userPrompt: string, 
  systemPrompt: string = "You are a helpful assistant."
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  console.log("[OpenAI] Calling API with prompt:", userPrompt.substring(0, 100) + "...");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[OpenAI] API error:", errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data: OpenAIResponse = await response.json();
    const result = data.choices[0]?.message?.content || "";
    
    console.log("[OpenAI] Response received:", result.substring(0, 100) + "...");
    
    return result;
  } catch (error) {
    console.error("[OpenAI] Error:", error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateImageWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  console.log("[OpenAI Image] Generating image with prompt:", prompt);

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[OpenAI Image] API error:", errorData);
      throw new Error(`OpenAI Image API error: ${JSON.stringify(errorData)}`);
    }

    const data: OpenAIImageResponse = await response.json();
    const imageUrl = data.data[0]?.url;
    
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    console.log("[OpenAI Image] Image generated successfully:", imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error("[OpenAI Image] Error:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
