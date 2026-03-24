import React from "react";
import { useState, type CSSProperties } from "react";

interface InputFieldProps {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  iconSrc?: string;
  iconAlt?: string;
  showClear?: boolean;
  disabled?: boolean;
  options?: string[];
  max?: number;
}

const InputField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  iconSrc,
  iconAlt = "icon",
  showClear = true,
  disabled = false,
  options = [],
  max,
}: InputFieldProps) => {
  // [STATES]
  const [showPassword, setShowPassword] = useState(false);

  // [HANDLE] Clear input
  const handleClear = () => {
    if (disabled) return;
    const event = { target: { value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(event);
  };

  // [HANDLE] Toggle password visibility
  const togglePasswordVisibility = () => {
    if (disabled) return;
    setShowPassword((prev) => !prev);
  };

  // [UI] Password icon path
  const passwordIcon = showPassword ? "/visibility-off-icon.svg" : "/visibility-on-icon.svg";

  // [STYLE] Remove number input arrows
  const numberInputStyle: CSSProperties = {
    MozAppearance: "textfield",
    WebkitAppearance: "none",
  };

  // [CLASSES] Base input styling
  const baseClasses = `w-full rounded-sm border py-2 text-body shadow-sm focus:outline-none focus:ring-2 ${
    disabled
      ? "bg-bg-200 border-bg-400 text-text-400 cursor-not-allowed"
      : "bg-bg-50 border-bg-300 text-text-900 focus:ring-primary-500"
  } ${iconSrc ? "pl-10" : "px-3"}`;

  return (
    <div className="flex flex-col gap-1">
      {/* [LABEL] Input label */}
      {label && (
        <label className="text-label text-text-900">
          {label}
        </label>
      )}

      <div className="relative">
        {/* [LEFT ICON] */}
        {iconSrc && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <img
              src={`/${iconSrc}`}
              alt={iconAlt}
              loading="eager"
              className="w-5 h-5 object-contain"
            />
          </div>
        )}

        {/* [INPUT OR SELECT] */}
        {type === "select" ? (
          <select
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`${baseClasses} appearance-none font-roboto`}
          >
            <option value="" disabled>
              {placeholder || "Select an option"}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type === "password" ? (showPassword ? "text" : "password") : type}
            step="any"
            value={value}
            onChange={(e) => {
              let val = e.target.value;

              if (type === "number") {
                if (val.startsWith("-")) val = val.slice(1);
                val = val.replace(/[^\d.]/g, "");
                if (maxLength && val.length > maxLength) val = val.slice(0, maxLength);
                if (max !== undefined && Number(val) > max) val = String(max);
                const event = { ...e, target: { ...e.target, value: val } } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
                return;
              }

              onChange(e);
            }}
            placeholder={placeholder}
            disabled={disabled}
            style={numberInputStyle}
            className={`${baseClasses} ${
              type === "number" ? "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""
            }`}
            {...(type === "number" && max !== undefined ? { max } : {})}
          />
        )}

        {/* [RIGHT BUTTON] password toggle or clear */}
        {type === "password" && value ? (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            className={`absolute inset-y-0 right-0 flex items-center justify-center pb-1 pl-3 pr-4 h-full ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <img
              src={passwordIcon}
              alt={showPassword ? "Hide password" : "Show password"}
              className="size-6 pt-1 object-contain"
            />
          </button>
        ) : showClear && value && !disabled && type !== "date" && type !== "select" && type !== "number" ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center justify-center pb-1 pl-3 pr-5 h-full font-bold text-md text-[var(--color-text-400)] hover:text-[var(--color-text-600)] cursor-pointer"
          >
            &times;
          </button>
        ) : null}
      </div>

      {/* [ERROR MESSAGE] */}
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
};

export default InputField;