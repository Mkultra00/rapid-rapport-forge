import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confidenceLabel, formatLR, type Hypothesis } from "@/lib/attribute";
import type { Sighting } from "@/lib/store";
import { ResolveText } from "./ResolveText";

export function ResultCard({
  vendorName,
  observed,
  channel,
  epoch,
  hypotheses,
  sighting,
  onFreeze,
  onDsar,
  frozen,
}: {
  vendorName: string;
  observed: string;
  channel: string;
  epoch: number;
  hypotheses: Hypothesis[];
  sighting?: Sighting | undefined;
  onFreeze: () => void;
  onDsar: () => void;
  frozen?: boolean | undefined;
}) {
  const top = hypotheses[0]!;

  return (
    <section className="hairline overflow-hidden rounded-2xl bg-card">
      <div className="border-b border-border/70 bg-surface-2/60 px-5 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          You gave this to
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{vendorName}</h2>
        <p className="mono-tag mt-2 break-all text-xs text-muted-foreground">{observed}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="mono-tag text-[10px] uppercase">
            {channel}
          </Badge>
          <Badge variant="secondary" className="mono-tag text-[10px] uppercase">
            epoch {epoch}
          </Badge>
          {frozen && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] uppercase">
              frozen
            </Badge>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-muted-foreground">{confidenceLabel(top.posterior)}</p>
        <p className="mt-1 text-lg font-medium">
          {top.label} —{" "}
          <ResolveText value={formatLR(top.likelihoodRatio)} className="text-primary" />
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This sighting is about {formatLR(top.likelihoodRatio).split(":")[0]} times more likely if
          that happened than if it didn&apos;t.
        </p>

        {sighting && (
          <div className="mt-4 rounded-xl bg-surface-2/60 p-3 text-sm">
            <p className="text-muted-foreground">{sighting.source}</p>
            <p className="mt-1">{sighting.context}</p>
            <p className="mono-tag mt-2 text-[10px] text-muted-foreground">
              record {sighting.hashSelf}
              {sighting.hashPrev ? ` ← ${sighting.hashPrev}` : " · chain root"}
            </p>
          </div>
        )}

        <Accordion type="single" collapsible className="mt-3">
          {hypotheses.map((h) => (
            <AccordionItem key={h.id} value={h.id} className="border-border/60">
              <AccordionTrigger className="py-3 text-left text-sm hover:no-underline">
                <span className="flex w-full items-center justify-between gap-3 pr-2">
                  <span>{h.label}</span>
                  <span className="mono-tag shrink-0 text-xs text-muted-foreground">
                    {Math.round(h.posterior * 100)}%
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {h.because.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">·</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={onFreeze}>
            Freeze &amp; rotate
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onDsar}>
            Deletion request
          </Button>
        </div>
      </div>
    </section>
  );
}
