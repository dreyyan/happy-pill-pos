// [IMPORT] React
import React from "react";

// ? [INTERFACE]
interface SkeletonProps {
  message?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-50">
      
      {/* Shimmer Background */}
      <div className="absolute inset-0 animate-pulse bg-bg-100" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-y-4">

        {/* Spinner */}
        <div className="h-12 w-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />

        {/* Message */}
        <p className="text-text-700 font-medium">{message}</p>

      </div>
    </div>
  );
};

export default Skeleton;