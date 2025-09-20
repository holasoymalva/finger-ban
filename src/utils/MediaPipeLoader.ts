/**
 * MediaPipe model loader with progress indicators and error handling
 */

import { Hands } from '@mediapipe/hands';

export interface ModelLoadingProgress {
  stage: 'initializing' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface ModelLoadingOptions {
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: ModelLoadingProgress) => void;
  modelComplexity?: 0 | 1;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export class MediaPipeLoader {
  private hands: Hands | null = null;
  private isLoaded = false;
  private loadingPromise: Promise<Hands> | null = null;

  constructor(private options: ModelLoadingOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
      ...options
    };
  }

  /**
   * Load MediaPipe Hands model with retry logic and progress reporting
   */
  async loadModel(): Promise<Hands> {
    if (this.isLoaded && this.hands) {
      return this.hands;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadModelWithRetry();
    return this.loadingPromise;
  }

  private async loadModelWithRetry(): Promise<Hands> {
    let lastError: Error | null = null;
    const maxRetries = this.options.maxRetries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.reportProgress({
          stage: 'initializing',
          progress: 0,
          message: `Initializing MediaPipe (attempt ${attempt}/${maxRetries})`
        });

        const hands = await this.initializeHands();
        
        this.reportProgress({
          stage: 'ready',
          progress: 100,
          message: 'MediaPipe Hands model loaded successfully'
        });

        this.hands = hands;
        this.isLoaded = true;
        return hands;

      } catch (error) {
        lastError = error as Error;
        
        this.reportProgress({
          stage: 'error',
          progress: 0,
          message: `Loading failed (attempt ${attempt}/${maxRetries}): ${(error as Error).message}`
        });

        if (attempt < maxRetries) {
          const delay = this.options.retryDelay! * Math.pow(2, attempt - 1); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    this.reportProgress({
      stage: 'error',
      progress: 0,
      message: `Failed to load MediaPipe after ${maxRetries} attempts: ${lastError?.message}`
    });

    throw new Error(`Failed to load MediaPipe Hands model after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private async initializeHands(): Promise<Hands> {
    return new Promise((resolve, reject) => {
      try {
        this.reportProgress({
          stage: 'downloading',
          progress: 25,
          message: 'Downloading MediaPipe model files...'
        });

        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        this.reportProgress({
          stage: 'loading',
          progress: 50,
          message: 'Configuring MediaPipe model...'
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: this.options.modelComplexity!,
          minDetectionConfidence: this.options.minDetectionConfidence!,
          minTrackingConfidence: this.options.minTrackingConfidence!,
        });

        this.reportProgress({
          stage: 'loading',
          progress: 75,
          message: 'Initializing MediaPipe model...'
        });

        hands.initialize().then(() => {
          resolve(hands);
        }).catch((error) => {
          reject(new Error(`MediaPipe initialization failed: ${error.message}`));
        });

      } catch (error) {
        reject(new Error(`MediaPipe setup failed: ${(error as Error).message}`));
      }
    });
  }

  private reportProgress(progress: ModelLoadingProgress): void {
    if (this.options.onProgress) {
      this.options.onProgress(progress);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the loaded MediaPipe Hands instance
   */
  getHands(): Hands | null {
    return this.hands;
  }

  /**
   * Check if the model is loaded and ready
   */
  isModelLoaded(): boolean {
    return this.isLoaded && this.hands !== null;
  }

  /**
   * Dispose of the MediaPipe model and free resources
   */
  dispose(): void {
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.isLoaded = false;
    this.loadingPromise = null;
  }
}