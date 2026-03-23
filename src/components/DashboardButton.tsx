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

const DashboardButton: React.FC<DashboardButtonProps> = ({ iconSrc, text, colorFrom, colorTo, gradientDirection = "135deg", to }) => {
    const navigate = useNavigate();

    // [HANDLE] Navigation
    const handleClick = () => {
        if (to) {
            navigate(to);
        }
    };

    return (
        <button
            style={{
                background: `linear-gradient(${gradientDirection}, ${colorFrom}, ${colorTo})`,
            }}
            onClick={handleClick}
            className="flex flex-col justify-center items-center aspect-square rounded-lg cursor-pointer transition-all duration-200 hover:opacity-90 shadow-md"
        >
            {/* Icon */}
            {iconSrc && <img src={iconSrc} className="size-16" />}

            {/* Text */}
            <p className="text-button font-button-primary text-text-50 mt-2">{text}</p>
        </button>
    );
};

export default DashboardButton;