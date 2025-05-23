import React, { forwardRef, useEffect, useRef } from "react";
import { useEmulator } from "../context/EmulatorContext";
import GhostFreeLayout from "./GhostFreeLayout";

// Define props if needed
interface EmulatorDisplayProps {
  onEmulatorCreated?: (emulator: any) => void;
}

// Use forwardRef to pass the ref to the canvas element
const EmulatorDisplay = forwardRef<HTMLCanvasElement, EmulatorDisplayProps>(
  (props, ref) => {
    const { onEmulatorCreated } = props;
    const emulator = useEmulator();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (emulator && containerRef.current) {
        const canvas = emulator.getCanvas();
        if (canvas) {
          // Remove any previous canvas
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(canvas);
        }

        // Call the onEmulatorCreated prop if provided
        if (onEmulatorCreated) {
          onEmulatorCreated(emulator);
        }
      }
    }, [emulator, onEmulatorCreated]);
    
    return (
      <GhostFreeLayout className="mx-auto">        
        {/* GameBoy-like frame - more compact */}
        <div className="relative bg-gray-300 rounded-t-2xl rounded-b-xl p-4 pb-12 shadow-xl border-2 border-gray-400">
          {/* Logo */}
          <div className="absolute top-2 right-4 text-sm text-gray-600 font-bold">
            <span className="mr-1">GAME BOY</span>
            <span className="text-xs italic">AI</span>
          </div>
          
          {/* Screen with frame - more responsive */}
          <div className="bg-gray-800 p-3 rounded-md mb-3 shadow-inner">
            <div className="bg-gray-700 p-1 rounded">
              {/* Power indicator - adjusted position */}
              <div className="absolute top-[3rem] left-6 flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                <span className="text-xs text-gray-700">POWER</span>
              </div>
              
              {/* Canvas - responsive sizing */}
              <canvas
                ref={ref}
                id="emulator-canvas"
                width={160}
                height={144}
                className="block mx-auto bg-olive-500 rounded"
                style={{ 
                  imageRendering: "pixelated",
                  width: "480px",  /* 3x the original width - reduced from 4x */
                  height: "432px"  /* 3x the original height - reduced from 4x */
                }}
              />
            </div>
          </div>
          
          {/* D-pad outline - more compact */}
          <div className="absolute bottom-8 left-5 flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full opacity-20"></div>
          </div>

          {/* A/B buttons outline - more compact */}
          <div className="absolute bottom-8 right-6 flex space-x-3">
            <div className="w-8 h-8 bg-red-400 rounded-full shadow-md opacity-50"></div>
            <div className="w-8 h-8 bg-red-400 rounded-full shadow-md opacity-50"></div>
          </div>

          {/* Start/Select buttons - more compact */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-6">
            <div className="w-12 h-2 bg-gray-500 rounded-full transform rotate-345"></div>
            <div className="w-12 h-2 bg-gray-500 rounded-full transform rotate-345"></div>
          </div>
        </div>
      </GhostFreeLayout>
    );
  }
);

// Display name for debugging
EmulatorDisplay.displayName = "EmulatorDisplay";

export default EmulatorDisplay;
