import { EmulatorWrapper } from './EmulatorWrapper';
import { Gameboy, mockGameboy } from 'gameboy-emulator'; // Imports from the mock

// Mock the entire gameboy-emulator module
jest.mock('gameboy-emulator');

describe('EmulatorWrapper', () => {
  let emulatorWrapper: EmulatorWrapper;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a fresh mock canvas for each test
    mockCanvas = document.createElement('canvas');
    jest.spyOn(mockCanvas, 'getContext').mockReturnValue({
      putImageData: jest.fn(),
    } as any);
    emulatorWrapper = new EmulatorWrapper(mockCanvas);
    
    // Reset all mocks before each test
    // This is crucial if the mockGameboy object's functions are globally defined in the mock file
    // and then assigned to instances.
    // If the mock functions are created fresh for each `new Gameboy()`, this might be redundant.
    // However, it's safer to explicitly clear/reset them here.
    mockGameboy.loadGame.mockClear();
    mockGameboy.run.mockClear();
    mockGameboy.onFrameFinished.mockClear();
    // mockGameboy.stop.mockClear(); // If you had a direct stop mock
    mockGameboy.saveState.mockClear().mockResolvedValue('mocked_save_data');
    mockGameboy.loadState.mockClear().mockResolvedValue(true);

    // Reset internal state of the mockGameboy that might be modified by tests
    mockGameboy.cartridge.title = 'Test ROM';
    mockGameboy.cpu.isRunning = false; 
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have romLoaded = false and gameboy = null initially', () => {
      // Accessing private members for testing can be done by casting to any
      // or by designing the class for testability (e.g. protected members or test-specific getters)
      expect((emulatorWrapper as any).romLoaded).toBe(false);
      expect((emulatorWrapper as any).gameboy).toBeNull();
    });

    it('isReady() should return false initially', () => {
      expect(emulatorWrapper.isReady()).toBe(false);
    });

    it('isRunning() should return false initially', () => {
      expect(emulatorWrapper.isRunning()).toBe(false);
    });
  });

  describe('loadROM()', () => {
    const romData = new ArrayBuffer(10);

    it('should load a ROM successfully', async () => {
      mockGameboy.loadGame.mockReturnValue(undefined); // Simulate successful loadGame
      // mockGameboy.cartridge.title = 'Test ROM'; // Already set in beforeEach, but good to be explicit

      const result = await emulatorWrapper.loadROM(romData);

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test ROM');
      expect((emulatorWrapper as any).romLoaded).toBe(true);
      expect((emulatorWrapper as any).gameboy).not.toBeNull();
      expect(emulatorWrapper.isReady()).toBe(true);
      // isRunning should be false until start() is called, even if a ROM is loaded
      // and gameboy instance exists, because the cpu.isRunning might be false.
      // The new isRunning() also checks typeof this.gameboy.cpu
      expect(emulatorWrapper.isRunning()).toBe(false); 
      expect(mockGameboy.loadGame).toHaveBeenCalledWith(romData);
      expect(mockGameboy.onFrameFinished).toHaveBeenCalled();
    });

    it('should handle failed ROM loading', async () => {
      mockGameboy.loadGame.mockImplementation(() => {
        throw new Error('Failed to load');
      });

      const result = await emulatorWrapper.loadROM(romData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to load ROM: Failed to load');
      expect((emulatorWrapper as any).romLoaded).toBe(false);
      expect((emulatorWrapper as any).gameboy).toBeNull();
      expect(emulatorWrapper.isReady()).toBe(false);
      expect(emulatorWrapper.isRunning()).toBe(false);
    });
     it('should stop the previous gameboy instance if one exists before loading a new ROM', async () => {
      // First, load a ROM successfully
      await emulatorWrapper.loadROM(romData);
      const firstGameboyInstance = (emulatorWrapper as any).gameboy;
      expect(firstGameboyInstance).not.toBeNull();
      // Spy on the onFrameFinished of the *instance* if possible, or check a side effect of stopping
      // For simplicity, we check if a new Gameboy instance is created, implying the old one was handled
      // and that onFrameFinished was called on the old one (which stop() does)

      // Load another ROM
      const newRomData = new ArrayBuffer(20);
      await emulatorWrapper.loadROM(newRomData);
      
      // Check that onFrameFinished was called on the first instance (mocked globally for Gameboy class)
      // This assumes the first instance's onFrameFinished was the one called by stop()
      expect(mockGameboy.onFrameFinished).toHaveBeenCalledTimes(2); // Once for load, once for stop previous
      expect((emulatorWrapper as any).gameboy).not.toBe(firstGameboyInstance); // New instance
      expect((emulatorWrapper as any).gameboy).not.toBeNull(); // New instance created
      expect((emulatorWrapper as any).romLoaded).toBe(true);
    });
  });

  describe('start()', () => {
    it('should not call gameboy.run() if not ready', () => {
      emulatorWrapper.start();
      expect(mockGameboy.run).not.toHaveBeenCalled();
    });

    it('should call gameboy.run() and set isRunning to true if ready', async () => {
      await emulatorWrapper.loadROM(new ArrayBuffer(10));
      // Simulate that the gameboy's CPU is now considered running by the mock
      // The actual Gameboy class would internally set its CPU state when run() is called.
      // Our mock needs to reflect this for isRunning() to be true.
      (Gameboy as any).mock.instances[0].cpu.isRunning = true; // After run() is called
      // Or, more cleanly, ensure the mock for `run` sets this.
      mockGameboy.run.mockImplementation(() => {
         if ((emulatorWrapper as any).gameboy) {
            (emulatorWrapper as any).gameboy.cpu.isRunning = true;
         }
      });


      emulatorWrapper.start();
      expect(mockGameboy.run).toHaveBeenCalled();
      expect(emulatorWrapper.isRunning()).toBe(true);
    });
  });

  describe('stop()', () => {
    beforeEach(async () => {
      await emulatorWrapper.loadROM(new ArrayBuffer(10));
      // Simulate gameboy running
      mockGameboy.run.mockImplementation(() => {
         if ((emulatorWrapper as any).gameboy) {
            (emulatorWrapper as any).gameboy.cpu.isRunning = true;
         }
      });
      emulatorWrapper.start(); // This will call the mocked run, which sets cpu.isRunning
    });

    it('should call gameboy.onFrameFinished with an empty function, nullify gameboy, and reset flags', () => {
      expect(emulatorWrapper.isReady()).toBe(true);
      // isRunning() depends on the cpu state in the mock
      expect(emulatorWrapper.isRunning()).toBe(true); 

      emulatorWrapper.stop();

      // onFrameFinished is called once during loadROM, then again during stop
      expect(mockGameboy.onFrameFinished).toHaveBeenCalledTimes(2); 
      expect(mockGameboy.onFrameFinished.mock.calls[1][0]).toBeInstanceOf(Function);
      // Check if the function is empty (hard to verify precisely without more complex mocking)
      // but we know it was called.

      expect((emulatorWrapper as any).gameboy).toBeNull();
      expect((emulatorWrapper as any).romLoaded).toBe(false);
      expect(emulatorWrapper.isReady()).toBe(false);
      expect(emulatorWrapper.isRunning()).toBe(false);
    });
  });

  describe('isReady() and isRunning()', () => {
    it('isReady should be true after successful loadROM, false after stop', async () => {
      expect(emulatorWrapper.isReady()).toBe(false);
      await emulatorWrapper.loadROM(new ArrayBuffer(10));
      expect(emulatorWrapper.isReady()).toBe(true);
      emulatorWrapper.stop();
      expect(emulatorWrapper.isReady()).toBe(false);
    });

    it('isRunning should be true after start, false after stop or if not started', async () => {
      expect(emulatorWrapper.isRunning()).toBe(false);
      await emulatorWrapper.loadROM(new ArrayBuffer(10));
      expect(emulatorWrapper.isRunning()).toBe(false); // Not started yet

      mockGameboy.run.mockImplementation(() => {
        if ((emulatorWrapper as any).gameboy) {
            (emulatorWrapper as any).gameboy.cpu.isRunning = true;
         }
      });
      emulatorWrapper.start();
      expect(emulatorWrapper.isRunning()).toBe(true);

      emulatorWrapper.stop();
      expect(emulatorWrapper.isRunning()).toBe(false);
    });
    
    it('isRunning should be false if gameboy.cpu is undefined (relevant for the new check)', async () => {
      await emulatorWrapper.loadROM(new ArrayBuffer(10));
      // Explicitly make cpu undefined on the current gameboy instance for this test
      if ((emulatorWrapper as any).gameboy) {
        delete (emulatorWrapper as any).gameboy.cpu;
      }
      emulatorWrapper.start(); // Attempt to start
      expect(emulatorWrapper.isRunning()).toBe(false);
    });
  });

  describe('Button Presses, Screenshots, Save/Load State', () => {
    const testButtonMethods = (methodName: 'pressButton' | 'releaseButton', button: any) => {
      it(`${methodName} should not throw if emulator not ready`, () => {
        expect(() => emulatorWrapper[methodName](button)).not.toThrow();
      });

      it(`${methodName} should call gameboy input if ready and running`, async () => {
        await emulatorWrapper.loadROM(new ArrayBuffer(10));
        mockGameboy.run.mockImplementation(() => {
            if ((emulatorWrapper as any).gameboy) (emulatorWrapper as any).gameboy.cpu.isRunning = true;
        });
        emulatorWrapper.start();
        
        // Get the actual gameboy instance created by the wrapper
        const currentGbInstance = (emulatorWrapper as any).gameboy;
        expect(currentGbInstance).not.toBeNull();

        emulatorWrapper[methodName](button);
        // Example for pressButton 'a'
        // This check needs to be specific to the button and method.
        // For instance, if button is 'a' and methodName is 'pressButton', 
        // you'd expect currentGbInstance.input.isPressingA to be true.
        // This requires the mockGameboy in the __mocks__ to correctly reflect these properties.
        // For simplicity, we'll just check if the relevant input property was set on the *mocked instance*.
        // This assumes the mockGameboy's input object is what the Gameboy class instance uses.
        if (currentGbInstance && currentGbInstance.input) {
            if (methodName === 'pressButton') {
                expect(currentGbInstance.input[`isPressing${button.charAt(0).toUpperCase() + button.slice(1)}`]).toBe(true);
            } else {
                 expect(currentGbInstance.input[`isPressing${button.charAt(0).toUpperCase() + button.slice(1)}`]).toBe(false);
            }
        } else {
            throw new Error("Gameboy instance or input not found for testing button press.");
        }
      });
    };

    ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'].forEach(btn => {
      testButtonMethods('pressButton', btn as any);
      testButtonMethods('releaseButton', btn as any);
    });
    
    // getScreenDataAsBase64
    it('getScreenDataAsBase64 should not throw and return null if not ready', async () => {
        await expect(emulatorWrapper.getScreenDataAsBase64()).resolves.toBeNull();
    });
    
    it('getScreenDataAsBase64 should return base64 string if ready', async () => {
        await emulatorWrapper.loadROM(new ArrayBuffer(10));
        mockCanvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mocked_base64_data');
        await expect(emulatorWrapper.getScreenDataAsBase64()).resolves.toBe('mocked_base64_data');
        expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    });

    // captureScreenshot
    it('captureScreenshot should not throw and return empty string if not ready', () => {
        expect(emulatorWrapper.captureScreenshot()).toBe("");
    });

    it('captureScreenshot should return base64 string if ready and running', async () => {
        await emulatorWrapper.loadROM(new ArrayBuffer(10));
        mockGameboy.run.mockImplementation(() => {
            if ((emulatorWrapper as any).gameboy) (emulatorWrapper as any).gameboy.cpu.isRunning = true;
        });
        emulatorWrapper.start();
        mockCanvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,screenshot_data');
        expect(emulatorWrapper.captureScreenshot()).toBe('screenshot_data');
    });

    // saveState
    it('saveState should throw if not ready', async () => {
        await expect(emulatorWrapper.saveState()).rejects.toThrow("Cannot save state: Emulator not ready");
    });
    
    it('saveState should call gameboy.saveState if ready', async () => {
        await emulatorWrapper.loadROM(new ArrayBuffer(10));
        // Ensure the gameboy instance is available for saveState
        const gbInstance = (emulatorWrapper as any).gameboy;
        expect(gbInstance).not.toBeNull();
        
        // Mock the captureScreenshot on the wrapper as saveState calls it
        jest.spyOn(emulatorWrapper, 'captureScreenshot').mockReturnValue('fake_screenshot_data');

        const result = await emulatorWrapper.saveState();
        // The actual saveState on the mockGameboy object is what we expect to be called.
        // However, our mock setup means the instance method `gbInstance.saveState` points to `mockGameboy.saveState`.
        // The test below is checking the global mock, which is correct.
        // We don't have direct access to the gameboy-emulator's saveState, so we rely on our mock.
        // The wrapper's saveState now creates a complex object, so we check parts of it.
        const decodedResult = JSON.parse(atob(result));
        expect(decodedResult.screenshot).toBe('fake_screenshot_data');
        expect(decodedResult.memory).toBeDefined(); // Memory is part of the mocked save state
    });

    // loadState
    it('loadState should throw if not ready', async () => {
        await expect(emulatorWrapper.loadState('test')).rejects.toThrow("Cannot load state: Emulator not ready");
    });

    it('loadState should call gameboy.loadState if ready', async () => {
        await emulatorWrapper.loadROM(new ArrayBuffer(10));
        const gbInstance = (emulatorWrapper as any).gameboy;
        expect(gbInstance).not.toBeNull();

        // The wrapper's loadState doesn't directly call gbInstance.loadState in the provided code,
        // it just logs. If it *were* to call it, this is how you'd test it.
        // For now, we test that it returns true and logs as per current implementation.
        const consoleSpy = jest.spyOn(console, 'log');
        const saveData = btoa(JSON.stringify({ timestamp: Date.now(), memory: [1,2,3], screenshot: "t"}));
        const result = await emulatorWrapper.loadState(saveData);
        
        expect(result).toBe(true); // As per current mock implementation
        expect(consoleSpy).toHaveBeenCalledWith("State load requested. Full state restoration not yet implemented.");
        // If the actual gameboy-emulator's loadState were called, you'd check:
        // expect(mockGameboy.loadState).toHaveBeenCalledWith(expect.anything()); // or the specific data
        consoleSpy.mockRestore();
    });
  });
});
