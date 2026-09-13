// Deterministic persona derivation. No registry lookup required.
// Runs entirely in the browser via WebCrypto — no network call.

const B32 = "abcdefghijkmnpqrstuvwxyz23456789"; // no l/o/0/1

async function hmac(keyBytes: Uint8Array, msg: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}

function b32(bytes: Uint8Array, chars: number): string {
  let out = "",
    bits = 0,
    acc = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      out += B32[(acc >> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= chars) break;
  }
  return out;
}

/** DEMO ONLY. Production requires Argon2id. Documented as a known gap. */
export async function deriveMasterKey(passphrase: string): Promise<Uint8Array> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passphrase));
  return new Uint8Array(h);
}

/** User-scoped prefix: lets you recognise your own canary without the registry. */
export async function selfPrefix(K: Uint8Array): Promise<string> {
  return b32(await hmac(K, "self"), 2); // 10 bits
}

export const DEMO_DOMAIN = "fy.cx";

export async function deriveEmail(
  K: Uint8Array,
  vendor: string,
  epoch = 0,
  domain = DEMO_DOMAIN,
): Promise<string> {
  const p = await selfPrefix(K);
  const tag = b32(await hmac(K, `email\0${vendor}\0${epoch}`), 5); // 25 bits
  return `${p}${tag}@${domain}`;
}

export async function deriveUsername(K: Uint8Array, vendor: string, epoch = 0): Promise<string> {
  const tag = b32(await hmac(K, `user\0${vendor}\0${epoch}`), 5);
  return `fy_${tag}`;
}

export type Cohort = { middleInitial: string; addrForm: string; cohortId: number };

/** Coarse cohort channel: quarter + category, ~6 bits. Corroborates, never identifies. */
export async function deriveCohort(
  K: Uint8Array,
  quarter: string,
  category: string,
): Promise<Cohort> {
  const tag = await hmac(K, `cohort\0${quarter}\0${category}`);
  const n = tag[0] & 0x3f;
  const initials = "ABCDEFGHJKLMNPQRSTVWXYZ";
  const addrForms = ["Apt 4", "Apt. 4", "#4", "Unit 4"];
  return {
    middleInitial: initials[n % initials.length],
    addrForm: addrForms[(n >> 4) & 3],
    cohortId: n,
  };
}

/** Pooled phone DID by sensitivity tier — simulated for the demo. */
export async function derivePooledDid(K: Uint8Array, tier: string): Promise<string> {
  const tag = await hmac(K, `did\0${tier}`);
  const n = ((tag[0] << 16) | (tag[1] << 8) | tag[2]) % 10000000;
  const s = String(n).padStart(7, "0");
  return `+1 (628) ${s.slice(0, 3)}-${s.slice(3)}`;
}
