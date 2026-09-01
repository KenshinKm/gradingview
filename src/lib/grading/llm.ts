import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { llmEnv } from "@/lib/env";

export interface ImagePart {
  mediaType: string; // e.g. "image/png"
  base64: string;
  /** Optional caption inserted before the image so the model knows its role/order. */
  label?: string;
}

export interface LlmRequest {
  system: string;
  user: string;
  images?: ImagePart[];
  /** Force the vision-capable model. */
  vision?: boolean;
}

export interface LlmResponse {
  text: string;
  model: string;
}

/**
 * Provider-agnostic LLM call. Provider + model are configured via env
 * (LLM_PROVIDER, LLM_MODEL, LLM_VISION_MODEL). All calls are server-side.
 */
export async function callLlm(req: LlmRequest): Promise<LlmResponse> {
  const model =
    req.vision || (req.images && req.images.length > 0)
      ? llmEnv.visionModel
      : llmEnv.model;

  if (llmEnv.provider === "openai") {
    return callOpenAi(req, model);
  }
  return callAnthropic(req, model);
}

const ANTHROPIC_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

async function callAnthropic(req: LlmRequest, model: string): Promise<LlmResponse> {
  if (!llmEnv.anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: llmEnv.anthropicKey });

  const content: Anthropic.MessageParam["content"] = [
    { type: "text", text: req.user },
  ];
  for (const img of req.images ?? []) {
    if (img.label) content.push({ type: "text", text: img.label });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: (ANTHROPIC_IMAGE_TYPES.has(img.mediaType)
          ? img.mediaType
          : "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: img.base64,
      },
    });
  }

  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    system: req.system,
    messages: [{ role: "user", content }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { text, model };
}

async function callOpenAi(req: LlmRequest, model: string): Promise<LlmResponse> {
  if (!llmEnv.openaiKey) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({
    apiKey: llmEnv.openaiKey,
    baseURL: llmEnv.openaiBaseUrl,
  });

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: req.user },
  ];
  for (const img of req.images ?? []) {
    if (img.label) userContent.push({ type: "text", text: img.label });
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
    });
  }

  const res = await client.chat.completions.create({
    model,
    max_tokens: 8000,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: userContent },
    ],
  });

  const text = (res.choices[0]?.message?.content ?? "").trim();
  return { text, model };
}
