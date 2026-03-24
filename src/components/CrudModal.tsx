import React from "react";
import InputField from "./InputField";

// ?[INTERFACES]
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
  setFormData?: (updater: (prev: T) => T) => void;
  showForm?: boolean;

  formError?: string;
  disableConfirm?: boolean;

  formFields?: FormField<T>[];
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
}: CrudModalProps<T>) {
  if (!isOpen) return null;

  const isDisabled = loading || disableConfirm;

  const handleConfirm = async () => {
    if (isDisabled) return;
    await onConfirm();
  };

  // [HANDLE] Input field change
  const handleFieldChange = (key: keyof T, type: string, rawValue: string) => {
    if (!setFormData) return;
    const val: unknown = type === "number" ? Number(rawValue) : rawValue;
    setFormData((prev) => ({ ...prev, [key]: val } as T));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-visible">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg overflow-visible">
        <h2 className="text-lg font-bold mb-4">{title}</h2>

        {showForm && formData && setFormData && (
          <div className="flex flex-col gap-3">
{formFields.map((field) => {
  // [CUSTOM RENDER] - Highest priority
  if ("render" in field && typeof field.render === "function") {
    return (
      <div key={String(field.key)} className="flex flex-col">
        <label className="font-roboto text-sm mb-1">{field.label}</label>
        {field.render()}
      </div>
    );
  }

  // [SELECT] Field
  if (field.type === "select" && field.options) {
    return (
      <div key={String(field.key)} className="flex flex-col">
        <label className="font-roboto text-sm mb-1">{field.label}</label>
        <select
          value={String(field.value ?? formData[field.key] ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            if (field.onChange) {
              field.onChange(val);
            } else {
              handleFieldChange(field.key, field.type, val);
            }
          }}
          className="bg-[var(--color-bg-50)] font-roboto rounded-md py-2 px-3 border border-[var(--color-text-300)] outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          disabled={!field.options || field.options.length === 0}
        >
          {field.options?.map((opt) =>
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

  // [DEFAULT] InputField
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
            {formError && <p className="text-red-500 text-sm mt-1">{formError}</p>}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          {isCancelable && (
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-roboto bg-[var(--color-bg-100)] text-[var(--color-text-700)] hover:bg-[var(--color-bg-200)] transition-colors text-sm disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className={`px-4 py-2 rounded-lg font-roboto text-white transition-colors text-sm ${
              title.includes("Delete")
                ? "bg-[var(--color-red-500)] hover:bg-[var(--color-red-600)]"
                : "bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]"
            }`}
          >
            {loading ? "Processing..." : title.includes("Delete") ? "Confirm" : title.includes("Create") ? "Create" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CrudModal;