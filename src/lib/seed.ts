export type Category = "finance" | "retail" | "health" | "civic" | "social";
export type Tier = "high" | "medium" | "low";

export type Vendor = {
  domain: string;
  name: string;
  category: Category;
  tier: Tier;
  /** Sector breach base rate, 0..1 */
  breachPrior: number;
  /** Disclosed breach date, if any (ISO) */
  breachDate?: string;
  /** Known to sell/share data */
  sharesData?: boolean;
  issuedAt: string;
};

export const VENDORS: Vendor[] = [
  {
    domain: "megashop.com",
    name: "MegaShop",
    category: "retail",
    tier: "low",
    breachPrior: 0.34,
    sharesData: true,
    issuedAt: "2024-02-11",
  },
  {
    domain: "acme-insurance.com",
    name: "Acme Insurance",
    category: "finance",
    tier: "high",
    breachPrior: 0.22,
    breachDate: "2025-04-02",
    issuedAt: "2025-07-19",
  },
  {
    domain: "petpalace.com",
    name: "PetPalace",
    category: "retail",
    tier: "low",
    breachPrior: 0.18,
    sharesData: true,
    issuedAt: "2024-09-03",
  },
  {
    domain: "northbank.com",
    name: "NorthBank",
    category: "finance",
    tier: "high",
    breachPrior: 0.06,
    issuedAt: "2023-05-27",
  },
  {
    domain: "cityutility.gov",
    name: "City Utility",
    category: "civic",
    tier: "medium",
    breachPrior: 0.11,
    issuedAt: "2024-01-14",
  },
  {
    domain: "glowfit.app",
    name: "GlowFit",
    category: "health",
    tier: "medium",
    breachPrior: 0.29,
    sharesData: true,
    issuedAt: "2025-01-08",
  },
  {
    domain: "bookburrow.com",
    name: "BookBurrow",
    category: "retail",
    tier: "low",
    breachPrior: 0.15,
    issuedAt: "2024-06-30",
  },
  {
    domain: "mediclinic.health",
    name: "MediClinic",
    category: "health",
    tier: "high",
    breachPrior: 0.24,
    issuedAt: "2025-03-22",
  },
];

export const VENDOR_BY_DOMAIN = Object.fromEntries(VENDORS.map((v) => [v.domain, v]));

export const QUARTER = "2025Q3";

/** The demo injector. Six cases, in stage order. */
export type DemoCase = {
  id: string;
  label: string;
  blurb: string;
  vendorDomain: string;
  channel: "email" | "username" | "phone" | "name";
  source: string;
  context: string;
  evidence: Evidence;
};

export type Evidence = {
  withPassword?: boolean;
  senderUnrelated?: boolean;
  multipleAliases?: boolean;
  postBreachIssuance?: boolean;
  brokerAggregated?: boolean;
  marketingBlast?: boolean;
  processorMix?: boolean;
  cohortAgrees?: boolean;
  vendorSpecificData?: boolean;
};

export const DEMO_CASES: DemoCase[] = [
  {
    id: "megashop-dump",
    label: "Inject MegaShop breach dump",
    blurb: "Alias appears in a credential dump next to a password hash.",
    vendorDomain: "megashop.com",
    channel: "email",
    source: "Breach corpus · combolist_2026_03",
    context: "Alias listed with a bcrypt hash and a MegaShop order reference.",
    evidence: {
      withPassword: true,
      multipleAliases: true,
      vendorSpecificData: true,
      cohortAgrees: true,
    },
  },
  {
    id: "petpalace-blast",
    label: "Inject PetPalace marketing blast",
    blurb: "Unrelated sender mails an alias only PetPalace ever had.",
    vendorDomain: "petpalace.com",
    channel: "email",
    source: "Inbound mail · deals@paw-savers-network.net",
    context: "Bulk promotional mail from a sender with no relationship to PetPalace.",
    evidence: { senderUnrelated: true, marketingBlast: true },
  },
  {
    id: "acme-broker",
    label: "Inject Acme broker profile",
    blurb: "People-search profile carries the alias and the matching cohort name.",
    vendorDomain: "acme-insurance.com",
    channel: "email",
    source: "Data broker · findpeoplefast.io",
    context: "Profile lists the alias, the cohort middle initial and the cohort address form.",
    evidence: { brokerAggregated: true, cohortAgrees: true },
  },
  {
    id: "cityutility-processor",
    label: "Inject downstream processor leak",
    blurb: "Alias sits in a dump mixed with other utilities' customers.",
    vendorDomain: "cityutility.gov",
    channel: "username",
    source: "Breach corpus · billing_vendor_export",
    context: "Export contains customers of four unrelated utilities in one file.",
    evidence: { processorMix: true, multipleAliases: false },
  },
  {
    id: "northbank-call",
    label: "Inject NorthBank scam call",
    blurb: "Caller claims to be the bank, on the wrong pooled number.",
    vendorDomain: "petpalace.com",
    channel: "phone",
    source: "Inbound call · +1 (415) 555-0188",
    context: 'Caller says "NorthBank fraud department" — but dialled the PetPalace pooled DID.',
    evidence: { senderUnrelated: true },
  },
  {
    id: "acme-releak",
    label: "Inject Acme post-breach re-leak",
    blurb: "An alias issued AFTER Acme's disclosed breach turns up in a new corpus.",
    vendorDomain: "acme-insurance.com",
    channel: "email",
    source: "Breach corpus · aggregate_2026_07",
    context:
      "This alias was issued 2025-07-19, after Acme's 2025-04-02 disclosure. It cannot have come from the breach they told you about.",
    evidence: {
      postBreachIssuance: true,
      withPassword: true,
      multipleAliases: true,
      cohortAgrees: true,
    },
  },
];
