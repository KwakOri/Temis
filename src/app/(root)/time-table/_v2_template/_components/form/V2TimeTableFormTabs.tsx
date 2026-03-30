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
    <div className="flex w-full border-b-2 border-timetable-card-border select-none bg-timetable-card-bg">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeActiveTab(tab.id)}
            className={`flex-1 py-3 px-2 text-sm font-bold text-center transition-all duration-200 border-b-2 ${
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

export default TimeTableFormTabs;
