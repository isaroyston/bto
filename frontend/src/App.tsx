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

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [combinedIncome, setCombinedIncome] = useState(6000);
  const [flatPrice, setFlatPrice] = useState(650000);
  const [flatType, setFlatType] = useState<FlatType>("4-room");
  const [financing, setFinancing] = useState<FinancingType>("hdb");
  const [scheme, setScheme] = useState<SchemeType>("normal");
  const [yearFilter, setYearFilter] = useState("latest");
  const [townQuery, setTownQuery] = useState("");
  const [selectedBtoProjectId, setSelectedBtoProjectId] = useState<string | null>(null);
  const [applicationMonth, setApplicationMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

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

  const handleSelectBtoProject = (projectId: string) => {
    const project = btoProjects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    const preferredVariant =
      project.flatVariants.find((variant) => variant.type === flatType) ??
      project.flatVariants[0];

    setSelectedBtoProjectId(project.id);

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

      <main className="mx-auto max-w-[1360px] space-y-8 px-5 pb-14 pt-24 md:px-8 lg:px-10">
        {activeTab === "overview" && (
          <OverviewTab
            combinedIncome={combinedIncome}
            loanAmount={loanAmount}
            ehgBand={ehgBand}
            ehgGrant={ehgGrant}
            selectedProject={selectedBtoProject}
            flatType={flatType}
            flatPrice={flatPrice}
            onIncomeChange={handleIncomeChange}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "plan" && (
          <PurchasePlanTab
            selectedProject={selectedBtoProject}
            loanAmount={loanAmount}
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
            onFlatPriceChange={handleFlatPriceChange}
            onFlatTypeChange={setFlatType}
            onFinancingChange={setFinancing}
            onSchemeChange={setScheme}
            onOpenBtoRadar={() => setActiveTab("bto")}
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

export default App;
