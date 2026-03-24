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
    <div className="flex flex-col items-center text-center gap-2">
      {/* Icon */}
      <div className="bg-primary-600 p-3 rounded-full">
        <img src={iconSrc} alt={title} className="w-6 h-6" />
      </div>

      {/* Title */}
      <h4 className="text-text-900">
        {title}
      </h4>

      {/* Description */}
      <p className="text-caption text-text-600">
        {description}
      </p>
    </div>
  );
};

export default TrustBadge;