import React from "react";

// [IMPORT] Components
import InputField from "./InputField";

// ? [INTERFACE]
interface SelectOption {
  label: string;
  value: string | number;
}

interface FormField<T> {
  key: keyof T;
  label: string;
  type: "text" | "number" | "select";
  options?: (string | SelectOption)[];
  value?: string;
  onChange?: (value: string | number) => void;
  render?: () => React.ReactNode;
}

interface CrudModalProps<T extends Record<string, unknown>> {
  isOpen: boolean;
  title: string;
  isCancelable?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;

  formData?: T;
  // [FIX] Accept both functional updater and direct setter from React.useState
  setFormData?: React.Dispatch<React.SetStateAction<T>>;
  showForm?: boolean;

  formError?: string;
  disableConfirm?: boolean;

  formFields?: FormField<T>[];

  // [FIX] Allow caller to override the confirm button label
  confirmLabel?: string;

  children?: React.ReactNode;
}

function CrudModal<T extends Record<string, unknown>>({
  isOpen,
  title,
  isCancelable = true,
  onClose,
  onConfirm,
  loading = false,

  formData,
  setFormData,
  showForm = false,

  formError = "",
  disableConfirm = false,

  formFields = [],

  confirmLabel,

  children,
}: CrudModalProps<T>) {
  if (!isOpen) return null;

  const isDisabled = loading || disableConfirm;

  const handleConfirm = async () => {
    if (isDisabled) return;
    await onConfirm();
  };

  const handleFieldChange = (key: keyof T, type: string, rawValue: string) => {
    if (!setFormData) return;
    const val: unknown = type === "number" ? Number(rawValue) : rawValue;
    // [FIX] Use functional updater so state always reflects the latest value
    setFormData((prev) => ({ ...prev, [key]: val } as T));
  };

  // [FIX] Derive a sensible confirm label instead of hardcoding "Create Order"
  const resolvedConfirmLabel = confirmLabel
    ?? (loading
      ? "Processing..."
      : title.toLowerCase().includes("delete")
        ? "Confirm"
        : title.toLowerCase().includes("update") || title.toLowerCase().includes("edit")
          ? "Update"
          : "Confirm");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-lg font-bold mb-4">{title}</h2>

        <div className="flex-1 overflow-y-auto pr-2">
          {showForm && formData && setFormData && (
            <div className="flex flex-col gap-3">
              {formFields.map((field) => {
                if ("render" in field && typeof field.render === "function") {
                  return (
                    <div key={String(field.key)} className="flex flex-col">
                      <label className="font-roboto text-sm mb-1">{field.label}</label>
                      {field.render()}
                    </div>
                  );
                }

                if (field.type === "select" && field.options) {
                  return (
                    <div key={String(field.key)} className="flex flex-col">
                      <label className="font-roboto text-sm mb-1">{field.label}</label>
                      <select
                        value={String(field.value ?? formData[field.key] ?? "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (field.onChange) field.onChange(val);
                          else handleFieldChange(field.key, field.type, val);
                        }}
                        className="bg-[var(--color-bg-50)] font-roboto rounded-md py-2 px-3 border border-[var(--color-text-300)] outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
                      >
                        {field.options.map((opt) =>
                          typeof opt === "object" ? (
                            <option key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </option>
                          ) : (
                            <option key={opt} value={String(opt)}>
                              {opt}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  );
                }

                return (
                  <InputField
                    key={String(field.key)}
                    label={field.label}
                    type={field.type}
                    value={field.value ?? String(formData[field.key] ?? "")}
                    onChange={(e) =>
                      field.onChange
                        ? field.onChange(e.target.value)
                        : handleFieldChange(field.key, field.type, e.target.value)
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Render children */}
          {children}
        </div>

        {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          {isCancelable && (
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 rounded-lg font-roboto bg-[var(--color-bg-100)] text-[var(--color-text-700)] hover:bg-[var(--color-bg-200)] transition-colors text-sm disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className={`px-5 py-2 rounded-lg font-roboto text-white transition-colors text-sm disabled:opacity-60 ${
              title.toLowerCase().includes("delete")
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]"
            }`}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CrudModal;