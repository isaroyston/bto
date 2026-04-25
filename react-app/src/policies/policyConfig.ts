export interface PolicySource {
  label: string;
  url: string;
}

export interface CpfAgeDefaults {
  band: string;
  employeeRate: number;
  employerRate: number;
  oaAllocationRate: number;
  oaUsableRate: number;
}

export interface EhgFamiliesBand {
  minIncome: number;
  maxIncome: number;
  grantAmount: number;
  label: string;
}

export interface EhgFamiliesPolicyMeta {
  scope: "families";
  title: string;
  sourceDocument: string;
  sourceReference: string;
  effectiveDate: string;
  lastVerified: string;
  incomeMeasure: string;
  householdTypeRule: string;
  firstTimerRule: string;
  maxIncomeInclusive: number;
}

interface ContributionBand {
  minAgeExclusive: number;
  maxAgeInclusive: number;
  employeeRate: number;
  employerRate: number;
  band: string;
}

interface AllocationBand {
  minAgeExclusive: number;
  maxAgeInclusive: number;
  oaAllocationRate: number;
  saOrRaAllocationRate: number;
  maAllocationRate: number;
  band: string;
}

const CPF_CONTRIBUTION_BANDS_2026: ContributionBand[] = [
  {
    minAgeExclusive: -1,
    maxAgeInclusive: 55,
    employeeRate: 0.2,
    employerRate: 0.17,
    band: "55 and below",
  },
  {
    minAgeExclusive: 55,
    maxAgeInclusive: 60,
    employeeRate: 0.18,
    employerRate: 0.16,
    band: "Above 55 to 60",
  },
  {
    minAgeExclusive: 60,
    maxAgeInclusive: 65,
    employeeRate: 0.125,
    employerRate: 0.125,
    band: "Above 60 to 65",
  },
  {
    minAgeExclusive: 65,
    maxAgeInclusive: 70,
    employeeRate: 0.075,
    employerRate: 0.09,
    band: "Above 65 to 70",
  },
  {
    minAgeExclusive: 70,
    maxAgeInclusive: Number.POSITIVE_INFINITY,
    employeeRate: 0.05,
    employerRate: 0.075,
    band: "Above 70",
  },
];

const CPF_ALLOCATION_BANDS_2026: AllocationBand[] = [
  {
    minAgeExclusive: -1,
    maxAgeInclusive: 35,
    oaAllocationRate: 0.6217,
    saOrRaAllocationRate: 0.1621,
    maAllocationRate: 0.2162,
    band: "35 and below",
  },
  {
    minAgeExclusive: 35,
    maxAgeInclusive: 45,
    oaAllocationRate: 0.5677,
    saOrRaAllocationRate: 0.1891,
    maAllocationRate: 0.2432,
    band: "Above 35 to 45",
  },
  {
    minAgeExclusive: 45,
    maxAgeInclusive: 50,
    oaAllocationRate: 0.5136,
    saOrRaAllocationRate: 0.2162,
    maAllocationRate: 0.2702,
    band: "Above 45 to 50",
  },
  {
    minAgeExclusive: 50,
    maxAgeInclusive: 55,
    oaAllocationRate: 0.4055,
    saOrRaAllocationRate: 0.3108,
    maAllocationRate: 0.2837,
    band: "Above 50 to 55",
  },
  {
    minAgeExclusive: 55,
    maxAgeInclusive: 60,
    oaAllocationRate: 0.353,
    saOrRaAllocationRate: 0.3382,
    maAllocationRate: 0.3088,
    band: "Above 55 to 60",
  },
  {
    minAgeExclusive: 60,
    maxAgeInclusive: 65,
    oaAllocationRate: 0.14,
    saOrRaAllocationRate: 0.44,
    maAllocationRate: 0.42,
    band: "Above 60 to 65",
  },
  {
    minAgeExclusive: 65,
    maxAgeInclusive: 70,
    oaAllocationRate: 0.0607,
    saOrRaAllocationRate: 0.303,
    maAllocationRate: 0.6363,
    band: "Above 65 to 70",
  },
  {
    minAgeExclusive: 70,
    maxAgeInclusive: Number.POSITIVE_INFINITY,
    oaAllocationRate: 0.08,
    saOrRaAllocationRate: 0.08,
    maAllocationRate: 0.84,
    band: "Above 70",
  },
];

export const EHG_FAMILIES_POLICY_META: EhgFamiliesPolicyMeta = {
  scope: "families",
  title: "Enhanced CPF Housing Grant for first-timer family households",
  sourceDocument: "EHG amount Couples and Families Aug 2024.pdf",
  sourceReference: "Local PDF, page 1",
  effectiveDate: "2024-08",
  lastVerified: "2026-04-24",
  incomeMeasure: "Average monthly household income",
  householdTypeRule: "Families only in this planner",
  firstTimerRule: "First-timer households",
  maxIncomeInclusive: 9000,
};

