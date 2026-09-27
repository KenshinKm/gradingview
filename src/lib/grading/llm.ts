import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { llmEnv } from "@/lib/env";

export interface ImagePart {
  /** e.g. "image/png". "application/pdf" is sent to the model as a document. */
  mediaType: string;
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
  /** How hard the model thinks. Omit for the model's default. */
  effort?: "low" | "medium" | "high";
  /** "off" skips the thinking phase entirely (fastest, least careful). */
  thinking?: "off";
  /** Called with the full text so far as the answer streams in (Anthropic only). */
  onText?: (textSoFar: string) => void;
}

export interface LlmResponse {
  text: string;
  model: string;
  /** Token usage reported by the provider, when available. */
  usage?: { input_tokens: number; output_tokens: number };
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
  // Fail fast instead of hanging: the grading job has its own hard stop.
  const client = new Anthropic({ apiKey: llmEnv.anthropicKey, timeout: 240_000, maxRetries: 1 });

  const content: Anthropic.MessageParam["content"] = [
    { type: "text", text: req.user },
  ];
  for (const img of req.images ?? []) {
    if (img.label) content.push({ type: "text", text: img.label });
    if (img.mediaType === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: img.base64 },
      });
      continue;
    }
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

  const params = {
    model,
    // Thinking tokens count toward this. 8000 was cut off on long Math papers.
    max_tokens: 16000,
    ...(req.effort ? { output_config: { effort: req.effort } } : {}),
    ...(req.thinking === "off" ? { thinking: { type: "disabled" as const } } : {}),
    system: req.system,
    messages: [{ role: "user" as const, content }],
  };

  let res: Anthropic.Message;
  if (req.onText) {
    // Stream so the student can watch results appear while we're still writing them.
    const onText = req.onText;
    const stream = client.messages.stream(params);
    stream.on("text", (_delta, snapshot) => {
      try {
        onText(snapshot);
      } catch {
        // a display problem must never break grading
      }
    });
    res = await stream.finalMessage();
  } else {
    res = await client.messages.create(params);
  }

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    text,
    model,
    usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
  };
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
    // The OpenAI path can't read PDFs directly.
    if (img.mediaType === "application/pdf") continue;
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
  return {
    text,
    model,
    usage: res.usage
      ? { input_tokens: res.usage.prompt_tokens, output_tokens: res.usage.completion_tokens }
      : undefined,
  };
}
