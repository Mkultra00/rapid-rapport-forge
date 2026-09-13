import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Globe, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildChatContext } from "@/lib/chat-context";
import { useCanary } from "@/lib/store";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research — ask Canary about a leak or a vendor" },
      {
        name: "description",
        content:
          "Chat with Canary's research analyst: it explains attribution results in plain language and searches the web for breach news about a company or data broker.",
      },
      { property: "og:title", content: "Research — ask Canary about a leak or a vendor" },
      {
        property: "og:description",
        content: "An AI analyst that explains your results and checks the news on vendors and brokers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchPage,
});

const PROMPTS = [
  "Explain my latest result in plain English",
  "Has MegaShop been in the news for a breach?",
  "Who are the biggest data brokers buying retail customer lists?",
  "What should I do next about PetPalace?",
];

function ResearchPage() {
  const state = useCanary();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: m }) => ({
        body: { messages: m, context: buildChatContext(state) },
      }),
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    void sendMessage({ text: text.trim() });
  }

  return (
    <AppShell title="Research">
      <h1 className="text-[26px] font-semibold leading-tight">Ask the analyst</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It reads your results, gives its own read on what happened, and searches the news on any
        company or broker you name.
      </p>

      <div className="mt-5 space-y-3">
        {messages.length === 0 && (
          <div className="hairline rounded-2xl bg-card p-4 text-sm text-muted-foreground">
            <Sparkles className="mb-2 h-4 w-4 text-primary" />
            Unlike the rest of Canary, this part needs a connection — it reaches out to a model and
            to the web.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                        : "mr-auto max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-3 text-sm leading-relaxed"
                    }
                  >
                    {part.text}
                  </div>
                );
              }
              if (part.type === "reasoning" && part.text?.trim()) {
                return (
                  <p key={i} className="mono-tag px-1 text-[11px] italic text-muted-foreground">
                    {part.text}
                  </p>
                );
              }
              if (part.type === "tool-web_search") {
                const query =
                  part.input && typeof part.input === "object" && "query" in part.input
                    ? String((part.input as { query: unknown }).query)
                    : "";
                return (
                  <p
                    key={i}
                    className="mono-tag flex items-center gap-2 px-1 text-[11px] uppercase tracking-widest text-muted-foreground"
                  >
                    <Globe className="h-3 w-3" />
                    {part.state === "output-available" ? "searched" : "searching"} — {query}
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}

        {status === "submitted" && (
          <p className="mono-tag px-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            thinking…
          </p>
        )}
        {error && (
          <p className="hairline rounded-xl bg-card px-4 py-3 text-sm text-destructive">
            {error.message || "Something went wrong. Try again."}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => submit(p)}
            className="hairline rounded-full px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        className="sticky bottom-24 mt-4 flex items-center gap-2 bg-background py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a result, a company or a broker"
          className="h-12 flex-1"
        />
        <Button type="submit" size="icon" className="h-12 w-12" disabled={busy} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </AppShell>
  );
}
