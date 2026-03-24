import React from "react";
import { useNavigate } from "react-router-dom";

interface SidebarLinkProps {
  icon: string;
  text: string;
  to?: string;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ icon, text, to, onClick }) => {
  const navigate = useNavigate();

  // [HANDLE] Click navigation link
  const handleClick = () => {
    if (to) navigate(to);
    if (onClick) onClick();
  };

  return (
    <button
      onClick={() => handleClick()}
      className="flex items-center gap-3 p-2 rounded hover:bg-bg-200 w-full text-left cursor-pointer">
      <img src={icon} alt={`${text} icon`} className="size-6" />
      <h3 className="text-primary-700">{text}</h3>
    </button>
  );
};

export default SidebarLink;