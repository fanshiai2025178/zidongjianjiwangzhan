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
  useStyleReference: boolean;
  styleImageUrl?: string;
  usePresetStyle: boolean;
  presetStyleId?: string;
}

// 分镜片段类型
export interface Segment {
  id: string;
  number: number;
  language: string;
  text: string;
  translation?: string;
  sceneDescription?: string;
  descriptionAspectRatio?: string; // 记录生成描述词时的比例
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
