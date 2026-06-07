import type { BtoProject } from "../policies/policyConfig";
import {
  EHG_FAMILIES_POLICY_META,
  type EhgFamiliesBand,
} from "../policies/policyConfig";
import { FactItem } from "./FactItem";
import type { BtoDecisionScore, FlatType, TabKey } from "../types";
import { currency } from "../utils/format";
import {
  getBtoProjectSourceLabel,
  getBtoProjectSourceNote,
} from "../utils/sourceCredits";

type OverviewTabProps = {
  combinedIncome: number;
  loanAmount: number;
  ehgBand: EhgFamiliesBand | null;
  ehgGrant: number;
  selectedProject: BtoProject | null;
  flatType: FlatType;
  flatPrice: number;
  decisionScore: BtoDecisionScore | null;
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
  decisionScore,
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
    <section
      className={`overview-page ${hasProject ? "overview-page-ready" : "overview-page-empty"}`}
    >
      <header className="overview-page-head">
        <div>
          <h1 className="text-2xl font-semibold text-heritage-navy md:text-3xl">
            Your BTO at a glance
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            Price, grant, loan, and next milestones, without the spreadsheet fog.
          </p>
        </div>
      </header>

      <div className="overview-grid">
        <section
          className={`panel overview-hero ${
            hasProject ? "overview-hero-ready" : "overview-hero-empty"
          }`}
        >
          <div className="overview-hero-main">
            <span
              className={`overview-status-chip ${
                hasProject ? "overview-status-ready" : "overview-status-missing"
              }`}
            >
              {hasProject ? "Project selected" : "Start here"}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-heritage-navy">
              {selectedProject?.name ?? "Pick a project to unlock the plan"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-stone">
              {selectedProject
                ? `${selectedProject.location}, launched ${selectedProject.launchMonth}.`
                : "Choose from BTO Radar once. The overview will stop guessing and start using real project context."}
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

          {hasProject ? (
            <div className="overview-price-stack">
              <p className="text-sm font-medium text-warm-stone">Target flat price</p>
              <p className="overview-price">{currency(flatPrice)}</p>
              <div className="overview-price-meta">
                <span>{flatType}</span>
                <span>{selectedProject?.expectedTop ?? "TOP not listed"}</span>
              </div>
            </div>
          ) : (
            <div className="overview-waiting-stack">
              <p className="text-sm font-semibold text-heritage-navy">
                Needs a project
              </p>
              <div className="overview-waiting-list">
                <span>Target price</span>
                <span>Expected TOP</span>
                <span>Launch month</span>
              </div>
              <p className="text-xs leading-5 text-warm-stone">
                Plan still works with defaults, but project data makes the numbers useful.
              </p>
            </div>
          )}
        </section>

        {hasProject ? (
          <section className="panel overview-stat-panel" aria-label="Planning figures">
            <OverviewStat
              label="Estimated loan"
              value={currency(loanAmount)}
              detail={`Target ${currency(flatPrice)}`}
            />
            <OverviewStat
              label="EHG grant"
              value={currency(ehgGrant)}
              detail={ehgBand ? ehgBand.label : "Above EHG ceiling"}
              tone="grant"
            />
            <OverviewStat
              label="Income"
              value={currency(combinedIncome)}
              detail="Loan and grant basis"
            />
          </section>
        ) : (
          <section className="panel overview-onboarding-panel" aria-label="Overview setup">
            <div>
              <h2 className="text-base font-semibold text-heritage-navy">
                Start with one decision
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
                Select a launch first. Fine-tune the household numbers after.
              </p>
            </div>
            <div className="overview-onboarding-grid">
              <SetupStep
                label="Project"
                value="Choose a BTO launch"
                detail="Sets price, TOP, location, and application month."
              />
              <SetupStep
                label="Household"
                value={`${currency(combinedIncome)} income now`}
                detail="Updates loan and EHG estimates after the project is anchored."
              />
              <SetupStep
                label="Plan"
                value={`${flatType}, ${currency(flatPrice)}`}
                detail="Current placeholder until a project flat type is selected."
              />
            </div>
          </section>
        )}

        <section className="panel overview-progress-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-heritage-navy">
                Milestones
              </h2>
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
          <div className="overview-progress-note">
            {hasProject
              ? `${Math.max(
                  totalMilestoneCount - completedMilestoneCount,
                  0
                )} open`
              : "Pick a project to generate milestones."}
          </div>
        </section>

        <ProjectContextPanel
          selectedProject={selectedProject}
          flatType={flatType}
          flatPrice={flatPrice}
          decisionScore={decisionScore}
        />

        {!hasProject && (
          <section className="panel overview-action-panel">
            <h2 className="text-base font-semibold text-heritage-navy">
              What happens after selection
            </h2>
            <p className="mt-1 text-sm leading-6 text-warm-stone">
              Price, TOP, and key milestones update from the selected project.
            </p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => onSelectTab("bto")}
            >
              Open BTO Radar
            </button>
          </section>
        )}

        <section className="panel overview-policy-panel">
          <div>
            <h2 className="text-base font-semibold text-heritage-navy">
              Policy basis
            </h2>
            <p className="mt-1 text-sm leading-6 text-warm-stone">
              Planning estimates only. Final eligibility comes from the official process.
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
      </div>
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

function SetupStep({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="overview-setup-step">
      <p className="text-xs font-medium text-warm-stone">{label}</p>
      <p className="mt-1 text-sm font-semibold text-heritage-navy">{value}</p>
      <p className="mt-1 text-xs leading-5 text-warm-stone">{detail}</p>
    </div>
  );
}

function ProjectContextPanel({
  selectedProject,
  flatType,
  flatPrice,
  decisionScore,
}: {
  selectedProject: BtoProject | null;
  flatType: FlatType;
  flatPrice: number;
  decisionScore: BtoDecisionScore | null;
}) {
  return (
    <section className="panel overview-context-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-heritage-navy">
            Project context
          </h2>
          <p className="mt-1 text-sm leading-6 text-warm-stone">
            What the planner is using now.
          </p>
        </div>
      </div>

      {selectedProject ? (
        <div className="overview-fact-grid">
          <FactItem label="Selected flat" value={`${flatType}, ${currency(flatPrice)}`} />
          <FactItem
            label="Project data"
            value={getBtoProjectSourceLabel(selectedProject)}
          />
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
          <FactItem
            label="Location context"
            value={formatOverviewLocationContext(selectedProject)}
          />
          <FactItem
            label="Decision score"
            value={formatOverviewScore(decisionScore)}
          />
          <div className="overview-source-note">
            <span>
              {decisionScore?.reasons.length
                ? `${decisionScore.confidence}: ${decisionScore.reasons.join(", ")}.`
                : getBtoProjectSourceNote(selectedProject)}
            </span>
            {selectedProject.sourceUrl && (
              <a href={selectedProject.sourceUrl} target="_blank" rel="noreferrer">
                View source
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="overview-empty-state">
          <h3 className="text-sm font-semibold text-heritage-navy">
            No project selected yet
          </h3>
          <p className="mt-1 text-sm leading-6 text-warm-stone">
            Choose a BTO project to show TOP, unit count, flat type, and nearest MRT.
          </p>
        </div>
      )}
    </section>
  );
}

function formatOverviewScore(score: BtoDecisionScore | null) {
  if (!score || score.total === null) return "Not enough data";
  return `${score.total}/100`;
}

function formatOverviewLocationContext(project: BtoProject) {
  const tags = project.locationSignals?.contextTags ?? [];
  if (tags.length) return tags.join(", ");
  return project.locationSignals?.centralityLabel ?? "Not listed";
}

function PolicyFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-warm-stone">{label}</p>
      <p className="mt-1 text-sm font-semibold text-heritage-navy">{value}</p>
    </div>
  );
}
