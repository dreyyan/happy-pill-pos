import React from "react";
import { useNavigate } from "react-router-dom";

// ? [INTERFACE]
interface DashboardButtonProps {
  iconSrc?: string;
  text: string;
  colorFrom: string;
  colorTo: string;
  gradientDirection?: string;
  to?: string;
}

const DashboardButton: React.FC<DashboardButtonProps> = ({
  iconSrc,
  text,
  colorFrom,
  colorTo,
  gradientDirection = "135deg",
  to,
}) => {
  const navigate = useNavigate();

  // [HANDLE] Navigation
  const handleClick = () => {
    if (to) navigate(to);
  };

  return (
    <button
      style={{
        background: `linear-gradient(${gradientDirection}, ${colorFrom}, ${colorTo})`,
      }}
      onClick={handleClick}
      className="
        flex flex-col sm:flex-row justify-center items-center 
        w-full 
        aspect-square sm:aspect-auto 
        max-w-[200px] sm:max-w-full
        rounded-lg 
        cursor-pointer 
        transition-all duration-200 hover:opacity-90 shadow-md
         sm:gap-4
        px-4 py-3
      "
    >
      {/* Icon */}
      {iconSrc && (
        <img
          src={iconSrc}
          className="w-16 h-16 sm:w-12 sm:h-12 object-contain"
          alt={text + " icon"}
        />
      )}

      {/* Text */}
      <p className="text-button font-button-primary text-text-50 mt-2 sm:mt-0 text-center sm:text-left truncate">
        {text}
      </p>
    </button>
  );
};

export default DashboardButton;