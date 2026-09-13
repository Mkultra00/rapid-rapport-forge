import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import canaryMascot from "@/assets/canary-mascot.png";
import { ResultCard } from "@/components/ResultCard";
import { WrenPanel } from "@/components/WrenPanel";
import { UsernameGenerator } from "@/components/UsernameGenerator";
import { DsarSheet } from "@/components/DsarSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { identify, scoreHypotheses, type Match } from "@/lib/attribute";
import { VENDORS } from "@/lib/seed";
import { draftDeletionRequest } from "@/lib/dsar";
import { epochMap, freezeAndRotate, getKey, personaFor, useCanary } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canary — find out who leaked your details" },
      {
        name: "description",
        content:
          "Paste an address, username or number that showed up somewhere it shouldn't have. Canary names the company you gave it to, and how sure it is.",
      },
      { property: "og:title", content: "Canary — find out who leaked your details" },
      {
        property: "og:description",
        content: "Keyed identity markers that attribute a leak to a single company, offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckPage,
});

function CheckPage() {
  const state = useCanary();
  const [q, setQ] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wren, setWren] = useState(false);
  const [dsar, setDsar] = useState<string | null>(null);

  // Prefill from the newest unacknowledged sighting when arriving from Alerts.
  useEffect(() => {
    const pending = sessionStorage.getItem("canary:check");
    if (pending) {
      sessionStorage.removeItem("canary:check");
      setQ(pending);
    }
  }, []);

  async function run(value: string) {
    const K = getKey();
    if (!K) return;
    setBusy(true);
    const m = await identify(K, value, VENDORS, epochMap());
    setMatch(m);
    setSearched(true);
    setBusy(false);
  }

  const sighting = match
    ? state.sightings.find((s) => s.vendorDomain === match.vendor.domain)
    : undefined;
  const hypotheses = match ? scoreHypotheses(match.vendor, sighting?.evidence ?? {}) : [];
  const persona = match ? personaFor(match.vendor.domain) : undefined;

  return (
    <AppShell title="Check">
      <div className="flex flex-col items-center text-center">
        <img
          src={canaryMascot}
          alt="Canary mascot — a canary in a police uniform holding a magnifying glass"
          width={1024}
          height={1024}
          className="h-32 w-32 object-contain drop-shadow-[0_0_24px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]"
        />
        <h1 className="mono-tag mt-2 text-5xl font-bold tracking-[0.15em] text-primary">
          CANARY
        </h1>
        <p className="mt-1 text-sm font-medium italic text-muted-foreground">
          In God we trust, everyone else we watermark.
        </p>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Paste the address, username or number that turned up somewhere it shouldn't have.
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(q);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="k7abc2def@fy.cx"
          className="mono-tag h-14 flex-1 text-base"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="icon" className="h-14 w-14" aria-label="Check">
          <Search className="h-5 w-5" />
        </Button>
      </form>

      {!state.ready && <Skeleton className="mt-6 h-40 w-full rounded-2xl" />}

      {state.ready && !searched && (
        <div className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Try one of yours</p>
          {state.personas.slice(0, 3).map((p) => (
            <button
              key={p.vendor.domain}
              onClick={() => {
                setQ(p.email);
                void run(p.email);
              }}
              className="hairline mono-tag block w-full truncate rounded-xl bg-card px-4 py-3 text-left text-xs text-muted-foreground"
            >
              {p.email}
            </button>
          ))}
        </div>
      )}

      {state.ready && (
        <div className="mt-6">
          <UsernameGenerator />
        </div>
      )}

      {busy && <Skeleton className="mt-6 h-40 w-full rounded-2xl" />}

      {!busy && searched && !match && (
        <div className="hairline mt-6 rounded-2xl bg-card p-5">
          <p className="font-medium">Not one of yours.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This doesn&apos;t match any marker derived from your key, so it was never issued by
            Canary.
          </p>
        </div>
      )}

      {!busy && match && (
        <div className="mt-6">
          <ResultCard
            vendorName={match.vendor.name}
            observed={q}
            channel={match.channel}
            epoch={match.epoch}
            hypotheses={hypotheses}
            sighting={sighting}
            frozen={persona?.frozen}
            onFreeze={() => void freezeAndRotate(match.vendor.domain)}
            onDsar={() => {
              const p = personaFor(match.vendor.domain);
              if (p) setDsar(draftDeletionRequest(p, sighting));
            }}
          />
        </div>
      )}

      <div className="fixed bottom-24 right-[max(1.25rem,calc(50%-215px+1.25rem))] z-30 flex flex-col gap-3">
        <Button
          asChild
          variant="secondary"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Research with AI"
        >
          <Link to="/research">
            <Sparkles className="h-6 w-6" />
          </Link>
        </Button>
        <Button onClick={() => setWren(true)} className="h-14 w-14 rounded-full shadow-lg" aria-label="Ask WREN">
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      <WrenPanel open={wren} onOpenChange={setWren} />
      <DsarSheet text={dsar} onOpenChange={() => setDsar(null)} />
    </AppShell>
  );
}
