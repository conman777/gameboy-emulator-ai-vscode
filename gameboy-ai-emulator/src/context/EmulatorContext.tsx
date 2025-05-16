import React, { createContext, useContext, useEffect, useState } from "react";
import { EmulatorWrapper, EmulatorWrapperApi } from "../emulator/EmulatorWrapper";

// Create the context type
type EmulatorContextType = {
  emulator: EmulatorWrapperApi | null;
};

// Create the context
const EmulatorContext = createContext<EmulatorContextType | undefined>(undefined);

// Define props for the provider
interface EmulatorProviderProps {
  children: React.ReactNode;
  canvasElement: HTMLCanvasElement | null;
}

// Provider component
export const EmulatorProvider: React.FC<EmulatorProviderProps> = ({ children, canvasElement }) => {
  // Use state to hold the emulator instance
  const [emulator, setEmulator] = useState<EmulatorWrapperApi | null>(null);

  useEffect(() => {
    // Create the emulator instance only when the canvas element is available
    // and if an instance doesn't already exist.
    if (canvasElement && !emulator) {
      console.log("Canvas element received in Provider, creating EmulatorWrapper...");
      try {
        const instance = new EmulatorWrapper(canvasElement);
        setEmulator(instance);
        console.log("EmulatorWrapper instance created and set in context.");
      } catch (error) {
        console.error("Failed to create EmulatorWrapper instance:", error);
      }
    }
  }, [canvasElement, emulator]);

  // Provide the emulator instance (or null if not ready)
  return (
    <EmulatorContext.Provider value={{ emulator: emulator || null }}>
      {children}
    </EmulatorContext.Provider>
  );
};

// Custom hook for consuming the context
export function useEmulator() {
  const context = useContext(EmulatorContext);
  if (context === undefined) {
    throw new Error("useEmulator must be used within an EmulatorProvider");
  }
  return context.emulator;
}
