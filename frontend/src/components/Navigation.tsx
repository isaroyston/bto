import { TABS } from "../constants";
import type { TabKey } from "../types";

type NavigationProps = {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
};

const tabButtonClass = (activeTab: TabKey, tab: TabKey) =>
  `rounded-hdb px-3 py-2 text-sm font-medium transition-colors ${
    activeTab === tab
      ? "bg-heritage-navy text-hdb-bg"
      : "text-warm-stone hover:bg-heritage-navy/5 hover:text-heritage-navy"
  }`;

export function Navigation({ activeTab, onSelectTab }: NavigationProps) {
  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-heritage-navy/10 bg-hdb-bg px-5 md:px-8">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-hdb border border-heritage-navy/15 bg-white">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 22V10L12 4L20 10V22H14V16H10V22H4Z" fill="currentColor" />
          </svg>
        </div>
        <span className="text-base font-semibold">HDB Planner</span>
      </div>

      <div className="hidden gap-2 text-sm font-medium md:flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tabButtonClass(activeTab, tab.id)}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(event) => onSelectTab(event.target.value as TabKey)}
          className="control"
          aria-label="Current section"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}
