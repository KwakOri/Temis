"use client";

import React from "react";

interface TemplateBuilderTabsProps<TTab extends string> {
  tabs: Array<{ id: TTab; label: string }>;
  activeTab: TTab;
  onSelectTab: (tab: TTab) => void;
}

const TemplateBuilderTabs = <TTab extends string>({
  tabs,
  activeTab,
  onSelectTab,
}: TemplateBuilderTabsProps<TTab>) => {
  return (
    <div className="flex border-b-2 border-timetable-card-border bg-timetable-card-bg">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 py-3 px-1 text-[11px] font-bold text-center transition-all duration-200 border-b-2 ${
              isActive
                ? "text-timetable-primary border-timetable-primary"
                : "text-gray-500 border-transparent hover:bg-timetable-input-bg hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TemplateBuilderTabs;
