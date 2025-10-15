// DON'T DELETE THIS COMMENT
// Using Gemini AI blueprint for text generation and image generation
// Note: Using gemini-2.0-flash-preview-image-generation for image generation

import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * 调用 Gemini API 生成文本内容
 * @param prompt 用户提示词
 * @param systemPrompt 系统提示词
 * @returns 生成的文本内容
 */
export async function callGeminiAPI(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      config: systemPrompt ? {
        systemInstruction: systemPrompt,
      } : undefined,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 使用 Gemini 生成图片
 * @param prompt 图片描述提示词
 * @returns 生成的图片 base64 数据
 */
export async function generateImageWithGemini(prompt: string): Promise<string> {
  try {
    console.log("[Gemini Image] Generating image with prompt:", prompt.substring(0, 100) + "...");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image generated");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("Invalid response format");
    }

    for (const part of content.parts) {
      if (part.text) {
        console.log("[Gemini Image] Model response:", part.text);
      } else if (part.inlineData && part.inlineData.data) {
        console.log("[Gemini Image] Image generated successfully");
        // 返回 base64 格式的图片数据
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data in response");
  } catch (error) {
    console.error("[Gemini Image] Error:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
