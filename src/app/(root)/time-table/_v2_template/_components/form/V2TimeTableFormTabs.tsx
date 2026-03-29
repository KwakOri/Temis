interface TimeTableFormTabsProps {
  activeTab: string;
  onChangeActiveTab: (nextTab: string) => void;
  isAddons: boolean;
}

export const TimeTableFormTabs = ({
  activeTab,
  onChangeActiveTab,
  isAddons,
}: TimeTableFormTabsProps) => {
  const tabs = [{ id: "main", label: "기본 설정" }];
  if (isAddons) {
    tabs.push({ id: "addons", label: "추가 기능" });
  }

  return (
    <div className="flex w-full border-b border-gray-300 select-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeActiveTab(tab.id)}
            className={`flex-1 py-3 px-2 text-sm font-bold text-center transition-all duration-200 border-b-2 ${
              isActive
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default TimeTableFormTabs;
