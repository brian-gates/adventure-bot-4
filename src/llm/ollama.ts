import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const NarrationSchema = z.object({ text: z.string() });

export async function narrate(prompt: string): Promise<string> {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({ model: "llama3", prompt, stream: false }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  const parsed = NarrationSchema.safeParse(data);
  if (!parsed.success) throw new Error("Invalid LLM output");
  return parsed.data.text;
}

const IntentSchema = z.object({
  intent: z.string(),
  args: z.any().optional(),
});

export async function inferIntent({
  message,
  context,
}: {
  message: string;
  context?: string;
}): Promise<{ intent: string; args?: unknown }> {
  const prompt = `You are an intent classifier for a Discord adventure game. Given the following message, infer the user's intent as a single word (e.g., "attack", "heal", "look", "inventory", etc.), and any arguments. If the intent is "attack", extract the target as args.target. If the target is ambiguous (e.g., "retaliate!", "punch him!"), infer the most likely target from context (such as the last attacker or the current enemy). If no target can be inferred, set args.target to null. Respond ONLY with a single line of valid JSON: { "intent": string, "args"?: any }. Do not include any explanation or extra text.

Message: "${message}"
${context ? `\nContext: ${context}` : ""}
`;
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({ model: "llama3", prompt, stream: false }),
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  const intentObj = JSON.parse(data.response);
  console.log("LLM prompt:", prompt);
  console.log("LLM response:", intentObj);
  const parsed = IntentSchema.safeParse(intentObj);
  if (!parsed.success) throw new Error("Invalid LLM output");
  return parsed.data;
}
