import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Snowflake } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ResolveText } from "@/components/ResolveText";
import { DsarSheet } from "@/components/DsarSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { draftDeletionRequest } from "@/lib/dsar";
import { freezeAndRotate, useCanary, type Persona } from "@/lib/store";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault — every company gets a different you | Canary" },
      {
        name: "description",
        content:
          "One derived email, username, name form and phone line per company, computed from your key rather than stored in someone's database.",
      },
      { property: "og:title", content: "Vault — every company gets a different you" },
      {
        property: "og:description",
        content: "Per-company identity markers, derived on your device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function PersonaCard({ p, onDsar }: { p: Persona; onDsar: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hairline rounded-2xl bg-card p-4">
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <div className="text-left">
          <p className="font-medium">{p.vendor.name}</p>
          <p className="mono-tag mt-0.5 truncate text-xs text-muted-foreground">{p.email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="secondary" className="text-[10px] uppercase">
            {p.vendor.tier}
          </Badge>
          {p.frozen && (
            <span className="mono-tag flex items-center gap-1 text-[10px] uppercase text-destructive">
              <Snowflake className="h-3 w-3" /> rotated
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-3 text-sm">
          <Row label="Email">
            <ResolveText value={p.email} />
          </Row>
          <Row label="Username">
            <ResolveText value={p.username} />
          </Row>
          <Row label="Name form">
            <ResolveText value={`J. ${p.cohort.middleInitial} Yu · ${p.cohort.addrForm}`} />
          </Row>
          <Row label="Pooled line">
            <ResolveText value={p.did} />
          </Row>
          <Row label="Epoch">
            <span className="mono-tag">{p.epoch}</span>
          </Row>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1" onClick={() => void freezeAndRotate(p.vendor.domain)}>
              Freeze &amp; rotate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => onDsar(draftDeletionRequest(p))}
            >
              Deletion request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-right text-xs">{children}</span>
    </div>
  );
}

function VaultPage() {
  const { personas, ready } = useCanary();
  const [dsar, setDsar] = useState<string | null>(null);

  return (
    <AppShell title="Vault">
      <h1 className="text-[26px] font-semibold leading-tight">Every company gets a different you</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        These are computed from your passphrase, not stored by anyone. Tap one to watch it derive.
      </p>

      <div className="mt-5 space-y-3">
        {!ready && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}
        {personas.map((p) => (
          <PersonaCard key={p.vendor.domain} p={p} onDsar={setDsar} />
        ))}
      </div>

      <DsarSheet text={dsar} onOpenChange={() => setDsar(null)} />
    </AppShell>
  );
}
