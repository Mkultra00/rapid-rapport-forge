import { useSyncExternalStore } from "react";
import {
  deriveCohort,
  deriveEmail,
  derivePooledDid,
  deriveMasterKey,
  deriveUsername,
  type Cohort,
} from "./derive";
import { DEMO_CASES, QUARTER, VENDORS, type DemoCase, type Evidence, type Vendor } from "./seed";
import { scoreHypotheses, type Hypothesis } from "./attribute";

export type Persona = {
  vendor: Vendor;
  email: string;
  username: string;
  cohort: Cohort;
  did: string;
  epoch: number;
  frozen: boolean;
};

export type Sighting = {
  id: string;
  caseId: string;
  observed: string;
  channel: DemoCase["channel"];
  source: string;
  context: string;
  vendorDomain: string;
  evidence: Evidence;
  detectedAt: number;
  acknowledged: boolean;
  hashSelf: string;
  hashPrev: string | null;
};

export type Watermark = {
  username: string;
  epoch: number;
  createdAt: number;
};

export type VendorWatermarks = {
  /** Display name as typed by the user. */
  name: string;
  /** Normalised key used for derivation. */
  slug: string;
  history: Watermark[];
};

export type State = {
  ready: boolean;
  personas: Persona[];
  sightings: Sighting[];
  passphrase: string;
  watermarks: VendorWatermarks[];
};

const PASSPHRASE = "correct horse battery staple";

let state: State = {
  ready: false,
  personas: [],
  sightings: [],
  passphrase: PASSPHRASE,
  watermarks: [],
};
const serverState = state;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useCanary(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

let key: Uint8Array | null = null;
let initStarted = false;

async function buildPersona(K: Uint8Array, vendor: Vendor, epoch: number, frozen: boolean) {
  const [email, username, cohort, did] = await Promise.all([
    deriveEmail(K, vendor.domain, epoch),
    deriveUsername(K, vendor.domain, epoch),
    deriveCohort(K, QUARTER, vendor.category),
    derivePooledDid(K, vendor.tier),
  ]);
  return { vendor, email, username, cohort, did, epoch, frozen } satisfies Persona;
}

export async function initCanary() {
  if (initStarted) return;
  initStarted = true;
  key = await deriveMasterKey(PASSPHRASE);
  const personas = await Promise.all(VENDORS.map((v) => buildPersona(key!, v, 0, false)));
  set({ ready: true, personas });
}

export function getKey() {
  return key;
}

export function epochMap(): Record<string, number> {
  return Object.fromEntries(state.personas.map((p) => [p.vendor.domain, p.epoch]));
}

async function sha(input: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(h).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function injectCase(c: DemoCase): Promise<Sighting | null> {
  const persona = state.personas.find((p) => p.vendor.domain === c.vendorDomain);
  if (!persona) return null;
  const observed =
    c.channel === "email"
      ? persona.email
      : c.channel === "username"
        ? persona.username
        : c.channel === "phone"
          ? persona.did
          : `J. ${persona.cohort.middleInitial} Yu · ${persona.cohort.addrForm}`;
  const prev = state.sightings[0]?.hashSelf ?? null;
  const detectedAt = Date.now();
  const hashSelf = await sha(`${prev ?? ""}|${observed}|${c.source}|${detectedAt}`);
  const sighting: Sighting = {
    id: `${c.id}-${detectedAt}`,
    caseId: c.id,
    observed,
    channel: c.channel,
    source: c.source,
    context: c.context,
    vendorDomain: c.vendorDomain,
    evidence: c.evidence,
    detectedAt,
    acknowledged: false,
    hashSelf,
    hashPrev: prev,
  };
  set({ sightings: [sighting, ...state.sightings] });
  return sighting;
}

export function acknowledge(id: string) {
  set({
    sightings: state.sightings.map((s) => (s.id === id ? { ...s, acknowledged: true } : s)),
  });
}

export async function freezeAndRotate(domain: string): Promise<Persona | null> {
  const K = key;
  const current = state.personas.find((p) => p.vendor.domain === domain);
  if (!K || !current) return null;
  const next = await buildPersona(K, current.vendor, current.epoch + 1, true);
  set({ personas: state.personas.map((p) => (p.vendor.domain === domain ? next : p)) });
  return next;
}

export function resetDemo() {
  set({ sightings: [] });
  if (key) {
    void Promise.all(VENDORS.map((v) => buildPersona(key!, v, 0, false))).then((personas) =>
      set({ personas }),
    );
  }
}

export function hypothesesFor(s: Sighting): Hypothesis[] {
  const persona = state.personas.find((p) => p.vendor.domain === s.vendorDomain);
  return scoreHypotheses(persona?.vendor ?? VENDORS[0]!, s.evidence);
}

export function personaFor(domain: string): Persona | undefined {
  return state.personas.find((p) => p.vendor.domain === domain);
}

export { DEMO_CASES };
