import {
  EHG_FAMILIES_POLICY_META,
  type EhgFamiliesBand,
} from "../policies/policyConfig";
import { INCOME_MAX, INCOME_MIN } from "../constants";
import { currency } from "../utils/format";

type GrantsTabProps = {
  combinedIncome: number;
  ehgBand: EhgFamiliesBand | null;
  ehgGrant: number;
  onIncomeChange: (value: number) => void;
};

export function GrantsTab({
  combinedIncome,
  ehgBand,
  ehgGrant,
  onIncomeChange,
}: GrantsTabProps) {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-3xl font-bold text-heritage-navy">
          CPF Grant Breakdown
        </h2>
        <p className="max-w-2xl text-warm-stone">
          Based on the Enhanced CPF Housing Grant for first-timer families.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card space-y-4 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-warm-stone">Total monthly income</p>
              <p className="text-2xl font-semibold text-heritage-navy">
                {currency(combinedIncome)}
              </p>
            </div>
            <span className="rounded-hdb bg-futuristic-teal/10 px-3 py-1 text-sm text-futuristic-teal">
              {EHG_FAMILIES_POLICY_META.effectiveDate} policy
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={INCOME_MIN}
              max={EHG_FAMILIES_POLICY_META.maxIncomeInclusive}
              step={100}
              value={combinedIncome}
              onChange={(event) => onIncomeChange(Number(event.target.value))}
              className="interactive-slider flex-1"
              aria-label="Total monthly income for grant estimate"
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
            <span>
              ${EHG_FAMILIES_POLICY_META.maxIncomeInclusive.toLocaleString("en-SG")}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-hdb border border-heritage-navy/10 bg-heritage-navy/5 p-4">
              <p className="text-xs text-warm-stone">Household type</p>
              <p className="text-sm font-semibold text-heritage-navy">
                {EHG_FAMILIES_POLICY_META.householdTypeRule}
              </p>
            </div>
            <div className="rounded-hdb border border-heritage-navy/10 bg-heritage-navy/5 p-4">
              <p className="text-xs text-warm-stone">Income band</p>
              <p className="text-sm font-semibold text-heritage-navy">
                {ehgBand ? ehgBand.label : "Not eligible"}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card space-y-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase text-warm-stone">
              Estimated Grant
            </p>
            <h3 className="mt-2 text-2xl font-bold text-heritage-navy">
              {currency(ehgGrant)}
            </h3>
          </div>
          <div className="text-sm text-warm-stone">
            Source document: {EHG_FAMILIES_POLICY_META.sourceDocument}
          </div>
          <div className="text-xs text-warm-stone">
            Last verified: {EHG_FAMILIES_POLICY_META.lastVerified}
          </div>
        </div>
      </div>
    </section>
  );
}
