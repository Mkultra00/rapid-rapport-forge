import { formatLR, confidenceLabel } from "./attribute";
import { draftDeletionRequest } from "./dsar";
import { freezeAndRotate, hypothesesFor, personaFor } from "./store";
import type { State } from "./store";
import { VENDORS } from "./seed";

export type WrenReply = {
  text: string;
  nav?: "/" | "/vault" | "/alerts" | "/demo";
  dsar?: string;
  tool?: string;
};

function findVendor(input: string) {
  const q = input.toLowerCase().replace(/[^a-z ]/g, "");
  return VENDORS.find(
    (v) =>
      q.includes(v.name.toLowerCase()) ||
      q.includes(v.name.toLowerCase().replace(/\s/g, "")) ||
      q.includes(v.domain.split(".")[0]!),
  );
}

export async function wrenReply(input: string, state: State): Promise<WrenReply> {
  const q = input.toLowerCase();
  const vendor = findVendor(input);
  const latest = state.sightings[0];

  // Elder flow: someone is calling.
  if (/call(ing|ed|er)?|phone|on the phone|rang/.test(q)) {
    const claimed = vendor;
    if (claimed) {
      const claimedPersona = personaFor(claimed.domain);
      // Which persona owns the pooled number they actually dialled?
      const dialled = latest?.channel === "phone" ? latest.observed : claimedPersona?.did;
      const owner = state.personas.find((p) => p.did === dialled);
      if (owner && claimedPersona && owner.vendor.domain !== claimed.domain) {
        return {
          tool: "get_persona",
          text: `The number they called is the one you gave to ${owner.vendor.name}, not to ${claimed.name}. ${claimed.name} would never reach you on that line. Hang up, and call the number on the back of your card.`,
        };
      }
      return {
        tool: "get_persona",
        text: `That line is the one you gave to ${claimed.name}, so the number checks out. Still never read out a code or a password to someone who called you.`,
      };
    }
    return {
      text: "Tell me which company they said they were from, and I'll check whether they called on the right line.",
    };
  }

  if (/freeze|rotate|change|new (alias|address|email)|shut/.test(q)) {
    if (!vendor)
      return { text: "Which company should I freeze? Say the name and I'll rotate that one." };
    const next = await freezeAndRotate(vendor.domain);
    return {
      tool: "freeze_and_rotate",
      nav: "/vault",
      text: next
        ? `Done. ${vendor.name}'s old address is frozen and anything sent to it from now on is logged, not delivered. Your new address for them is ${next.email}.`
        : `I couldn't rotate ${vendor.name}.`,
    };
  }

  if (/delet|dsar|erase|removal|request/.test(q)) {
    if (!vendor)
      return { text: "Which company should I write the deletion request to?" };
    const persona = personaFor(vendor.domain);
    if (!persona) return { text: `I don't have a persona for ${vendor.name}.` };
    const sighting = state.sightings.find((s) => s.vendorDomain === vendor.domain);
    return {
      tool: "draft_deletion_request",
      dsar: draftDeletionRequest(persona, sighting),
      text: `I've drafted a deletion request to ${vendor.name}. Read it over before you send it.`,
    };
  }

  if (/why|explain|how do you know|sure|confiden/.test(q)) {
    if (!latest) return { text: "Nothing has turned up yet, so there's nothing to explain." };
    const hs = hypothesesFor(latest);
    const top = hs[0]!;
    const alt = hs[1]!;
    return {
      tool: "explain_last_result",
      text: `${top.label}, at ${formatLR(top.likelihoodRatio)}. ${top.because[1] ?? top.because[0]} The next best explanation is that ${alt.label.toLowerCase()}, but ${alt.because[alt.because.length - 1]}`,
    };
  }

  if (/exposure|what.*(happen|going on)|alert|status|summary|anything/.test(q)) {
    const open = state.sightings.filter((s) => !s.acknowledged);
    if (!open.length)
      return { tool: "list_exposure", text: "Nothing new. All of your markers are quiet." };
    const s = open[0]!;
    const top = hypothesesFor(s)[0]!;
    return {
      tool: "list_exposure",
      nav: "/alerts",
      text: `${open.length} thing${open.length > 1 ? "s" : ""} to look at. The newest: your ${personaFor(s.vendorDomain)?.vendor.name} marker showed up at ${s.source}. ${confidenceLabel(top.posterior)} that ${top.label.toLowerCase()}.`,
    };
  }

  if (vendor) {
    const p = personaFor(vendor.domain);
    if (p)
      return {
        tool: "get_persona",
        nav: "/vault",
        text: `For ${vendor.name} you use ${p.email}, the username ${p.username}, and the middle initial ${p.cohort.middleInitial}. ${p.frozen ? "That one has been rotated already." : "It's still active."}`,
      };
  }

  if (/vault|personas|list/.test(q)) return { nav: "/vault", text: "Here's your vault." };
  if (/check|look up|search/.test(q))
    return { nav: "/", text: "Paste what you saw into the box and I'll tell you who it came from." };

  return {
    text: "I can check who an address came from, tell you what's turned up lately, freeze a company's address, or write a deletion request. Which one?",
  };
}
