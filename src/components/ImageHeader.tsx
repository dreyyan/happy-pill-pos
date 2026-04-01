// [IMPORT] React Navigation
import React from "react";
import { useNavigate } from "react-router-dom";

// [IMPORT] Helpers
import { adjustThemeColor, getContrastColor } from "../utils/helpers";

interface ImageHeaderProps {
  themeColor?: string;
  businessName?: string;
}

const ImageHeader: React.FC<ImageHeaderProps> = ({ themeColor, businessName }) => {
  const navigate = useNavigate();

  // Adjust the theme color to avoid too-bright background
  const adjustedColor = themeColor ? adjustThemeColor(themeColor) : "#6366F1";

  // Get contrasting text color (white or black) for readability
  const textColor = getContrastColor(adjustedColor);

  return (
    <button
      onClick={() => navigate("/")}
      className="relative flex flex-col justify-center items-center space-y-2 w-full px-4 py-8 cursor-pointer"
      style={{
        background: `linear-gradient(to top right, ${adjustedColor}, ${adjustedColor}CC)`,
      }}
    >
      <h1 style={{ color: textColor }} className="text-3xl font-bold">
        {businessName || "POS System"}
      </h1>
      <p className="text-h5" style={{ color: textColor }}>
        "Powerful POS for seamless sales and operations"
      </p>
    </button>
  );
};

export default ImageHeader;