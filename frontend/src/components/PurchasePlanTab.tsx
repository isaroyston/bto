import {
  BANK_LOAN_TENURE_MAX,
  DEFAULT_LOAN_INTEREST_RATE,
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
import { NumberSliderField } from "./NumberSliderField";
import type {
  FinancingType,
  FlatType,
  SchemeType,
  TimelineItem,
} from "../types";
import { formatDateInputDisplay } from "../utils/date";
import { currency } from "../utils/format";
import {
  getBtoProjectSourceLabel,
  getBtoProjectSourceNote,
} from "../utils/sourceCredits";

type PurchasePlanTabProps = {
  selectedProject: BtoProject | null;
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  signingAmount: number;
  keyAmount: number;
  minCashSigning: number;
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
  onOpenBtoRadar: () => void;
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
  flatPrice,
  flatType,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
  signingAmount,
  keyAmount,
  minCashSigning,
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
  onOpenBtoRadar,
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
  const totalPlannedCosts = downpaymentTotal + immediateCostsTotal;

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-2xl font-semibold text-heritage-navy">
          Purchase plan
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-warm-stone">
          Tune the assumptions, then track what is due and when.
        </p>
      </header>

      <div className="space-y-5">
        <ScenarioLedger
          selectedProject={selectedProject}
          combinedIncome={combinedIncome}
          loanAmount={loanAmount}
          ehgGrant={ehgGrant}
          flatPrice={flatPrice}
          flatType={flatType}
          financing={financing}
          scheme={scheme}
          loanTenureYears={loanTenureYears}
          loanInterestRate={loanInterestRate}
          signingAmount={signingAmount}
          keyAmount={keyAmount}
          minCashSigning={minCashSigning}
          immediateCostsTotal={immediateCostsTotal}
          downpaymentTotal={downpaymentTotal}
          totalPlannedCosts={totalPlannedCosts}
          downpaymentNote={downpaymentNote}
          planStorageStatus={planStorageStatus}
          planStorageError={planStorageError}
          onIncomeChange={onIncomeChange}
          onFlatPriceChange={onFlatPriceChange}
          onFlatTypeChange={onFlatTypeChange}
          onFinancingChange={onFinancingChange}
          onSchemeChange={onSchemeChange}
          onLoanTenureChange={onLoanTenureChange}
          onLoanInterestRateChange={onLoanInterestRateChange}
          onOpenBtoRadar={onOpenBtoRadar}
          onSavePlan={onSavePlan}
        />

        <TimelineBoard
          timeline={timeline}
          selectedProject={selectedProject}
          completedMilestones={completedMilestones}
          confirmedMilestoneDates={confirmedMilestoneDates}
          onToggleMilestoneComplete={onToggleMilestoneComplete}
          onMilestoneDateChange={onMilestoneDateChange}
        />
      </div>
    </section>
  );
}

