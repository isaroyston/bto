import { useRef } from "react";
import { FLAT_MAX, FLAT_MIN, FLAT_TYPE_OPTIONS } from "../constants";
import { POLICY_CONFIG } from "../policies/policyConfig";
import type { BtoProject } from "../policies/policyConfig";
import { FactItem } from "./FactItem";
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
  loanAmount: number;
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
  planStorageStatus: string;
  planStorageError: string | null;
  onFlatPriceChange: (value: number) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onFinancingChange: (value: FinancingType) => void;
  onSchemeChange: (value: SchemeType) => void;
  onOpenBtoRadar: () => void;
  onSavePlan: () => void;
  onDownloadPlan: () => void;
  onImportPlan: (file: File) => void | Promise<void>;
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

const MILESTONE_NODE_CLASS =
  "border-futuristic-teal bg-white text-heritage-navy shadow-[0_0_0_4px_oklch(var(--color-electric-mint)_/_0.22)]";

export function PurchasePlanTab({
  selectedProject,
  loanAmount,
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
  planStorageStatus,
  planStorageError,
  onFlatPriceChange,
  onFlatTypeChange,
  onFinancingChange,
  onSchemeChange,
  onOpenBtoRadar,
  onSavePlan,
  onDownloadPlan,
  onImportPlan,
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

      <div className="space-y-4">
        <div className="panel space-y-4 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              {selectedProject ? (
                <div>
                  <p className="text-sm font-medium text-warm-stone">
                    Selected BTO project
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-heritage-navy">
                    {selectedProject.name}
                  </h3>
                  <p className="mt-1 text-sm text-warm-stone">
                    {selectedProject.location}, {selectedProject.launchMonth}
                  </p>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <FactItem
                      label="Selected flat"
                      value={`${flatType}, ${currency(flatPrice)}`}
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
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-warm-stone">
                    Selected BTO project
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-heritage-navy">
                    No project selected
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-stone">
                    Choose one from BTO Radar to prefill flat type, price,
                    launch month, and expected completion details.
                  </p>
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
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
        </div>

        <PlanStoragePanel
          status={planStorageStatus}
          error={planStorageError}
          onSave={onSavePlan}
          onDownload={onDownloadPlan}
          onImport={onImportPlan}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="panel space-y-5 p-6">
            <h3 className="text-base font-semibold text-heritage-navy">
              Scenario inputs
            </h3>
            <NumberSliderField
              id="flat-price"
              label="Target flat price"
              min={FLAT_MIN}
              max={FLAT_MAX}
              step={5000}
              value={flatPrice}
              onChange={onFlatPriceChange}
              minLabel={currency(FLAT_MIN)}
              maxLabel={currency(FLAT_MAX)}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <label className="field-label" htmlFor="flat-type">
                  Flat type
                </label>
                <select
                  id="flat-type"
                  value={flatType}
                  onChange={(event) =>
                    onFlatTypeChange(event.target.value as FlatType)
                  }
                  className="control"
                >
                  {FLAT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="field-label" htmlFor="financing-type">
                  Financing type
                </label>
                <select
                  id="financing-type"
                  value={financing}
                  onChange={(event) =>
                    onFinancingChange(event.target.value as FinancingType)
                  }
                  className="control"
                >
                  {FINANCING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="field-label" htmlFor="payment-scheme">
                  Payment scheme
                </label>
                <select
                  id="payment-scheme"
                  value={scheme}
                  onChange={(event) =>
                    onSchemeChange(event.target.value as SchemeType)
                  }
                  className="control"
                >
                  {SCHEME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="panel flex flex-col justify-between gap-5 p-6">
            <div>
              <h3 className="text-base font-semibold text-heritage-navy">
                Estimated loan value
              </h3>
              <p className="mt-2 text-sm leading-6 text-warm-stone">
                From the household income used in Overview.
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-heritage-navy">
                {currency(loanAmount)}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <CostRow label="Current financing" value={formatFinancing(financing)} />
                <CostRow label="Flat price" value={currency(flatPrice)} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel space-y-4 p-6">
            <h3 className="text-base font-semibold text-heritage-navy">
              Required Downpayment
            </h3>
            <div className="space-y-3">
              <CostRow label="Signing" value={currency(signingAmount)} />
              <CostRow label="Key collection" value={currency(keyAmount)} />
              <CostRow
                label="Minimum cash at signing"
                value={currency(minCashSigning)}
              />
            </div>
            <div className="rounded-hdb border border-heritage-navy/10 bg-heritage-navy/5 p-3 text-xs text-warm-stone">
              {downpaymentNote}
            </div>
          </div>

          <div className="panel space-y-4 p-6">
            <h3 className="text-base font-semibold text-heritage-navy">
              Immediate Costs
            </h3>
            <div className="space-y-2 text-sm">
              {[
                ["Application fee", POLICY_CONFIG.fees.applicationFee],
                [`Option fee (${flatType})`, optionFee],
                [`Survey fee (${flatType})`, surveyFee],
                [`Fire insurance (${flatType})`, fireInsurance],
                ["Registration fee", POLICY_CONFIG.fees.registrationFeeLeaseEscrow],
              ].map(([label, amount]) => (
                <CostRow
                  key={label}
                  label={String(label)}
                  value={currency(Number(amount))}
                />
              ))}
              <CostRow
                label="GST rate"
                value={`${(POLICY_CONFIG.fees.gstRate * 100).toFixed(0)}%`}
              />
            </div>
            <div className="text-xs text-warm-stone">
              Source: {POLICY_CONFIG.sources.processOverview.label}
            </div>
          </div>

          <div className="panel space-y-4 p-6">
            <h3 className="text-base font-semibold text-heritage-navy">
              Total costs
            </h3>
            <p className="text-3xl font-semibold text-heritage-navy">
              {currency(totalPlannedCosts)}
            </p>
            <div className="space-y-3 text-sm">
              <CostRow
                label="Required downpayment"
                value={currency(downpaymentTotal)}
              />
              <CostRow
                label="Immediate fees"
                value={currency(immediateCostsTotal)}
              />
            </div>
            <p className="text-xs leading-5 text-warm-stone">
              Sum of listed downpayment and fee items. Loan balance and CPF OA
              availability are not deducted here.
            </p>
          </div>
        </div>

        <div className="panel space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-heritage-navy">
                Key milestones from application to keys{" "}
                <span className="font-normal text-warm-stone">(estimated)</span>
              </h3>
              <p className="mt-1 text-sm text-warm-stone">
                Based on default BTO offsets, not confirmed appointment dates.
              </p>
            </div>
            <div className="rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-warm-stone">
              {selectedProject
                ? `Starts from ${selectedProject.launchMonth}`
                : "Choose a project to set the launch month"}
            </div>
          </div>

          <div className="overflow-x-auto rounded-hdb border border-heritage-navy/15">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-heritage-navy text-hdb-bg">
                <tr className="text-xs">
                  <th className="w-16 px-4 py-3 font-semibold">Step</th>
                  <th className="px-4 py-3 font-semibold">Milestone</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Payment item</th>
                  <th className="px-4 py-3 text-right font-semibold">Payment</th>
                  <th className="px-4 py-3 text-right font-semibold">CPF OA</th>
                  <th className="px-4 py-3 text-right font-semibold">Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-heritage-navy/10">
              {timeline.map((item, index) => (
                <tr
                  key={item.label}
                  className="align-top odd:bg-white even:bg-hdb-bg/70 hover:bg-electric-mint/10"
                >
                  <td className="px-4 py-4">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-extrabold ${MILESTONE_NODE_CLASS}`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="max-w-[300px] px-4 py-4">
                    <p className="font-semibold text-heritage-navy">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-heritage-navy/70">
                      {item.note}
                      {item.payment?.note ? ` ${item.payment.note}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-heritage-navy">
                    {item.date}
                  </td>
                  <td className="px-4 py-4 text-heritage-navy/75">
                    {item.payment?.label ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.payment ? (
                      <AmountPill tone="total" value={currency(item.payment.total)} />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.payment ? (
                      <AmountPill tone="cpf" value={currency(item.payment.cpfOa)} />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {item.payment ? (
                      <AmountPill tone="cash" value={currency(item.payment.cash)} />
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-warm-stone">
            CPF OA usage depends on available OA balance and eligibility. Treat
            the split as an indicative guide.
          </p>
        </div>
      </div>
    </section>
  );
}

function PlanStoragePanel({
  status,
  error,
  onSave,
  onDownload,
  onImport,
}: {
  status: string;
  error: string | null;
  onSave: () => void;
  onDownload: () => void;
  onImport: (file: File) => void | Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-heritage-navy">
            Saved scenario
          </h3>
          <p className="mt-1 text-sm text-warm-stone">{status}</p>
          {error && (
            <p className="mt-1 text-sm font-medium text-red-700">{error}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={onSave}>
            Save plan
          </button>
          <button type="button" className="btn-secondary" onClick={onDownload}>
            Download JSON
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Load JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void onImport(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AmountPill({
  tone,
  value,
}: {
  tone: "total" | "cpf" | "cash";
  value: string;
}) {
  const toneClass =
    tone === "total"
      ? "bg-heritage-navy text-hdb-bg"
      : tone === "cpf"
        ? "bg-futuristic-teal/15 text-heritage-navy ring-futuristic-teal/30"
        : "bg-electric-mint/25 text-heritage-navy ring-electric-mint/40";

  return (
    <span
      className={`inline-flex min-w-[96px] justify-center rounded-hdb px-2.5 py-1 text-xs font-semibold ring-1 ${toneClass}`}
    >
      {value}
    </span>
  );
}

function formatFinancing(value: FinancingType) {
  return FINANCING_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-warm-stone">{label}</span>
      <span className="font-semibold text-heritage-navy">{value}</span>
    </div>
  );
}
