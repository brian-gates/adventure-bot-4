import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LLM_MODEL = "llama3";

export async function callLLM({
  prompt,
  stream = false,
  max_tokens,
}: {
  prompt: string;
  stream?: boolean;
  max_tokens?: number;
}) {
  const start = Date.now();
  const body: Record<string, unknown> = { model: LLM_MODEL, prompt, stream };
  if (max_tokens) body.max_tokens = max_tokens;

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    }).then((res) => res.text());

    const duration = Date.now() - start;
    console.log(`LLM (${LLM_MODEL}) call took ${duration}ms: ${response}`);
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("LLM call timed out.");
      return '{"response": "The narration was lost in the heat of battle..."}';
    }
    throw error;
  }
}

export async function narrate({ prompt }: { prompt: string }) {
  const raw = await callLLM({ prompt });
  const LLMResponse = z.object({ response: z.string() });
  try {
    const parsed = JSON.parse(raw);
    console.log("[LLM] Full response:", parsed.response);
    if (LLMResponse.safeParse(parsed).success) {
      return LLMResponse.parse(parsed).response;
    }
    return raw;
  } catch {
    return raw;
  }
}

export function inferIntent({
  message,
  context,
}: {
  message: string;
  context?: string;
}) {
  const prompt = [
    "You are an intent classifier for a Discord adventure game.",
    "Given the following message, respond ONLY with the user's intent as a single word (e.g., 'attack', 'heal', 'look', 'inventory', etc.).",
    "Do not include any explanation, formatting, or JSON.",
    `\nMessage: \"${message}\"`,
    context ? `\nContext: ${context}` : "",
  ].join("\n");
  return callLLM({ prompt });
}
