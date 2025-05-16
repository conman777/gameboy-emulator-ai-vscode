// Test script for verifying Game Boy AI Emulator functionality
console.log('Testing Game Boy AI Emulator functionality...');

// Step 1: Test screenshot capture
function testScreenshotCapture() {
  console.log('Testing screenshot capture functionality...');
  
  // Get the emulator instance from the React app
  const emulatorContext = document.querySelector('[data-testid="emulator-container"]')?.__reactFiber$?.return?.return?.return?.stateNode?.context;
  
  if (!emulatorContext || !emulatorContext.emulator) {
    console.error('Could not access emulator instance. Make sure a ROM is loaded and the emulator is running.');
    return false;
  }
  
  const emulator = emulatorContext.emulator;
  
  // Test if captureScreenshot method exists
  if (typeof emulator.captureScreenshot !== 'function') {
    console.error('captureScreenshot method not found on emulator instance');
    return false;
  }
  
  try {
    // Capture a screenshot
    const base64Image = emulator.captureScreenshot();
    
    // Check if we got a valid base64 string
    if (!base64Image || typeof base64Image !== 'string' || base64Image.length === 0) {
      console.error('Screenshot capture failed - empty or invalid result');
      return false;
    }
    
    console.log('Screenshot captured successfully!');
    console.log('Image data (first 100 chars):', base64Image.substring(0, 100) + '...');
    
    // Display the captured image in console
    console.log('Preview:');
    console.log('%c ', 'font-size: 1px; padding: 80px 160px; background-size: contain; background-image: url(data:image/png;base64,' + base64Image + '); background-repeat: no-repeat;');
    
    return true;
  } catch (error) {
    console.error('Error during screenshot capture:', error);
    return false;
  }
}

// Step 2: Test OpenRouterService with game context
async function testOpenRouterService() {
  console.log('Testing OpenRouter service with game context...');
  
  // First get the screenshot
  const emulatorContext = document.querySelector('[data-testid="emulator-container"]')?.__reactFiber$?.return?.return?.return?.stateNode?.context;
  if (!emulatorContext || !emulatorContext.emulator) {
    console.error('Could not access emulator instance');
    return;
  }
  
  const emulator = emulatorContext.emulator;
  const base64Image = emulator.captureScreenshot();
  
  if (!base64Image) {
    console.error('Failed to capture screenshot for testing');
    return;
  }
  
  // Load API key from localStorage
  const apiKey = localStorage.getItem('aiApiKey');
  const modelName = localStorage.getItem('aiModelName') || 'openai/gpt-4o-mini';
  
  if (!apiKey) {
    console.error('No API key found in localStorage. Please set up an API key in the config panel.');
    return;
  }
  
  // Test with and without game context
  const gameContext = "This is Tetris. The goal is to arrange falling blocks to create complete lines.";
  
  console.log('Testing AI service without game context...');
  // Import the service function
  const OpenRouterService = await import('../services/OpenRouterService.js');
  
  try {
    const resultWithoutContext = await OpenRouterService.getGameAction(
      base64Image, 
      modelName, 
      apiKey
    );
    console.log('AI Response without context:', resultWithoutContext);
    
    console.log('Testing AI service with game context...');
    const resultWithContext = await OpenRouterService.getGameAction(
      base64Image, 
      modelName, 
      apiKey, 
      gameContext
    );
    console.log('AI Response with context:', resultWithContext);
    
    return true;
  } catch (error) {
    console.error('Error testing OpenRouter service:', error);
    return false;
  }
}

// Execute tests when emulator is ready
function runTests() {
  // First check if emulator is ready
  const emulatorContext = document.querySelector('[data-testid="emulator-container"]')?.__reactFiber$?.return?.return?.return?.stateNode?.context;
  if (!emulatorContext || !emulatorContext.emulator || !emulatorContext.emulator.isRunning()) {
    console.log('Emulator not ready yet. Please load a ROM and start the emulator, then run the tests again.');
    return;
  }
  
  console.log('Starting tests...');
  const screenshotTestPassed = testScreenshotCapture();
  
  if (screenshotTestPassed) {
    console.log('Screenshot test passed! Now testing AI service...');
    testOpenRouterService().then(passed => {
      if (passed) {
        console.log('All tests completed successfully!');
      } else {
        console.log('AI service test failed.');
      }
    });
  } else {
    console.log('Screenshot test failed. Please check the implementation of captureScreenshot().');
  }
}

// Export test functions to global scope so they can be called from console
window.testGameBoyAI = {
  testScreenshotCapture,
  testOpenRouterService,
  runTests
};

console.log('Test script loaded. Use window.testGameBoyAI.runTests() to run all tests after loading a ROM.');
