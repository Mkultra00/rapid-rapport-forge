import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BellOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ResultCard } from "@/components/ResultCard";
import { DsarSheet } from "@/components/DsarSheet";
import { confidenceLabel, formatLR } from "@/lib/attribute";
import { draftDeletionRequest } from "@/lib/dsar";
import {
  acknowledge,
  freezeAndRotate,
  hypothesesFor,
  personaFor,
  useCanary,
  type Sighting,
} from "@/lib/store";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — every sighting, with the reasoning | Canary" },
      {
        name: "description",
        content:
          "A timestamped, hash-chained log of everywhere your markers turned up, each with a ranked explanation of how it got there.",
      },
      { property: "og:title", content: "Alerts — every sighting, with the reasoning" },
      {
        property: "og:description",
        content: "Hash-chained sightings with ranked, plain-language attribution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { sightings } = useCanary();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [dsar, setDsar] = useState<string | null>(null);

  return (
    <AppShell title="Alerts">
      <h1 className="text-[26px] font-semibold leading-tight">Sightings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Each entry is hash-chained to the one before it, so the log can&apos;t be quietly edited.
      </p>

      {sightings.length === 0 && (
        <div className="hairline mt-6 flex flex-col items-center gap-2 rounded-2xl bg-card px-5 py-10 text-center">
          <BellOff className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">All quiet</p>
          <button
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => void navigate({ to: "/demo" })}
          >
            Open the Demo tab to inject a sighting
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {sightings.map((s) => (
          <AlertRow
            key={s.id}
            s={s}
            open={openId === s.id}
            onToggle={() => {
              acknowledge(s.id);
              setOpenId(openId === s.id ? null : s.id);
            }}
            onDsar={setDsar}
          />
        ))}
      </div>

      <DsarSheet text={dsar} onOpenChange={() => setDsar(null)} />
    </AppShell>
  );
}

function AlertRow({
  s,
  open,
  onToggle,
  onDsar,
}: {
  s: Sighting;
  open: boolean;
  onToggle: () => void;
  onDsar: (t: string) => void;
}) {
  const persona = personaFor(s.vendorDomain);
  const hs = hypothesesFor(s);
  const top = hs[0]!;

  if (open && persona) {
    return (
      <div>
        <button
          className="mb-2 text-xs uppercase tracking-widest text-muted-foreground"
          onClick={onToggle}
        >
          ← collapse
        </button>
        <ResultCard
          vendorName={persona.vendor.name}
          observed={s.observed}
          channel={s.channel}
          epoch={persona.epoch}
          hypotheses={hs}
          sighting={s}
          frozen={persona.frozen}
          onFreeze={() => void freezeAndRotate(s.vendorDomain)}
          onDsar={() => onDsar(draftDeletionRequest(persona, s))}
        />
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`hairline block w-full rounded-2xl bg-card p-4 text-left ${
        s.acknowledged ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{persona?.vendor.name ?? s.vendorDomain}</p>
          <p className="mono-tag mt-0.5 truncate text-xs text-muted-foreground">{s.observed}</p>
        </div>
        {!s.acknowledged && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{s.source}</p>
      <p className="mt-2 text-sm">
        {confidenceLabel(top.posterior)} · {top.label.toLowerCase()} ·{" "}
        <span className="mono-tag text-primary">{formatLR(top.likelihoodRatio)}</span>
      </p>
    </button>
  );
}
