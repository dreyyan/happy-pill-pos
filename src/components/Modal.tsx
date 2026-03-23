// [IMPORT] Hooks
import React from "react";
import { useState, useEffect, useRef } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  inputValue?: string;
  onConfirm?: (value: string) => void;
  confirmButton?: React.ReactNode;
  children?: React.ReactNode;
  type?: "default" | "error" | "success" | "info" | "warning";
  showInput?: boolean;
  closeOnBackdrop?: boolean;
  isCancelable?: boolean;
};

const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  inputValue = "",
  onConfirm,
  confirmButton,
  children,
  type = "default",
  showInput = false,
  closeOnBackdrop = true,
  isCancelable = true,
}: ModalProps) => {
  // [STATES]
  const [textInput, setTextInput] = useState(inputValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // [EFFECT] Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCancelable) onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    if (showInput) setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, showInput, isCancelable]);

  if (!isOpen) return null;

  // [STYLES] border + text colors
  const borderColors = {
    default: "border-t-primary-500",
    error: "border-t-red-500",
    success: "border-t-green-500",
    info: "border-t-primary-700",
    warning: "border-t-secondary-600",
  };
  const textColors = {
    default: "text-primary-500",
    error: "text-red-600",
    success: "text-green-600",
    info: "text-primary-700",
    warning: "text-secondary-500",
  };
  const borderClass = borderColors[type];
  const textClass = textColors[type];

  const inputBorderClass =
    type === "error"
      ? "border-red-500 focus:ring-red-500"
      : "border-gray-300 focus:ring-blue-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={() => closeOnBackdrop && isCancelable && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        key={isOpen ? "modal-open" : "modal-closed"}
        className={`bg-[var(--color-bg-100)] rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7 flex flex-col border-t-4 ${borderClass} animate-[scaleIn_.18s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* [TITLE] */}
        <h2 className={`text-xl sm:text-2xl font-semibold mb-3 ${textClass}`}>
          {title}
        </h2>

        {/* [MESSAGE OR CHILDREN] */}
        {children ? (
          <div className="mb-4">{children}</div>
        ) : (
          message && (
            <p
              className="text-sm font-roboto sm:text-base text-[var(--color-text-700)] mb-4"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          )
        )}

        {/* [OPTIONAL INPUT] */}
        {showInput && (
          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter value..."
            className={`w-full mb-5 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow shadow-sm ${inputBorderClass}`}
          />
        )}

        {/* [BUTTONS] */}
        <div className="flex justify-end gap-3 mt-2">
          {isCancelable && !confirmButton && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-roboto text-[var(--color-text-700)] bg-[var(--color-bg-100)] hover:bg-[var(--color-bg-200)] transition-colors text-sm sm:text-base"
            >
              {cancelText}
            </button>
          )}

          {/* Use custom confirmButton if provided */}
          {confirmButton ? (
            confirmButton
          ) : (
            <button
              onClick={() => {
                onConfirm?.(textInput);
                onClose();
              }}
              className="px-4 py-2 rounded-lg font-roboto text-[var(--color-text-50)] text-sm sm:text-base font-semibold bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] transition-colors"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;