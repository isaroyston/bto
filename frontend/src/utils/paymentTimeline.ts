import { POLICY_CONFIG } from "../policies/policyConfig";
import type { FlatType, TimelineItem, TimelinePayment } from "../types";
import { addMonths, addWeeks, formatMonthYear, parseMonth } from "./date";

type PaymentTimelineInput = {
  applicationMonth: string;
  flatType: FlatType;
  signingAmount: number;
  signingCpf: number;
  minCashSigning: number;
  keyAmount: number;
  keyCpf: number;
  optionFee: number;
  surveyFee: number;
  fireInsurance: number;
};

export function buildPaymentTimeline({
  applicationMonth,
  flatType,
  signingAmount,
  signingCpf,
  minCashSigning,
  keyAmount,
  keyCpf,
  optionFee,
  surveyFee,
  fireInsurance,
}: PaymentTimelineInput): TimelineItem[] {
  const start = parseMonth(applicationMonth);
  const ballot = addMonths(start, POLICY_CONFIG.defaultOffsets.ballotAfterMonths);
  const booking = addWeeks(
    ballot,
    POLICY_CONFIG.defaultOffsets.bookingAfterBallotWeeks
  );
  const agreement = addMonths(
    booking,
    POLICY_CONFIG.defaultOffsets.agreementAfterBookingMonths
  );
  const key = addMonths(
    booking,
    POLICY_CONFIG.defaultOffsets.keyAfterBookingMonths
  );

  const applicationPayment: TimelinePayment = {
    label: "Application fee",
    total: POLICY_CONFIG.fees.applicationFee,
    cpfOa: 0,
    cash: POLICY_CONFIG.fees.applicationFee,
    note: "Payable in cash at application.",
  };

  const bookingPayment: TimelinePayment = {
    label: `Option fee (${flatType})`,
    total: optionFee,
    cpfOa: 0,
    cash: optionFee,
    note: "Typically payable in cash at booking.",
  };

  const agreementPayment: TimelinePayment = {
    label: "Downpayment at signing",
    total: signingAmount,
    cpfOa: signingCpf,
    cash: minCashSigning,
    note: "CPF OA usage depends on available OA balance.",
  };

  const keyPayment: TimelinePayment = {
    label: "Downpayment at keys",
    total: keyAmount,
    cpfOa: keyCpf,
    cash: 0,
    note: "CPF OA usage depends on available OA balance.",
  };

  const ancillaryPayment: TimelinePayment = {
    label: "Survey and fire insurance",
    total: surveyFee + fireInsurance,
    cpfOa: 0,
    cash: surveyFee + fireInsurance,
  };

  return [
    {
      label: "Application window",
      date: formatMonthYear(start),
      note: "Submit HFE and BTO application.",
      payment: applicationPayment,
    },
    {
      label: "Ballot result",
      date: formatMonthYear(ballot),
      note: "First ballot outcome.",
    },
    {
      label: "Flat booking",
      date: formatMonthYear(booking),
      note: "Choose a unit and pay the option fee.",
      payment: bookingPayment,
    },
    {
      label: "Agreement for lease",
      date: formatMonthYear(agreement),
      note: "Sign the agreement and make CPF withdrawal.",
      payment: agreementPayment,
    },
    {
      label: "Key collection",
      date: formatMonthYear(key),
      note: "Make final payments and collect keys.",
      payment: keyPayment,
    },
    {
      label: "Post-keys fees",
      date: formatMonthYear(key),
      note: "One-off survey and fire insurance fees.",
      payment: ancillaryPayment,
    },
  ];
}
