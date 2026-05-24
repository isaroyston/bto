import type { BtoProject } from "../policies/policyConfig";
import { INCOME_MAX, INCOME_MIN, LOAN_MULTIPLIER } from "../constants";
import type { TabKey } from "../types";
import { currency } from "../utils/format";

type OverviewTabProps = {
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  latestProjects: BtoProject[];
  btoLoading: boolean;
  btoError: string | null;
  onIncomeChange: (value: number) => void;
  onSelectTab: (tab: TabKey) => void;
};

export function OverviewTab({
  combinedIncome,
  loanAmount,
  ehgGrant,
  latestProjects,
  btoLoading,
  btoError,
  onIncomeChange,
  onSelectTab,
}: OverviewTabProps) {
  return (
    <section className="space-y-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight text-heritage-navy md:text-5xl">
            Plan your HDB purchase with Singapore-ready numbers.
          </h1>
          <p className="text-base leading-relaxed text-warm-stone md:text-lg">
            A policy-backed dashboard for grants, BTO pricing, and financing
            milestones.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-accent"
            onClick={() => onSelectTab("eligibility")}
          >
            Start Assessment
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => onSelectTab("bto")}
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
            Compare Estates
          </button>
        </div>
      </header>

      <div className="bento-grid">
        <div className="glass-card flex flex-col justify-between p-6 md:col-span-2 lg:col-span-2 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-warm-stone">
                Estimated Loan Eligibility
              </p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-heritage-navy md:text-4xl">
                  {currency(loanAmount)}
                </span>
                <span className="rounded-hdb bg-futuristic-teal/10 px-2 py-1 text-xs font-medium text-futuristic-teal">
                  Income x {LOAN_MULTIPLIER}
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-hdb bg-heritage-navy/5 text-heritage-navy">
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-warm-stone">Total monthly income</span>
              <span className="font-medium">{currency(combinedIncome)}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={INCOME_MIN}
                max={INCOME_MAX}
                step={100}
                value={combinedIncome}
                onChange={(event) => onIncomeChange(Number(event.target.value))}
                className="interactive-slider flex-1"
                aria-label="Total monthly income"
              />
              <input
                type="number"
                min={INCOME_MIN}
                max={INCOME_MAX}
                step={100}
                value={combinedIncome}
                onChange={(event) => onIncomeChange(Number(event.target.value))}
                className="w-28 rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-right text-sm text-heritage-navy shadow-fintech"
                aria-label="Total monthly income amount"
              />
            </div>
            <div className="flex justify-between text-xs text-warm-stone">
              <span>$1,000</span>
              <span>$15,000+</span>
            </div>
            <p className="text-xs text-warm-stone">
              Adjust this when income assumptions change.
            </p>
          </div>
        </div>

        <div className="glass-card flex flex-col justify-between p-6">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-hdb bg-electric-mint/20 p-2 text-futuristic-teal">
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-heritage-navy">CPF Grants</h3>
            </div>
            <p className="mb-2 text-sm text-warm-stone">Live EHG estimate</p>
            <h2 className="text-2xl font-bold text-heritage-navy">
              {currency(ehgGrant)}
            </h2>
          </div>
          <button
            type="button"
            className="mt-4 flex items-center justify-between border-t border-heritage-navy/5 pt-4 text-sm font-medium text-futuristic-teal transition-colors hover:text-heritage-navy"
            onClick={() => onSelectTab("grants")}
          >
            View breakdown
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 font-semibold text-heritage-navy">
            Latest BTO Launches
          </h3>
          <div className="space-y-3">
            {btoLoading && (
              <p className="text-xs text-warm-stone">Loading BTO launches...</p>
            )}
            {btoError && <p className="text-xs text-warm-stone">{btoError}</p>}
            {!btoLoading &&
              !btoError &&
              latestProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-hdb border border-transparent p-3 text-left transition-colors hover:border-heritage-navy/10 hover:bg-heritage-navy/5"
                  onClick={() => onSelectTab("bto")}
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {project.name}
                    </span>
                    <span className="block text-xs text-warm-stone">
                      {project.location} - {project.flatVariants[0]?.type}
                    </span>
                  </span>
                  <span className="h-2 w-2 rounded-full bg-futuristic-teal" />
                </button>
              ))}
            {!btoLoading && !btoError && latestProjects.length === 0 && (
              <p className="text-xs text-warm-stone">
                BTO launch data is not available yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
