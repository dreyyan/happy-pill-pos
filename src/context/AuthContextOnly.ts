import { createContext } from "react";

interface AuthContextType {
  showTokenExpiredModal: boolean;
  setShowTokenExpiredModal: (val: boolean) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);