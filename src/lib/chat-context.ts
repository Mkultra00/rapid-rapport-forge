import { confidenceLabel, formatLR } from "./attribute";
import { hypothesesFor, type State } from "./store";

/** Compact, human-readable snapshot of the demo state for the research assistant. */
export function buildChatContext(state: State): string {
  const personas = state.personas
    .map(
      (p) =>
        `- ${p.vendor.name} (${p.vendor.domain}, ${p.vendor.category}, tier ${p.vendor.tier}): alias ${p.email}, username ${p.username}${p.frozen ? " [frozen/rotated]" : ""}`,
    )
    .join("\n");

  const sightings = state.sightings.length
    ? state.sightings
        .slice(0, 6)
        .map((s) => {
          const hs = hypothesesFor(s);
          const top = hs[0];
          const alt = hs[1];
          return `- ${new Date(s.detectedAt).toLocaleString()}: marker ${s.observed} (${s.channel}) for ${s.vendorDomain} seen at ${s.source}. ${s.context} Leading explanation: ${top?.label} at ${top ? formatLR(top.likelihoodRatio) : "n/a"} (${top ? confidenceLabel(top.posterior) : ""}). Next best: ${alt?.label}.`;
        })
        .join("\n")
    : "- none yet";

  return `Vendors and markers:\n${personas}\n\nRecent sightings:\n${sightings}`;
}
