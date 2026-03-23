import React from "react";

interface DashboardProps {
    iconSrc?: string;
    text: string;
    value: number;
};

const DashboardItem: React.FC<DashboardProps> = ({iconSrc, text, value}) => {
    return (
        <div className="flex items-center justify-between gap-x-2 bg-bg-50 pr-3 rounded-sm shadow-sm/10">
            <div className="flex items-center gap-x-2">
                {/* Icon */}
                <div className="p-2 bg-primary-700 rounded-l-sm flex items-center justify-center">
                <img src={iconSrc} className="size-5"/>
                </div>
                {/* Text */}
                <h3 className="text-h5">{text}</h3>
            </div>

            {/* Value container */}
            <div className="flex items-center justify-center h-full px-1 rounded-r-sm">
                <h2 className="text-text-900 text-center">{value}</h2>
            </div>
        </div>
    );
};

export default DashboardItem;