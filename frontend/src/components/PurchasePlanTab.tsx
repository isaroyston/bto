import { useMemo, useState, useEffect, useId, type ChangeEvent } from "react";
import {
  BANK_LOAN_TENURE_MAX,
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  HDB_LOAN_TENURE_MAX,
  INCOME_MAX,
  INCOME_MIN,
  LOAN_INTEREST_RATE_MAX,
  LOAN_INTEREST_RATE_MIN,
  LOAN_TENURE_MIN,
} from "../constants";
import { POLICY_CONFIG } from "../policies/policyConfig";
import type { BtoProject } from "../policies/policyConfig";
import type { FinancingType, FlatType, SchemeType, TimelineItem } from "../types";
import { formatDateInputDisplay } from "../utils/date";
import { currency } from "../utils/format";
import {
  Card,
  Icon,
  MetricRow,
  PageHeader,
  Pill,
} from "./DashboardUi";

type PurchasePlanTabProps = {
  selectedProject: BtoProject | null;
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  totalAffordability: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  signingAmount: number;
  keyAmount: number;
  minCashSigning: number;
  signingCpf: number;
  keyCpf: number;
  optionFee: number;
  surveyFee: number;
  fireInsurance: number;
  downpaymentNote: string;
  timeline: TimelineItem[];
  completedMilestones: string[];
  confirmedMilestoneDates: Record<string, string>;
  planStorageStatus: string;
  planStorageError: string | null;
  onIncomeChange: (value: number) => void;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onLoanTenureChange: (value: number) => void;
  onLoanInterestRateChange: (value: number) => void;
  onSavePlan: () => void;
  onToggleMilestoneComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
};

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

