import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { RotateCcw, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DEMO_CASES, injectCase, resetDemo, useCanary } from "@/lib/store";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo injector — six leak scenarios | Canary" },
      {
        name: "description",
        content:
          "Fire any of six seeded scenarios — breach dump, resold list, broker profile, processor leak, scam call, post-breach re-leak — and watch attribution happen live.",
      },
      { property: "og:title", content: "Demo injector — six leak scenarios" },
      {
        property: "og:description",
        content: "Seeded scenarios that drive Canary's attribution engine on stage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { ready, sightings } = useCanary();
  const navigate = useNavigate();

  return (
    <AppShell title="Demo">
      <h1 className="text-[26px] font-semibold leading-tight">Injector</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Simulated sensors. Nothing here touches a real mailbox, phone line or breach feed.
      </p>

      <div className="mt-5 space-y-3">
        {DEMO_CASES.map((c, i) => (
          <button
            key={c.id}
            disabled={!ready}
            onClick={async () => {
              const s = await injectCase(c);
              if (s) {
                toast("Sighting detected", { description: c.blurb });
                void navigate({ to: "/alerts" });
              }
            }}
            className="hairline flex w-full items-start gap-3 rounded-2xl bg-card p-4 text-left disabled:opacity-50"
          >
            <span className="mono-tag mt-0.5 text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <span className="block font-medium">{c.label}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{c.blurb}</span>
            </span>
            <Zap className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          </button>
        ))}
      </div>

      <Button
        variant="secondary"
        className="mt-5 w-full"
        onClick={() => {
          resetDemo();
          toast("Demo reset", { description: "Sightings cleared, epochs back to zero." });
        }}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset demo ({sightings.length} sighting{sightings.length === 1 ? "" : "s"})
      </Button>

      <div className="hairline mt-6 rounded-2xl bg-card p-4 text-sm">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Out of scope</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>· No accounts, no sign-in, no encryption at rest</li>
          <li>· Key derived with SHA-256, not Argon2id</li>
          <li>· Corpus is seeded; phone lines are simulated</li>
          <li>· Deletion requests are generated, never sent</li>
          <li>· Hypothesis priors are hand-set, not calibrated</li>
        </ul>
      </div>
    </AppShell>
  );
}
