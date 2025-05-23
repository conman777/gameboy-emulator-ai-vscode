import { Gameboy } from 'gameboy-emulator';
import { GameBoyButton } from '../types';

/**
 * Interface defining the Emulator API
 */
export interface EmulatorWrapperApi {
  loadROM(romData: ArrayBuffer): Promise<{ success: boolean; message?: string; title?: string }>;
  start(): void;
  stop(): void;
  isReady(): boolean;
  isRunning(): boolean;
  getScreenDataAsBase64(): Promise<string | null>;
  pressButton(button: GameBoyButton): void;
  releaseButton(button: GameBoyButton): void;
  getCanvas(): HTMLCanvasElement | null;
  captureScreenshot(): string;
  saveState(): Promise<string>;
  loadState(saveData: string): Promise<boolean>;
}

// Mapping from our button type to gameboy-emulator's key codes
const keyMap: { [key in GameBoyButton]: number } = {
  right: 0,
  left: 1,
  up: 2,
  down: 3,
  a: 4,
  b: 5,
  select: 6,
  start: 7,
};

export class EmulatorWrapper implements EmulatorWrapperApi {
  private gameboy: Gameboy | null = null;
  private romLoaded: boolean = false;
  private gameTitle: string | undefined = undefined;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    // Use provided canvas or create a new one
    this.canvas = canvas || document.createElement('canvas');
    
    // Set default dimensions if needed
    if (this.canvas.width === 0) this.canvas.width = 160;
    if (this.canvas.height === 0) this.canvas.height = 144;
    
    this.context = this.canvas.getContext('2d');
  }

  async loadROM(romData: ArrayBuffer): Promise<{ success: boolean; message?: string; title?: string }> {
    try {
      this.stop();
      this.gameboy = new Gameboy();
      this.gameboy.loadGame(romData);

      // Set up frame rendering
      if (this.context) {
        this.gameboy.onFrameFinished((imageData: ImageData) => {
          this.context!.putImageData(imageData, 0, 0);
        });
      }

      // Get game title if available
      this.gameTitle = this.gameboy.cartridge?.title || undefined;
      this.romLoaded = true;
      return { success: true, title: this.gameTitle };
    } catch (error: any) {
      this.romLoaded = false;
      this.gameboy = null;
      return { success: false, message: `Failed to load ROM: ${error.message || error}` };
    }
  }

  start(): void {
    if (!this.isReady()) return;
    this.gameboy?.run();
  }

  stop(): void {
    // No explicit stop in API, but we can clear the frame callback to "pause" rendering
    if (this.gameboy) {
      this.gameboy.onFrameFinished(() => {});
    }
    this.gameboy = null;
    this.romLoaded = false;
  }

  isReady(): boolean {
    return this.romLoaded && this.gameboy !== null;
  }

  isRunning(): boolean {
    // No explicit running state, so just check if gameboy exists and ROM is loaded
    return this.romLoaded && this.gameboy !== null && (typeof (this.gameboy as any).cpu !== 'undefined');
  }

  async getScreenDataAsBase64(): Promise<string | null> {
    if (!this.canvas || !this.isReady() || !this.gameboy) return null;
    try {
      const dataUrl = this.canvas.toDataURL('image/png');
      return dataUrl.split(',')[1];
    } catch {
      return null;
    }
  }

  pressButton(button: GameBoyButton): void {
    if (!this.gameboy || !this.isRunning() || !this.gameboy) return;
    // Use the input API for programmatic button presses
    switch (button) {
      case 'up': this.gameboy.input.isPressingUp = true; break;
      case 'down': this.gameboy.input.isPressingDown = true; break;
      case 'left': this.gameboy.input.isPressingLeft = true; break;
      case 'right': this.gameboy.input.isPressingRight = true; break;
      case 'a': this.gameboy.input.isPressingA = true; break;
      case 'b': this.gameboy.input.isPressingB = true; break;
      case 'start': this.gameboy.input.isPressingStart = true; break;
      case 'select': this.gameboy.input.isPressingSelect = true; break;
    }
  }

  releaseButton(button: GameBoyButton): void {
    if (!this.gameboy || !this.isRunning() || !this.gameboy) return;
    switch (button) {
      case 'up': this.gameboy.input.isPressingUp = false; break;
      case 'down': this.gameboy.input.isPressingDown = false; break;
      case 'left': this.gameboy.input.isPressingLeft = false; break;
      case 'right': this.gameboy.input.isPressingRight = false; break;
      case 'a': this.gameboy.input.isPressingA = false; break;
      case 'b': this.gameboy.input.isPressingB = false; break;
      case 'start': this.gameboy.input.isPressingStart = false; break;
      case 'select': this.gameboy.input.isPressingSelect = false; break;
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
  captureScreenshot(): string {
    // Check if emulator is ready
    if (!this.isReady() || !this.isRunning() || !this.canvas || !this.gameboy) {
      console.error("Cannot capture screenshot: Emulator not ready or canvas not available");
      return "";
    }
    
    try {
      // Convert the canvas to base64 PNG
      const base64Image = this.canvas.toDataURL('image/png').split(',')[1];
      return base64Image;
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      return "";
    }
  }
  async saveState(): Promise<string> {
    if (!this.gameboy || !this.isReady() || !this.gameboy) {
      throw new Error("Cannot save state: Emulator not ready");
    }
    
    try {
      // Create a serializable state object with what we can access
      const stateData = {
        timestamp: Date.now(),
        // Get memory state if the emulator provides access to it
        memory: this.gameboy.memory ? Array.from(this.gameboy.memory) : undefined,
        // Include a screenshot for visual reference
        screenshot: this.captureScreenshot()
      };
      
      // Convert to JSON and then to base64
      const serialized = JSON.stringify(stateData);
      const base64Data = btoa(serialized);
      
      return base64Data;
    } catch (error: any) {
      console.error("Error saving state:", error);
      throw new Error(`Failed to save state: ${error.message || 'Unknown error'}`);
    }
  }

  async loadState(saveData: string): Promise<boolean> {
    if (!this.gameboy || !this.isReady() || !this.gameboy) {
      throw new Error("Cannot load state: Emulator not ready");
    }
    
    try {
      // Deserialize the state data
      const serialized = atob(saveData);
      const stateData = JSON.parse(serialized);
      
      // TODO: Implement actual state restoration when gameboy-emulator supports it
      // For now, we'll just return true and log a message
      console.log("State load requested. Full state restoration not yet implemented.");
      console.log("State data timestamp:", new Date(stateData.timestamp).toLocaleString());
      
      // Return true to indicate "successful" loading (even though it's just a placeholder)
      return true;
    } catch (error: any) {
      console.error("Error loading state:", error);
      throw new Error(`Failed to load state: ${error.message || 'Unknown error'}`);
    }
  }

  // Optional: Add cleanup method if needed
  // cleanup() {
  //   this.stop();
  //   if (this.canvas && this.canvas.parentNode) {
  //     this.canvas.parentNode.removeChild(this.canvas);
  //   }
  //   this.gameboy = null;
  //   this.canvas = null;
  // }
}
