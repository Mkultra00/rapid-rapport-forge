import { useRef, useState } from "react";
import { Loader2, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildChatContext } from "@/lib/chat-context";
import { useCanary } from "@/lib/store";

type Props = {
  /** Speak this exact text instead of generating a briefing. */
  text?: string;
  /** Optional focus for a generated briefing. */
  topic?: string;
  label?: string;
  compact?: boolean;
  /** Round icon-only floating button. */
  iconOnly?: boolean;
};

export function VoiceBrief({ text, topic, label = "Voice brief", compact = false, iconOnly = false }: Props) {
  const state = useCanary();
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }

  async function run() {
    if (playing) return stop();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, topic, context: buildChatContext(state) }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `Request failed (${res.status})`));
      const data = (await res.json()) as { text: string; audio: string };
      setTranscript(data.text);
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      setPlaying(true);
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the voice brief");
      setPlaying(false);
    } finally {
      setBusy(false);
    }
  }

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="secondary"
        onClick={() => void run()}
        disabled={busy}
        className="h-14 w-14 rounded-full shadow-lg"
        aria-label={label}
        title={error ?? label}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : playing ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Volume2 className="h-6 w-6" />
        )}
      </Button>
    );
  }

  return (
    <div className={compact ? "" : "space-y-2"}>
      <Button
        type="button"
        variant="secondary"
        size={compact ? "sm" : "default"}
        onClick={() => void run()}
        disabled={busy}
        className="gap-2"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        {busy ? "Preparing…" : playing ? "Stop" : label}
      </Button>

      {!compact && transcript && (
        <p className="hairline rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed text-muted-foreground">
          {transcript}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