export function PurchasePlanTab({
  selectedProject,
  combinedIncome,
  loanAmount,
  ehgGrant,
  totalAffordability,
  flatPrice,
  flatType,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
  signingAmount,
  keyAmount,
  minCashSigning,
  signingCpf,
  keyCpf,
  optionFee,
  surveyFee,
  fireInsurance,
  downpaymentNote,
  timeline,
  completedMilestones,
  confirmedMilestoneDates,
  planStorageStatus,
  planStorageError,
  onIncomeChange,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onLoanTenureChange,
  onLoanInterestRateChange,
  onSavePlan,
  onToggleMilestoneComplete,
  onMilestoneDateChange,
}: PurchasePlanTabProps) {
  const immediateCostsTotal =
    POLICY_CONFIG.fees.applicationFee +
    optionFee +
    surveyFee +
    fireInsurance +
    POLICY_CONFIG.fees.registrationFeeLeaseEscrow;
  const downpaymentTotal = signingAmount + keyAmount;
  const estimatedTotalPrice = flatPrice;
  const balanceAfterUpfront = Math.max(flatPrice - downpaymentTotal - ehgGrant, 0);
  const loanPrincipalNeeded = financing === "none" ? 0 : balanceAfterUpfront;
  const monthlyPayment = calculateMonthlyPayment(
    loanPrincipalNeeded,
    loanInterestRate,
    loanTenureYears
  );
  const cpfTotal = signingCpf + keyCpf;
  const cashTotal = minCashSigning + immediateCostsTotal;
  const fundingTotal = Math.max(loanPrincipalNeeded + cpfTotal + cashTotal + ehgGrant, 1);
  const hdbLoanShare = Math.min(100, Math.round((loanPrincipalNeeded / fundingTotal) * 100));
  const cpfShare = Math.min(100, Math.round((cpfTotal / fundingTotal) * 100));
  const cashShare = Math.min(100, Math.round((cashTotal / fundingTotal) * 100));
  const grantShare = Math.max(0, 100 - hdbLoanShare - cpfShare - cashShare);
  const [showAffordTip, setShowAffordTip] = useState(false);
  const affordTipId = useId();
  const [paymentOverrides, setPaymentOverrides] = useState<Record<string, { total: number; cpf: number; cash: number }>>({});

  const effectiveTimeline = useMemo(() => {
    return timeline.map((item) => {
      if (!item.payment) return item;
      const override = paymentOverrides[item.label];
      if (!override) return item;
      return {
        ...item,
        payment: {
          ...item.payment,
          total: override.total,
          cpfOa: override.cpf,
          cash: override.cash,
        },
      };
    });
  }, [timeline, paymentOverrides]);

  const handleTogglePaymentFunding = (label: string, type: 'cpf' | 'cash') => {
    const item = effectiveTimeline.find((t) => t.label === label);
    if (!item?.payment) return;
    const { total, cpfOa, cash } = item.payment;
    // Only allow toggling for milestones that have both funding sources (or are downpayments)
    const isDownpayment = total >= 10000;
    if (!isDownpayment) return;

    setPaymentOverrides((prev) => {
      const current = prev[label] ?? { total, cpf: cpfOa, cash };
      if (type === 'cpf') {
        // Toggle CPF: if CPF > 0, move all to cash; if CPF is 0, move all back to CPF
        const newCpf = current.cpf > 0 ? 0 : current.total;
        const newCash = current.total - newCpf;
        return { ...prev, [label]: { ...current, cpf: newCpf, cash: newCash } };
      } else {
        // Toggle Cash: if Cash > 0, move all to CPF; if Cash is 0, move all back to Cash
        const newCash = current.cash > 0 ? 0 : current.total;
        const newCpf = current.total - newCash;
        return { ...prev, [label]: { ...current, cpf: newCpf, cash: newCash } };
      }
    });
  };

  const handlePaymentTotalChange = (label: string, newTotal: number) => {
    const item = effectiveTimeline.find((t) => t.label === label);
    if (!item?.payment) return;
    const { cpfOa, cash } = item.payment;
    const currentTotal = cpfOa + cash;
    if (currentTotal === 0) return;
    // Maintain the same ratio
    const cpfRatio = cpfOa / currentTotal;
    const cashRatio = cash / currentTotal;
    setPaymentOverrides((prev) => {
      return {
        ...prev,
        [label]: {
          total: newTotal,
          cpf: Math.round(newTotal * cpfRatio),
          cash: Math.round(newTotal * cashRatio),
        },
      };
    });
  };

  return (
    <section className="dashboard-page">
      <PageHeader
        title="Plan"
        subtitle="Build and adjust your financial plan for a confident home journey."
        action={
          <div className="plan-actions">
            <button type="button" className="btn-primary" onClick={onSavePlan}>
              Save Plan
            </button>
            <span className={planStorageError ? "form-error" : ""}>
              <Icon name="calendar" />
              {planStorageError ? planStorageError : planStorageStatus}
            </span>
          </div>
        }
      />

      <div className="plan-layout">
        <div className="plan-main">
          {selectedProject && (
            <Card className="plan-section-card plan-project-card">
              <div className="plan-project-header">
                <div>
                  <h3>{selectedProject.name}</h3>
                  <div className="plan-project-meta">
                    <span className="plan-project-tag">{selectedProject.location}</span>
                    {selectedProject.btoType && (
                      <span className={`plan-project-badge plan-project-badge-${selectedProject.btoType.toLowerCase()}`}>
                        {selectedProject.btoType.charAt(0).toUpperCase() + selectedProject.btoType.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
                {selectedProject.sourceUrl && (
                  <a
                    href={selectedProject.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="plan-project-link"
                  >
                    View Details <Icon name="external" />
                  </a>
                )}
              </div>
              <div className="plan-project-kpis">
                <span className="plan-project-kpi">
                  <Icon name="home" />
                  <strong>
                    {selectedProject.flatVariants.find((v) => v.type === flatType)
                      ? currency(selectedProject.flatVariants.find((v) => v.type === flatType)!.basePrice)
                      : "No price"}
                  </strong>
                  <span className="plan-project-kpi-sublabel">est.</span>
                  <span>{flatType}</span>
                </span>
                <span className="plan-project-kpi-divider" />
                <span className="plan-project-kpi">
                  <Icon name="calendar" />
                  <strong>{selectedProject.expectedTop ?? "—"}</strong>
                  <span>TOP</span>
                </span>
                <span className="plan-project-kpi-divider" />
                <span className="plan-project-kpi">
                  <Icon name="metro" />
                  <strong>
                    {selectedProject.nearestMrtDistanceMeters
                      ? `${(selectedProject.nearestMrtDistanceMeters / 1000).toFixed(1)} km`
                      : "—"}
                  </strong>
                  <span>{selectedProject.nearestMrt ?? "MRT"}</span>
                </span>
                <span className="plan-project-kpi-divider" />
                <span className="plan-project-kpi">
                  <Icon name="building" />
                  <strong>{selectedProject.totalUnits?.toLocaleString("en-SG") ?? "—"}</strong>
                  <span>Units</span>
                </span>
              </div>
              <p className="plan-project-footer">
                <Icon name="info" />
                {selectedProject.flatVariants.length > 0
                  ? `Available: ${selectedProject.flatVariants.map((v) => v.type).join(", ")}`
                  : "Flat types not listed"}
              </p>
            </Card>
          )}

          <Card className="plan-section-card">
            <PlanStepHeader
              step={1}
              title="Assumptions"
              description="These inputs help us customise your plan and estimates."
            />
            <div className="assumption-grid primary-assumption-grid">
              <MoneyInput
                label="Monthly Household Income"
                value={combinedIncome}
                min={INCOME_MIN}
                max={INCOME_MAX}
                onChange={onIncomeChange}
              />
              <SelectField
                label="Flat"
                value={flatType}
                onChange={(value) => onFlatTypeChange(value as FlatType)}
                options={FLAT_TYPE_OPTIONS}
                className="segmented-field-flat"
              />
              <SegmentedField
                label="Financing"
                value={financing}
                onChange={(value) => onFinancingChange(value as FinancingType)}
                options={FINANCING_OPTIONS}
                className="segmented-field-financing"
              />
              <SegmentedField
                label="Payment"
                value={scheme}
                onChange={(value) => onSchemeChange(value as SchemeType)}
                options={SCHEME_OPTIONS}
                className="segmented-field-payment"
              />
            </div>
            <details className="assumption-more">
              <summary>Show more assumptions</summary>
              <div className="assumption-grid assumption-grid-small">
                <NumberInput
                  label="Loan tenure"
                  value={loanTenureYears}
                  min={LOAN_TENURE_MIN}
                  max={getLoanTenureMax(financing)}
                  suffix="years"
                  onChange={onLoanTenureChange}
                />
                <NumberInput
                  label="Interest rate"
                  value={loanInterestRate}
                  min={LOAN_INTEREST_RATE_MIN}
                  max={LOAN_INTEREST_RATE_MAX}
                  step={0.05}
                  suffix="% p.a."
                  onChange={onLoanInterestRateChange}
                />
                <MetricRow
                  icon="building"
                  label="Project"
                  value={selectedProject?.name ?? "No project selected"}
                  detail={selectedProject?.location}
                />
              </div>
            </details>
            <p className="policy-note">
              {downpaymentNote} CPF OA usage is applied automatically where eligible.
            </p>
          </Card>

          <Card className="plan-section-card">
            <PlanStepHeader
              step={2}
              title="Target Flat Price"
              description="Set your own target price. BTO prices shown elsewhere are estimates based on past launches."
            />
            <div className="target-price-grid">
              <div>
                <MoneyInput
                  label="Target Flat Price (your estimate)"
                  value={flatPrice}
                  min={FLAT_MIN}
                  max={FLAT_MAX}
                  onChange={onFlatPriceChange}
                />
                <p className={`inline-help ${selectedProject && flatPrice > totalAffordability ? "inline-help-warn" : ""}`}>
                  {selectedProject ? <Icon name="check" /> : <Icon name="building" />}
                  {selectedProject
                    ? flatPrice <= totalAffordability
                      ? "Target price is within your estimated affordability"
                      : "Target price exceeds your estimated affordability"
                    : "Choose a BTO project to compare against a launch price range"}
                </p>
              </div>
              <div className="affordability-callout">
                <div>
                  <p>
                    Based on your inputs, your estimated total affordability is
                    <span
                      className="bto-breakdown-info"
                      onMouseEnter={() => setShowAffordTip(true)}
                      onMouseLeave={() => setShowAffordTip(false)}
                      onFocus={() => setShowAffordTip(true)}
                      onBlur={() => setShowAffordTip(false)}
                      aria-describedby={affordTipId}
                      tabIndex={0}
                    >
                      <Icon name="info" />
                      {showAffordTip && (
                        <span id={affordTipId} className="bto-tooltip" role="tooltip">
                          Total affordability = (Loan + Grant) / (1 - Downpayment). Assumes downpayment is covered by CPF/cash savings.
                        </span>
                      )}
                    </span>
                  </p>
                  <strong>{currency(totalAffordability)}</strong>
                  <span className="affordability-note">Loan + grant: {currency(loanAmount + ehgGrant)}</span>
                  {selectedProject && (
                    (selectedProject.flatVariants.find((v) => v.type === flatType)?.basePrice ?? 0) > totalAffordability
                  ) && (
                    <span className="affordability-warning">
                      <Icon name="alert" />
                      Selected project exceeds your affordability
                    </span>
                  )}
                </div>
                <div className="affordability-illustration" aria-hidden="true">
                  <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Left building */}
                    <rect x="12" y="48" width="42" height="62" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <rect x="18" y="56" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="34" y="56" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="18" y="72" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="34" y="72" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Main house */}
                    <rect x="58" y="28" width="80" height="82" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Roof */}
                    <path d="M55 28 L98 4 L141 28 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
                    {/* Top windows */}
                    <rect x="68" y="38" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="92" y="38" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <rect x="116" y="38" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Bottom left window */}
                    <rect x="68" y="62" width="14" height="14" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Door/Garage */}
                    <rect x="90" y="58" width="28" height="52" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="104" y1="58" x2="104" y2="110" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="90" y1="72" x2="118" y2="72" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="90" y1="86" x2="118" y2="86" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="90" y1="100" x2="118" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                    {/* Bushes */}
                    <circle cx="20" cy="112" r="8" fill="#bbf7d0" />
                    <circle cx="40" cy="115" r="10" fill="#86efac" />
                    <circle cx="70" cy="113" r="7" fill="#bbf7d0" />
                    <circle cx="135" cy="114" r="9" fill="#bbf7d0" />
                  </svg>
                </div>
              </div>
            </div>
          </Card>

          <Card className="plan-section-card">
            <PlanStepHeader
              step={3}
              title="Milestones & Payments"
              description="Review the key milestones, estimated amounts and select your expected dates."
            />
            <div className="milestone-table-wrap">
              <table className="milestone-table">
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Your Expected Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveTimeline.map((item, index) => (
                    <MilestoneRow
                      key={item.label}
                      item={item}
                      index={index}
                      confirmedDate={confirmedMilestoneDates[item.label]}
                      isComplete={completedMilestones.includes(item.label)}
                      onToggleComplete={onToggleMilestoneComplete}
                      onMilestoneDateChange={onMilestoneDateChange}
                      onTogglePaymentFunding={handleTogglePaymentFunding}
                      onPaymentTotalChange={handlePaymentTotalChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="milestone-footer">
              <span>Dates are estimates only. Click any amount to edit it to your actual figure.</span>
            </div>
          </Card>
        </div>

        <aside className="plan-side">
          <Card className="summary-card">
            <div className="summary-head">
              <h2>Plan Summary</h2>
              <Pill tone="green">On Track</Pill>
            </div>
            <div className="summary-price">
              <span>Target Flat Price</span>
              <strong>{currency(flatPrice)}</strong>
            </div>
            <SummaryLine label="Estimated Total Price" value={currency(estimatedTotalPrice)} />
            <SummaryLine
              label="Estimated Monthly Payment"
              value={currency(monthlyPayment)}
              tooltip="Monthly Payment = Loan Principal × [Monthly Rate × (1 + Monthly Rate)^Months] / [(1 + Monthly Rate)^Months − 1]"
            />
            <FundingBreakdown
              hdbLoan={loanPrincipalNeeded}
              hdbLoanShare={hdbLoanShare}
              cpf={cpfTotal}
              cpfShare={cpfShare}
              cash={cashTotal}
              cashShare={cashShare}
              ehgGrant={ehgGrant}
              grantShare={grantShare}
            />
          </Card>

          <Card title="Key Dates" icon="calendar">
            <div className="key-date-list">
              {timeline.slice(0, 4).map((item) => (
                <div key={item.label}>
                  <span>
                    <Icon name="calendar" />
                    {item.label}
                  </span>
                  <strong>
                    {confirmedMilestoneDates[item.label]
                      ? formatDateInputDisplay(confirmedMilestoneDates[item.label])
                      : item.date}
                  </strong>
                </div>
              ))}
            </div>
          </Card>


        </aside>
      </div>
    </section>
  );
}

function MoneyInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      setText(raw);
    }
  };

  const handleBlur = () => {
    if (text === "") {
      onChange(min);
      return;
    }
    const num = Number(text);
    if (Number.isNaN(num)) {
      onChange(min);
    } else if (num < min) {
      onChange(min);
    } else if (num > max) {
      onChange(max);
    } else {
      onChange(num);
    }
  };

  return (
    <label className="input-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <div className="number-with-suffix">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <em>{suffix}</em>
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`select-field ${className}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SegmentedField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`segmented-field ${className}`}>
      <span>{label}</span>
      <div
        className="segmented-button-group"
        style={{ "--segment-count": options.length } as React.CSSProperties}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "segmented-button-active" : ""}
            onClick={() => onChange(option.value)}
            aria-pressed={option.value === value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanStepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="plan-step-header">
      <span>{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function MilestoneRow({
  item,
  index,
  confirmedDate,
  isComplete,
  onToggleComplete,
  onMilestoneDateChange,
  onTogglePaymentFunding,
  onPaymentTotalChange,
}: {
  item: TimelineItem;
  index: number;
  confirmedDate: string | undefined;
  isComplete: boolean;
  onToggleComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
  onTogglePaymentFunding: (label: string, type: 'cpf' | 'cash') => void;
  onPaymentTotalChange: (label: string, value: number) => void;
}) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountText, setAmountText] = useState("");
  const isInterchangeable = item.payment !== undefined && (item.payment.cpfOa > 0 && item.payment.cash > 0);

  return (
    <tr>
      <td>
        <div className="milestone-name">
          <span>{index + 1}</span>
          <div>
            <strong>{item.label}</strong>
            <p>{item.note}</p>
          </div>
        </div>
      </td>
      <td>{item.payment?.label ?? "No payment expected"}</td>
      <td>
        {item.payment ? (
          <div>
            {editingAmount ? (
              <input
                type="text"
                inputMode="numeric"
                value={amountText}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d+$/.test(raw)) {
                    setAmountText(raw);
                  }
                }}
                onBlur={() => {
                  const num = Number(amountText);
                  if (!Number.isNaN(num) && num > 0) {
                    onPaymentTotalChange(item.label, num);
                  }
                  setEditingAmount(false);
                  setAmountText("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="milestone-amount-input"
                autoFocus
              />
            ) : (
              <strong
                className="milestone-amount-editable"
                onClick={() => {
                  setAmountText(String(item.payment!.total));
                  setEditingAmount(true);
                }}
                title="Click to edit actual amount"
              >
                {currency(item.payment.total)}
              </strong>
            )}
            <div className="milestone-payment-tags">
              {item.payment.cpfOa > 0 && (
                <span
                  className={`milestone-tag milestone-tag-cpf ${isInterchangeable ? "milestone-tag-interactive" : ""}`}
                  onClick={isInterchangeable ? () => onTogglePaymentFunding(item.label, 'cpf') : undefined}
                  title={isInterchangeable ? "Click to move to Cash" : undefined}
                >
                  CPF {currency(item.payment.cpfOa)}
                </span>
              )}
              {item.payment.cash > 0 && (
                <span
                  className={`milestone-tag milestone-tag-cash ${isInterchangeable ? "milestone-tag-interactive" : ""}`}
                  onClick={isInterchangeable ? () => onTogglePaymentFunding(item.label, 'cash') : undefined}
                  title={isInterchangeable ? "Click to move to CPF" : undefined}
                >
                  Cash {currency(item.payment.cash)}
                </span>
              )}

            </div>
          </div>
        ) : (
          "-"
        )}
        <p>{item.date}</p>
      </td>
      <td>
        <input
          type="date"
          value={confirmedDate ?? ""}
          onChange={(event) => onMilestoneDateChange(item.label, event.target.value)}
          aria-label={`Expected date for ${item.label}`}
        />
      </td>
      <td>
        <button
          type="button"
          className={`milestone-status ${isComplete ? "milestone-status-done" : ""}`}
          onClick={() => onToggleComplete(item.label)}
          aria-pressed={isComplete}
        >
          <span className="milestone-status-box">
            {isComplete ? <Icon name="check" /> : <span className="milestone-status-empty" />}
          </span>
          {isComplete ? "Done" : "Confirm"}
        </button>
      </td>
    </tr>
  );
}

function FundingBreakdown({
  hdbLoan,
  hdbLoanShare,
  cpf,
  cpfShare,
  cash,
  cashShare,
  ehgGrant,
  grantShare,
}: {
  hdbLoan: number;
  hdbLoanShare: number;
  cpf: number;
  cpfShare: number;
  cash: number;
  cashShare: number;
  ehgGrant: number;
  grantShare: number;
}) {
  return (
    <div className="funding-box">
      <h3>Estimated Funding Breakdown</h3>
      <div className="funding-content">
        <div
          className="donut"
          style={{
            ["--loan" as string]: `${hdbLoanShare * 3.6}deg`,
            ["--cpf" as string]: `${(hdbLoanShare + cpfShare) * 3.6}deg`,
            ["--cash" as string]: `${(hdbLoanShare + cpfShare + cashShare) * 3.6}deg`,
          }}
          aria-hidden="true"
        />
        <div className="funding-lines">
          <FundingLegendItem label={`HDB Loan (${hdbLoanShare}%)`} value={currency(hdbLoan)} color="oklch(var(--color-futuristic-teal))" />
          <FundingLegendItem label={`CPF Usage (${cpfShare}%)`} value={currency(cpf)} color="oklch(70% 0.13 178)" />
          <FundingLegendItem label={`Cash (${cashShare}%)`} value={currency(cash)} color="oklch(68% 0.11 292)" />
          <FundingLegendItem label={`EHG Grant (${grantShare}%)`} value={currency(ehgGrant)} color="oklch(75% 0.12 95)" />
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  const [showTip, setShowTip] = useState(false);
  const tipId = useId();
  return (
    <div className="summary-line">
      <span>
        {label}
        {tooltip && (
          <span
            className="bto-breakdown-info"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onFocus={() => setShowTip(true)}
            onBlur={() => setShowTip(false)}
            aria-describedby={tipId}
            tabIndex={0}
          >
            <Icon name="info" />
            {showTip && (
              <span id={tipId} className="bto-tooltip" role="tooltip">
                {tooltip}
              </span>
            )}
          </span>
        )}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function FundingLegendItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="funding-legend-item">
      <div className="funding-legend-row">
        <span className="funding-legend-dot" style={{ backgroundColor: color }} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  tenureYears: number
) {
  if (principal <= 0 || tenureYears <= 0) return 0;

  const months = tenureYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;

  if (monthlyRate <= 0) return principal / months;

  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

function getLoanTenureMax(financing: FinancingType) {
  if (financing === "bank") return BANK_LOAN_TENURE_MAX;
  if (financing === "none") return BANK_LOAN_TENURE_MAX;
  return HDB_LOAN_TENURE_MAX;
}
