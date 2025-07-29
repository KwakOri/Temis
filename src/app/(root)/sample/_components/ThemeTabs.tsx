import { buttonThemes, TTheme } from "../_settings/settings";

interface ThemeTabsProps {
  currentTheme: TTheme;
  handleThemeChange: (theme: TTheme) => void;
}

const ThemeTabs = ({ currentTheme, handleThemeChange }: ThemeTabsProps) => {
  return (
    <div className="space-y-2 flex flex-col items-start">
      <h3 className="font-bold text-lg text-gray-800">테마</h3>
      <div className="flex w-full border border-gray-300 rounded-md bg-gray-100 select-none">
        {buttonThemes.map((theme) => {
          const isActive = currentTheme === theme.value;
          return (
            <button
              key={theme.value}
              onClick={() => handleThemeChange(theme.value as TTheme)}
              className={`flex-1 py-2 px-1 text-sm font-medium text-center transition-all duration-200 rounded-md ${
                isActive
                  ? "bg-white text-blue-600 border border-blue-400 shadow-sm"
                  : "text-gray-500 hover:bg-gray-200 border border-transparent"
              }`}
            >
              {theme.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeTabs;
