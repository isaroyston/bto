import type { BtoProject } from "../policies/policyConfig";
import {
  EHG_FAMILIES_POLICY_META,
  type EhgFamiliesBand,
} from "../policies/policyConfig";
import { FactItem } from "./FactItem";
import type { FlatType, TabKey } from "../types";
import { currency } from "../utils/format";

type OverviewTabProps = {
  combinedIncome: number;
  loanAmount: number;
  ehgBand: EhgFamiliesBand | null;
  ehgGrant: number;
  selectedProject: BtoProject | null;
  flatType: FlatType;
  flatPrice: number;
  completedMilestoneCount: number;
  totalMilestoneCount: number;
  onSelectTab: (tab: TabKey) => void;
};

export function OverviewTab({
  combinedIncome,
  loanAmount,
  ehgBand,
  ehgGrant,
  selectedProject,
  flatType,
  flatPrice,
  completedMilestoneCount,
  totalMilestoneCount,
  onSelectTab,
}: OverviewTabProps) {
  const hasProject = Boolean(selectedProject);
  const progressPercent =
    totalMilestoneCount > 0
      ? Math.round((completedMilestoneCount / totalMilestoneCount) * 100)
      : 0;

  return (
    <section className="space-y-5">
      <header className="overview-page-head">
        <div>
          <h1 className="text-2xl font-semibold text-heritage-navy md:text-3xl">
            Planner overview
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            See the current BTO, price, loan, grant, and next steps before you
            drill into Plan or BTO Radar.
          </p>
        </div>
      </header>

      <section className="panel overview-hero">
        <div className="overview-hero-main">
          <span
            className={`overview-status-chip ${
              hasProject ? "overview-status-ready" : "overview-status-missing"
            }`}
          >
            {hasProject ? "Project selected" : "Project needed"}
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-heritage-navy">
            {selectedProject?.name ?? "Choose a BTO project to start"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-stone">
            {selectedProject
              ? `${selectedProject.location}, launched ${selectedProject.launchMonth}. The planner is using this project for price, flat type, and milestone estimates.`
              : "BTO Radar can prefill project context, flat price, launch month, and expected completion so the payment plan starts from real project data."}
          </p>
          <div className="overview-hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => onSelectTab(hasProject ? "plan" : "bto")}
            >
              {hasProject ? "Review plan" : "Choose project"}
            </button>
          </div>
        </div>

        <div className="overview-price-stack">
          <p className="text-sm font-medium text-warm-stone">Target flat price</p>
          <p className="overview-price">{currency(flatPrice)}</p>
          <div className="overview-price-meta">
            <span>{flatType}</span>
            <span>{selectedProject?.expectedTop ?? "TOP not listed"}</span>
          </div>
        </div>
      </section>

      <section className="panel overview-stat-panel" aria-label="Planning figures">
        <OverviewStat
          label="Estimated loan"
          value={currency(loanAmount)}
          detail={`Based on ${currency(combinedIncome)} monthly income`}
        />
        <OverviewStat
          label="EHG grant"
          value={currency(ehgGrant)}
          detail={ehgBand ? ehgBand.label : "Above EHG ceiling"}
          tone="grant"
        />
        <OverviewStat
          label="Current assumption"
          value={currency(combinedIncome)}
          detail="Edit income, price, financing, and scheme in Plan"
        />
      </section>

      <div className="overview-main-grid">
        <section className="panel overview-progress-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-heritage-navy">
                Milestone progress
              </h2>
              <p className="mt-1 text-sm leading-6 text-warm-stone">
                Completion is marked from the Plan timeline cards.
              </p>
            </div>
            <span className="overview-progress-count">
              {completedMilestoneCount}/{totalMilestoneCount}
            </span>
          </div>
          <div className="overview-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-sm font-medium text-heritage-navy">
            {progressPercent}% complete
          </p>
          <div className="overview-progress-notes">
            <span>{hasProject ? "Project timeline active" : "Select a project first"}</span>
            <span>Included when you save</span>
          </div>
        </section>

        <ProjectContextPanel
          selectedProject={selectedProject}
          flatType={flatType}
          flatPrice={flatPrice}
        />
      </div>

      <section className="panel overview-policy-panel">
        <div>
          <h2 className="text-base font-semibold text-heritage-navy">
            Policy basis
          </h2>
          <p className="mt-1 text-sm leading-6 text-warm-stone">
            Loan and grant figures are estimates for planning, not eligibility
            approval.
          </p>
        </div>
        <div className="overview-policy-grid">
          <PolicyFact label="Grant scheme" value="First-timer family EHG" />
          <PolicyFact label="Loan basis" value="HDB loan planning figure" />
          <PolicyFact label="Effective date" value={EHG_FAMILIES_POLICY_META.effectiveDate} />
          <PolicyFact
            label="Last verified"
            value={EHG_FAMILIES_POLICY_META.lastVerified}
          />
        </div>
        <p className="text-xs leading-5 text-warm-stone">
          Source: {EHG_FAMILIES_POLICY_META.sourceDocument}.
        </p>
      </section>
    </section>
  );
}

function OverviewStat({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "grant";
}) {
  return (
    <div className="overview-stat">
      <p className="text-xs font-medium text-warm-stone">{label}</p>
      <p
        className={`overview-stat-value ${
          tone === "grant" ? "overview-stat-value-grant" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-warm-stone">{detail}</p>
    </div>
  );
}

function ProjectContextPanel({
  selectedProject,
  flatType,
  flatPrice,
}: {
  selectedProject: BtoProject | null;
  flatType: FlatType;
  flatPrice: number;
}) {
  return (
    <section className="panel overview-context-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-heritage-navy">
            Project context
          </h2>
          <p className="mt-1 text-sm leading-6 text-warm-stone">
            The details currently feeding the Plan tab.
          </p>
        </div>
      </div>

      {selectedProject ? (
        <div className="overview-fact-grid">
          <FactItem label="Selected flat" value={`${flatType}, ${currency(flatPrice)}`} />
          <FactItem
            label="Expected TOP"
            value={selectedProject.expectedTop ?? "Not listed"}
          />
          <FactItem
            label="Units"
            value={
              selectedProject.totalUnits?.toLocaleString("en-SG") ??
              "Not listed"
            }
          />
          <FactItem
            label="Nearest MRT"
            value={selectedProject.nearestMrt ?? "Not listed"}
          />
        </div>
      ) : (
        <div className="overview-empty-state">
          <h3 className="text-sm font-semibold text-heritage-navy">
            No project selected yet
          </h3>
          <p className="mt-1 text-sm leading-6 text-warm-stone">
            Choose a project from BTO Radar and this area will show TOP, unit
            count, flat type, and nearest MRT.
          </p>
        </div>
      )}
    </section>
  );
}

function PolicyFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-warm-stone">{label}</p>
      <p className="mt-1 text-sm font-semibold text-heritage-navy">{value}</p>
    </div>
  );
}
