import { useMemo, useState } from "react";
import { BtoTab } from "./components/BtoTab";
import { Navigation } from "./components/Navigation";
import { OverviewTab } from "./components/OverviewTab";
import { PurchasePlanTab } from "./components/PurchasePlanTab";
import {
  FLAT_MAX,
  FLAT_MIN,
  INCOME_MAX,
  INCOME_MIN,
  LOAN_MULTIPLIER,
} from "./constants";
import { useBtoProjects } from "./hooks/useBtoProjects";
import { POLICY_CONFIG } from "./policies/policyConfig";
import type { FinancingType, FlatType, SchemeType, TabKey } from "./types";
import {
  filterBtoProjects,
  getActiveYear,
  getAvailableYears,
  getEhgBand,
} from "./utils/bto";
import { parseLaunchMonthInput } from "./utils/date";
import { clampNumber } from "./utils/format";
import { buildPaymentTimeline } from "./utils/paymentTimeline";
import {
  createPlannerSnapshot,
  loadPlannerSnapshot,
  savePlannerSnapshot,
} from "./utils/planStorage";

function App() {
  const [initialPlanResult] = useState(() => {
    try {
      return {
        snapshot: loadPlannerSnapshot(),
        error: null,
      };
    } catch (error) {
      return {
        snapshot: null,
        error: getErrorMessage(error),
      };
    }
  });
  const initialPlan = initialPlanResult.snapshot;

  const [activeTab, setActiveTabState] = useState<TabKey>(getInitialTab());
  const [combinedIncome, setCombinedIncome] = useState(
    initialPlan?.combinedIncome ?? 6000
  );
  const [flatPrice, setFlatPrice] = useState(initialPlan?.flatPrice ?? 650000);
  const [flatType, setFlatType] = useState<FlatType>(
    initialPlan?.flatType ?? "4-room"
  );
  const [financing, setFinancing] = useState<FinancingType>(
    initialPlan?.financing ?? "hdb"
  );
  const [scheme, setScheme] = useState<SchemeType>(
    initialPlan?.scheme ?? "normal"
  );
  const [yearFilter, setYearFilter] = useState(
    initialPlan?.yearFilter ?? "latest"
  );
  const [townQuery, setTownQuery] = useState(initialPlan?.townQuery ?? "");
  const [selectedBtoProjectId, setSelectedBtoProjectId] = useState<string | null>(
    initialPlan?.selectedBtoProjectId ?? null
  );
  const [planStorageStatus, setPlanStorageStatus] = useState(
    initialPlanResult.error
      ? "Saved plan could not be loaded"
      : initialPlan
        ? `Loaded saved plan from ${formatSavedAt(initialPlan.savedAt)}`
        : "No saved plan in this browser"
  );
  const [planStorageError, setPlanStorageError] = useState<string | null>(
    initialPlanResult.error
  );
  const [applicationMonth, setApplicationMonth] = useState(
    initialPlan?.applicationMonth ?? getDefaultApplicationMonth()
  );
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(
    initialPlan?.completedMilestones ?? []
  );

  const {
    projects: btoProjects,
    isLoading: btoLoading,
    error: btoError,
    retry: retryBto,
  } = useBtoProjects();

  const loanAmount = combinedIncome * LOAN_MULTIPLIER;
  const ehgBand = useMemo(() => getEhgBand(combinedIncome), [combinedIncome]);
  const ehgGrant = ehgBand?.grantAmount ?? 0;

  const downpaymentRule = POLICY_CONFIG.downpaymentRules[financing][scheme];
  const signingAmount = flatPrice * downpaymentRule.signing;
  const keyAmount = flatPrice * downpaymentRule.key;
  const minCashSigning = flatPrice * downpaymentRule.minCashSigning;
  const signingCpf = Math.max(signingAmount - minCashSigning, 0);
  const keyCpf = keyAmount;
  const optionFee = POLICY_CONFIG.fees.optionFeeByFlatType[flatType];
  const surveyFee = POLICY_CONFIG.fees.surveyFeeByFlatType[flatType];
  const fireInsurance = POLICY_CONFIG.fees.fireInsuranceByFlatType[flatType];

  const timeline = useMemo(
    () =>
      buildPaymentTimeline({
        applicationMonth,
        flatType,
        signingAmount,
        signingCpf,
        minCashSigning,
        keyAmount,
        keyCpf,
        optionFee,
        surveyFee,
        fireInsurance,
      }),
    [
      applicationMonth,
      fireInsurance,
      flatType,
      keyAmount,
      keyCpf,
      minCashSigning,
      optionFee,
      signingAmount,
      signingCpf,
      surveyFee,
    ]
  );
  const activeCompletedMilestones = useMemo(() => {
    const timelineLabels = new Set(timeline.map((item) => item.label));
    return completedMilestones.filter((label) => timelineLabels.has(label));
  }, [completedMilestones, timeline]);

  const availableYears = useMemo(
    () => getAvailableYears(btoProjects),
    [btoProjects]
  );
  const activeYear = useMemo(
    () => getActiveYear(yearFilter, availableYears),
    [availableYears, yearFilter]
  );
  const filteredProjects = useMemo(
    () => filterBtoProjects(btoProjects, activeYear, townQuery, flatType),
    [activeYear, btoProjects, flatType, townQuery]
  );
  const selectedBtoProject = useMemo(
    () =>
      selectedBtoProjectId
        ? btoProjects.find((project) => project.id === selectedBtoProjectId) ?? null
        : null,
    [btoProjects, selectedBtoProjectId]
  );

  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab);

    const url = new URL(window.location.href);
    if (tab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const handleYearFilterChange = (value: string) => {
    setYearFilter(value);
  };

  const handleTownQueryChange = (value: string) => {
    setTownQuery(value);
  };

  const handleResetBtoFilters = () => {
    setYearFilter("latest");
    setTownQuery("");
  };

  const handleRetryBto = () => {
    retryBto();
    setActiveTab("bto");
  };

  const handleIncomeChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setCombinedIncome(clampNumber(value, INCOME_MIN, INCOME_MAX));
  };

  const handleFlatPriceChange = (value: number) => {
    if (Number.isNaN(value)) return;
    setFlatPrice(clampNumber(value, FLAT_MIN, FLAT_MAX));
  };

  const handleToggleMilestoneComplete = (label: string) => {
    setCompletedMilestones((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  };

  const buildCurrentSnapshot = () =>
    createPlannerSnapshot({
      combinedIncome,
      flatPrice,
      flatType,
      financing,
      scheme,
      yearFilter,
      townQuery,
      selectedBtoProjectId,
      applicationMonth,
      completedMilestones: activeCompletedMilestones,
    });

  const handleSavePlan = () => {
    try {
      const snapshot = buildCurrentSnapshot();
      savePlannerSnapshot(snapshot);
      setPlanStorageStatus(`Saved locally at ${formatSavedAt(snapshot.savedAt)}`);
      setPlanStorageError(null);
    } catch (error) {
      setPlanStorageStatus("Plan was not saved");
      setPlanStorageError(getErrorMessage(error));
    }
  };

  const handleSelectBtoProject = (projectId: string) => {
    const project = btoProjects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    const preferredVariant =
      project.flatVariants.find((variant) => variant.type === flatType) ??
      project.flatVariants[0];

    setSelectedBtoProjectId(project.id);
    setCompletedMilestones([]);

    if (preferredVariant) {
      setFlatType(preferredVariant.type);
      setFlatPrice(clampNumber(preferredVariant.basePrice, FLAT_MIN, FLAT_MAX));
    }

    const launchMonth = parseLaunchMonthInput(project.launchMonth);
    if (launchMonth) setApplicationMonth(launchMonth);

    setActiveTab("plan");
  };

  return (
    <div className="min-h-screen bg-hdb-bg text-heritage-navy">
      <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="mx-auto w-full max-w-[1360px] min-w-0 space-y-8 overflow-x-hidden px-5 pb-14 pt-24 md:px-8 lg:px-10">
        {activeTab === "overview" && (
          <OverviewTab
            combinedIncome={combinedIncome}
            loanAmount={loanAmount}
            ehgBand={ehgBand}
            ehgGrant={ehgGrant}
            selectedProject={selectedBtoProject}
            flatType={flatType}
            flatPrice={flatPrice}
            completedMilestoneCount={activeCompletedMilestones.length}
            totalMilestoneCount={timeline.length}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "plan" && (
          <PurchasePlanTab
            selectedProject={selectedBtoProject}
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
            optionFee={optionFee}
            surveyFee={surveyFee}
            fireInsurance={fireInsurance}
            downpaymentNote={downpaymentRule.note}
            timeline={timeline}
            completedMilestones={activeCompletedMilestones}
            planStorageStatus={planStorageStatus}
            planStorageError={planStorageError}
            onIncomeChange={handleIncomeChange}
            onFlatPriceChange={handleFlatPriceChange}
            onFlatTypeChange={setFlatType}
            onFinancingChange={setFinancing}
            onSchemeChange={setScheme}
            onOpenBtoRadar={() => setActiveTab("bto")}
            onSavePlan={handleSavePlan}
            onToggleMilestoneComplete={handleToggleMilestoneComplete}
          />
        )}

        {activeTab === "bto" && (
          <BtoTab
            btoProjects={btoProjects}
            btoLoading={btoLoading}
            btoError={btoError}
            availableYears={availableYears}
            yearFilter={yearFilter}
            townQuery={townQuery}
            filteredProjects={filteredProjects}
            selectedFlatType={flatType}
            onRetry={handleRetryBto}
            onYearFilterChange={handleYearFilterChange}
            onTownQueryChange={handleTownQueryChange}
            onFlatTypeChange={setFlatType}
            selectedProjectId={selectedBtoProjectId}
            onSelectProject={handleSelectBtoProject}
            onResetFilters={handleResetBtoFilters}
          />
        )}
      </main>
    </div>
  );
}

function formatSavedAt(value: string) {
  return new Date(value).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDefaultApplicationMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function getInitialTab(): TabKey {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab === "plan" || tab === "bto" || tab === "overview" ? tab : "overview";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected storage error.";
}

export default App;
