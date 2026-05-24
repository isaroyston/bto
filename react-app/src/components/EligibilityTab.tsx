import { FLAT_MAX, FLAT_MIN } from "../constants";
import { POLICY_CONFIG } from "../policies/policyConfig";
import type {
  FinancingType,
  FlatType,
  SchemeType,
  TimelineItem,
} from "../types";
import { currency } from "../utils/format";

type EligibilityTabProps = {
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  applicationMonth: string;
  signingAmount: number;
  keyAmount: number;
  minCashSigning: number;
  optionFee: number;
  surveyFee: number;
  fireInsurance: number;
  downpaymentNote: string;
  timeline: TimelineItem[];
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onApplicationMonthChange: (value: string) => void;
};

const FLAT_TYPE_OPTIONS: { value: FlatType; label: string }[] = [
  { value: "2-room", label: "2-room" },
  { value: "3-room", label: "3-room" },
  { value: "4-room", label: "4-room" },
  { value: "5-room", label: "5-room" },
  { value: "executive", label: "Executive" },
];

const FINANCING_OPTIONS: { value: FinancingType; label: string }[] = [
  { value: "hdb", label: "HDB Loan" },
  { value: "bank", label: "Bank Loan" },
  { value: "none", label: "No Loan" },
];

const SCHEME_OPTIONS: { value: SchemeType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "staggered", label: "Staggered" },
  { value: "dia", label: "DIA" },
];

export function EligibilityTab({
  flatPrice,
  flatType,
  financing,
  scheme,
  applicationMonth,
  signingAmount,
  keyAmount,
  minCashSigning,
  optionFee,
  surveyFee,
  fireInsurance,
  downpaymentNote,
  timeline,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onApplicationMonthChange,
}: EligibilityTabProps) {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-3xl font-bold text-heritage-navy">
          Eligibility and Downpayment Planning
        </h2>
        <p className="max-w-2xl text-warm-stone">
          Calibrate flat price, financing choice, and payment timing against
          the current policy model.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-warm-stone">
              Scenario Inputs
            </p>
            <h3 className="mt-2 text-xl font-semibold text-heritage-navy">
              Flat Price and Scheme
            </h3>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-warm-stone" htmlFor="flat-price">
              Target flat price
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={FLAT_MIN}
                max={FLAT_MAX}
                step={5000}
                value={flatPrice}
                onChange={(event) => onFlatPriceChange(Number(event.target.value))}
                className="interactive-slider flex-1"
                aria-label="Target flat price"
              />
              <input
                id="flat-price"
                type="number"
                min={FLAT_MIN}
                max={FLAT_MAX}
                step={5000}
                value={flatPrice}
                onChange={(event) => onFlatPriceChange(Number(event.target.value))}
                className="w-32 rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-right text-sm text-heritage-navy shadow-fintech"
              />
            </div>
          </div>
          <div className="grid gap-3">
            <label className="text-sm text-warm-stone" htmlFor="flat-type">
              Flat type
            </label>
            <select
              id="flat-type"
              value={flatType}
              onChange={(event) => onFlatTypeChange(event.target.value as FlatType)}
              className="rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-heritage-navy shadow-fintech"
            >
              {FLAT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="text-sm text-warm-stone" htmlFor="financing-type">
              Financing type
            </label>
            <select
              id="financing-type"
              value={financing}
              onChange={(event) =>
                onFinancingChange(event.target.value as FinancingType)
              }
              className="rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-heritage-navy shadow-fintech"
            >
              {FINANCING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="text-sm text-warm-stone" htmlFor="payment-scheme">
              Payment scheme
            </label>
            <select
              id="payment-scheme"
              value={scheme}
              onChange={(event) => onSchemeChange(event.target.value as SchemeType)}
              className="rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-heritage-navy shadow-fintech"
            >
              {SCHEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="glass-card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-warm-stone">
              Payment Schedule
            </p>
            <h3 className="mt-2 text-xl font-semibold text-heritage-navy">
              Required Downpayment
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-warm-stone">Signing</span>
              <span className="font-semibold text-heritage-navy">
                {currency(signingAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-warm-stone">Key collection</span>
              <span className="font-semibold text-heritage-navy">
                {currency(keyAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-warm-stone">
                Minimum cash at signing
              </span>
              <span className="font-semibold text-heritage-navy">
                {currency(minCashSigning)}
              </span>
            </div>
          </div>
          <div className="rounded-hdb border border-heritage-navy/10 bg-heritage-navy/5 p-3 text-xs text-warm-stone">
            {downpaymentNote}
          </div>
        </div>

        <div className="glass-card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-warm-stone">
              Official Fees
            </p>
            <h3 className="mt-2 text-xl font-semibold text-heritage-navy">
              Immediate Costs
            </h3>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ["Application fee", POLICY_CONFIG.fees.applicationFee],
              [`Option fee (${flatType})`, optionFee],
              [`Survey fee (${flatType})`, surveyFee],
              [`Fire insurance (${flatType})`, fireInsurance],
              ["Registration fee", POLICY_CONFIG.fees.registrationFeeLeaseEscrow],
            ].map(([label, amount]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-warm-stone">{label}</span>
                <span className="font-semibold text-heritage-navy">
                  {currency(Number(amount))}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <span className="text-warm-stone">GST rate</span>
              <span className="font-semibold text-heritage-navy">
                {(POLICY_CONFIG.fees.gstRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="text-xs text-warm-stone">
            Source: {POLICY_CONFIG.sources.processOverview.label}
          </div>
        </div>

        <div className="glass-card space-y-4 p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-warm-stone">
                Timeline Breakdown
              </p>
              <h3 className="mt-2 text-xl font-semibold text-heritage-navy">
                Key milestones from application to keys
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-warm-stone" htmlFor="start-month">
                Start month
              </label>
              <input
                id="start-month"
                type="month"
                value={applicationMonth}
                onChange={(event) => onApplicationMonthChange(event.target.value)}
                className="rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-heritage-navy shadow-fintech"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {timeline.map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-3 rounded-hdb border border-heritage-navy/10 bg-heritage-navy/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-heritage-navy">
                      {item.label}
                    </p>
                    <p className="text-xs text-warm-stone">{item.note}</p>
                  </div>
                  <span className="text-sm font-semibold text-heritage-navy">
                    {item.date}
                  </span>
                </div>
                {item.payment && (
                  <div className="grid gap-1 text-xs text-warm-stone">
                    <div className="flex items-center justify-between gap-4">
                      <span>{item.payment.label}</span>
                      <span className="font-semibold text-heritage-navy">
                        {currency(item.payment.total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>CPF OA</span>
                      <span>{currency(item.payment.cpfOa)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Cash</span>
                      <span>{currency(item.payment.cash)}</span>
                    </div>
                    {item.payment.note && (
                      <div className="text-xs text-warm-stone">
                        {item.payment.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-warm-stone">
            CPF OA usage depends on available OA balance and eligibility. Treat
            the split as an indicative guide.
          </p>
        </div>
      </div>
    </section>
  );
}
