import {
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  INCOME_MAX,
  INCOME_MIN,
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
import { currency } from "../utils/format";

type PurchasePlanTabProps = {
  selectedProject: BtoProject | null;
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  signingAmount: number;
  keyAmount: number;
  minCashSigning: number;
  optionFee: number;
  surveyFee: number;
  fireInsurance: number;
  downpaymentNote: string;
  timeline: TimelineItem[];
  completedMilestones: string[];
  planStorageStatus: string;
  planStorageError: string | null;
  onIncomeChange: (value: number) => void;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onOpenBtoRadar: () => void;
  onSavePlan: () => void;
  onToggleMilestoneComplete: (label: string) => void;
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
  signingAmount,
  keyAmount,
  minCashSigning,
  optionFee,
  surveyFee,
  fireInsurance,
  downpaymentNote,
  timeline,
  completedMilestones,
  planStorageStatus,
  planStorageError,
  onIncomeChange,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onOpenBtoRadar,
  onSavePlan,
  onToggleMilestoneComplete,
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
          Select a BTO project, then review the flat price, expected completion,
          and estimated payment milestones in one place.
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
          onOpenBtoRadar={onOpenBtoRadar}
          onSavePlan={onSavePlan}
        />

        <TimelineBoard
          timeline={timeline}
          selectedProject={selectedProject}
          completedMilestones={completedMilestones}
          onToggleMilestoneComplete={onToggleMilestoneComplete}
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
  onOpenBtoRadar: () => void;
  onSavePlan: () => void;
}) {
  const loanCoverage = Math.min(
    100,
    Math.round((loanAmount / Math.max(flatPrice, 1)) * 100)
  );

  return (
    <div className="panel scenario-ledger">
      <div className="scenario-ledger-head">
        <div>
          <p className="scenario-eyebrow">Selected scenario</p>
          <h3 className="mt-1 text-xl font-semibold text-heritage-navy">
            {selectedProject?.name ?? "No project selected"}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            {selectedProject
              ? `${selectedProject.location}, ${selectedProject.launchMonth}`
              : "Choose a BTO project to prefill launch month, completion, and project context."}
          </p>
        </div>
        <div className="scenario-ledger-actions">
          {selectedProject?.sourceUrl && (
            <a
              href={selectedProject.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              View source
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
              These controls drive the downpayment and timeline split.
            </p>
          </div>

          <div className="scenario-control-grid">
            <NumberSliderField
              id="plan-income"
              label="Monthly household income"
              helperText="Updates the loan and grant figures in this plan."
              min={INCOME_MIN}
              max={INCOME_MAX}
              step={100}
              value={combinedIncome}
              onChange={onIncomeChange}
              minLabel={currency(INCOME_MIN)}
              maxLabel={currency(INCOME_MAX)}
            />
            <ScenarioSelect
              id="flat-type"
              label="Flat type"
              value={flatType}
              onChange={(value) => onFlatTypeChange(value as FlatType)}
              options={FLAT_TYPE_OPTIONS}
            />
            <ScenarioSelect
              id="financing-type"
              label="Financing"
              value={financing}
              onChange={(value) => onFinancingChange(value as FinancingType)}
              options={FINANCING_OPTIONS}
            />
            <ScenarioSelect
              id="payment-scheme"
              label="Payment scheme"
              value={scheme}
              onChange={(value) => onSchemeChange(value as SchemeType)}
              options={SCHEME_OPTIONS}
            />
          </div>

          <p className="scenario-note">{downpaymentNote}</p>
        </section>

        <section className="scenario-money-section" aria-label="Money snapshot">
          <div className="scenario-money-head">
            <div>
              <p className="scenario-section-label">Money snapshot</p>
              <p className="mt-1 text-sm text-warm-stone">
                Listed payments before loan balance.
              </p>
            </div>
            <div className="scenario-money-total">
              <p className="scenario-snapshot-total">{currency(totalPlannedCosts)}</p>
              <p className="text-xs text-warm-stone">Total listed costs</p>
            </div>
          </div>

          <div className="scenario-loan-meter">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-heritage-navy">Estimated loan</span>
              <span className="money-value font-semibold text-heritage-navy">
                {currency(loanAmount)}
              </span>
            </div>
            <div className="scenario-meter-track" aria-hidden="true">
              <span
                className="scenario-meter-fill"
                style={{ width: `${loanCoverage}%` }}
              />
            </div>
            <p className="text-xs text-warm-stone">
              Covers about {loanCoverage}% of the target price.
            </p>
          </div>

          <div className="scenario-ledger-rows">
            <CostRow label="Required downpayment" value={currency(downpaymentTotal)} />
            <CostRow label="Signing" value={currency(signingAmount)} />
            <CostRow label="Key collection" value={currency(keyAmount)} />
            <CostRow label="Minimum cash at signing" value={currency(minCashSigning)} />
            <CostRow label="EHG grant estimate" value={currency(ehgGrant)} />
            <CostRow label="Immediate fees" value={currency(immediateCostsTotal)} />
          </div>

          <div className="scenario-fee-row">
            <span>Fees include application, option, survey, insurance, and registration.</span>
            <span className="money-value">{currency(immediateCostsTotal)}</span>
          </div>
        </section>
      </div>

      <div className="scenario-save-strip">
        <div>
          <p className="text-sm font-semibold text-heritage-navy">Saved scenario</p>
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

function ScenarioFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="scenario-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScenarioSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="control"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type TimelineFlowGroup = {
  date: string;
  items: TimelineItem[];
  firstIndex: number;
  totalPayment: number;
  cpfOa: number;
  cash: number;
};

function getTimelineFlowGroups(timeline: TimelineItem[]) {
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
  onToggleMilestoneComplete,
}: {
  timeline: TimelineItem[];
  selectedProject: BtoProject | null;
  completedMilestones: string[];
  onToggleMilestoneComplete: (label: string) => void;
}) {
  const groups = getTimelineFlowGroups(timeline);
  const totalPayment = groups.reduce(
    (total, group) => total + group.totalPayment,
    0
  );

  return (
    <section className="panel timeline-board-panel">
      <div className="timeline-board-head">
        <div>
          <h3 className="text-lg font-semibold text-heritage-navy">
            Milestone calendar{" "}
            <span className="font-normal text-warm-stone">(estimated)</span>
          </h3>
          <p className="mt-1 text-sm leading-6 text-warm-stone">
            Based on default BTO offsets, not confirmed appointment dates.
          </p>
        </div>
        <div className="timeline-board-summary">
          <span>
            {selectedProject
              ? `Starts from ${selectedProject.launchMonth}`
              : "Choose a project to set the launch month"}
          </span>
          <strong>{currency(totalPayment)}</strong>
          <em>
            {completedMilestones.length}/{timeline.length} milestones done
          </em>
        </div>
      </div>

      <div className="timeline-flow">
        <ol className="timeline-flow-list" aria-label="Estimated payment milestones">
          {groups.map((group) => {
            const completedInGroup = group.items.filter((item) =>
              completedMilestones.includes(item.label)
            ).length;
            const groupComplete = completedInGroup === group.items.length;

            return (
              <li
                key={group.date}
                className={`timeline-flow-group ${
                  groupComplete ? "timeline-flow-group-complete" : ""
                }`}
              >
                <div className="timeline-flow-date">
                  <span>{group.date}</span>
                  <strong>
                    {group.totalPayment > 0
                      ? currency(group.totalPayment)
                      : "No payment"}
                  </strong>
                </div>
                <div className="timeline-flow-node-wrap" aria-hidden="true">
                  <span className="timeline-flow-node">
                    {String(group.firstIndex + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="timeline-flow-content">
                  <div className="timeline-flow-group-head">
                    <div>
                      <h4>{group.date}</h4>
                      <p>
                        {group.items.length === 1
                          ? "1 milestone"
                          : `${group.items.length} milestones`}
                      </p>
                    </div>
                    <span>
                      {completedInGroup}/{group.items.length} done
                    </span>
                  </div>
                  {group.totalPayment > 0 && (
                    <PaymentMixBar
                      cpfOa={group.cpfOa}
                      cash={group.cash}
                      total={group.totalPayment}
                    />
                  )}
                  <ol className="timeline-flow-cards">
                    {group.items.map((item, itemIndex) => (
                      <TimelineBoardCard
                        key={item.label}
                        item={item}
                        stepIndex={group.firstIndex + itemIndex}
                        isComplete={completedMilestones.includes(item.label)}
                        onToggleComplete={onToggleMilestoneComplete}
                      />
                    ))}
                  </ol>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="timeline-footnote">
        CPF OA usage depends on available OA balance and eligibility. Treat the
        split as an indicative guide.
      </p>
    </section>
  );
}

function TimelineBoardCard({
  item,
  stepIndex,
  isComplete,
  onToggleComplete,
}: {
  item: TimelineItem;
  stepIndex: number;
  isComplete: boolean;
  onToggleComplete: (label: string) => void;
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
          <h5>{item.label}</h5>
        </div>
        <p>{item.note}</p>
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

      <div className="timeline-flow-card-side">
        {item.payment && (
          <span className="timeline-flow-total">
            {currency(item.payment.total)}
          </span>
        )}
        {item.payment ? (
          <div className="timeline-board-payment">
            <p className="text-xs font-semibold text-heritage-navy">
              {item.payment.label}
            </p>
            <div className="timeline-board-split">
              <PaymentSource label="CPF OA" value={item.payment.cpfOa} tone="cpf" />
              <PaymentSource label="Cash" value={item.payment.cash} tone="cash" />
            </div>
          </div>
        ) : (
          <div className="timeline-board-empty">No payment expected</div>
        )}
      </div>
    </li>
  );
}

function PaymentMixBar({
  cpfOa,
  cash,
  total,
  compact = false,
}: {
  cpfOa: number;
  cash: number;
  total: number;
  compact?: boolean;
}) {
  const denominator = Math.max(cpfOa + cash, total, 1);
  const cpfPercent = (cpfOa / denominator) * 100;
  const cashPercent = (cash / denominator) * 100;

  return (
    <div className={compact ? "mt-3" : "mt-1"}>
      <div className="payment-mix-bar" aria-hidden="true">
        {cpfOa > 0 && (
          <span
            className="payment-mix-segment payment-mix-cpf"
            style={{ width: `${Math.max(cpfPercent, 5)}%` }}
          />
        )}
        {cash > 0 && (
          <span
            className="payment-mix-segment payment-mix-cash"
            style={{ width: `${Math.max(cashPercent, 5)}%` }}
          />
        )}
        {cpfOa === 0 && cash === 0 && <span className="payment-mix-empty" />}
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-stone">
          <span className="money-value">CPF OA {currency(cpfOa)}</span>
          <span className="money-value">Cash {currency(cash)}</span>
        </div>
      )}
    </div>
  );
}

function PaymentSource({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cpf" | "cash";
}) {
  return (
    <div className={`payment-source payment-source-${tone}`}>
      <p className="payment-source-value">{currency(value)}</p>
      <p className="mt-0.5 text-[0.72rem] text-current/70">{label}</p>
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
