import React from "react";

// Example presets
const LOGO_PRESETS = [
  { name: "Coffee", icon: "☕" },
  { name: "Restaurant", icon: "🍴" },
  { name: "Business", icon: "🏢" },
];

// * [PROPS]
interface ThemeAndLogoFormProps {
  themeColor: string;
  logo: string;
  onThemeChange: (color: string) => void;
  onLogoChange: (logo: string) => void;
}

const ThemeAndLogoForm: React.FC<ThemeAndLogoFormProps> = ({
  themeColor,
  logo,
  onThemeChange,
  onLogoChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Theme Color */}
      <div className="flex flex-col">
        <label className="text-label text-text-900 mb-1">Theme Color</label>
        <input
          type="color"
          value={themeColor}
          onChange={(e) => onThemeChange(e.target.value)}
          className="w-full h-10 rounded-md border border-[var(--color-bg-200)] cursor-pointer"
        />
      </div>

      {/* Logo Selector */}
      <div className="flex flex-col">
        <label className="text-label text-text-900 mb-1">Logo</label>
        <div className="flex gap-2">
          {LOGO_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onLogoChange(preset.icon)}
              className={`w-10 h-10 flex items-center justify-center rounded-md border cursor-pointer transition-colors ${
                logo === preset.icon
                  ? "border-[var(--color-primary-600)] bg-[var(--color-bg-200)]"
                  : "border-[var(--color-bg-200)] hover:bg-[var(--color-bg-100)]"
              }`}
              title={preset.name}
            >
              <span className="text-xl">{preset.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-md"
          style={{ backgroundColor: themeColor }}
        />
        <span className="text-2xl">{logo}</span>
      </div>
    </div>
  );
};

export default ThemeAndLogoForm;