import {
  GameFeedbackConfig,
  FeedbackContext,
  FeedbackResult,
  GameEvent,
  EventDetectorConfig,
  RamDetectorConfig,
  ScreenTextDetectorConfig,
  ImagePatternDetectorConfig,
  RewardRule,
} from '../types/index'; // Changed from '../types'

// Placeholder for OCR and image matching utilities - these would be complex implementations
// For now, we'll assume they exist and are imported or injected.
// const ocrUtility = { performOcr: async (imageData: string, region?: any): Promise<string> => '' };
// const imageMatcher = { findPattern: async (screen: string, pattern: string, region?: any, threshold?: number): Promise<boolean> => false };
// const memoryReader = { readAddress: (address: string, dataType: string): any => null };

export class FeedbackService {
  private gameConfigs: GameFeedbackConfig[] = [];
  private activeConfig: GameFeedbackConfig | null = null;
  private episodeTotalReward: number = 0;
  private lastEventTimestamps: Map<string, number> = new Map(); // For detector cooldowns

  constructor(initialConfigs?: GameFeedbackConfig[]) {
    if (initialConfigs) {
      this.gameConfigs = initialConfigs;
    }
    // In a real scenario, configs might be loaded from files or a central store
  }

  public loadConfig(config: GameFeedbackConfig): void {
    const existingIndex = this.gameConfigs.findIndex(
      (c) => c.gameTitlePattern === config.gameTitlePattern
    );
    if (existingIndex > -1) {
      this.gameConfigs[existingIndex] = config;
    } else {
      this.gameConfigs.push(config);
    }
    // If a config matching the current game is updated, re-select it
    if (this.activeConfig && new RegExp(this.activeConfig.gameTitlePattern).test(config.gameTitlePattern)) {
        this.selectConfigForGame(this.activeConfig.gameTitlePattern);
    }
  }

  public loadConfigs(configs: GameFeedbackConfig[]): void {
    configs.forEach(config => this.loadConfig(config));
  }

  private selectConfigForGame(gameTitle: string): void {
    this.activeConfig =
      this.gameConfigs.find((config) =>
        new RegExp(config.gameTitlePattern, 'i').test(gameTitle)
      ) || null;
    if (this.activeConfig) {
      console.log(`FeedbackService: Activated config for game matching "${this.activeConfig.gameTitlePattern}"`);
    } else {
      console.warn(`FeedbackService: No matching feedback config found for game "${gameTitle}"`);
    }
  }

  public resetEpisode(newGameTitle?: string): void {
    this.episodeTotalReward = 0;
    this.lastEventTimestamps.clear();
    if (newGameTitle) {
        this.selectConfigForGame(newGameTitle);
    }
    console.log('FeedbackService: Episode reset.');
  }

  // Placeholder: Actual RAM reading needs emulator integration
  private async detectRamEvent(detector: RamDetectorConfig, context: FeedbackContext): Promise<GameEvent | null> {
    if (!detector.enabled) return null;
    // const currentValue = memoryReader.readAddress(detector.address, detector.dataType);
    // For now, simulate a change for demonstration
    const previousValue = detector.previousValue;
    // detector.previousValue = currentValue; // Update previous value

    // This is highly simplified. Real implementation needs to handle previousValue, comparison logic etc.
    // e.g. if (detector.comparison === 'changed' && currentValue !== previousValue) { /* create event */ }
    // console.log(`RAM Detector (${detector.id}): Address ${detector.address}, Value: ${currentValue}`);
    return null; // Placeholder
  }

  // Placeholder: Actual OCR needs a library and integration
  private async detectScreenTextEvent(detector: ScreenTextDetectorConfig, screenData: string, context: FeedbackContext): Promise<GameEvent | null> {
    if (!detector.enabled) return null;
    // const screenText = await ocrUtility.performOcr(screenData, detector.region);
    // const regex = new RegExp(detector.searchText, detector.caseSensitive ? '' : 'i');
    // if (regex.test(screenText)) {
    //   console.log(`Screen Text Detector (${detector.id}): Found "${detector.searchText}"`);
    //   return { type: detector.id, timestamp: Date.now(), source: 'screen_text', data: { matchedText: detector.searchText } };
    // }
    return null; // Placeholder
  }

  // Placeholder: Actual image matching needs a library and integration
  private async detectImagePatternEvent(detector: ImagePatternDetectorConfig, screenData: string, context: FeedbackContext): Promise<GameEvent | null> {
    if (!detector.enabled) return null;
    // const patternToUse = detector.base64Pattern || await this.loadPatternImage(detector.patternImageUrl);
    // if (patternToUse) {
    //   const found = await imageMatcher.findPattern(screenData, patternToUse, detector.region, detector.similarityThreshold);
    //   if (found) {
    //     console.log(`Image Pattern Detector (${detector.id}): Found pattern`);
    //     return { type: detector.id, timestamp: Date.now(), source: 'image_pattern' };
    //   }
    // }
    return null; // Placeholder
  }

