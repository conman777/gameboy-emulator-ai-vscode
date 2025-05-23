export const mockGameboy = {
  loadGame: jest.fn(),
  run: jest.fn(),
  onFrameFinished: jest.fn(),
  cartridge: { title: 'Test ROM' },
  cpu: { isRunning: false }, // Mock the cpu object and its isRunning property
  input: {
    isPressingUp: false,
    isPressingDown: false,
    isPressingLeft: false,
    isPressingRight: false,
    isPressingA: false,
    isPressingB: false,
    isPressingStart: false,
    isPressingSelect: false,
  },
  memory: new Uint8Array(1024), // Mock memory
  stop: jest.fn(), // Mock stop if it exists on Gameboy class, though wrapper uses onFrameFinished
  saveState: jest.fn().mockResolvedValue('mocked_save_data'), // Mock saveState
  loadState: jest.fn().mockResolvedValue(true), // Mock loadState
};

export class Gameboy {
  constructor() {
    // Reset mocks for each new instance if necessary, or manage state in mockGameboy
    Object.assign(this, mockGameboy);
    // Cast to any to bypass readonly checks for mock purposes
    (this as any).cpu = { ...mockGameboy.cpu }; // Ensure cpu state is fresh for each instance
    (this as any).input = { ...mockGameboy.input };
    (this as any).cartridge = { ...mockGameboy.cartridge };

    // Clear mock function calls for new instances
    mockGameboy.loadGame.mockClear();
    mockGameboy.run.mockClear();
    mockGameboy.onFrameFinished.mockClear();
    mockGameboy.stop.mockClear();
    mockGameboy.saveState.mockClear();
    mockGameboy.loadState.mockClear();
  }

  // Methods need to be part of the class prototype for jest.spyOn to work if needed
  // or ensure they are assigned from mockGameboy in constructor as above.
  loadGame = mockGameboy.loadGame;
  run = mockGameboy.run;
  onFrameFinished = mockGameboy.onFrameFinished;
  // stop = mockGameboy.stop; // if it exists
  saveState = mockGameboy.saveState;
  loadState = mockGameboy.loadState;

  // Ensure getters are mocked if EmulatorWrapper uses them directly
  get cartridge() {
    return mockGameboy.cartridge;
  }
  get cpu() {
    return mockGameboy.cpu;
  }
  get input() {
    return mockGameboy.input;
  }
  get memory() {
    return mockGameboy.memory;
  }
}

// You might need to export a default if that's how the original module is structured
// export default Gameboy;
