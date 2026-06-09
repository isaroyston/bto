import type { BtoProject } from "../policies/policyConfig";
import type { BtoDecisionScore, FlatType, TabKey, TimelineItem } from "../types";
import { currency } from "../utils/format";
import { getBtoProjectSourceLabel } from "../utils/sourceCredits";
import {
  Card,
  CircularProgress,
  Icon,
  MetricRow,
  PageHeader,
  Pill,
  ProgressBar,
} from "./DashboardUi";

type OverviewTabProps = {
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  totalAffordability: number;
  selectedProject: BtoProject | null;
  flatType: FlatType;
  flatPrice: number;
  decisionScore: BtoDecisionScore | null;
  completedMilestoneCount: number;
  totalMilestoneCount: number;
  timeline: TimelineItem[];
  completedMilestones: string[];
  onSelectTab: (tab: TabKey) => void;
};

export function OverviewTab({
  combinedIncome,
  loanAmount,
  ehgGrant,
  totalAffordability,
  selectedProject,
  flatType,
  flatPrice,
  decisionScore,
  completedMilestoneCount,
  totalMilestoneCount,
  timeline,
  completedMilestones,
  onSelectTab,
}: OverviewTabProps) {
  const hasProject = Boolean(selectedProject);
  const progressPercent =
    totalMilestoneCount > 0
      ? Math.round((completedMilestoneCount / totalMilestoneCount) * 100)
      : 0;

  return (
    <section className="dashboard-page">
      <PageHeader
        title="Overview"
        subtitle="Track your BTO projects and progress in one place."
      />

      <Card title={hasProject ? "Project Overview" : "Get Started"} icon={hasProject ? "home" : "building"}>
        <div className="overview-card-content">
          {selectedProject ? (
            <div className="overview-project-detail">
              <div className="overview-project-detail-header">
                <strong>{selectedProject.name}</strong>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onSelectTab("plan")}
                >
                  Review Plan
                </button>
              </div>
              <div className="overview-project-detail-meta">
                <span>{selectedProject.location}</span>
                {selectedProject.btoType && (
                  <Pill tone="blue">
                    {selectedProject.btoType.charAt(0).toUpperCase() + selectedProject.btoType.slice(1)}
                  </Pill>
                )}
              </div>
              <div className="overview-project-kpis">
                <span className="overview-project-kpi">
                  <Icon name="home" />
                  <strong>
                    {selectedProject.flatVariants.find((v) => v.type === flatType)
                      ? currency(selectedProject.flatVariants.find((v) => v.type === flatType)!.basePrice)
                      : "No price"}
                  </strong>
                  <span className="overview-project-kpi-sublabel">est.</span>
                  <span>{flatType}</span>
                </span>
                <span className="overview-project-kpi-divider" />
                <span className="overview-project-kpi">
                  <Icon name="calendar" />
                  <strong>{selectedProject.expectedTop ?? "—"}</strong>
                  <span>TOP</span>
                </span>
                <span className="overview-project-kpi-divider" />
                <span className="overview-project-kpi">
                  <Icon name="metro" />
                  <strong>
                    {selectedProject.nearestMrtDistanceMeters
                      ? `${(selectedProject.nearestMrtDistanceMeters / 1000).toFixed(1)} km`
                      : "—"}
                  </strong>
                  <span>{selectedProject.nearestMrt ?? "MRT"}</span>
                </span>
                <span className="overview-project-kpi-divider" />
                <span className="overview-project-kpi">
                  <Icon name="building" />
                  <strong>{selectedProject.totalUnits?.toLocaleString("en-SG") ?? "—"}</strong>
                  <span>Units</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="overview-project-empty">
              <strong>Choose a BTO launch</strong>
              <p>Select a project in BTO Radar to fill in your overview.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onSelectTab("bto")}
              >
                Select Project
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="overview-card-grid">
        <Card title="Next Steps" icon="plan">
          <div className="overview-card-content">
            {(() => {
              const nextMilestone = timeline.find(
                (item) => item.payment && !completedMilestones.includes(item.label)
              );
              if (!nextMilestone) {
                return (
                  <div className="next-steps-empty">
                    <Icon name="check" />
                    <strong>All milestones complete</strong>
                    <p>You have completed all payment milestones.</p>
                  </div>
                );
              }
              return (
                <div className="next-steps-body">
                  <div className="next-steps-badge">
                    <span className="next-steps-label">Upcoming</span>
                    <strong>{nextMilestone.label}</strong>
                    <p>{nextMilestone.note}</p>
                  </div>
                  {nextMilestone.payment && (
                    <div className="next-steps-amount">
                      <strong>{currency(nextMilestone.payment.total)}</strong>
                      <div className="next-steps-tags">
                        {nextMilestone.payment.cpfOa > 0 && (
                          <span className="next-steps-tag next-steps-tag-cpf">
                            CPF {currency(nextMilestone.payment.cpfOa)}
                          </span>
                        )}
                        {nextMilestone.payment.cash > 0 && (
                          <span className="next-steps-tag next-steps-tag-cash">
                            Cash {currency(nextMilestone.payment.cash)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="next-steps-meta">
                    <MetricRow icon="calendar" label="Expected" value={nextMilestone.date} />
                    {nextMilestone.payment?.note && (
                      <MetricRow icon="info" label="Note" value={nextMilestone.payment.note} />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          <button type="button" className="card-footer-link" onClick={() => onSelectTab("plan")}>
            View Full Timeline
            <Icon name="chevron" />
          </button>
        </Card>

        <Card title="Project Context" icon="building">
          {selectedProject ? (
            <div className="overview-card-content context-list">
              <MetricRow
                icon="building"
                label="Project Name"
                value={selectedProject.name}
              />
              <MetricRow
                icon="map"
                label="Location"
                value={selectedProject.location || selectedProject.district || "To be confirmed"}
              />
              <MetricRow icon="home" label="Flat Type" value={flatType} />
              <MetricRow
                icon="calendar"
                label="BTO Programme"
                value={selectedProject.launchMonth || "To be confirmed"}
              />
              <MetricRow
                icon="calendar"
                label="Estimated Key Collection"
                value={selectedProject.expectedTop ?? "To be confirmed"}
              />
            </div>
          ) : (
            <OverviewEmptyState
              title="Waiting for project"
              body="Choose a launch in BTO Radar to show project details here."
            />
          )}
          <button type="button" className="card-footer-link" onClick={() => onSelectTab("bto")}>
            {hasProject ? "View Project Details" : "Choose Project"}
            <Icon name="chevron" />
          </button>
        </Card>

        <Card title="Progress" icon="chart">
          {hasProject ? (
            <div className="overview-card-content">
              <div className="progress-summary">
                <div>
                  <p>Overall Progress</p>
                  <strong>{progressPercent}%</strong>
                  <span>
                    {completedMilestoneCount} of {totalMilestoneCount} completed
                  </span>
                </div>
                <CircularProgress value={progressPercent} />
              </div>
              <div className="progress-list">
                <ProgressLine label="Application" value={100} count="2/2" tone="green" />
                <ProgressLine label="Plan Selection" value={35} count="1/3" />
                <ProgressLine label="Financing" value={0} count="0/2" />
                <ProgressLine label="Construction" value={0} count="0/5" />
                <ProgressLine label="Completion" value={0} count="0/2" />
              </div>
            </div>
          ) : (
            <OverviewEmptyState
              title="Waiting for project"
              body="Progress appears after you choose a launch and start saving your plan."
            />
          )}
          <button type="button" className="card-footer-link" onClick={() => onSelectTab("plan")}>
            {hasProject ? "View Full Progress" : "Open Plan"}
            <Icon name="chevron" />
          </button>
        </Card>
      </div>

      {hasProject ? (
        <Card title="Financial Summary" icon="wallet">
          <div className="overview-metrics-strip">
            <MetricMini label="Monthly income" value={currency(combinedIncome)} />
            <MetricMini label="Target flat price" value={currency(flatPrice)} />
            <MetricMini label="Max loan" value={currency(loanAmount)} />
            <MetricMini label="EHG grant" value={currency(ehgGrant)} tone="green" />
            <MetricMini
              label="Total affordability"
              value={currency(totalAffordability)}
              tone="green"
            />
            <MetricMini
              label="Radar score"
              value={formatOverviewScore(decisionScore)}
              detail={
                selectedProject ? getBtoProjectSourceLabel(selectedProject) : undefined
              }
            />
          </div>
        </Card>
      ) : (
        <div className="overview-waiting-strip">
          <Icon name="building" />
          <div>
            <strong>Waiting for project</strong>
            <p>Choose a launch to show income, target price, grants, and score here.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function OverviewEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="overview-card-empty">
      <Icon name="building" />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  count,
  tone = "blue",
}: {
  label: string;
  value: number;
  count: string;
  tone?: "blue" | "green";
}) {
  return (
    <div className="progress-line">
      <span className={tone === "green" ? "progress-line-done" : ""}>
        {tone === "green" ? <Icon name="check" /> : <Icon name="settings" />}
      </span>
      <strong>{label}</strong>
      <ProgressBar value={value} tone={tone} />
      <em>{count}</em>
    </div>
  );
}

function MetricMini({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "green";
}) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone === "green" ? "text-good" : ""}>{value}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}

function formatOverviewScore(score: BtoDecisionScore | null) {
  if (!score || score.total === null) return "To be confirmed";
  return `${score.total}/100`;
}


