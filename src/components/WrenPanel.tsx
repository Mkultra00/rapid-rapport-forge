import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanary } from "@/lib/store";
import { wrenReply } from "@/lib/wren";
import { DsarSheet } from "./DsarSheet";

type Msg = { role: "wren" | "you"; text: string; tool?: string | undefined };

const SUGGESTIONS = [
  "Someone's calling from NorthBank asking for my details",
  "What's happened lately?",
  "Why do you think it was MegaShop?",
  "Freeze PetPalace",
];

export function WrenPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const state = useCanary();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "wren",
      text: "I'm WREN. Tell me what happened, or tap a suggestion below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [dsar, setDsar] = useState<string | null>(null);
  const [speak, setSpeak] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function send(text: string) {
    if (!text.trim()) return;
    setInput("");
    setMsgs((m) => [...m, { role: "you", text }]);
    const reply = await wrenReply(text, state);
    setMsgs((m) => [...m, { role: "wren", text: reply.text, tool: reply.tool }]);
    if (reply.dsar) setDsar(reply.dsar);
    if (reply.nav) void navigate({ to: reply.nav });
    if (speak && typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(reply.text);
      u.rate = 1.02;
      window.speechSynthesis.speak(u);
    }
  }

  function toggleMic() {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      setMsgs((m) => [
        ...m,
        { role: "wren", text: "This browser has no speech input — type it instead." },
      ]);
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript as string;
      setListening(false);
      void send(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setSpeak(true);
    setListening(true);
    rec.start();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[85vh] flex-col bg-card">
          <SheetHeader className="px-1 text-left">
            <SheetTitle className="flex items-center gap-2">
              WREN
              <span className="mono-tag text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                on-device assistant
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "you"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                    : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2 text-sm"
                }
              >
                {m.tool && (
                  <p className="mono-tag mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {m.tool}()
                  </p>
                )}
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-2 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="hairline rounded-full px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2 pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "secondary"}
              onClick={toggleMic}
              aria-label="Talk to WREN"
              className={listening ? "pulse-ring" : ""}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell WREN what happened"
              className="flex-1"
            />
            <Button type="submit" size="icon" aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Sheet>
      <DsarSheet text={dsar} onOpenChange={() => setDsar(null)} />
    </>
  );
}
