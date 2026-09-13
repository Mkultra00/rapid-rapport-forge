import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { webSearch } from "@/lib/websearch.server";

type Body = { messages?: unknown; context?: unknown };

const SYSTEM = `You are CANARY's research analyst. The app issues a unique, cryptographically derived email/username/phone marker to each company a person shares details with, so when a marker turns up somewhere it shouldn't, the leak can be attributed to one company.

Your job:
- Explain attribution results in plain, calm language for a non-technical person. Likelihood ratios like "82:1" mean the evidence is 82 times more consistent with that explanation than with the alternatives; never invent numbers, use the ones given in context.
- Give your own opinion on what the person should do next (freeze and rotate, request deletion, ignore it).
- Use the web_search tool whenever a company, data broker or breach may have been in the news, or the user asks for outside information. Cite sources as markdown links.
- Be honest about uncertainty. Never claim proof. Short paragraphs, no jargon dumps.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const context = typeof body.context === "string" ? body.context : "";

        try {
          const result = streamText({
            model: lovable.responses("openai/gpt-6-astra"),
            system: context ? `${SYSTEM}\n\nCurrent app state:\n${context}` : SYSTEM,
            messages: convertToModelMessages(body.messages as UIMessage[]),
            stopWhen: stepCountIs(50),
            tools: {
              web_search: tool({
                description:
                  "Search the public web for news, breaches, lawsuits or background on a company or data broker.",
                inputSchema: z.object({ query: z.string() }),
                execute: async ({ query }) => ({ query, results: await webSearch(query, 5) }),
              }),
            },
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "auto",
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
            abortSignal: request.signal,
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
            sendReasoning: true,
            onError: (error) => (error instanceof Error ? error.message : "AI request failed"),
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response("Cancelled", { status: 499 });
          }
          throw error;
        }
      },
    },
  },
});
