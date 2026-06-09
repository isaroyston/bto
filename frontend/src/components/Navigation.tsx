import { TABS } from "../constants";
import { Icon, type IconName } from "./DashboardUi";
import type { TabKey } from "../types";

type NavigationProps = {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
};

const tabIcons: Record<TabKey, IconName> = {
  overview: "home",
  plan: "clipboard",
  bto: "building",
};

const tabButtonClass = (activeTab: TabKey, tab: TabKey) =>
  `nav-item ${
    activeTab === tab
      ? "nav-item-active"
      : "nav-item-idle"
  }`;

export function Navigation({
  activeTab,
  onSelectTab,
}: NavigationProps) {
  return (
    <>
      <nav className="app-nav hidden lg:flex">
        <div>
          <div className="brand-lockup">
            <div className="brand-radar" aria-hidden="true">
              <span />
            </div>
            <div className="brand-wordmark">
              <strong>BTO</strong>
              <strong>RADAR</strong>
            </div>
          </div>

          <div className="nav-section">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tabButtonClass(activeTab, tab.id)}
                onClick={() => onSelectTab(tab.id)}
              >
                <Icon name={tabIcons[tab.id]} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>


      </nav>

      <nav className="mobile-nav lg:hidden">
        <div className="flex items-center gap-2">
          <div className="brand-radar brand-radar-small" aria-hidden="true">
            <span />
          </div>
          <strong>BTO RADAR</strong>
        </div>
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
      </nav>
    </>
  );
}
