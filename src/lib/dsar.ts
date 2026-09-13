import type { Persona } from "./store";
import type { Sighting } from "./store";

export function draftDeletionRequest(persona: Persona, sighting?: Sighting | undefined): string {
  const today = new Date().toISOString().slice(0, 10);
  return `To: privacy@${persona.vendor.domain}
Subject: Data subject request — erasure and disclosure of recipients
Date: ${today}

To the Data Protection Officer,

I am exercising my right to erasure and my right to know the recipients of my
personal data. The identifiers below were issued to ${persona.vendor.name} and to
no other party.

  Email     ${persona.email}
  Username  ${persona.username}
  Name form J. ${persona.cohort.middleInitial} Yu, ${persona.cohort.addrForm}
  Phone     ${persona.did}

${
  sighting
    ? `On ${new Date(sighting.detectedAt).toISOString().slice(0, 10)} the identifier
${sighting.observed} was observed at: ${sighting.source}.
Context: ${sighting.context}
Tamper-evident record hash: ${sighting.hashSelf}

These identifiers are unique to your organisation, so this observation indicates
that my data left your control.`
    : `I have no outstanding incident to report; this is a routine erasure request.`
}

I request that you:

  1. Erase all personal data you hold relating to the identifiers above.
  2. Disclose every recipient to whom that data has been transferred.
  3. Confirm in writing within the statutory period.

Regards,
J. Yu
`;
}
