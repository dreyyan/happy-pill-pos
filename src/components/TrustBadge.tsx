import React from "react";

// [IMPORT] Helpers
import { adjustThemeColor } from "../utils/helpers";

interface TrustBadgeProps {
  iconSrc: string;
  title: string;
  description: string;
  color?: string;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  iconSrc,
  title,
  description,
  color,
}) => {
  const bgColor = color ? adjustThemeColor(color) : undefined;

  return (
    <div className="flex flex-col items-center text-center gap-2 bg-bg-50 p-4 py-6 rounded-md shadow-md">
      {/* [UI] Icon */}
      <div
        className="p-3 rounded-full"
        style={bgColor ? { backgroundColor: bgColor } : { backgroundColor: "#6366F1" }}
      >
        <img src={iconSrc} alt={title} className="w-6 h-6" />
      </div>

      {/* [UI] Title */}
      <h4 className="text-text-900">{title}</h4>

      {/* [UI] Description */}
      <p className="text-caption text-text-600">{description}</p>
    </div>
  );
};

export default TrustBadge;