export const EHG_FAMILIES_BANDS_2024: EhgFamiliesBand[] = [
  { minIncome: 0, maxIncome: 1500, grantAmount: 120000, label: "Not more than $1,500" },
  { minIncome: 1501, maxIncome: 2000, grantAmount: 110000, label: "$1,501 to $2,000" },
  { minIncome: 2001, maxIncome: 2500, grantAmount: 105000, label: "$2,001 to $2,500" },
  { minIncome: 2501, maxIncome: 3000, grantAmount: 95000, label: "$2,501 to $3,000" },
  { minIncome: 3001, maxIncome: 3500, grantAmount: 90000, label: "$3,001 to $3,500" },
  { minIncome: 3501, maxIncome: 4000, grantAmount: 80000, label: "$3,501 to $4,000" },
  { minIncome: 4001, maxIncome: 4500, grantAmount: 70000, label: "$4,001 to $4,500" },
  { minIncome: 4501, maxIncome: 5000, grantAmount: 65000, label: "$4,501 to $5,000" },
  { minIncome: 5001, maxIncome: 5500, grantAmount: 55000, label: "$5,001 to $5,500" },
  { minIncome: 5501, maxIncome: 6000, grantAmount: 50000, label: "$5,501 to $6,000" },
  { minIncome: 6001, maxIncome: 6500, grantAmount: 40000, label: "$6,001 to $6,500" },
  { minIncome: 6501, maxIncome: 7000, grantAmount: 30000, label: "$6,501 to $7,000" },
  { minIncome: 7001, maxIncome: 7500, grantAmount: 25000, label: "$7,001 to $7,500" },
  { minIncome: 7501, maxIncome: 8000, grantAmount: 20000, label: "$7,501 to $8,000" },
  { minIncome: 8001, maxIncome: 8500, grantAmount: 10000, label: "$8,001 to $8,500" },
  { minIncome: 8501, maxIncome: 9000, grantAmount: 5000, label: "$8,501 to $9,000" },
];

