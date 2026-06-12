"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

type NavigationGuardContextType = {
  isGuarded: boolean;
  setGuarded: (guarded: boolean) => void;
};

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  isGuarded: false,
  setGuarded: () => {},
});

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [isGuarded, setGuarded] = useState(false);
  return (
    <NavigationGuardContext.Provider value={{ isGuarded, setGuarded }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
