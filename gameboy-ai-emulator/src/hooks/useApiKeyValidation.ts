import { useState, useEffect } from 'react';
import { validateApiKey } from '../services/OpenRouterService';

export type ApiKeyStatus = 'unchecked' | 'valid' | 'invalid';

export const useApiKeyValidation = (apiKey: string) => {
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('unchecked');
  const [apiKeyMessage, setApiKeyMessage] = useState('');

  useEffect(() => {
    if (apiKey) {
      const validate = async () => {
        setApiKeyStatus('unchecked');
        setApiKeyMessage('Validating API key...');
        try {
          console.log("Starting API key validation (from hook)...");
          const isValid = await validateApiKey(apiKey);
          console.log("Validation completed (from hook), result:", isValid);
          
          setApiKeyStatus(isValid ? 'valid' : 'invalid');
          if (isValid) {
            setApiKeyMessage('API key is valid.');
          } else {
            setApiKeyMessage(
              'Invalid API key. Please check that your OpenRouter API key is correct and has sufficient credits. ' +
              'You can regenerate your key at https://openrouter.ai/keys if needed.'
            );
          }
        } catch (err) {
          console.error("Error during API key validation call (from hook):", err);
          setApiKeyStatus('invalid');
          setApiKeyMessage('Error validating API key. Please check your internet connection and try again.');
        }
      };
      validate();
    } else {
      setApiKeyStatus('unchecked');
      setApiKeyMessage(''); // Clear message if API key is removed
    }
  }, [apiKey]);

  return { apiKeyStatus, apiKeyMessage, setApiKeyStatus, setApiKeyMessage };
};
