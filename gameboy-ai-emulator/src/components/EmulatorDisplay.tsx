import React, { forwardRef, useEffect, useRef } from "react";
import { useEmulator } from "../context/EmulatorContext";

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
      <div className="relative mx-auto">        {/* GameBoy-like frame - enlarged to accommodate 4x larger screen */}
        <div className="relative bg-gray-300 rounded-t-2xl rounded-b-xl p-8 pb-24 shadow-xl border-4 border-gray-400">
          {/* Logo */}
          <div className="absolute top-4 right-12 text-lg text-gray-600 font-bold">
            <span className="mr-1">GAME BOY</span>
            <span className="text-sm italic">AI</span>
          </div>          {/* Screen with frame - enlarged */}
          <div className="bg-gray-800 p-6 rounded-md mb-6 shadow-inner">
            <div className="bg-gray-700 p-3 rounded">
              {/* Power indicator - adjusted position */}
              <div className="absolute top-[6rem] left-14 flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm text-gray-700">POWER</span>
              </div>{/* Canvas - 4x larger */}
              <canvas
                ref={ref}
                id="emulator-canvas"
                width={160}
                height={144}
                className="block mx-auto bg-olive-500 rounded"
                style={{ 
                  imageRendering: "pixelated",
                  width: "640px",  /* 4x the original width */
                  height: "576px"  /* 4x the original height */
                }}
              />
            </div>
          </div>          {/* D-pad outline - larger */}
          <div className="absolute bottom-16 left-10 w-24 h-24 flex items-center justify-center">
            <div className="w-24 h-24 bg-gray-600 rounded-full opacity-20"></div>
          </div>

          {/* A/B buttons outline - larger */}
          <div className="absolute bottom-16 right-12 flex space-x-6">
            <div className="w-12 h-12 bg-red-400 rounded-full shadow-md opacity-50"></div>
            <div className="w-12 h-12 bg-red-400 rounded-full shadow-md opacity-50"></div>
          </div>

          {/* Start/Select buttons - larger */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-8">
            <div className="w-16 h-3 bg-gray-500 rounded-full transform rotate-345"></div>
            <div className="w-16 h-3 bg-gray-500 rounded-full transform rotate-345"></div>
          </div>
        </div>
      </div>
    );
  }
);

// Display name for debugging
EmulatorDisplay.displayName = "EmulatorDisplay";

export default EmulatorDisplay;
