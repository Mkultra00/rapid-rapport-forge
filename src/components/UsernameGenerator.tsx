import { useState } from "react";
import { Check, Copy, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deriveUsername } from "@/lib/derive";
import { VENDORS } from "@/lib/seed";
import { getKey } from "@/lib/store";

export function UsernameGenerator() {
  const [vendor, setVendor] = useState(VENDORS[0]!.domain);
  const [epoch, setEpoch] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate(nextEpoch = epoch) {
    const K = getKey();
    if (!K) return;
    setUsername(await deriveUsername(K, vendor, nextEpoch));
    setCopied(false);
  }

  async function copy() {
    if (!username) return;
    await navigator.clipboard.writeText(username);
    setCopied(true);
  }

  return (
    <div className="hairline rounded-2xl bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Watermark username generator
      </p>
      <div className="mt-3 flex gap-2">
        <select
          value={vendor}
          onChange={(e) => {
            setVendor(e.target.value);
            setEpoch(0);
            setUsername(null);
          }}
          className="hairline mono-tag h-11 flex-1 rounded-xl bg-background px-3 text-sm"
          aria-label="Vendor"
        >
          {VENDORS.map((v) => (
            <option key={v.domain} value={v.domain}>
              {v.name}
            </option>
          ))}
        </select>
        <Button onClick={() => void generate()} className="h-11">
          <Dices className="mr-2 h-4 w-4" /> Generate
        </Button>
      </div>
      {username && (
        <div className="mt-3 flex items-center gap-2">
          <code className="mono-tag flex-1 truncate rounded-xl bg-background px-3 py-2.5 text-base text-primary">
            {username}
          </code>
          <Button variant="secondary" size="icon" onClick={() => void copy()} aria-label="Copy username">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const e = epoch + 1;
              setEpoch(e);
              void generate(e);
            }}
          >
            Rotate
          </Button>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Unique to you and this vendor — if it ever leaks, Canary traces it back.
      </p>
    </div>
  );
}