export const POLICY_CONFIG = {
  country: "Singapore",
  lastVerified: "2026-04-24",
  updateCadenceDays: 30,
  reviewProcess: "Manual monthly review of HDB, IRAS, and CPF sources",
  fees: {
    applicationFee: 10,
    gstRate: 0.09,
    optionFeeByFlatType: {
      "2-room": 500,
      "3-room": 1000,
      "4-room": 2000,
      "5-room": 2000,
      executive: 2000,
    },
    surveyFeeByFlatType: {
      "2-room": 163.5,
      "3-room": 231.6,
      "4-room": 299.75,
      "5-room": 354.25,
      executive: 408.75,
    },
    fireInsuranceByFlatType: {
      "2-room": 1.99,
      "3-room": 3.27,
      "4-room": 4.59,
      "5-room": 5.43,
      executive: 6.68,
    },
    registrationFeeLeaseEscrow: 38.3,
    registrationFeeMortgageEscrow: 38.3,
  },
  downpaymentRules: {
    hdb: {
      normal: {
        signing: 0.1,
        key: 0.15,
        minCashSigning: 0,
        note: "HDB loan normal: 10% at signing, 15% at key collection.",
      },
      staggered: {
        signing: 0.05,
        key: 0.2,
        minCashSigning: 0,
        note: "Staggered scheme: 5% at signing, 20% at key collection.",
      },
      dia: {
        signing: 0.025,
        key: 0.225,
        minCashSigning: 0,
        note: "DIA pathway: 2.5% at signing, 22.5% at key collection.",
      },
    },
    bank: {
      normal: {
        signing: 0.2,
        key: 0.05,
        minCashSigning: 0.05,
        note: "Bank loan normal: 20% at signing (minimum 5% cash), 5% at key collection.",
      },
      staggered: {
        signing: 0.1,
        key: 0.15,
        minCashSigning: 0.05,
        note: "Bank loan staggered: 10% at signing (minimum 5% cash), 15% at key collection.",
      },
      dia: {
        signing: 0.025,
        key: 0.225,
        minCashSigning: 0.025,
        note: "Bank loan DIA: 2.5% cash at signing, 22.5% at key collection.",
      },
    },
    none: {
      normal: {
        signing: 0.2,
        key: 0.25,
        minCashSigning: 0.1,
        note: "No loan normal: 20% at signing (minimum 10% cash), 25% at key collection.",
      },
      staggered: {
        signing: 0.1,
        key: 0.35,
        minCashSigning: 0.1,
        note: "No loan staggered: 10% cash at signing, 35% at key collection.",
      },
      dia: {
        signing: 0.025,
        key: 0.425,
        minCashSigning: 0.025,
        note: "No loan DIA: 2.5% cash at signing, 42.5% at key collection.",
      },
    },
  },
  defaultOffsets: {
    ballotAfterMonths: 2,
    bookingAfterBallotWeeks: 4,
    agreementAfterBookingMonths: 9,
    keyAfterBookingMonths: 42,
  },
  ehgFamilies: {
    meta: EHG_FAMILIES_POLICY_META,
    bands: EHG_FAMILIES_BANDS_2024,
  },
  sources: {
    processOverview: {
      label: "HDB Overview of New Flat Buying Process",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/overview",
    },
    applicationFee: {
      label: "HDB Application for a New Flat",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/application",
    },
    bookingOptionFee: {
      label: "HDB Booking of Flat",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/booking-of-flat",
    },
    agreementLease: {
      label: "HDB Sign Agreement for Lease",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/sign-agreement-for-lease",
    },
    keyCollection: {
      label: "HDB Key Collection",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/key-collection",
    },
    bsd: {
      label: "IRAS Stamp Duty Rates",
      url: "https://www.iras.gov.sg/quick-links/tax-rates/stamp-duty",
    },
    hps: {
      label: "CPF Home Protection Scheme",
      url: "https://www.cpf.gov.sg/member/home-ownership/protecting-against-losing-your-home",
    },
    fireInsurance: {
      label: "HDB Fire Insurance",
      url: "https://www.hdb.gov.sg/managing-my-home/home-ownership/fire-insurance",
    },
    cpfContributionRates: {
      label: "CPF Contribution Rates (from 1 Jan 2026)",
      url: "https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay",
    },
    cpfAllocationRates: {
      label: "CPF Allocation Rates (from 1 Jan 2026 PDF)",
      url: "https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf",
    },
    cpfAllocationFaq: {
      label: "CPF FAQ - allocation rates for 2026",
      url: "http://cpf.gov.sg/sacallocation",
    },
    ehgFamiliesPdf: {
      label: "Local PDF - EHG amount Couples and Families Aug 2024",
      url: "local://EHG amount Couples and Families Aug 2024.pdf",
    },
  },
} as const;

function pickContributionBand(ageYears: number): ContributionBand {
  return (
    CPF_CONTRIBUTION_BANDS_2026.find(
      (band) => ageYears > band.minAgeExclusive && ageYears <= band.maxAgeInclusive,
    ) || CPF_CONTRIBUTION_BANDS_2026[CPF_CONTRIBUTION_BANDS_2026.length - 1]
  );
}

function pickAllocationBand(ageYears: number): AllocationBand {
  return (
    CPF_ALLOCATION_BANDS_2026.find(
      (band) => ageYears > band.minAgeExclusive && ageYears <= band.maxAgeInclusive,
    ) || CPF_ALLOCATION_BANDS_2026[CPF_ALLOCATION_BANDS_2026.length - 1]
  );
}

export function getCpfDefaultsForAge(ageYears: number): CpfAgeDefaults {
  const contributionBand = pickContributionBand(ageYears);
  const allocationBand = pickAllocationBand(ageYears);

  return {
    band: `${contributionBand.band} | ${allocationBand.band}`,
    employeeRate: contributionBand.employeeRate,
    employerRate: contributionBand.employerRate,
    oaAllocationRate: allocationBand.oaAllocationRate,
    oaUsableRate: 1,
  };
}

export function lookupEhgFamiliesGrant(averageMonthlyIncome: number): EhgFamiliesBand | null {
  const roundedIncome = Math.round(Math.max(0, averageMonthlyIncome));

  return (
    EHG_FAMILIES_BANDS_2024.find(
      (band) => roundedIncome >= band.minIncome && roundedIncome <= band.maxIncome,
    ) || null
  );
}

export function getPolicyReviewMeta(lastVerified: string, cadenceDays: number): {
  nextReviewDate: Date;
  daysToReview: number;
  isDue: boolean;
} {
  const verified = new Date(lastVerified + "T00:00:00");
  const now = new Date();
  const nextReviewDate = new Date(verified.getTime());
  nextReviewDate.setDate(nextReviewDate.getDate() + cadenceDays);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysToReview = Math.floor((nextReviewDate.getTime() - now.getTime()) / msPerDay);

  return {
    nextReviewDate,
    daysToReview,
    isDue: daysToReview < 0,
  };
}
