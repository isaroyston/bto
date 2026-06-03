import type { BtoProject } from "../policies/policyConfig";
import {
  EHG_FAMILIES_POLICY_META,
  type EhgFamiliesBand,
} from "../policies/policyConfig";
import { INCOME_MAX, INCOME_MIN } from "../constants";
import { FactItem } from "./FactItem";
import { NumberSliderField } from "./NumberSliderField";
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
  onIncomeChange: (value: number) => void;
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
  onIncomeChange,
  onSelectTab,
}: OverviewTabProps) {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-heritage-navy">
            Affordability snapshot
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            Adjust household income once, then review the loan and CPF grant
            estimates used across the planner.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="panel p-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div>
              <NumberSliderField
                id="overview-income"
                label="Monthly household income"
                helperText="Include applicants and listed occupiers whose income counts for the flat application."
                min={INCOME_MIN}
                max={INCOME_MAX}
                step={100}
                value={combinedIncome}
                onChange={onIncomeChange}
                minLabel={currency(INCOME_MIN)}
                maxLabel={currency(INCOME_MAX)}
              />
            </div>

            <div className="grid gap-3 text-sm">
              <SummaryCard
                label="Loan estimate"
                value={currency(loanAmount)}
              />
              <SummaryCard
                label="Grant estimate"
                value={currency(ehgGrant)}
              />
              <SummaryCard
                label="Income band"
                value={ehgBand ? ehgBand.label : "Above EHG ceiling"}
              />
            </div>
          </div>
        </div>

        <div className="panel space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-heritage-navy">
                Scheme assumptions
              </h2>
              <p className="mt-1 text-sm text-warm-stone">
                Used for the loan and grant figures on this page.
              </p>
            </div>
            <span className="text-sm font-medium text-futuristic-teal">
              {EHG_FAMILIES_POLICY_META.effectiveDate}
            </span>
          </div>

          <div>
            <p className="text-2xl font-semibold text-heritage-navy">
              {currency(ehgGrant)}
            </p>
            <p className="mt-1 text-sm text-warm-stone">
              Estimated Enhanced CPF Housing Grant
            </p>
          </div>

          <div className="grid gap-2 text-sm">
            <AssumptionRow label="Grant scheme" value="First-timer family EHG" />
            <AssumptionRow label="Loan estimate" value="HDB loan planning figure" />
            <AssumptionRow label="Income basis" value="Household income" />
          </div>

          <p className="text-xs leading-5 text-warm-stone">
            Source: {EHG_FAMILIES_POLICY_META.sourceDocument}. Last verified{" "}
            {EHG_FAMILIES_POLICY_META.lastVerified}.
          </p>
        </div>
      </div>

      <CurrentPlanPanel
        selectedProject={selectedProject}
        flatType={flatType}
        flatPrice={flatPrice}
        onOpenPlan={() => onSelectTab("plan")}
        onOpenBtoRadar={() => onSelectTab("bto")}
      />
    </section>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <p className="text-xs text-warm-stone">{label}</p>
      <p className="mt-1 text-base font-semibold text-heritage-navy">{value}</p>
    </div>
  );
}

function CurrentPlanPanel({
  selectedProject,
  flatType,
  flatPrice,
  onOpenPlan,
  onOpenBtoRadar,
}: {
  selectedProject: BtoProject | null;
  flatType: FlatType;
  flatPrice: number;
  onOpenPlan: () => void;
  onOpenBtoRadar: () => void;
}) {
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-warm-stone">Current plan</p>
          {selectedProject ? (
            <>
              <h2 className="mt-1 text-lg font-semibold text-heritage-navy">
                {selectedProject.name}
              </h2>
              <p className="mt-1 text-sm text-warm-stone">
                {selectedProject.location}, {selectedProject.launchMonth}
              </p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
            </>
          ) : (
            <>
              <h2 className="mt-1 text-lg font-semibold text-heritage-navy">
                No BTO project selected
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-stone">
                Pick a project from BTO Radar and it will become the basis for
                your payment timeline.
              </p>
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-secondary" onClick={onOpenBtoRadar}>
            {selectedProject ? "Change project" : "Choose project"}
          </button>
          <button type="button" className="btn-primary" onClick={onOpenPlan}>
            View Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function AssumptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-heritage-navy/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-warm-stone">{label}</span>
      <span className="font-semibold text-heritage-navy">{value}</span>
    </div>
  );
}