function ScenarioLedger({
  selectedProject,
  combinedIncome,
  loanAmount,
  ehgGrant,
  flatPrice,
  flatType,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
  signingAmount,
  keyAmount,
  minCashSigning,
  immediateCostsTotal,
  downpaymentTotal,
  totalPlannedCosts,
  downpaymentNote,
  planStorageStatus,
  planStorageError,
  onIncomeChange,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onLoanTenureChange,
  onLoanInterestRateChange,
  onOpenBtoRadar,
  onSavePlan,
}: {
  selectedProject: BtoProject | null;
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  signingAmount: number;
  keyAmount: number;
  minCashSigning: number;
  immediateCostsTotal: number;
  downpaymentTotal: number;
  totalPlannedCosts: number;
  downpaymentNote: string;
  planStorageStatus: string;
  planStorageError: string | null;
  onIncomeChange: (value: number) => void;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onLoanTenureChange: (value: number) => void;
  onLoanInterestRateChange: (value: number) => void;
  onOpenBtoRadar: () => void;
  onSavePlan: () => void;
}) {
  const loanTenureMax = getLoanTenureMax(financing);
  const balanceAfterUpfront = Math.max(
    flatPrice - downpaymentTotal - ehgGrant,
    0
  );
  const loanPrincipalNeeded = financing === "none" ? 0 : balanceAfterUpfront;
  const monthlyPayment = calculateMonthlyPayment(
    loanPrincipalNeeded,
    loanInterestRate,
    loanTenureYears
  );
  const loanEstimateCoverage = Math.min(
    100,
    Math.round(
      (Math.min(loanAmount, loanPrincipalNeeded) /
        Math.max(loanPrincipalNeeded, 1)) *
        100
    )
  );
  const loanEstimateShortfall = Math.max(loanPrincipalNeeded - loanAmount, 0);
  const financingLabel = getFinancingLabel(financing);
  const monthlyPaymentDetail =
    financing === "none"
      ? "No monthly loan instalment because no loan is selected."
      : `${loanTenureYears} years at ${formatRate(loanInterestRate)}% p.a.`;

  return (
    <div className="panel scenario-ledger">
      <div className="scenario-ledger-head">
        <div>
          <p className="scenario-eyebrow">Plan anchor</p>
          <h3 className="mt-1 text-xl font-semibold text-heritage-navy">
            {selectedProject?.name ?? "No project selected"}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            {selectedProject
              ? `${selectedProject.location}, ${selectedProject.launchMonth}`
              : "Choose a BTO project to anchor price, TOP, and timing."}
          </p>
          {selectedProject && (
            <p className="mt-2 text-xs leading-5 text-warm-stone">
              {getBtoProjectSourceNote(selectedProject)}
            </p>
          )}
        </div>
        <div className="scenario-ledger-actions">
          {selectedProject?.sourceUrl && (
            <a
              href={selectedProject.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Source: {getBtoProjectSourceLabel(selectedProject)}
            </a>
          )}
          <button type="button" className="btn-primary" onClick={onOpenBtoRadar}>
            {selectedProject ? "Change project" : "Choose project"}
          </button>
        </div>
      </div>

      <div className="scenario-ledger-body">
        <section className="scenario-price-section" aria-labelledby="scenario-price-title">
          <div>
            <p id="scenario-price-title" className="scenario-section-label">
              Target flat price
            </p>
            <p className="scenario-price">{currency(flatPrice)}</p>
          </div>

          <NumberSliderField
            id="flat-price"
            label="Adjust target price"
            min={FLAT_MIN}
            max={FLAT_MAX}
            step={5000}
            value={flatPrice}
            onChange={onFlatPriceChange}
            minLabel={currency(FLAT_MIN)}
            maxLabel={currency(FLAT_MAX)}
          />

          <div className="scenario-fact-grid">
            <ScenarioFact label="Flat" value={flatType} />
            <ScenarioFact
              label="Expected TOP"
              value={selectedProject?.expectedTop ?? "Not listed"}
            />
            <ScenarioFact
              label="Units"
              value={selectedProject?.totalUnits?.toLocaleString("en-SG") ?? "Not listed"}
            />
            <ScenarioFact
              label="Nearest MRT"
              value={selectedProject?.nearestMrt ?? "Not listed"}
            />
          </div>
        </section>

        <section className="scenario-assumptions-section" aria-label="Scenario assumptions">
          <div>
            <p className="scenario-section-label">Assumptions</p>
            <p className="mt-1 text-sm leading-6 text-warm-stone">
              Change a choice, the numbers update.
            </p>
          </div>

          <div className="scenario-control-grid">
            <div className="scenario-income-control">
              <NumberSliderField
                id="plan-income"
                label="Monthly household income"
                helperText="Drives loan and EHG estimates."
                min={INCOME_MIN}
                max={INCOME_MAX}
                step={100}
                value={combinedIncome}
                onChange={onIncomeChange}
                minLabel={currency(INCOME_MIN)}
                maxLabel={currency(INCOME_MAX)}
              />
            </div>

            <div className="scenario-choice-grid">
              <ScenarioSegmentedControl
                label="Flat"
                value={flatType}
                options={FLAT_TYPE_OPTIONS}
                onChange={(value) => onFlatTypeChange(value as FlatType)}
              />
              <ScenarioSegmentedControl
                label="Financing"
                value={financing}
                options={FINANCING_OPTIONS}
                onChange={(value) => onFinancingChange(value as FinancingType)}
              />
              <ScenarioSegmentedControl
                label="Payment"
                value={scheme}
                options={SCHEME_OPTIONS}
                onChange={(value) => onSchemeChange(value as SchemeType)}
              />
            </div>

            <div className="scenario-loan-controls">
              <NumberSliderField
                id="loan-tenure"
                label="Loan tenure"
                helperText={`${financingLabel} max: ${loanTenureMax} years.`}
                min={LOAN_TENURE_MIN}
                max={loanTenureMax}
                step={1}
                value={loanTenureYears}
                onChange={onLoanTenureChange}
                minLabel="1 year"
                maxLabel={`${loanTenureMax} years`}
              />
              <InterestRateField
                value={loanInterestRate}
                onChange={onLoanInterestRateChange}
                financing={financing}
              />
            </div>
          </div>

          <p className="scenario-note">{downpaymentNote}</p>
        </section>

        <section className="scenario-money-section" aria-label="Money snapshot">
          <div className="scenario-money-head">
            <div>
              <p className="scenario-section-label">Money snapshot</p>
              <p className="mt-1 text-sm text-warm-stone">Before the loan balance.</p>
            </div>
            <div className="scenario-money-total">
              <p className="scenario-snapshot-total">{currency(totalPlannedCosts)}</p>
              <p className="text-xs text-warm-stone">Before loan balance</p>
            </div>
          </div>

          <div className="scenario-price-bridge">
            <span>Target price</span>
            <strong>{currency(flatPrice)}</strong>
            <em>
              Scheduled cash/CPF first, then the remaining loan.
            </em>
          </div>

          <div className="scenario-loan-needed-card">
            <div>
              <span>Loan amount needed</span>
              <strong>{currency(loanPrincipalNeeded)}</strong>
              <em>
                {financing === "none"
                  ? `${currency(balanceAfterUpfront)} still needs to be covered without a loan.`
                  : "Target price minus downpayment and EHG grant. Fees are separate."}
              </em>
            </div>
            <div className="scenario-repayment-card">
              <span>Estimated monthly payment</span>
              <strong>{currency(monthlyPayment)}</strong>
              <em>{monthlyPaymentDetail}</em>
            </div>
          </div>

          <div className="scenario-loan-meter">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-heritage-navy">
                Income-based loan estimate
              </span>
              <span className="money-value font-semibold text-heritage-navy">
                {currency(loanAmount)}
              </span>
            </div>
            <div className="scenario-meter-track" aria-hidden="true">
              <span
                className="scenario-meter-fill"
                style={{ width: `${loanEstimateCoverage}%` }}
              />
            </div>
            <p className="text-xs text-warm-stone">
              {financing === "none"
                ? "Switch to HDB or bank financing to compare against loan need."
                : loanEstimateShortfall > 0
                  ? `${currency(loanEstimateShortfall)} more than this estimate may be needed.`
                  : "This estimate covers the loan amount needed in this scenario."}
            </p>
          </div>

          <div className="scenario-ledger-rows">
            <CostRow label="Required downpayment" value={currency(downpaymentTotal)} />
            <CostRow label="Signing" value={currency(signingAmount)} />
            <CostRow label="Key collection" value={currency(keyAmount)} />
            <CostRow label="Minimum cash at signing" value={currency(minCashSigning)} />
            <CostRow label="EHG grant estimate" value={currency(ehgGrant)} />
            <CostRow label="Loan amount needed" value={currency(loanPrincipalNeeded)} />
            <CostRow label="Monthly payment estimate" value={currency(monthlyPayment)} />
            <CostRow label="Immediate fees" value={currency(immediateCostsTotal)} />
          </div>

          <div className="scenario-fee-row">
            <span>Fees: application, option, survey, insurance, registration.</span>
            <span className="money-value">{currency(immediateCostsTotal)}</span>
          </div>
        </section>
      </div>

      <div className="scenario-save-strip">
        <div>
          <p className="text-sm font-semibold text-heritage-navy">Saved plan</p>
          <p className="mt-1 text-sm text-warm-stone">{planStorageStatus}</p>
          {planStorageError && (
            <p className="mt-1 text-sm font-medium text-red-700">{planStorageError}</p>
          )}
        </div>
        <div className="scenario-save-actions">
          <button type="button" className="btn-primary" onClick={onSavePlan}>
            Save plan
          </button>
        </div>
      </div>
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

  if (monthlyRate <= 0) {
    return principal / months;
  }

  return (
    (principal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months))
  );
}

function getLoanTenureMax(financing: FinancingType) {
  return financing === "hdb" ? HDB_LOAN_TENURE_MAX : BANK_LOAN_TENURE_MAX;
}

function getFinancingLabel(financing: FinancingType) {
  if (financing === "hdb") return "HDB loan";
  if (financing === "bank") return "Bank loan";
  return "No-loan plan";
}

function formatRate(value: number) {
  return value.toLocaleString("en-SG", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function ScenarioFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="scenario-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScenarioSegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="scenario-segmented-field">
      <p className="field-label">{label}</p>
      <div className="scenario-segmented-control">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "scenario-segment-active" : ""}
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

function InterestRateField({
  value,
  financing,
  onChange,
}: {
  value: number;
  financing: FinancingType;
  onChange: (value: number) => void;
}) {
  const helperText =
    financing === "hdb"
      ? `Default uses the current HDB concessionary rate, ${formatRate(
          DEFAULT_LOAN_INTEREST_RATE
        )}% p.a.`
      : "Use your expected package rate.";

  return (
    <div className="loan-rate-field">
      <div>
        <label className="field-label" htmlFor="loan-interest-rate">
          Planning interest rate
        </label>
        <p className="mt-1 text-sm leading-6 text-warm-stone">{helperText}</p>
      </div>
      <div className="loan-rate-control">
        <input
          id="loan-interest-rate"
          type="number"
          min={LOAN_INTEREST_RATE_MIN}
          max={LOAN_INTEREST_RATE_MAX}
          step={0.05}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Planning interest rate"
        />
        <span>% p.a.</span>
      </div>
    </div>
  );
}

type TimelineFlowGroup = {
  date: string;
  items: TimelineDisplayItem[];
  firstIndex: number;
  totalPayment: number;
  cpfOa: number;
  cash: number;
};

type TimelineDisplayItem = TimelineItem & {
  estimatedDate: string;
  confirmedDate?: string;
};

function applyConfirmedMilestoneDates(
  timeline: TimelineItem[],
  confirmedMilestoneDates: Record<string, string>
): TimelineDisplayItem[] {
  return timeline.map((item) => {
    const confirmedDate = confirmedMilestoneDates[item.label];
    const confirmedDateLabel = confirmedDate
      ? formatDateInputDisplay(confirmedDate)
      : null;

    return {
      ...item,
      estimatedDate: item.date,
      date: confirmedDateLabel ?? item.date,
      confirmedDate,
    };
  });
}

function getTimelineFlowGroups(timeline: TimelineDisplayItem[]) {
  return timeline.reduce<TimelineFlowGroup[]>((groups, item, index) => {
    const existing = groups.find((group) => group.date === item.date);
    const payment = item.payment;
    const totalPayment = payment?.total ?? 0;
    const cpfOa = payment?.cpfOa ?? 0;
    const cash = payment?.cash ?? 0;

    if (existing) {
      existing.items.push(item);
      existing.totalPayment += totalPayment;
      existing.cpfOa += cpfOa;
      existing.cash += cash;
      return groups;
    }

    groups.push({
      date: item.date,
      items: [item],
      firstIndex: index,
      totalPayment,
      cpfOa,
      cash,
    });

    return groups;
  }, []);
}

function TimelineBoard({
  timeline,
  selectedProject,
  completedMilestones,
  confirmedMilestoneDates,
  onToggleMilestoneComplete,
  onMilestoneDateChange,
}: {
  timeline: TimelineItem[];
  selectedProject: BtoProject | null;
  completedMilestones: string[];
  confirmedMilestoneDates: Record<string, string>;
  onToggleMilestoneComplete: (label: string) => void;
  onMilestoneDateChange: (label: string, value: string) => void;
}) {
  const displayTimeline = applyConfirmedMilestoneDates(
    timeline,
    confirmedMilestoneDates
  );
  const groups = getTimelineFlowGroups(displayTimeline);
  const totalPayment = groups.reduce(
    (total, group) => total + group.totalPayment,
    0
  );
  const completedPayment = displayTimeline.reduce(
    (total, item) =>
      completedMilestones.includes(item.label)
        ? total + (item.payment?.total ?? 0)
        : total,
    0
  );
  const remainingPayment = Math.max(totalPayment - completedPayment, 0);

  return (
    <section className="panel timeline-board-panel">
      <div className="timeline-board-head">
        <div>
          <h3 className="text-lg font-semibold text-heritage-navy">
            Milestones
          </h3>
        </div>
        <div className="timeline-board-summary">
          <span>
            {selectedProject
              ? `From ${selectedProject.launchMonth}`
              : "Project sets dates"}
          </span>
          <strong>{currency(remainingPayment)}</strong>
          <em>scheduled</em>
        </div>
      </div>

      <div className="timeline-board-body">
        <div className="timeline-month-strip" aria-label="Milestone month summary">
          {groups.map((group) => {
            const completedInGroup = group.items.filter((item) =>
              completedMilestones.includes(item.label)
            ).length;
            const groupComplete = completedInGroup === group.items.length;
            const groupCompletedPayment = group.items.reduce(
              (total, item) =>
                completedMilestones.includes(item.label)
                  ? total + (item.payment?.total ?? 0)
                  : total,
              0
            );
            const groupRemainingPayment = Math.max(
              group.totalPayment - groupCompletedPayment,
              0
            );

            return (
              <div
                key={group.date}
                className={`timeline-month-chip ${
                  groupComplete ? "timeline-month-chip-complete" : ""
                }`}
              >
                <span>{group.date}</span>
                <strong>
                  {groupRemainingPayment > 0
                    ? currency(groupRemainingPayment)
                    : group.totalPayment > 0
                      ? "Cleared"
                      : "No payment"}
                </strong>
                <em>
                  {completedInGroup}/{group.items.length} done
                </em>
              </div>
            );
          })}
        </div>

        <ol className="timeline-card-grid" aria-label="Payment milestones">
          {displayTimeline.map((item, index) => (
            <TimelineBoardCard
              key={item.label}
              item={item}
              stepIndex={index}
              isComplete={completedMilestones.includes(item.label)}
              onToggleComplete={onToggleMilestoneComplete}
              onDateChange={onMilestoneDateChange}
            />
          ))}
        </ol>
      </div>

      <p className="timeline-footnote">
        CPF OA split is indicative.
      </p>
    </section>
  );
}

function TimelineBoardCard({
  item,
  stepIndex,
  isComplete,
  onToggleComplete,
  onDateChange,
}: {
  item: TimelineDisplayItem;
  stepIndex: number;
  isComplete: boolean;
  onToggleComplete: (label: string) => void;
  onDateChange: (label: string, value: string) => void;
}) {
  return (
    <li
      className={`timeline-flow-card ${
        item.payment ? "timeline-flow-card-payment" : ""
      } ${isComplete ? "timeline-flow-card-complete" : ""}`}
    >
      <div className="timeline-flow-card-main">
        <div className="timeline-flow-card-top">
          <span className="timeline-flow-step">
            {String(stepIndex + 1).padStart(2, "0")}
          </span>
          <div>
            <h5>{item.label}</h5>
            <span>{item.date}</span>
          </div>
        </div>
        <p>{item.note}</p>
        {item.payment && (
          <div className="timeline-board-payment">
            <p className="text-xs font-semibold text-heritage-navy">
              {item.payment.label}
            </p>
            <PaymentRequirement payment={item.payment} />
          </div>
        )}
      </div>

      <div className="timeline-flow-card-side">
        {!item.payment && (
          <div className="timeline-board-empty">No payment expected</div>
        )}
        <label className="milestone-date-field">
          <span>Confirmed date</span>
          <input
            type="date"
            value={item.confirmedDate ?? ""}
            onChange={(event) => onDateChange(item.label, event.target.value)}
            aria-label={`Confirmed date for ${item.label}`}
          />
          {item.confirmedDate && (
            <em>Estimated {item.estimatedDate}</em>
          )}
        </label>
        <button
          type="button"
          className={`timeline-complete-toggle ${
            isComplete ? "timeline-complete-toggle-on" : ""
          }`}
          aria-pressed={isComplete}
          onClick={() => onToggleComplete(item.label)}
        >
          <span className="timeline-complete-box" aria-hidden="true" />
          {isComplete ? "Done" : "Mark done"}
        </button>
      </div>
    </li>
  );
}

function PaymentRequirement({
  payment,
}: {
  payment: NonNullable<TimelineItem["payment"]>;
}) {
  const hasCpf = payment.cpfOa > 0;
  const hasCash = payment.cash > 0;

  if (!hasCpf || !hasCash) {
    return (
      <div className="payment-requirement">
        <PaymentLine label={hasCpf ? "CPF OA amount" : "Cash amount"} value={payment.total} />
      </div>
    );
  }

  return (
    <div className="payment-requirement">
      <PaymentLine label="CPF OA estimate" value={payment.cpfOa} />
      <PaymentLine label="Cash minimum" value={payment.cash} />
    </div>
  );
}

function PaymentLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="payment-line">
      <span>{label}</span>
      <strong>{currency(value)}</strong>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="cost-row">
      <span className="min-w-0 text-warm-stone">{label}</span>
      <span className="cost-row-value">{value}</span>
    </div>
  );
}
