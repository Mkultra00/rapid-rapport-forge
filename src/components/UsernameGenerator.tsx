import { useState } from "react";
import { Check, Copy, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateWatermark, useCanary, vendorSlug } from "@/lib/store";

export function UsernameGenerator() {
  const state = useCanary();
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const slug = vendorSlug(name);
  const record = state.watermarks.find((w) => w.slug === slug);
  const current = record?.history[0];

  async function generate() {
    if (!slug) return;
    setCopied(null);
    await generateWatermark(name);
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(value);
  }

  return (
    <div className="hairline rounded-2xl bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Watermark username generator
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void generate();
          }}
          placeholder="Name the vendor, e.g. Acme Gym"
          className="hairline mono-tag h-11 min-w-0 flex-1 rounded-xl bg-background px-3 text-sm"
          aria-label="Vendor name"
        />
        <Button onClick={() => void generate()} disabled={!slug} className="h-11 shrink-0">
          <Dices className="mr-2 h-4 w-4" /> Generate
        </Button>
      </div>

      {current && (
        <div className="mt-3 flex items-center gap-2">
          <code className="mono-tag flex-1 truncate rounded-xl bg-background px-3 py-2.5 text-base text-primary">
            {current.username}
          </code>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => void copy(current.username)}
            aria-label="Copy username"
          >
            {copied === current.username ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {record && record.history.length > 1 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Past usernames for {record.name}
          </p>
          <ul className="mt-2 space-y-1">
            {record.history.slice(1).map((h) => (
              <li
                key={h.username}
                className="mono-tag flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span className="truncate line-through">{h.username}</span>
                <span className="shrink-0">
                  v{h.epoch + 1} · {new Date(h.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Unique to you and this vendor — if it ever leaks, Canary traces it back.
      </p>
    </div>
  );
}