  private calculateReward(event: GameEvent, rules: RewardRule[]): number {
    let reward = 0;
    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (rule.eventType === event.type) {
        // Basic reward application. 'DELTA_SCORE_DIV_100' or condition parsing would be more complex.
        if (typeof rule.reward === 'number') {
          reward += rule.reward;
        } else if (rule.reward === 'DELTA_SCORE_DIV_100' && event.data?.change && typeof event.data.change === 'number') {
          // Example for a dynamic reward based on event data
          reward += event.data.change / 100;
        }
        // TODO: Implement condition parsing if needed: eval(rule.condition) with event in scope
        console.log(`Reward rule "${rule.id}" applied for event "${event.type}", reward: ${rule.reward}`);
      }
    }
    return reward;
  }

  private packageFeedbackText(event: GameEvent, calculatedReward: number): string {
    let feedbackText = `Event: ${event.type}`;
    if (event.data) {
      feedbackText += ` (Details: ${JSON.stringify(event.data)})`;
    }
    if (calculatedReward !== 0) {
      feedbackText += `, Reward: ${calculatedReward.toFixed(2)}`;
    }
    return feedbackText;
  }

  public async pollEvents(context: FeedbackContext, screenDataBase64: string): Promise<FeedbackResult> {
    if (!this.activeConfig || !new RegExp(this.activeConfig.gameTitlePattern, 'i').test(context.gameTitle)) {
        this.selectConfigForGame(context.gameTitle);
    }
    
    if (!this.activeConfig) {
      return {
        textFeedback: ['No feedback config active for this game.'],
        numericalReward: 0,
        rawEvents: [],
        episodeTotalReward: this.episodeTotalReward,
      };
    }

    const detectedEvents: GameEvent[] = [];
    const currentTime = Date.now();

    for (const detector of this.activeConfig.detectors) {
      if (detector.enabled === false) continue;

      const lastTime = this.lastEventTimestamps.get(detector.id) || 0;
      if (detector.cooldown && (currentTime - lastTime < detector.cooldown)) {
        continue; // Skip due to cooldown
      }

      let event: GameEvent | null = null;
      switch (detector.type) {
        case 'ram':
          event = await this.detectRamEvent(detector as RamDetectorConfig, context);
          break;
        case 'screen_text':
          event = await this.detectScreenTextEvent(detector as ScreenTextDetectorConfig, screenDataBase64, context);
          break;
        case 'image_pattern':
          event = await this.detectImagePatternEvent(detector as ImagePatternDetectorConfig, screenDataBase64, context);
          break;
      }

      if (event) {
        detectedEvents.push(event);
        this.lastEventTimestamps.set(detector.id, currentTime);
      }
    }

    let currentStepReward = 0;
    const textFeedback: string[] = [];

    for (const event of detectedEvents) {
      const rewardFromEvent = this.calculateReward(event, this.activeConfig.rewardRules);
      currentStepReward += rewardFromEvent;
      textFeedback.push(this.packageFeedbackText(event, rewardFromEvent));
    }
    
    if (detectedEvents.length === 0 && this.activeConfig.defaultRewardForUnknownEvent) {
        currentStepReward += this.activeConfig.defaultRewardForUnknownEvent;
        if (this.activeConfig.defaultRewardForUnknownEvent !== 0) {
            textFeedback.push(`Default reward/penalty applied: ${this.activeConfig.defaultRewardForUnknownEvent}`);
        }
    }

    this.episodeTotalReward += currentStepReward;

    return {
      textFeedback,
      numericalReward: currentStepReward,
      rawEvents: detectedEvents,
      episodeTotalReward: this.episodeTotalReward,
    };
  }

  // Helper to load pattern image if stored as URL (not used by current placeholders)
  // private async loadPatternImage(url?: string): Promise<string | undefined> {
  //   if (!url) return undefined;
  //   try {
  //     const response = await fetch(url);
  //     const blob = await response.blob();
  //     return new Promise((resolve, reject) => {
  //       const reader = new FileReader();
  //       reader.onloadend = () => resolve(reader.result as string);
  //       reader.onerror = reject;
  //       reader.readAsDataURL(blob);
  //     });
  //   } catch (error) {
  //     console.error(`Error loading pattern image from ${url}:`, error);
  //     return undefined;
  //   }
  // }
}

// Example Usage (conceptual - would be integrated into the AI controller)
/*
async function gameLoopIntegration() {
  const feedbackService = new FeedbackService();

  // Load configuration (e.g., from a JSON file specific to "Super Mario Land")
  const marioConfig: GameFeedbackConfig = {
    gameTitlePattern: "Super Mario Land",
    detectors: [
      { id: "mario_dies", type: "screen_text", searchText: "GAME OVER", cooldown: 5000, enabled: true },
      { 
        id: "score_increase", 
        type: "ram", 
        address: "0xC0A0", // Fictional address for score
        dataType: "uint16", 
        comparison: "increased", 
        description: "Player score increased",
        enabled: true,
      }
    ],
    rewardRules: [
      { id: "death_penalty", eventType: "mario_dies", reward: -100, enabled: true },
      { id: "score_reward", eventType: "score_increase", reward: 10, description: "Gained points", enabled: true } // Or use DELTA_SCORE_DIV_100
    ],
    defaultRewardForUnknownEvent: -0.1
  };
  feedbackService.loadConfig(marioConfig);
  feedbackService.resetEpisode("Super Mario Land");

  // In the game loop, before asking LLM for next action:
  const gameContext: FeedbackContext = { gameTitle: "Super Mario Land", currentEmulatorTime: Date.now() };
  const screenImageBase64 = "base64_image_string_from_emulator"; // Get current screen
  
  const feedback = await feedbackService.pollEvents(gameContext, screenImageBase64);
  
  console.log("Feedback for LLM:", feedback.textFeedback);
  console.log("Numerical Reward for this step:", feedback.numericalReward);
  console.log("Total Episode Reward:", feedback.episodeTotalReward);

  // This feedback would then be added to the LLM prompt.
}
*/
