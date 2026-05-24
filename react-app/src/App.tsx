import { useMemo, useState } from "react";
import { BtoTab } from "./components/BtoTab";
import { EligibilityTab } from "./components/EligibilityTab";
import { GrantsTab } from "./components/GrantsTab";
import { Navigation } from "./components/Navigation";
import { OverviewTab } from "./components/OverviewTab";
import {
  DEFAULT_VISIBLE_PROJECTS,
  FLAT_MAX,
  FLAT_MIN,
  INCOME_MAX,
  INCOME_MIN,
  LOAN_MULTIPLIER,
} from "./constants";
import { useBtoProjects } from "./hooks/useBtoProjects";
import { usePlanningAreaMap } from "./hooks/usePlanningAreaMap";
import { POLICY_CONFIG } from "./policies/policyConfig";
import type { FinancingType, FlatType, SchemeType, TabKey } from "./types";
import {
  filterBtoProjects,
  getActiveYear,
  getAvailableYears,
  getEhgBand,
  getHeatmapData,
  getLatestBtoProjects,
} from "./utils/bto";
import { clampNumber } from "./utils/format";
import { buildAreaPaths } from "./utils/map";
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
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_PROJECTS);
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
  const planningAreaMap = usePlanningAreaMap();

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
    () => filterBtoProjects(btoProjects, activeYear, townQuery),
    [activeYear, btoProjects, townQuery]
  );
  const visibleProjects = useMemo(
    () => filteredProjects.slice(0, visibleCount),
    [filteredProjects, visibleCount]
  );
  const latestProjects = useMemo(
    () => getLatestBtoProjects(btoProjects),
    [btoProjects]
  );
  const townHeatmap = useMemo(() => getHeatmapData(btoProjects), [btoProjects]);
  const planningAreaPaths = useMemo(
    () => buildAreaPaths(planningAreaMap),
    [planningAreaMap]
  );

  const resetVisibleCount = () => setVisibleCount(DEFAULT_VISIBLE_PROJECTS);

  const handleYearFilterChange = (value: string) => {
    setYearFilter(value);
    resetVisibleCount();
  };

  const handleTownQueryChange = (value: string) => {
    setTownQuery(value);
    resetVisibleCount();
  };

  const handleResetBtoFilters = () => {
    setYearFilter("latest");
    setTownQuery("");
    resetVisibleCount();
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

  return (
    <div className="min-h-screen bg-hdb-bg text-heritage-navy">
      <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="mx-auto max-w-[1440px] space-y-10 px-5 pb-16 pt-28 md:px-8 lg:px-10">
        {activeTab === "overview" && (
          <OverviewTab
            combinedIncome={combinedIncome}
            loanAmount={loanAmount}
            ehgGrant={ehgGrant}
            latestProjects={latestProjects}
            btoLoading={btoLoading}
            btoError={btoError}
            onIncomeChange={handleIncomeChange}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === "eligibility" && (
          <EligibilityTab
            flatPrice={flatPrice}
            flatType={flatType}
            financing={financing}
            scheme={scheme}
            applicationMonth={applicationMonth}
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
            onApplicationMonthChange={setApplicationMonth}
          />
        )}

        {activeTab === "grants" && (
          <GrantsTab
            combinedIncome={combinedIncome}
            ehgBand={ehgBand}
            ehgGrant={ehgGrant}
            onIncomeChange={handleIncomeChange}
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
            visibleCount={visibleCount}
            filteredProjects={filteredProjects}
            visibleProjects={visibleProjects}
            townHeatmap={townHeatmap}
            planningAreaPaths={planningAreaPaths}
            onRetry={handleRetryBto}
            onYearFilterChange={handleYearFilterChange}
            onTownQueryChange={handleTownQueryChange}
            onResetFilters={handleResetBtoFilters}
            onShowMore={() => setVisibleCount((count) => count + 12)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
