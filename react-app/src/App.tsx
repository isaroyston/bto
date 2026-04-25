import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  EHG_FAMILIES_POLICY_META,
  getCpfDefaultsForAge,
  getPolicyReviewMeta,
  lookupEhgFamiliesGrant,
  POLICY_CONFIG as POLICY,
} from "./policies/policyConfig";
import "./App.css";

type FlatType = "2-room" | "3-room" | "4-room" | "5-room" | "executive";
type FinancingOption = "hdb" | "bank" | "none";
type DownpaymentScheme = "normal" | "staggered" | "dia";
type StageName =
  | "Application"
  | "Flat Booking"
  | "Sign Agreement for Lease"
  | "Key Collection";
type SourceKey = keyof typeof POLICY.sources;
type TabKey = "profile" | "property-loan" | "scheme-grants" | "timeline-payments" | "sources";
type ThemeMode = "light" | "dark";
type PersonRole = "applicant" | "co-applicant" | "essential-occupier" | "household-member";
type Citizenship = "singapore-citizen" | "permanent-resident" | "other";

interface PersonFormValues {
  id: string;
  role: PersonRole;
  citizenship: Citizenship;
  firstTimer: boolean;
  ageYears: string;
  employmentContinuous12Months: boolean;
  currentlyWorking: boolean;
  monthlyIncome: string;
  currentCpfOaBalance: string;
  currentCashSavings: string;
}

interface PlannerFormValues {
  flatType: FlatType;
  flatPrice: string;
  financing: FinancingOption;
  scheme: DownpaymentScheme;
  ltvRatio: string;
  annualInterestRate: string;
  loanTenureYears: string;
  completionMonths: string;
  plannedMonthlyCashSetAside: string;
  applicationDate: string;
  members: PersonFormValues[];
}

interface EstimatedDates {
  applicationDate: Date;
  ballotDate: Date;
  bookingDate: Date;
  agreementDate: Date;
  keyDate: Date;
}

interface HouseholdMemberProjection {
  id: string;
  role: PersonRole;
  citizenship: Citizenship;
  firstTimer: boolean;
  ageYears: number;
  monthlyIncome: number;
  currentCpfOaBalance: number;
  currentCashSavings: number;
  currentlyWorking: boolean;
  employmentContinuous12Months: boolean;
  cpfBand: string;
  employeeCpfRate: number;
  employerCpfRate: number;
  oaAllocationRate: number;
  oaMonthlyInflow: number;
}

interface HouseholdProjection {
  members: HouseholdMemberProjection[];
  relevantMembers: HouseholdMemberProjection[];
  grossMonthlyIncome: number;
  oaMonthlyInflow: number;
  currentCpfOaBalance: number;
  currentCashSavings: number;
  plannedMonthlyCashSetAside: number;
}

interface EhgAssessment {
  eligible: boolean;
  grantAmount: number;
  bandLabel: string;
  averageMonthlyIncome: number;
  reasons: string[];
}

interface LoanProjection {
  annualInterestRate: number;
  loanTenureYears: number;
  termMonths: number;
  monthlyInstalment: number;
}

interface LegalFeeBreakdown {
  baseRounded: number;
  gstAmount: number;
  totalInclusive: number;
}

interface ScheduleRow {
  stage: StageName;
  item: string;
  amount: number | null;
  date: Date;
  paymentMode: string;
  remarks: string;
  sourceKey: SourceKey;
}

interface PaymentGroup {
  stage: StageName;
  date: Date;
  rows: ScheduleRow[];
  knownTotal: number;
}

interface ComparisonRow {
  label: string;
  requirement: string;
  currentValue: string;
  status: "pass" | "fail" | "info";
  statusLabel: string;
}

interface PaymentStageSummary {
  stage: StageName;
  knownTotal: number;
  lineCount: number;
  pendingCount: number;
}

interface LoanRepaymentSummary {
  hasLoan: boolean;
  firstPaymentDate: Date | null;
  monthlyInstalment: number;
  oaInflow: number;
  monthlyCashTopUp: number;
  firstYearInstalmentTotal: number;
  firstYearOaSupportTotal: number;
  firstYearCashTopUpTotal: number;
  fullTermRepaymentTotal: number;
  estimatedInterestTotal: number;
}

interface StageFeasibility {
  stage: StageName;
  date: Date;
  monthsFromStart: number;
  stageRequired: number;
  cumulativeRequired: number;
  cashFloorStage: number;
  cumulativeCashFloor: number;
  estimatedCashAvailable: number;
  estimatedOaAvailable: number;
  estimatedTotalAvailable: number;
  surplus: number;
  coverageRatio: number;
  isCashFeasible: boolean;
  isFeasible: boolean;
}

interface FeasibilitySummary {
  feasibleStages: number;
  totalStages: number;
  keyStageProjectedAvailable: number;
  keyStageCumulativeRequired: number;
  keyStageSurplus: number;
  overallCoverageRatio: number;
}

interface CalculationResult {
  inputs: PlannerFormValues;
  dates: EstimatedDates;
  household: HouseholdProjection;
  ehgAssessment: EhgAssessment;
  flatPrice: number;
  ehgGrant: number;
  netPurchasePrice: number;
  optionFee: number;
  totalDownpayment: number;
  estimatedLoanAmount: number;
  monthlyLoanProjection: LoanProjection;
  unfundedAtKey: number;
  bsdAmount: number;
  legalFee: LegalFeeBreakdown;
  knownPayable: number;
  knownDueBeforeKeys: number;
  knownDueAtKeyCollection: number;
  pendingAmountCount: number;
  scheduleRows: ScheduleRow[];
  paymentGroups: PaymentGroup[];
  paymentStageSummaries: PaymentStageSummary[];
  stageFeasibility: StageFeasibility[];
  feasibilitySummary: FeasibilitySummary;
  ehgRequirementRows: ComparisonRow[];
  schemeRuleRows: ComparisonRow[];
  loanRepaymentSummary: LoanRepaymentSummary;
  monthlyOaCoverageRatio: number;
  monthlyCashTopUp: number;
}

const STAGE_ORDER: StageName[] = [
  "Application",
  "Flat Booking",
  "Sign Agreement for Lease",
  "Key Collection",
];

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "property-loan", label: "Flat & Loan" },
  { key: "scheme-grants", label: "Scheme & Grant" },
  { key: "timeline-payments", label: "Payments" },
  { key: "sources", label: "Sources" },
];

