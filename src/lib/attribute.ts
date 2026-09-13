import { deriveEmail, deriveUsername } from "./derive";
import type { Evidence, Vendor } from "./seed";

export type Match = {
  vendor: Vendor;
  channel: "email" | "username";
  epoch: number;
};

export async function identify(
  K: Uint8Array,
  observed: string,
  vendors: Vendor[],
  epochOf: Record<string, number> = {},
): Promise<Match | null> {
  const needle = observed.trim().toLowerCase();
  if (!needle) return null;
  for (const v of vendors) {
    const max = (epochOf[v.domain] ?? 0) + 1;
    for (let epoch = 0; epoch <= max; epoch++) {
      if ((await deriveEmail(K, v.domain, epoch)).toLowerCase() === needle)
        return { vendor: v, channel: "email", epoch };
      if ((await deriveUsername(K, v.domain, epoch)).toLowerCase() === needle)
        return { vendor: v, channel: "username", epoch };
    }
  }
  return null;
}

export type HypothesisId = "H1" | "H2" | "H3" | "H4" | "H5";

export type Hypothesis = {
  id: HypothesisId;
  label: string;
  likelihoodRatio: number;
  posterior: number;
  because: string[];
};

type Def = {
  id: HypothesisId;
  label: string;
  prior: (v: Vendor) => number;
  score: (v: Vendor, e: Evidence) => { factor: number; because: string[] };
};

const DEFS: Def[] = [
  {
    id: "H1",
    label: "The company was compromised",
    prior: (v) => v.breachPrior,
    score: (v, e) => {
      let f = 1;
      const because: string[] = [`${v.name} sits in a sector with a ${pct(v.breachPrior)} base rate of disclosed breaches.`];
      if (e.withPassword) {
        f *= 6;
        because.push("The alias appears next to a password hash — that is a database, not a mailing list.");
      }
      if (e.multipleAliases) {
        f *= 3;
        because.push("More than one of your aliases for this company surfaced in the same corpus.");
      }
      if (e.vendorSpecificData) {
        f *= 2.5;
        because.push("The record includes an order reference only this company held.");
      }
      if (e.marketingBlast) {
        f *= 0.3;
        because.push("Promotional mail is weak evidence of a compromise.");
      }
      if (e.processorMix) {
        f *= 0.4;
        because.push("The file mixes customers of several companies, which points away from this one.");
      }
      if (e.postBreachIssuance) {
        f *= 2;
        because.push("A fresh compromise would explain an alias issued after the last disclosure.");
      }
      return { factor: f, because };
    },
  },
  {
    id: "H2",
    label: "The company sold or shared your data",
    prior: (v) => (v.sharesData ? 0.3 : 0.12),
    score: (v, e) => {
      let f = 1;
      const because: string[] = [
        v.sharesData
          ? `${v.name}'s privacy policy permits onward sharing.`
          : `${v.name} does not advertise onward sharing.`,
      ];
      if (e.marketingBlast) {
        f *= 5;
        because.push("The contact is bulk marketing from a sender with no relationship to the company.");
      }
      if (e.senderUnrelated) {
        f *= 2.5;
        because.push("The sender is a third party you never dealt with.");
      }
      if (e.brokerAggregated) {
        f *= 3;
        because.push("The alias surfaced in a data broker profile, which is how lawful resale looks.");
      }
      if (e.withPassword) {
        f *= 0.15;
        because.push("Nobody sells password hashes on a marketing list.");
      }
      return { factor: f, because };
    },
  },
  {
    id: "H3",
    label: "A processor they use was compromised",
    prior: () => 0.15,
    score: (_v, e) => {
      let f = 1;
      const because: string[] = ["Most companies hand your record to vendors you never see."];
      if (e.processorMix) {
        f *= 8;
        because.push("The same file contains customers of unrelated companies — a shared supplier signature.");
      }
      if (e.multipleAliases) {
        f *= 0.6;
        because.push("Several aliases from one company points back at that company.");
      }
      if (e.brokerAggregated) f *= 0.8;
      return { factor: f, because };
    },
  },
  {
    id: "H4",
    label: "You used this alias somewhere else",
    prior: () => 0.06,
    score: (_v, e) => {
      let f = 1;
      const because: string[] = ["Canary issued this marker to exactly one company."];
      if (e.withPassword) f *= 0.8;
      if (e.postBreachIssuance) f *= 0.5;
      return { factor: f, because };
    },
  },
  {
    id: "H5",
    label: "Coincidence or a scraped guess",
    prior: () => 0.02,
    score: (_v, e) => {
      let f = 1;
      const because: string[] = [
        "The marker carries 25 keyed bits. Guessing it by chance is about a 1 in 33 million event.",
      ];
      if (e.cohortAgrees) {
        f *= 0.2;
        because.push("The name cohort tag matches too, which chance would not produce.");
      }
      return { factor: f, because };
    },
  },
];

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function scoreHypotheses(vendor: Vendor, evidence: Evidence): Hypothesis[] {
  const raw = DEFS.map((d) => {
    const { factor, because } = d.score(vendor, evidence);
    return { id: d.id, label: d.label, weight: d.prior(vendor) * factor, because };
  });
  const total = raw.reduce((s, r) => s + r.weight, 0) || 1;
  return raw
    .map((r) => {
      const posterior = r.weight / total;
      const odds = posterior / Math.max(1 - posterior, 1e-6);
      return {
        id: r.id,
        label: r.label,
        posterior,
        likelihoodRatio: odds,
        because: r.because,
      };
    })
    .sort((a, b) => b.posterior - a.posterior);
}

export function formatLR(lr: number): string {
  if (lr >= 10) return `${Math.round(lr)}:1`;
  if (lr >= 1) return `${lr.toFixed(1)}:1`;
  return `1:${Math.round(1 / Math.max(lr, 1e-6))}`;
}

export function confidenceLabel(p: number): string {
  if (p >= 0.7) return "High confidence";
  if (p >= 0.45) return "Moderate confidence";
  return "Weak signal";
}
