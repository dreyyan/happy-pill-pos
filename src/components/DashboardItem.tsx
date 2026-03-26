import React from "react";

// ? [INTERFACE]
interface DashboardProps {
  iconSrc?: string;
  text: string;
  value: number | string;
}

const DashboardItem: React.FC<DashboardProps> = ({ iconSrc, text, value }) => {
  return (
    <div className="flex items-center justify-between gap-x-2 bg-bg-50 pr-3 rounded-sm shadow-sm/10 w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]">
      <div className="flex items-center gap-x-2">
        {/* [UI] Icon */}
        <div className="p-2 bg-primary-700 rounded-l-sm flex items-center justify-center min-w-[2.5rem] min-h-[2.5rem]">
          <img src={iconSrc} className="w-5 h-5 object-contain" alt={text + " icon"} />
        </div>

        {/* [UI] Text */}
        <h3 className="text-h5">{text}</h3>
      </div>

      {/* [SECTION] Value */}
      <div className="flex items-center justify-center h-full px-1 rounded-r-sm">
        <h2 className="text-text-900 text-center">{value}</h2>
      </div>
    </div>
  );
};

export default DashboardItem;