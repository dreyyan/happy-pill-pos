// [IMPORT] React Navigation
import React from "react";
import { useNavigate } from "react-router-dom";
interface ImageHeaderProps {
  businessName?: string;
}

const ImageHeader: React.FC<ImageHeaderProps> = ({ businessName }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/")}
      className="relative flex flex-col justify-center items-center space-y-2 bg-gradient-to-tr from-primary-500 to-primary-700 w-full px-4 py-8 cursor-pointer"
    >
      <h1 className="text-3xl font-bold text-text-50">
        {businessName || "POS System"}
      </h1>
      <p className="text-h5 text-text-50">
        "Powerful POS for seamless sales and operations"
      </p>
    </button>
  );
};

export default ImageHeader;