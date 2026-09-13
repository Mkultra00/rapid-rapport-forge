import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { webSearch } from "@/lib/websearch.server";

type Body = { context?: unknown; text?: unknown; topic?: unknown };

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

const SYSTEM = `You are CANARY's voice analyst. CANARY gives every company a unique watermarked email/username, so when a marker shows up somewhere it shouldn't, the leak can be attributed to one company.

Write a spoken briefing, 120-180 words, for a non-technical listener:
- Open with the headline: what was detected, and which company is the leading explanation.
- Explain the likelihood ratio in plain words (e.g. "82 to 1" means the evidence is 82 times more consistent with that company than with the alternatives). Only use numbers given to you.
- Mention anything relevant you found in the news, naming the outlet.
- Close with one clear recommendation.
Plain sentences only. No markdown, no bullet points, no headings, no URLs — this text is read aloud.`;

async function speak(text: string, apiKey: string) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs failed [${res.status}]: ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

export const Route = createFileRoute("/api/voice-brief")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const elevenKey = process.env["ELEVENLABS_API_KEY"];
        if (!elevenKey) return new Response("ElevenLabs is not connected", { status: 500 });

        try {
          // Speak a supplied answer verbatim.
          if (typeof body.text === "string" && body.text.trim()) {
            const clean = body.text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>]/g, "");
            const text = clean.slice(0, 3000);
            return Response.json({ text, audio: await speak(text, elevenKey) });
          }

          const aiKey = process.env["LOVABLE_API_KEY"];
          if (!aiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const context = typeof body.context === "string" ? body.context : "";
          const topic = typeof body.topic === "string" ? body.topic.trim() : "";

          const hits = await webSearch(
            topic || "data broker breach news this week",
            4,
          ).catch(() => []);
          const newsBlock = hits.length
            ? hits.map((h) => `- ${h.title} (${h.snippet})`).join("\n")
            : "- nothing notable found";

          const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
          const lovable = createOpenAI({
            baseURL: "https://ai.gateway.lovable.dev/v1",
            apiKey: aiKey,
            headers: { "Lovable-API-Key": aiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
            fetch: runIdFetch.fetch,
          });

          const { text } = await generateText({
            model: lovable.responses("openai/gpt-6-astra"),
            system: SYSTEM,
            prompt: `Current app state:\n${context || "no results yet"}\n\nRecent web/news results (Tavily):\n${newsBlock}\n\n${topic ? `Focus the briefing on: ${topic}` : "Brief me on where things stand."}`,
            providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
            abortSignal: request.signal,
          });

          const spoken = text.trim().slice(0, 3000);
          return Response.json({ text: spoken, audio: await speak(spoken, elevenKey) });
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const message = error instanceof Error ? error.message : "Voice brief failed";
          console.error(message);
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
