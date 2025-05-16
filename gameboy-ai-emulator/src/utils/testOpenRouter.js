// Test file for OpenRouter API
import axios from 'axios';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

// A simple API key validation function
async function validateApiKey(apiKey) {
  if (!apiKey) {
    console.error('Cannot validate empty API key');
    return false;
  }
  
  console.log('Validating OpenRouter API key...');
  
  try {
    const response = await axios.get(OPENROUTER_MODELS_URL, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Game Boy AI Emulator',
      }
    });
    console.log('Validation response status:', response.status);
    console.log('Models data sample:', response.data);
    return response.status === 200;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

// Function to fetch available models
async function getAvailableModels(apiKey) {
  if (!apiKey) {
    console.error('Cannot fetch models: API key is missing');
    return [];
  }
  
  console.log('Fetching models from OpenRouter...');
  
  try {
    const response = await axios.get(OPENROUTER_MODELS_URL, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Game Boy AI Emulator',
      }
    });
    
    console.log('OpenRouter API response structure:', Object.keys(response.data));
    
    // Handle different response formats from OpenRouter
    let modelsData = [];
    
    if (response.data.data && Array.isArray(response.data.data)) {
      modelsData = response.data.data;
    } else if (Array.isArray(response.data)) {
      modelsData = response.data;
    } else {
      console.error('Unexpected response format from OpenRouter models API:', response.data);
      // Try to extract models if possible
      if (typeof response.data === 'object') {
        const possibleModels = Object.values(response.data).find(val => Array.isArray(val));
        if (possibleModels) {
          modelsData = possibleModels;
          console.log('Found potential models array:', modelsData.length);
        }
      }
      
      if (modelsData.length === 0) {
        return [];
      }
    }
    
    // Filter for models that support vision capabilities
    console.log('Total models available:', modelsData.length);
    
    // Check the first few models to understand structure
    if (modelsData.length > 0) {
      console.log('Sample model object:', JSON.stringify(modelsData[0], null, 2));
    }
    
    const visionModels = modelsData.filter(model => {
      // Check different properties that might indicate vision support
      const hasVision = 
        (model.capabilities && Array.isArray(model.capabilities) && model.capabilities.includes('vision')) ||
        (model.features && Array.isArray(model.features) && model.features.includes('vision')) ||
        model.vision === true;
      
      if (hasVision) {
        console.log(`Model with vision capabilities: ${model.id || model.name}`);
      }
      
      return hasVision;
    });
    
    console.log(`Found ${visionModels.length} models with vision capabilities`);
    return visionModels;
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

// Test the API with a provided key
// Replace 'YOUR_API_KEY' with an actual OpenRouter API key
const testApiKey = 'YOUR_API_KEY';

validateApiKey(testApiKey)
  .then(isValid => {
    console.log('API key valid:', isValid);
    if (isValid) {
      return getAvailableModels(testApiKey);
    }
    return [];
  })
  .then(models => {
    console.log('Vision-capable models:', models);
  })
  .catch(error => {
    console.error('Test failed:', error);
  });
