// This file provides TypeScript declarations for the AIConsole component
import { GameBoyButton } from '../types';

interface AIConsoleProps {
  isActive: boolean;
  onSendPrompt: (prompt: string) => void;
  aiThought: string | null;
  lastAction: GameBoyButton | 'none' | null;
}

declare const AIConsole: React.FC<AIConsoleProps>;

export default AIConsole;
