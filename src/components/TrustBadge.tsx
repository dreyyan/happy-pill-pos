import React from "react";

interface TrustBadgeProps {
  iconSrc: string;
  title: string;
  description: string;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  iconSrc,
  title,
  description,
}) => {
  return (
    <div className="flex flex-col items-center text-center gap-2 bg-bg-50 p-4 py-6 rounded-md shadow-md">
      {/* [UI] Icon */}
      <div className="bg-primary-600 p-3 rounded-full">
        <img src={iconSrc} alt={title} className="w-6 h-6" />
      </div>

      {/* [UI] Title */}
      <h4 className="text-text-900">
        {title}
      </h4>

      {/* [UI] Description */}
      <p className="text-caption text-text-600">
        {description}
      </p>
    </div>
  );
};

export default TrustBadge;