function App() {
  const [formValues, setFormValues] = useState<PlannerFormValues>(createInitialFormValues);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const lastScrollYRef = useRef(0);
  const tabPanelContentRef = useRef<HTMLDivElement | null>(null);
  const [tabStageHeight, setTabStageHeight] = useState<number>(640);

  const result = useMemo(() => calculatePlan(formValues), [formValues]);
  const policyReviewMeta = useMemo(
    () => getPolicyReviewMeta(POLICY.lastVerified, POLICY.updateCadenceDays),
    [],
  );
  const ehgIncomeRatioPercent = Math.min(
    100,
    (result.ehgAssessment.averageMonthlyIncome / EHG_FAMILIES_POLICY_META.maxIncomeInclusive) * 100,
  );

  useEffect(() => {
    window.localStorage.setItem("hdb-planner-theme", themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    const content = tabPanelContentRef.current;
    if (!content) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = Math.max(620, Math.ceil(content.getBoundingClientRect().height));
      setTabStageHeight(nextHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => observer.disconnect();
  }, [activeTab, formValues, themeMode]);

  const handlePlannerFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberFieldChange = (
    memberId: string,
    field: keyof PersonFormValues,
    value: string | boolean,
  ) => {
    setFormValues((prev) => ({
      ...prev,
      members: prev.members.map((member) =>
        member.id === memberId ? { ...member, [field]: value } : member,
      ),
    }));
  };

  const addMember = () => {
    setFormValues((prev) => ({
      ...prev,
      members: [...prev.members, createMember(prev.members.length)],
    }));
  };

  const removeMember = (memberId: string) => {
    setFormValues((prev) => {
      if (prev.members.length <= 2) {
        return prev;
      }

      return {
        ...prev,
        members: prev.members.filter((member) => member.id !== memberId),
      };
    });
  };

  const exportIcs = () => {
    const icsText = buildIcs(result);
    const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "hdb-payment-plan.ics";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleTabChange = (tabKey: TabKey) => {
    if (tabKey === activeTab) {
      return;
    }

    // Preserve the current viewport position when tab content heights differ.
    lastScrollYRef.current = window.scrollY;
    setActiveTab(tabKey);

    requestAnimationFrame(() => {
      window.scrollTo({ top: lastScrollYRef.current, behavior: "auto" });
    });
  };

  return (
    <div className={`app-shell ${themeMode === "dark" ? "theme-dark" : "theme-light"}`}>
      <header className="hero">
        <div className="hero-shape hero-shape-a" aria-hidden="true"></div>
        <div className="hero-shape hero-shape-b" aria-hidden="true"></div>
        <div className="hero-bar">
          <p className="eyebrow">Families EHG planner</p>
          <div className="appearance-switch" role="group" aria-label="Appearance">
            <button
              type="button"
              className={themeMode === "light" ? "appearance-button is-active" : "appearance-button"}
              onClick={() => setThemeMode("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={themeMode === "dark" ? "appearance-button is-active" : "appearance-button"}
              onClick={() => setThemeMode("dark")}
            >
              Dark
            </button>
          </div>
        </div>
        <h1>HDB Family Planner</h1>
        <p>
          Set up the household cleanly, see whether the selected scheme fits the
          family’s grant profile, and understand both the one-off stage payments and
          the monthly loan after key collection.
        </p>
        <p className="meta">
          Policy baseline: {POLICY.country} | Last verified: {POLICY.lastVerified} |
          Review cadence: every {POLICY.updateCadenceDays} days
        </p>
        <p className={policyReviewMeta.isDue ? "meta meta-warn" : "meta"}>
          Next policy check: {formatDate(policyReviewMeta.nextReviewDate)}
          {policyReviewMeta.isDue
            ? " (review due)"
            : ` (${policyReviewMeta.daysToReview} day(s) remaining)`}
        </p>
      </header>

      <main className="layout">
        <section className="panel overview-panel">
          <div className="overview-head">
            <div>
              <h2>What You Need To See Right Now</h2>
              <p className="small">
                Get the household right first, confirm the scheme and grant fit next,
                then review the one-off milestone payments and the recurring monthly
                loan after keys.
              </p>
            </div>
            <span className="policy-pill">
              Families-only EHG | {EHG_FAMILIES_POLICY_META.sourceDocument}
            </span>
          </div>

          <div className="summary-strip">
            <SummaryStat label="Families EHG" value={toCurrency(result.ehgGrant)} />
            <SummaryStat
              label="One-off before keys"
              value={toCurrency(result.knownDueBeforeKeys)}
            />
            <SummaryStat
              label="Monthly after keys"
              value={toCurrency(result.monthlyLoanProjection.monthlyInstalment)}
              hint={
                result.monthlyCashTopUp > 0
                  ? `${toCurrency(result.monthlyCashTopUp)} cash top-up after OA`
                  : "Fully covered by OA"
              }
            />
          </div>
        </section>

        <section className="panel planner-panel">
          <div className="tabs" role="tablist" aria-label="Planner tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={tab.key === activeTab ? "tab is-active" : "tab"}
                aria-selected={tab.key === activeTab}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-stage" style={{ height: tabStageHeight }}>
            <div className="tab-panel" ref={tabPanelContentRef}>
          {activeTab === "profile" ? (
            <>
              <div className="section-header">
                <div>
                  <h2>Household Profile</h2>
                  <p className="small">
                    This is the tab to get right first. Only the relevant family members
                    should drive the grant decision and OA projection.
                  </p>
                </div>
                <button type="button" className="add-member-button" onClick={addMember}>
                  Add member
                </button>
              </div>

              <div className="summary-strip">
                <SummaryStat
                  label="Relevant members"
                  value={`${result.household.relevantMembers.length}`}
                  hint="Applicant, co-applicant, essential occupier"
                />
                <SummaryStat
                  label="Avg household income"
                  value={toCurrency(result.ehgAssessment.averageMonthlyIncome)}
                />
                <SummaryStat
                  label="Monthly OA inflow"
                  value={toCurrency(result.household.oaMonthlyInflow)}
                />
                <SummaryStat
                  label="Current status"
                  value={result.ehgAssessment.eligible ? "Grant-ready" : "Needs fixes"}
                  hint={
                    result.ehgAssessment.eligible
                      ? result.ehgAssessment.bandLabel
                      : `${result.ehgAssessment.reasons.length} blocker(s) to clear`
                  }
                  tone={result.ehgAssessment.eligible ? "success" : "warn"}
                />
              </div>

              <p
                className={
                  result.ehgAssessment.eligible ? "status-inline status-ok" : "status-inline status-gap"
                }
              >
                {result.ehgAssessment.eligible
                  ? `Matched families EHG band: ${result.ehgAssessment.bandLabel}. Current grant amount: ${toCurrency(
                      result.ehgAssessment.grantAmount,
                    )}.`
                  : result.ehgAssessment.reasons.join(" ")}
              </p>

              <div className="member-board">
                {formValues.members.map((member, index) => {
                  const memberProjection = result.household.members.find(
                    (item) => item.id === member.id,
                  );

                  return (
                    <article className="member-card" key={member.id}>
                      <div className="member-card-head">
                        <div>
                          <p className="section-kicker">Person {index + 1}</p>
                          <h3>{formatRoleLabel(member.role)}</h3>
                        </div>
                        {formValues.members.length > 2 ? (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => removeMember(member.id)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <section className="member-section">
                        <p className="section-kicker">Particulars</p>
                        <div className="field-grid member-field-grid">
                          <Field label="Role">
                            <select
                              value={member.role}
                              onChange={(event) =>
                                handleMemberFieldChange(member.id, "role", event.target.value)
                              }
                            >
                              <option value="applicant">Applicant</option>
                              <option value="co-applicant">Co-applicant</option>
                              <option value="essential-occupier">Essential occupier</option>
                              <option value="household-member">Household member</option>
                            </select>
                          </Field>

                          <Field label="Citizenship">
                            <select
                              value={member.citizenship}
                              onChange={(event) =>
                                handleMemberFieldChange(
                                  member.id,
                                  "citizenship",
                                  event.target.value,
                                )
                              }
                            >
                              <option value="singapore-citizen">Singapore Citizen</option>
                              <option value="permanent-resident">Singapore PR</option>
                              <option value="other">Other</option>
                            </select>
                          </Field>

                          <Field label="Age">
                            <input
                              type="number"
                              min="18"
                              max="100"
                              value={member.ageYears}
                              onChange={(event) =>
                                handleMemberFieldChange(
                                  member.id,
                                  "ageYears",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Monthly income contribution (SGD)">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={member.monthlyIncome}
                              onChange={(event) =>
                                handleMemberFieldChange(
                                  member.id,
                                  "monthlyIncome",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>
                        </div>
                      </section>

                      <section className="member-section">
                        <p className="section-kicker">Funding Position</p>
                        <div className="field-grid member-field-grid">
                          <Field label="Current CPF OA balance (SGD)">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={member.currentCpfOaBalance}
                              onChange={(event) =>
                                handleMemberFieldChange(
                                  member.id,
                                  "currentCpfOaBalance",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Current cash savings (SGD)">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={member.currentCashSavings}
                              onChange={(event) =>
                                handleMemberFieldChange(
                                  member.id,
                                  "currentCashSavings",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>
                        </div>
                      </section>

                      <section className="member-section">
                        <p className="section-kicker">Eligibility Flags</p>
                        <div className="toggle-row">
                          <ToggleField
                            label="First-timer"
                            checked={member.firstTimer}
                            onChange={(checked) =>
                              handleMemberFieldChange(member.id, "firstTimer", checked)
                            }
                          />
                          <ToggleField
                            label="12 months employment continuity"
                            checked={member.employmentContinuous12Months}
                            onChange={(checked) =>
                              handleMemberFieldChange(
                                member.id,
                                "employmentContinuous12Months",
                                checked,
                              )
                            }
                          />
                          <ToggleField
                            label="Currently working"
                            checked={member.currentlyWorking}
                            onChange={(checked) =>
                              handleMemberFieldChange(member.id, "currentlyWorking", checked)
                            }
                          />
                        </div>
                      </section>

                      <div className="member-card-foot">
                        <span className="small">
                          CPF defaults: {memberProjection?.cpfBand ?? "Awaiting age input"}
                        </span>
                        <span className="inline-chip">
                          OA inflow preview: {toCurrency(memberProjection?.oaMonthlyInflow ?? 0)} /
                          month
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

          {activeTab === "property-loan" ? (
            <>
              <div className="section-header">
                <div>
                  <h2>Flat & Loan</h2>
                  <p className="small">
                    This tab is for the numbers you are choosing. The selected financing
                    route and grant checks are kept in the next tab so the policy logic
                    stays together.
                  </p>
                </div>
              </div>

              <div className="split-grid">
                <article className="subpanel">
                  <p className="section-kicker">Flat assumptions</p>
                  <div className="field-grid">
                    <Field label="Flat type">
                      <select
                        name="flatType"
                        value={formValues.flatType}
                        onChange={handlePlannerFieldChange}
                      >
                        <option value="2-room">2-room Flexi</option>
                        <option value="3-room">3-room</option>
                        <option value="4-room">4-room</option>
                        <option value="5-room">5-room / 3-Gen</option>
                        <option value="executive">Executive / Multi-Generation</option>
                      </select>
                    </Field>

                    <Field label="Flat price (SGD)">
                      <input
                        type="number"
                        name="flatPrice"
                        min="0"
                        step="1000"
                        value={formValues.flatPrice}
                        onChange={handlePlannerFieldChange}
                      />
                    </Field>

                    <Field label="Application start date">
                      <input
                        type="date"
                        name="applicationDate"
                        value={formValues.applicationDate}
                        onChange={handlePlannerFieldChange}
                      />
                    </Field>

                    <RangeField
                      label="Completion timeline from booking"
                      name="completionMonths"
                      min={24}
                      max={72}
                      step={1}
                      value={formValues.completionMonths}
                      suffix="months"
                      onChange={handlePlannerFieldChange}
                    />
                  </div>
                </article>

                <article className="subpanel">
                  <p className="section-kicker">Loan assumptions</p>
                  <div className="field-grid">
                    <RangeField
                      label="Annual interest rate"
                      name="annualInterestRate"
                      min={0}
                      max={6}
                      step={0.05}
                      value={formValues.annualInterestRate}
                      suffix="%"
                      onChange={handlePlannerFieldChange}
                    />

                    <RangeField
                      label="Loan tenure"
                      name="loanTenureYears"
                      min={5}
                      max={35}
                      step={1}
                      value={formValues.loanTenureYears}
                      suffix="years"
                      onChange={handlePlannerFieldChange}
                    />

                    <Field label="Planned monthly cash set-aside (SGD)">
                      <input
                        type="number"
                        name="plannedMonthlyCashSetAside"
                        min="0"
                        step="100"
                        value={formValues.plannedMonthlyCashSetAside}
                        onChange={handlePlannerFieldChange}
                      />
                    </Field>
                  </div>
                </article>
              </div>

              <div className="summary-strip">
                <SummaryStat
                  label="Net price after grant"
                  value={toCurrency(result.netPurchasePrice)}
                />
                <SummaryStat
                  label="Estimated loan amount"
                  value={toCurrency(result.estimatedLoanAmount)}
                />
                <SummaryStat
                  label="Loan term"
                  value={`${result.monthlyLoanProjection.termMonths} months`}
                />
              </div>
            </>
          ) : null}

          {activeTab === "scheme-grants" ? (
            <>
              <div className="section-header">
                <div>
                  <h2>Scheme & Grant</h2>
                  <p className="small">
                    This tab shows the policy side clearly: what the rule says, what
                    your current household or selected scheme looks like, and whether it
                    lines up.
                  </p>
                </div>
              </div>

              <div className="subpanel">
                <p className="section-kicker">Selected route</p>
                <div className="field-grid">
                  <Field label="Financing">
                    <select
                      name="financing"
                      value={formValues.financing}
                      onChange={handlePlannerFieldChange}
                    >
                      <option value="hdb">HDB loan</option>
                      <option value="bank">Bank loan</option>
                      <option value="none">No loan</option>
                    </select>
                  </Field>

                  <Field label="Downpayment scheme">
                    <select
                      name="scheme"
                      value={formValues.scheme}
                      onChange={handlePlannerFieldChange}
                    >
                      <option value="normal">Normal</option>
                      <option value="staggered">Staggered</option>
                      <option value="dia">Deferred Income Assessment</option>
                    </select>
                  </Field>

                  <RangeField
                    label="Loan-to-value ratio"
                    name="ltvRatio"
                    min={0}
                    max={90}
                    step={1}
                    value={formValues.ltvRatio}
                    suffix="%"
                    onChange={handlePlannerFieldChange}
                  />
                </div>
              </div>

              <article className="grant-hero">
                <div className="grant-hero-amount">
                  <p className="section-kicker">Line One: Grant Snapshot</p>
                  <strong>{toCurrency(result.ehgGrant)}</strong>
                  <p className="small">{result.ehgAssessment.bandLabel}</p>
                  <span
                    className={
                      result.ehgAssessment.eligible
                        ? "grant-status grant-status-pass"
                        : "grant-status grant-status-fail"
                    }
                  >
                    {result.ehgAssessment.eligible
                      ? "Eligible based on current profile"
                      : "Eligibility gaps detected"}
                  </span>
                </div>
                <div className="grant-hero-meter">
                  <div className="grant-hero-meter-head">
                    <strong>Eligibility vs current status</strong>
                    <span>
                      {toCurrency(result.ehgAssessment.averageMonthlyIncome)} of{" "}
                      {toCurrency(EHG_FAMILIES_POLICY_META.maxIncomeInclusive)}
                    </span>
                  </div>
                  <div className="grant-meter-track" aria-hidden="true">
                    <span
                      className="grant-meter-fill"
                      style={{ width: `${ehgIncomeRatioPercent}%` }}
                    ></span>
                  </div>
                  <p className="small muted-line">
                    Lower income bands qualify for higher grant amounts. Keep this line
                    comfortably within the policy ceiling.
                  </p>
                </div>
              </article>

              <div className="summary-strip">
                <SummaryStat
                  label="Families EHG"
                  value={toCurrency(result.ehgGrant)}
                  hint={result.ehgAssessment.bandLabel}
                />
                <SummaryStat
                  label="Household income"
                  value={toCurrency(result.ehgAssessment.averageMonthlyIncome)}
                />
                <SummaryStat
                  label="OA-only coverage"
                  value={toPercentage(result.monthlyOaCoverageRatio)}
                  hint={
                    result.monthlyCashTopUp > 0
                      ? `${toCurrency(result.monthlyCashTopUp)} top-up needed`
                      : "OA covers instalment"
                  }
                />
              </div>

              <div className="comparison-grid">
                <ComparisonTable
                  title="Families EHG requirement vs current value"
                  intro={`Grounded in ${EHG_FAMILIES_POLICY_META.sourceDocument} (${EHG_FAMILIES_POLICY_META.sourceReference}).`}
                  rows={result.ehgRequirementRows.slice(0, 6)}
                />
                <ComparisonTable
                  title="Scheme rule vs current amount"
                  intro="This makes the selected financing path and payment rule more concrete."
                  rows={result.schemeRuleRows.slice(0, 6)}
                />
              </div>
            </>
          ) : null}

          {activeTab === "timeline-payments" ? (
            <>
              <div className="section-header">
                <div>
                  <h2>Payments</h2>
                  <p className="small">
                    This tab separates one-off milestone payments from the recurring
                    loan after keys, so you can see what must be prepared upfront and
                    what continues monthly.
                  </p>
                </div>
                <button type="button" className="add-member-button" onClick={exportIcs}>
                  Export reminders
                </button>
              </div>

              <div className="summary-strip">
                <SummaryStat
                  label="Before keys"
                  value={toCurrency(result.knownDueBeforeKeys)}
                />
                <SummaryStat
                  label="At key collection"
                  value={toCurrency(result.knownDueAtKeyCollection)}
                />
                <SummaryStat
                  label="Monthly after keys"
                  value={toCurrency(result.monthlyLoanProjection.monthlyInstalment)}
                />
                <SummaryStat
                  label="Still to confirm"
                  value={`${result.pendingAmountCount}`}
                  hint={result.pendingAmountCount === 1 ? "1 pending amount" : `${result.pendingAmountCount} pending amounts`}
                />
              </div>

              <article className="subpanel">
                <div className="subpanel-head">
                  <div>
                    <p className="section-kicker">Monthly loan after key collection</p>
                    <h3>Recurring repayment summary</h3>
                  </div>
                  <p className="small">
                    Based on {formatFinancingLabel(formValues.financing)},{" "}
                    {formatPercent(clampBetween(toNumber(formValues.ltvRatio), 0, 100) / 100)} LTV,
                    and a {result.monthlyLoanProjection.termMonths}-month loan term.
                  </p>
                </div>

                {result.loanRepaymentSummary.hasLoan ? (
                  <div className="summary-strip loan-summary-strip">
                    <SummaryStat
                      label="First payment"
                      value={
                        result.loanRepaymentSummary.firstPaymentDate
                          ? formatDate(result.loanRepaymentSummary.firstPaymentDate)
                          : "N/A"
                      }
                    />
                    <SummaryStat
                      label="OA per month"
                      value={toCurrency(result.loanRepaymentSummary.oaInflow)}
                    />
                    <SummaryStat
                      label="Cash top-up per month"
                      value={toCurrency(result.loanRepaymentSummary.monthlyCashTopUp)}
                    />
                    <SummaryStat
                      label="Cash top-up in year 1"
                      value={toCurrency(result.loanRepaymentSummary.firstYearCashTopUpTotal)}
                    />
                  </div>
                ) : (
                  <NoticeCard
                    tone="neutral"
                    title="No recurring loan instalment in this plan"
                    lines={[
                      "The current setup does not produce a monthly loan repayment.",
                    ]}
                  />
                )}
              </article>

              <div className="payment-timeline" aria-label="Payment timeline">
                {result.paymentGroups.map((group, groupIndex) => (
                  <article className={`payment-node payment-node-${toStageTone(group.stage)}`} key={group.stage + groupIndex}>
                    <span className="payment-node-dot" aria-hidden="true">
                      {toStageIcon(group.stage)}
                    </span>
                    <div className="payment-node-main">
                      <div className="payment-matrix-layout">
                        <aside className="payment-node-side">
                          <p className="section-kicker">{group.stage}</p>
                          <p className="payment-side-date">{formatDate(group.date)}</p>
                          <div className="payment-node-amount">{toCurrency(group.knownTotal)}</div>
                          <p className="small">
                            {group.rows.length} item(s)
                            {group.rows.some((row) => row.amount === null)
                              ? ` • ${group.rows.filter((row) => row.amount === null).length} pending`
                              : ""}
                          </p>
                          <div className="cpf-meter">
                            <div className="cpf-meter-head">
                              <span>CPF/OA-payable known</span>
                              <strong>{toCurrency(getCpfEligibleKnownTotal(group.rows))}</strong>
                            </div>
                            <div className="cpf-meter-track" aria-hidden="true">
                              <span
                                className="cpf-meter-fill"
                                style={{ width: `${getCpfEligibleRatio(group.rows)}%` }}
                              ></span>
                            </div>
                          </div>
                        </aside>

                        <div className="payment-matrix-wrap">
                          <table className="payment-matrix">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Funding</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.rows.map((row, rowIndex) => {
                                const funding = getFundingBadge(row.paymentMode);

                                return (
                                  <tr key={row.item + rowIndex} className="payment-row">
                                    <td className="payment-item-cell">
                                      <span className="payment-item-name">{row.item}</span>
                                      <div className="payment-tooltip" role="tooltip">
                                        <p>
                                          <strong>Payment type:</strong> {row.paymentMode}
                                        </p>
                                        <p>
                                          <strong>Details:</strong> {row.remarks}
                                        </p>
                                        <p>
                                          <strong>Source:</strong> {renderSource(row.sourceKey)}
                                        </p>
                                      </div>
                                    </td>
                                    <td>{row.amount === null ? "Depends" : toCurrency(row.amount)}</td>
                                    <td>{formatDate(row.date)}</td>
                                    <td>
                                      <span className={`funding-badge funding-${funding.tone}`}>
                                        {funding.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {activeTab === "sources" ? (
            <>
              <div className="section-header">
                <div>
                  <h2>Sources</h2>
                  <p className="small">
                    Small, dedicated reference tab for policy and process links.
                  </p>
                </div>
              </div>
              <article className="sources-panel">
                <ul className="source-list source-columns">
                  {Object.entries(POLICY.sources).map(([key]) => (
                    <li key={key}>{renderSource(key as SourceKey)}</li>
                  ))}
                </ul>
              </article>
            </>
          ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-title">{props.label}</span>
      {props.children}
    </label>
  );
}

function ToggleField(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-field">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

function RangeField(props: {
  label: string;
  name: string;
  value: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="field">
      <span className="field-title">{props.label}</span>
      <div className="range-field">
        <input
          type="range"
          name={props.name}
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onChange={props.onChange}
        />
        <div className="range-meta">
          <input
            type="number"
            name={props.name}
            min={props.min}
            max={props.max}
            step={props.step}
            value={props.value}
            onChange={props.onChange}
          />
          <span>{props.suffix}</span>
        </div>
      </div>
    </label>
  );
}

function SummaryStat(props: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warn";
}) {
  return (
    <div
      className={
        props.tone === "success"
          ? "summary-stat summary-stat-success"
          : props.tone === "warn"
            ? "summary-stat summary-stat-warn"
            : "summary-stat"
      }
    >
      <span className="summary-stat-label">{props.label}</span>
      <strong className="summary-stat-value">{props.value}</strong>
      {props.hint ? <span className="summary-stat-hint">{props.hint}</span> : null}
    </div>
  );
}

function NoticeCard(props: {
  tone: "neutral" | "success" | "warn";
  title: string;
  lines: string[];
}) {
  return (
    <article className={`notice-card notice-${props.tone}`}>
      <h3>{props.title}</h3>
      <ul>
        {props.lines.map((line, index) => (
          <li key={line + index}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

function ComparisonTable(props: {
  title: string;
  intro: string;
  rows: ComparisonRow[];
}) {
  return (
    <article className="comparison-card">
      <div className="comparison-card-head">
        <h3>{props.title}</h3>
        <p className="small">{props.intro}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Requirement</th>
              <th>Current value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.requirement}</td>
                <td>{row.currentValue}</td>
                <td>
                  <span
                    className={`status-badge ${
                      row.status === "pass"
                        ? "status-ok"
                        : row.status === "fail"
                          ? "status-gap"
                          : "status-info"
                    }`}
                  >
                    {row.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function renderSource(sourceKey: SourceKey) {
  const source = POLICY.sources[sourceKey];

  if (source.url.startsWith("http")) {
    return (
      <a href={source.url} target="_blank" rel="noreferrer">
        {source.label}
      </a>
    );
  }

  return <span>{source.label}</span>;
}

function toStageTone(stage: StageName): "application" | "booking" | "agreement" | "key" {
  if (stage === "Application") {
    return "application";
  }

  if (stage === "Flat Booking") {
    return "booking";
  }

  if (stage === "Sign Agreement for Lease") {
    return "agreement";
  }

  return "key";
}

function toStageIcon(stage: StageName): string {
  if (stage === "Application") {
    return "📝";
  }

  if (stage === "Flat Booking") {
    return "🏠";
  }

  if (stage === "Sign Agreement for Lease") {
    return "📄";
  }

  return "🔑";
}

function isCpfOaPayable(paymentMode: string): boolean | null {
  const normalized = paymentMode.toLowerCase();

  if (normalized.includes("cannot use cpf") || normalized.includes("cash only")) {
    return false;
  }

  if (normalized.includes("cpf")) {
    return true;
  }

  return null;
}

function getCpfEligibleKnownTotal(rows: ScheduleRow[]): number {
  return roundTo2(
    rows.reduce((sum, row) => {
      if (row.amount === null) {
        return sum;
      }

      return isCpfOaPayable(row.paymentMode) === true ? sum + row.amount : sum;
    }, 0),
  );
}

function getCpfEligibleRatio(rows: ScheduleRow[]): number {
  const knownTotal = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  if (knownTotal <= 0) {
    return 0;
  }

  return (getCpfEligibleKnownTotal(rows) / knownTotal) * 100;
}

function getFundingBadge(paymentMode: string): {
  label: string;
  tone: "cpf" | "cash" | "mixed";
} {
  const payable = isCpfOaPayable(paymentMode);

  if (payable === true) {
    return {
      label: "CPF/OA possible",
      tone: "cpf",
    };
  }

  if (payable === false) {
    return {
      label: "Cash only",
      tone: "cash",
    };
  }

  return {
    label: "Check notice",
    tone: "mixed",
  };
}

function formatRoleLabel(role: PersonRole): string {
  if (role === "co-applicant") {
    return "Co-applicant";
  }

  if (role === "essential-occupier") {
    return "Essential occupier";
  }

  if (role === "household-member") {
    return "Household member";
  }

  return "Applicant";
}

function formatFinancingLabel(financing: FinancingOption): string {
  if (financing === "hdb") {
    return "HDB loan";
  }

  if (financing === "bank") {
    return "Bank loan";
  }

  return "No loan";
}

function formatSchemeLabel(scheme: DownpaymentScheme): string {
  if (scheme === "dia") {
    return "Deferred Income Assessment";
  }

  if (scheme === "staggered") {
    return "Staggered";
  }

  return "Normal";
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("hdb-planner-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function createInitialFormValues(): PlannerFormValues {
  return {
    flatType: "4-room",
    flatPrice: "650000",
    financing: "hdb",
    scheme: "dia",
    ltvRatio: "75",
    annualInterestRate: "2.6",
    loanTenureYears: "25",
    completionMonths: "42",
    plannedMonthlyCashSetAside: "1200",
    applicationDate: toInputDate(new Date()),
    members: [
      {
        id: "person-1",
        role: "applicant",
        citizenship: "singapore-citizen",
        firstTimer: true,
        ageYears: "30",
        employmentContinuous12Months: true,
        currentlyWorking: true,
        monthlyIncome: "2400",
        currentCpfOaBalance: "35000",
        currentCashSavings: "18000",
      },
      {
        id: "person-2",
        role: "co-applicant",
        citizenship: "permanent-resident",
        firstTimer: true,
        ageYears: "29",
        employmentContinuous12Months: true,
        currentlyWorking: true,
        monthlyIncome: "1800",
        currentCpfOaBalance: "20000",
        currentCashSavings: "10000",
      },
    ],
  };
}

function createMember(index: number): PersonFormValues {
  return {
    id: `person-${index + 1}`,
    role: "household-member",
    citizenship: "permanent-resident",
    firstTimer: true,
    ageYears: "24",
    employmentContinuous12Months: true,
    currentlyWorking: false,
    monthlyIncome: "0",
    currentCpfOaBalance: "0",
    currentCashSavings: "0",
  };
}

export function calculatePlan(inputs: PlannerFormValues): CalculationResult {
  const flatPrice = clampNonNegative(toNumber(inputs.flatPrice));
  const household = calculateHouseholdProjection(inputs);
  const ehgAssessment = calculateEhgAssessment(household);
  const ehgGrant = clampBetween(ehgAssessment.grantAmount, 0, flatPrice);
  const netPurchasePrice = Math.max(0, flatPrice - ehgGrant);

  const rule = POLICY.downpaymentRules[inputs.financing][inputs.scheme];
  const optionFee = POLICY.fees.optionFeeByFlatType[inputs.flatType] ?? 0;

  const signingDownpaymentGross = netPurchasePrice * rule.signing;
  const optionFeeApplied = Math.min(optionFee, signingDownpaymentGross);
  const signingDownpaymentDue = Math.max(0, signingDownpaymentGross - optionFeeApplied);
  const keyDownpaymentDue = netPurchasePrice * rule.key;
  const totalDownpayment = signingDownpaymentGross + keyDownpaymentDue;

  const loanByRatio =
    inputs.financing === "none"
      ? 0
      : netPurchasePrice * (clampBetween(toNumber(inputs.ltvRatio), 0, 100) / 100);
  const loanCapByRule = Math.max(0, netPurchasePrice - totalDownpayment);
  const estimatedLoanAmount = Math.min(loanByRatio, loanCapByRule);
  const unfundedAtKey = Math.max(0, netPurchasePrice - totalDownpayment - estimatedLoanAmount);

  const monthlyLoanProjection = calculateMonthlyInstalment(
    estimatedLoanAmount,
    clampNonNegative(toNumber(inputs.annualInterestRate)) / 100,
    clampNonNegative(toNumber(inputs.loanTenureYears)),
  );

  const bsdAmount = calculateBsd(flatPrice);
  const legalFee = calculateLegalFee(flatPrice, POLICY.fees.gstRate);
  const deedStampDuty =
    estimatedLoanAmount > 0 ? calculateMortgageDuty(estimatedLoanAmount) : 0;
  const registrationFee = estimateRegistrationFee(inputs.financing);
  const surveyFee = POLICY.fees.surveyFeeByFlatType[inputs.flatType] ?? 0;
  const fireInsurance =
    inputs.financing === "hdb" ? POLICY.fees.fireInsuranceByFlatType[inputs.flatType] ?? 0 : 0;

  const completionMonths =
    clampNonNegative(toNumber(inputs.completionMonths)) ||
    POLICY.defaultOffsets.keyAfterBookingMonths;
  const dates = estimateDates(inputs, completionMonths);

  const scheduleRows = buildScheduleRows({
    dates,
    optionFee,
    signingDownpaymentDue,
    keyDownpaymentDue,
    bsdAmount,
    legalFee,
    deedStampDuty,
    registrationFee,
    surveyFee,
    fireInsurance,
    unfundedAtKey,
    financing: inputs.financing,
    ruleNote: rule.note,
  });

  const paymentGroups = groupPaymentRows(scheduleRows);
  const paymentStageSummaries = buildPaymentStageSummaries(scheduleRows);
  const stageFeasibility = buildStageFeasibility({
    dates,
    scheduleRows,
    household,
    netPurchasePrice,
    minCashSigning: rule.minCashSigning,
    optionFeeApplied,
  });
  const feasibilitySummary = summarizeFeasibility(stageFeasibility);

  const monthlyOaCoverageRatio =
    monthlyLoanProjection.monthlyInstalment === 0
      ? 1
      : household.oaMonthlyInflow / monthlyLoanProjection.monthlyInstalment;
  const monthlyCashTopUp =
    monthlyLoanProjection.monthlyInstalment === 0
      ? 0
      : Math.max(0, monthlyLoanProjection.monthlyInstalment - household.oaMonthlyInflow);
  const knownDueBeforeKeys = paymentStageSummaries
    .filter((summary) => summary.stage !== "Key Collection")
    .reduce((sum, summary) => sum + summary.knownTotal, 0);
  const knownDueAtKeyCollection =
    paymentStageSummaries.find((summary) => summary.stage === "Key Collection")?.knownTotal ?? 0;
  const pendingAmountCount = scheduleRows.filter((row) => row.amount === null).length;

  return {
    inputs,
    dates,
    household,
    ehgAssessment,
    flatPrice,
    ehgGrant,
    netPurchasePrice,
    optionFee,
    totalDownpayment,
    estimatedLoanAmount,
    monthlyLoanProjection,
    unfundedAtKey,
    bsdAmount,
    legalFee,
    knownPayable: scheduleRows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    knownDueBeforeKeys,
    knownDueAtKeyCollection,
    pendingAmountCount,
    scheduleRows,
    paymentGroups,
    paymentStageSummaries,
    stageFeasibility,
    feasibilitySummary,
    ehgRequirementRows: buildEhgRequirementRows(household, ehgAssessment),
    schemeRuleRows: buildSchemeRuleRows({
      inputs,
      household,
      rule,
      netPurchasePrice,
      optionFeeApplied,
      signingDownpaymentDue,
      keyDownpaymentDue,
      estimatedLoanAmount,
      unfundedAtKey,
      monthlyLoanProjection,
      monthlyCashTopUp,
    }),
    loanRepaymentSummary: buildLoanRepaymentSummary({
      financing: inputs.financing,
      keyDate: dates.keyDate,
      monthlyInstalment: monthlyLoanProjection.monthlyInstalment,
      oaInflow: household.oaMonthlyInflow,
      termMonths: monthlyLoanProjection.termMonths,
      principal: estimatedLoanAmount,
    }),
    monthlyOaCoverageRatio,
    monthlyCashTopUp,
  };
}

function calculateHouseholdProjection(inputs: PlannerFormValues): HouseholdProjection {
  const members = inputs.members.map((member) => {
    const ageYears = clampBetween(toNumber(member.ageYears), 18, 100);
    const cpfDefaults = getCpfDefaultsForAge(ageYears);
    const monthlyIncome = clampNonNegative(toNumber(member.monthlyIncome));
    const totalCpfRate = cpfDefaults.employeeRate + cpfDefaults.employerRate;
    const oaMonthlyInflow = member.currentlyWorking
      ? monthlyIncome * totalCpfRate * cpfDefaults.oaAllocationRate
      : 0;

    return {
      id: member.id,
      role: member.role,
      citizenship: member.citizenship,
      firstTimer: member.firstTimer,
      ageYears,
      monthlyIncome,
      currentCpfOaBalance: clampNonNegative(toNumber(member.currentCpfOaBalance)),
      currentCashSavings: clampNonNegative(toNumber(member.currentCashSavings)),
      currentlyWorking: member.currentlyWorking,
      employmentContinuous12Months: member.employmentContinuous12Months,
      cpfBand: cpfDefaults.band,
      employeeCpfRate: cpfDefaults.employeeRate,
      employerCpfRate: cpfDefaults.employerRate,
      oaAllocationRate: cpfDefaults.oaAllocationRate,
      oaMonthlyInflow: roundTo2(oaMonthlyInflow),
    };
  });

  const relevantMembers = members.filter(
    (member) => member.role !== "household-member",
  );

  return {
    members,
    relevantMembers,
    grossMonthlyIncome: roundTo2(
      relevantMembers.reduce((sum, member) => sum + member.monthlyIncome, 0),
    ),
    oaMonthlyInflow: roundTo2(
      relevantMembers.reduce((sum, member) => sum + member.oaMonthlyInflow, 0),
    ),
    currentCpfOaBalance: roundTo2(
      relevantMembers.reduce((sum, member) => sum + member.currentCpfOaBalance, 0),
    ),
    currentCashSavings: roundTo2(
      members.reduce((sum, member) => sum + member.currentCashSavings, 0),
    ),
    plannedMonthlyCashSetAside: clampNonNegative(toNumber(inputs.plannedMonthlyCashSetAside)),
  };
}

function calculateEhgAssessment(household: HouseholdProjection): EhgAssessment {
  const reasons: string[] = [];
  const relevantMembers = household.relevantMembers;
  const applicants = relevantMembers.filter(
    (member) => member.role === "applicant" || member.role === "co-applicant",
  );

  if (relevantMembers.length < 2) {
    reasons.push("Add at least two relevant family members for the families-only EHG flow.");
  }

  if (applicants.length === 0) {
    reasons.push("Include at least one applicant or co-applicant in the relevant household.");
  }

  if (!relevantMembers.some((member) => member.citizenship === "singapore-citizen")) {
    reasons.push("At least one relevant family member should be a Singapore Citizen.");
  }

  if (
    relevantMembers.some(
      (member) =>
        member.citizenship !== "singapore-citizen" &&
        member.citizenship !== "permanent-resident",
    )
  ) {
    reasons.push("This planner treats non-SC/SPR family profiles as unsupported for EHG.");
  }

  if (relevantMembers.some((member) => !member.firstTimer)) {
    reasons.push("Families EHG from this PDF table applies to first-timer households.");
  }

  if (
    relevantMembers.some(
      (member) =>
        member.monthlyIncome > 0 &&
        (!member.currentlyWorking || !member.employmentContinuous12Months),
    )
  ) {
    reasons.push(
      "Income-contributing members should be currently working and have 12 months of employment continuity.",
    );
  }

  const averageMonthlyIncome = household.grossMonthlyIncome;
  if (averageMonthlyIncome <= 0) {
    reasons.push("Enter at least one positive monthly income contribution for EHG assessment.");
  }

  if (averageMonthlyIncome > EHG_FAMILIES_POLICY_META.maxIncomeInclusive) {
    reasons.push(
      `Average monthly household income exceeds the ${toCurrency(
        EHG_FAMILIES_POLICY_META.maxIncomeInclusive,
      )} ceiling in the local PDF table.`,
    );
  }

  const band = lookupEhgFamiliesGrant(averageMonthlyIncome);
  const eligible = reasons.length === 0 && band !== null;

  return {
    eligible,
    grantAmount: eligible && band ? band.grantAmount : 0,
    bandLabel: band?.label ?? "Outside families EHG band",
    averageMonthlyIncome,
    reasons: eligible
      ? [
          "Relevant family members pass the planner's first-timer, citizenship, and income checks.",
        ]
      : reasons,
  };
}

function buildEhgRequirementRows(
  household: HouseholdProjection,
  assessment: EhgAssessment,
): ComparisonRow[] {
  const relevantMembers = household.relevantMembers;
  const applicants = relevantMembers.filter(
    (member) => member.role === "applicant" || member.role === "co-applicant",
  ).length;
  const citizenCount = relevantMembers.filter(
    (member) => member.citizenship === "singapore-citizen",
  ).length;
  const firstTimerCount = relevantMembers.filter((member) => member.firstTimer).length;
  const incomeContributors = relevantMembers.filter((member) => member.monthlyIncome > 0);
  const compliantIncomeMembers = incomeContributors.filter(
    (member) => member.currentlyWorking && member.employmentContinuous12Months,
  ).length;
  const band = lookupEhgFamiliesGrant(assessment.averageMonthlyIncome);

  return [
    {
      label: "Relevant family members",
      requirement: "At least 2 relevant members in the family application",
      currentValue: `${relevantMembers.length} relevant member(s)`,
      status: relevantMembers.length >= 2 ? "pass" : "fail",
      statusLabel: relevantMembers.length >= 2 ? "Met" : "Missing",
    },
    {
      label: "Applicant presence",
      requirement: "At least 1 applicant or co-applicant",
      currentValue: `${applicants} applicant / co-applicant member(s)`,
      status: applicants > 0 ? "pass" : "fail",
      statusLabel: applicants > 0 ? "Met" : "Missing",
    },
    {
      label: "Singapore Citizen requirement",
      requirement: "At least 1 relevant member should be a Singapore Citizen",
      currentValue: `${citizenCount} Singapore Citizen(s)`,
      status: citizenCount > 0 ? "pass" : "fail",
      statusLabel: citizenCount > 0 ? "Met" : "Missing",
    },
    {
      label: "First-timer status",
      requirement: "All relevant members should be first-timer",
      currentValue: `${firstTimerCount} of ${relevantMembers.length} marked first-timer`,
      status: firstTimerCount === relevantMembers.length && relevantMembers.length > 0 ? "pass" : "fail",
      statusLabel:
        firstTimerCount === relevantMembers.length && relevantMembers.length > 0
          ? "Met"
          : "Blocked",
    },
    {
      label: "Employment continuity",
      requirement: "Income contributors should be working and employment-continuous",
      currentValue: `${compliantIncomeMembers} of ${incomeContributors.length} income contributor(s) compliant`,
      status:
        incomeContributors.length === compliantIncomeMembers && incomeContributors.length > 0
          ? "pass"
          : "fail",
      statusLabel:
        incomeContributors.length === compliantIncomeMembers && incomeContributors.length > 0
          ? "Met"
          : "Blocked",
    },
    {
      label: "Income ceiling",
      requirement: `Average monthly household income up to ${toCurrency(
        EHG_FAMILIES_POLICY_META.maxIncomeInclusive,
      )}`,
      currentValue: toCurrency(assessment.averageMonthlyIncome),
      status:
        assessment.averageMonthlyIncome > 0 &&
        assessment.averageMonthlyIncome <= EHG_FAMILIES_POLICY_META.maxIncomeInclusive
          ? "pass"
          : "fail",
      statusLabel:
        assessment.averageMonthlyIncome > 0 &&
        assessment.averageMonthlyIncome <= EHG_FAMILIES_POLICY_META.maxIncomeInclusive
          ? "Within limit"
          : "Exceeded",
    },
    {
      label: "Matched PDF band",
      requirement: "Income should map to a families EHG band in the local PDF",
      currentValue: band ? `${band.label} -> ${toCurrency(band.grantAmount)}` : "No eligible band",
      status: band ? "pass" : "fail",
      statusLabel: band ? "Matched" : "No match",
    },
    {
      label: "Current grant outcome",
      requirement: "All families EHG conditions above should be met",
      currentValue:
        assessment.eligible && band
          ? toCurrency(assessment.grantAmount)
          : "No families EHG applied",
      status: assessment.eligible ? "pass" : "fail",
      statusLabel: assessment.eligible ? "Eligible" : "Blocked",
    },
  ];
}

function buildSchemeRuleRows(args: {
  inputs: PlannerFormValues;
  household: HouseholdProjection;
  rule: {
    signing: number;
    key: number;
    minCashSigning: number;
    note: string;
  };
  netPurchasePrice: number;
  optionFeeApplied: number;
  signingDownpaymentDue: number;
  keyDownpaymentDue: number;
  estimatedLoanAmount: number;
  unfundedAtKey: number;
  monthlyLoanProjection: LoanProjection;
  monthlyCashTopUp: number;
}): ComparisonRow[] {
  const minCashRequiredAtSigning = Math.max(
    0,
    args.netPurchasePrice * args.rule.minCashSigning - args.optionFeeApplied,
  );

  return [
    {
      label: "Financing route",
      requirement: "Choose one route for how the flat will be funded",
      currentValue: formatFinancingLabel(args.inputs.financing),
      status: "info",
      statusLabel: "Selected",
    },
    {
      label: "Downpayment scheme",
      requirement: "Choose how the downpayment is split across milestones",
      currentValue: formatSchemeLabel(args.inputs.scheme),
      status: "info",
      statusLabel: "Selected",
    },
    {
      label: "Signing payment",
      requirement: `${formatPercent(args.rule.signing)} of net price due at Agreement for Lease`,
      currentValue: `${toCurrency(args.signingDownpaymentDue)} due after option fee`,
      status: "info",
      statusLabel: "Current",
    },
    {
      label: "Minimum cash at signing",
      requirement: `${formatPercent(args.rule.minCashSigning)} of net price must be cash`,
      currentValue: `${toCurrency(minCashRequiredAtSigning)} required vs ${toCurrency(
        args.household.currentCashSavings,
      )} current cash`,
      status:
        args.household.currentCashSavings >= minCashRequiredAtSigning ? "pass" : "fail",
      statusLabel:
        args.household.currentCashSavings >= minCashRequiredAtSigning
          ? "Covered"
          : "Short",
    },
    {
      label: "Key collection payment",
      requirement: `${formatPercent(args.rule.key)} of net price due at key collection`,
      currentValue: toCurrency(args.keyDownpaymentDue),
      status: "info",
      statusLabel: "Current",
    },
    {
      label: "LTV and loan amount",
      requirement:
        args.inputs.financing === "none"
          ? "No loan funding in this scenario"
          : `${formatPercent(clampBetween(toNumber(args.inputs.ltvRatio), 0, 100) / 100)} planned LTV in this scenario`,
      currentValue:
        args.inputs.financing === "none"
          ? "No loan amount"
          : args.unfundedAtKey > 0
            ? `${toCurrency(args.estimatedLoanAmount)} estimated loan, ${toCurrency(
                args.unfundedAtKey,
              )} still unfunded at key`
            : `${toCurrency(args.estimatedLoanAmount)} estimated loan`,
      status:
        args.inputs.financing === "none"
          ? "info"
          : args.unfundedAtKey > 0
            ? "fail"
            : "pass",
      statusLabel:
        args.inputs.financing === "none"
          ? "No loan"
          : args.unfundedAtKey > 0
            ? "Gap"
            : "Within plan",
    },
    {
      label: "Monthly repayment after keys",
      requirement: "Recurring monthly repayment starts after key collection when a loan is taken",
      currentValue:
        args.monthlyLoanProjection.monthlyInstalment === 0
          ? "No recurring loan payment"
          : `${toCurrency(args.monthlyLoanProjection.monthlyInstalment)} / month, ${toCurrency(
              args.monthlyCashTopUp,
            )} cash top-up after OA`,
      status:
        args.monthlyLoanProjection.monthlyInstalment === 0 || args.monthlyCashTopUp === 0
          ? "pass"
          : "fail",
      statusLabel:
        args.monthlyLoanProjection.monthlyInstalment === 0
          ? "Not needed"
          : args.monthlyCashTopUp === 0
            ? "OA covers"
            : "Top-up needed",
    },
  ];
}

function buildPaymentStageSummaries(scheduleRows: ScheduleRow[]): PaymentStageSummary[] {
  return STAGE_ORDER.map((stage) => {
    const rows = scheduleRows.filter((row) => row.stage === stage);

    return {
      stage,
      knownTotal: roundTo2(rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)),
      lineCount: rows.length,
      pendingCount: rows.filter((row) => row.amount === null).length,
    };
  });
}

function buildLoanRepaymentSummary(args: {
  financing: FinancingOption;
  keyDate: Date;
  monthlyInstalment: number;
  oaInflow: number;
  termMonths: number;
  principal: number;
}): LoanRepaymentSummary {
  if (args.financing === "none" || args.monthlyInstalment <= 0) {
    return {
      hasLoan: false,
      firstPaymentDate: null,
      monthlyInstalment: 0,
      oaInflow: 0,
      monthlyCashTopUp: 0,
      firstYearInstalmentTotal: 0,
      firstYearOaSupportTotal: 0,
      firstYearCashTopUpTotal: 0,
      fullTermRepaymentTotal: 0,
      estimatedInterestTotal: 0,
    };
  }

  const monthsInFirstYear = Math.min(12, args.termMonths);
  const monthlyCashTopUp = Math.max(0, args.monthlyInstalment - args.oaInflow);
  const fullTermRepaymentTotal = roundTo2(args.monthlyInstalment * args.termMonths);

  return {
    hasLoan: true,
    firstPaymentDate: addMonths(args.keyDate, 1),
    monthlyInstalment: args.monthlyInstalment,
    oaInflow: args.oaInflow,
    monthlyCashTopUp,
    firstYearInstalmentTotal: roundTo2(args.monthlyInstalment * monthsInFirstYear),
    firstYearOaSupportTotal: roundTo2(args.oaInflow * monthsInFirstYear),
    firstYearCashTopUpTotal: roundTo2(monthlyCashTopUp * monthsInFirstYear),
    fullTermRepaymentTotal,
    estimatedInterestTotal: roundTo2(Math.max(0, fullTermRepaymentTotal - args.principal)),
  };
}

function calculateMonthlyInstalment(
  principal: number,
  annualRate: number,
  tenureYears: number,
): LoanProjection {
  const loanTenureYears = Math.max(0, tenureYears || 0);
  const termMonths = Math.max(0, Math.round(loanTenureYears * 12));

  if (principal <= 0 || termMonths === 0) {
    return {
      annualInterestRate: annualRate,
      loanTenureYears,
      termMonths,
      monthlyInstalment: 0,
    };
  }

  const monthlyRate = annualRate / 12;
  const monthlyInstalment =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths);

  return {
    annualInterestRate: annualRate,
    loanTenureYears,
    termMonths,
    monthlyInstalment: roundTo2(monthlyInstalment),
  };
}

function buildStageFeasibility(args: {
  dates: EstimatedDates;
  scheduleRows: ScheduleRow[];
  household: HouseholdProjection;
  netPurchasePrice: number;
  minCashSigning: number;
  optionFeeApplied: number;
}): StageFeasibility[] {
  const requiredByStage = sumRequiredByStage(args.scheduleRows);

  const cashFloorByStage: Record<StageName, number> = {
    Application: POLICY.fees.applicationFee,
    "Flat Booking": requiredByStage["Flat Booking"],
    "Sign Agreement for Lease": Math.max(
      0,
      args.netPurchasePrice * args.minCashSigning - args.optionFeeApplied,
    ),
    "Key Collection": 0,
  };

  let cumulativeRequired = 0;
  let cumulativeCashFloor = 0;

  return STAGE_ORDER.map((stage) => {
    const date = getStageDate(stage, args.dates);
    const monthsFromStart = monthsBetween(args.dates.applicationDate, date);
    const stageRequired = requiredByStage[stage];
    const cashFloorStage = cashFloorByStage[stage];

    cumulativeRequired += stageRequired;
    cumulativeCashFloor += cashFloorStage;

    const estimatedCashAvailable =
      args.household.currentCashSavings +
      args.household.plannedMonthlyCashSetAside * monthsFromStart;
    const estimatedOaAvailable =
      args.household.currentCpfOaBalance + args.household.oaMonthlyInflow * monthsFromStart;
    const estimatedTotalAvailable = estimatedCashAvailable + estimatedOaAvailable;
    const surplus = estimatedTotalAvailable - cumulativeRequired;
    const coverageRatio =
      cumulativeRequired === 0 ? 1 : estimatedTotalAvailable / cumulativeRequired;
    const isCashFeasible = estimatedCashAvailable >= cumulativeCashFloor;
    const isFeasible = surplus >= 0 && isCashFeasible;

    return {
      stage,
      date,
      monthsFromStart,
      stageRequired,
      cumulativeRequired,
      cashFloorStage,
      cumulativeCashFloor,
      estimatedCashAvailable: roundTo2(estimatedCashAvailable),
      estimatedOaAvailable: roundTo2(estimatedOaAvailable),
      estimatedTotalAvailable: roundTo2(estimatedTotalAvailable),
      surplus: roundTo2(surplus),
      coverageRatio,
      isCashFeasible,
      isFeasible,
    };
  });
}

function summarizeFeasibility(stageRows: StageFeasibility[]): FeasibilitySummary {
  if (stageRows.length === 0) {
    return {
      feasibleStages: 0,
      totalStages: 0,
      keyStageProjectedAvailable: 0,
      keyStageCumulativeRequired: 0,
      keyStageSurplus: 0,
      overallCoverageRatio: 0,
    };
  }

  const keyStage = stageRows[stageRows.length - 1];

  return {
    feasibleStages: stageRows.filter((row) => row.isFeasible).length,
    totalStages: stageRows.length,
    keyStageProjectedAvailable: keyStage.estimatedTotalAvailable,
    keyStageCumulativeRequired: keyStage.cumulativeRequired,
    keyStageSurplus: keyStage.surplus,
    overallCoverageRatio:
      keyStage.cumulativeRequired === 0
        ? 1
        : keyStage.estimatedTotalAvailable / keyStage.cumulativeRequired,
  };
}

function sumRequiredByStage(scheduleRows: ScheduleRow[]): Record<StageName, number> {
  const totals: Record<StageName, number> = {
    Application: 0,
    "Flat Booking": 0,
    "Sign Agreement for Lease": 0,
    "Key Collection": 0,
  };

  scheduleRows.forEach((row) => {
    if (row.amount !== null) {
      totals[row.stage] += row.amount;
    }
  });

  return totals;
}

function getStageDate(stage: StageName, dates: EstimatedDates): Date {
  if (stage === "Application") {
    return dates.applicationDate;
  }

  if (stage === "Flat Booking") {
    return dates.bookingDate;
  }

  if (stage === "Sign Agreement for Lease") {
    return dates.agreementDate;
  }

  return dates.keyDate;
}

function monthsBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.max(0, (endDate.getTime() - startDate.getTime()) / msPerDay);
  return roundTo2(diffDays / 30.4375);
}

function buildScheduleRows(args: {
  dates: EstimatedDates;
  optionFee: number;
  signingDownpaymentDue: number;
  keyDownpaymentDue: number;
  bsdAmount: number;
  legalFee: LegalFeeBreakdown;
  deedStampDuty: number;
  registrationFee: number;
  surveyFee: number;
  fireInsurance: number;
  unfundedAtKey: number;
  financing: FinancingOption;
  ruleNote: string;
}): ScheduleRow[] {
  const rows: ScheduleRow[] = [
    {
      stage: "Application",
      item: "Application fee",
      amount: POLICY.fees.applicationFee,
      date: args.dates.applicationDate,
      paymentMode: "Credit Card / PayNow",
      remarks: "Non-refundable administrative fee.",
      sourceKey: "applicationFee",
    },
    {
      stage: "Flat Booking",
      item: "Option fee",
      amount: args.optionFee,
      date: args.dates.bookingDate,
      paymentMode: "NETS",
      remarks: "This is offset against the signing downpayment.",
      sourceKey: "bookingOptionFee",
    },
    {
      stage: "Sign Agreement for Lease",
      item: "Downpayment (first instalment)",
      amount: args.signingDownpaymentDue,
      date: args.dates.agreementDate,
      paymentMode: "Cash and/or CPF OA",
      remarks: args.ruleNote,
      sourceKey: "agreementLease",
    },
    {
      stage: "Sign Agreement for Lease",
      item: "Buyer stamp duty",
      amount: args.bsdAmount,
      date: args.dates.agreementDate,
      paymentMode: "As instructed at the appointment",
      remarks: "Calculated using current IRAS residential BSD tiers.",
      sourceKey: "bsd",
    },
    {
      stage: "Sign Agreement for Lease",
      item: "Legal fee",
      amount: args.legalFee.totalInclusive,
      date: args.dates.agreementDate,
      paymentMode: "Cash and/or CPF OA",
      remarks: `Base ${toCurrency(args.legalFee.baseRounded)}, GST ${toCurrency(
        args.legalFee.gstAmount,
      )}.`,
      sourceKey: "agreementLease",
    },
    {
      stage: "Key Collection",
      item: "Downpayment (second instalment)",
      amount: args.keyDownpaymentDue,
      date: args.dates.keyDate,
      paymentMode: "Cash and/or CPF OA",
      remarks: "Second instalment under the selected financing scheme.",
      sourceKey: "agreementLease",
    },
  ];

  if (args.unfundedAtKey > 0) {
    rows.push({
      stage: "Key Collection",
      item: "Additional amount not covered by loan",
      amount: args.unfundedAtKey,
      date: args.dates.keyDate,
      paymentMode: "Cash and/or CPF OA",
      remarks: "Shows up when the selected LTV is below the required financing need.",
      sourceKey: "keyCollection",
    });
  }

  if (args.deedStampDuty > 0) {
    rows.push({
      stage: "Key Collection",
      item: "Stamp duty for deed of assignment",
      amount: args.deedStampDuty,
      date: args.dates.keyDate,
      paymentMode: "As instructed at the appointment",
      remarks: "0.4% of the loan amount, capped at $500.",
      sourceKey: "keyCollection",
    });
  }

  rows.push({
    stage: "Key Collection",
    item: "Registration fee",
    amount: args.registrationFee,
    date: args.dates.keyDate,
    paymentMode: "Cashier's Order / CPF where allowed",
    remarks: "Auto-filled from the planner's policy baseline.",
    sourceKey: "keyCollection",
  });

  rows.push({
    stage: "Key Collection",
    item: "Survey fee",
    amount: args.surveyFee,
    date: args.dates.keyDate,
    paymentMode: "As instructed at the appointment",
    remarks: "Flat-type based fee.",
    sourceKey: "keyCollection",
  });

  if (args.fireInsurance > 0) {
    rows.push({
      stage: "Key Collection",
      item: "HDB fire insurance",
      amount: args.fireInsurance,
      date: args.dates.keyDate,
      paymentMode: "Cannot use CPF",
      remarks: "Mandatory for households with outstanding HDB loans.",
      sourceKey: "fireInsurance",
    });
  }

  if (args.financing !== "none") {
    rows.push({
      stage: "Key Collection",
      item: "Home Protection Scheme premium",
      amount: null,
      date: args.dates.keyDate,
      paymentMode: "CPF OA or cash",
      remarks: "Amount depends on the member-level loan profile and HPS quotation.",
      sourceKey: "hps",
    });
  }

  return rows;
}

function groupPaymentRows(rows: ScheduleRow[]): PaymentGroup[] {
  const grouped = new Map<string, PaymentGroup>();

  rows.forEach((row) => {
    const key = `${row.stage}-${toInputDate(row.date)}`;
    const current = grouped.get(key);

    if (current) {
      current.rows.push(row);
      current.knownTotal += row.amount ?? 0;
      return;
    }

    grouped.set(key, {
      stage: row.stage,
      date: row.date,
      rows: [row],
      knownTotal: row.amount ?? 0,
    });
  });

  return Array.from(grouped.values()).sort(
    (left, right) => left.date.getTime() - right.date.getTime(),
  );
}

function estimateDates(inputs: PlannerFormValues, completionMonths: number): EstimatedDates {
  const applicationDate = parseDate(inputs.applicationDate) ?? new Date();
  const ballotDate = addMonths(applicationDate, POLICY.defaultOffsets.ballotAfterMonths);
  const bookingDate = addDays(ballotDate, POLICY.defaultOffsets.bookingAfterBallotWeeks * 7);
  const agreementDate = addMonths(bookingDate, POLICY.defaultOffsets.agreementAfterBookingMonths);
  const keyDate = addMonths(bookingDate, completionMonths);

  return {
    applicationDate,
    ballotDate,
    bookingDate,
    agreementDate,
    keyDate,
  };
}

function calculateBsd(purchasePrice: number): number {
  const tiers = [
    { cap: 180000, rate: 0.01 },
    { cap: 180000, rate: 0.02 },
    { cap: 640000, rate: 0.03 },
    { cap: 500000, rate: 0.04 },
    { cap: 1500000, rate: 0.05 },
    { cap: Number.POSITIVE_INFINITY, rate: 0.06 },
  ];

  let remaining = clampNonNegative(purchasePrice);
  let duty = 0;

  for (const tier of tiers) {
    if (remaining <= 0) {
      break;
    }

    const taxable = Math.min(remaining, tier.cap);
    duty += taxable * tier.rate;
    remaining -= taxable;
  }

  return Math.max(1, Math.floor(duty));
}

function calculateLegalFee(purchasePrice: number, gstRate: number): LegalFeeBreakdown {
  const amount = clampNonNegative(purchasePrice);

  let base = 0;
  const tier1 = Math.min(amount, 30000);
  base += (tier1 / 1000) * 0.9;

  const tier2 = Math.min(Math.max(amount - 30000, 0), 30000);
  base += (tier2 / 1000) * 0.72;

  const tier3 = Math.max(amount - 60000, 0);
  base += (tier3 / 1000) * 0.6;

  const baseRounded = Math.ceil(base);
  let totalInclusive = baseRounded * (1 + Math.max(0, gstRate));

  if (totalInclusive < 21.8) {
    totalInclusive = 21.8;
  }

  const totalRounded = roundTo2(totalInclusive);
  const gstAmount = roundTo2(totalRounded - baseRounded);

  return {
    baseRounded,
    gstAmount,
    totalInclusive: totalRounded,
  };
}

function calculateMortgageDuty(loanAmount: number): number {
  const raw = loanAmount * 0.004;
  return Math.min(500, Math.max(1, Math.floor(raw)));
}

function estimateRegistrationFee(financing: FinancingOption): number {
  if (financing === "hdb") {
    return POLICY.fees.registrationFeeLeaseEscrow + POLICY.fees.registrationFeeMortgageEscrow;
  }

  if (financing === "bank" || financing === "none") {
    return POLICY.fees.registrationFeeLeaseEscrow;
  }

  return 0;
}

function buildIcs(result: CalculationResult): string {
  const events: string[] = [];
  const dtStamp = formatIcsDateTime(new Date());

  result.scheduleRows.forEach((row, index) => {
    if (row.amount === null) {
      return;
    }

    const summary = escapeIcsText(`HDB Payment - ${row.stage} - ${row.item}`);
    const description = escapeIcsText(
      `Amount: ${toCurrency(row.amount)}\nEstimated date: ${formatDate(
        row.date,
      )}\nPayment mode: ${row.paymentMode}\nRemarks: ${row.remarks}`,
    );

    events.push(
      "BEGIN:VEVENT\n" +
        `UID:hdb-payment-plan-${index}@hdb-planner\n` +
        `DTSTAMP:${dtStamp}\n` +
        `DTSTART;VALUE=DATE:${formatIcsDate(row.date)}\n` +
        `DTEND;VALUE=DATE:${formatIcsDate(addDays(row.date, 1))}\n` +
        `SUMMARY:${summary}\n` +
        `DESCRIPTION:${description}\n` +
        "END:VEVENT",
    );
  });

  return (
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "PRODID:-//HDB Planner//EN\n" +
    "CALSCALE:GREGORIAN\n" +
    events.join("\n") +
    "\nEND:VCALENDAR"
  );
}

function toCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function toPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace(".0", "")}%`;
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampBetween(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampNonNegative(value: number): number {
  return Math.max(0, value);
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(date: Date): string {
  return toInputDate(date).replace(/-/g, "");
}

function formatIcsDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export default App;
