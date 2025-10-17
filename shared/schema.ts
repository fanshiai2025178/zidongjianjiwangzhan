import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 项目表
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  creationMode: text("creation_mode").notNull(), // 'ai-original' | 'commentary' | 'reference'
  currentStep: integer("current_step").notNull().default(1),
  styleSettings: jsonb("style_settings"),
  scriptContent: text("script_content"),
  segments: jsonb("segments"),
  generationMode: text("generation_mode"),
  aspectRatio: text("aspect_ratio").default("16:9"), // '9:16' | '3:4' | '1:1' | '16:9' | '4:3'
  visualBible: jsonb("visual_bible"), // Visual Bible（导演生成的视觉圣经）
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// 风格设置类型
export interface StyleSettings {
  useCharacterReference: boolean;
  characterImageUrl?: string;
  characterAnalysis?: string; // AI识别的人物形象描述
  useStyleReference: boolean;
  styleImageUrl?: string;
  styleAnalysis?: string; // AI识别的风格描述
  usePresetStyle: boolean;
  presetStyleId?: string;
  presetStyleAnalysis?: string; // AI识别的预设风格描述
}

// 分镜片段类型
export interface Segment {
  id: string;
  number: number;
  language: string;
  text: string;
  translation?: string;
  sceneDescription?: string; // 中文描述词
  sceneDescriptionEn?: string; // 英文描述词
  descriptionAspectRatio?: string; // 记录生成描述词时的比例
  keywords?: string; // 中文关键词（给用户看和修改）
  keywordsEn?: string; // 英文关键词（给AI使用）
  optimizedPrompt?: string; // 提示词优化结果
  imageUrl?: string;
  videoUrl?: string;
}

// 预设风格
export interface PresetStyle {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  imageUrl: string;
}

// Visual Bible（视觉圣经）类型
export interface VisualBible {
  overall_theme: string; // 整体主题
  emotional_arc: string; // 情感弧线
  visual_metaphor: string; // 视觉隐喻
  lighting_and_color_plan: string; // 光影与色彩规划
  core_elements_anchor: string; // 核心元素锚点（角色、物体等的具体描述）
}
