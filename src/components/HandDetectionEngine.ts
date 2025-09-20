/**
 * Hand Detection Engine using MediaPipe Hands
 */

import { Hands, Results } from '@mediapipe/hands';
import { HandDetectionEngine as IHandDetectionEngine, HandLandmarks } from '../types';
import { MediaPipeLoader, ModelLoadingOptions } from '../utils/MediaPipeLoader';

export class HandDetectionEngine implements IHandDetectionEngine {
  private mediaPipeLoader: MediaPipeLoader;
  private hands: Hands | null = null;
  private isInitialized = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(options: ModelLoadingOptions = {}) {
    this.mediaPipeLoader = new MediaPipeLoader(options);
    
    // Create a canvas for processing frames
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Initialize the hand detection engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.hands = await this.mediaPipeLoader.loadModel();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize HandDetectionEngine: ${(error as Error).message}`);
    }
  }

  /**
   * Detect hands in the provided image data
   */
  async detectHands(imageData: ImageData): Promise<HandLandmarks[]> {
    if (!this.isInitialized || !this.hands) {
      throw new Error('HandDetectionEngine not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      try {
        // Set up the canvas with the image data
        this.canvas.width = imageData.width;
        this.canvas.height = imageData.height;
        this.ctx.putImageData(imageData, 0, 0);

        // Set up results callback
        this.hands!.onResults((results: Results) => {
          const handLandmarks = this.convertResults(results);
          resolve(handLandmarks);
        });

        // Send the canvas to MediaPipe for processing
        this.hands!.send({ image: this.canvas });

      } catch (error) {
        reject(new Error(`Hand detection failed: ${(error as Error).message}`));
      }
    });
  }

  /**
   * Convert MediaPipe results to internal HandLandmarks format
   */
  private convertResults(results: Results): HandLandmarks[] {
    const handLandmarks: HandLandmarks[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        // Convert MediaPipe landmarks to our Point3D format
        const convertedLandmarks = landmarks.map(landmark => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0
        }));

        // Determine handedness (MediaPipe returns 'Left' or 'Right')
        const hand: 'Left' | 'Right' = handedness.label === 'Left' ? 'Left' : 'Right';

        // Get confidence score
        const confidence = handedness.score || 0;

        handLandmarks.push({
          landmarks: convertedLandmarks,
          handedness: hand,
          confidence: confidence
        });
      }
    }

    return handLandmarks;
  }

  /**
   * Dispose of the hand detection engine and free resources
   */
  dispose(): void {
    if (this.mediaPipeLoader) {
      this.mediaPipeLoader.dispose();
    }
    this.hands = null;
    this.isInitialized = false;
  }

  /**
   * Check if the engine is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.hands !== null;
  }

  /**
   * Get the underlying MediaPipe Hands instance (for advanced usage)
   */
  getMediaPipeHands(): Hands | null {
    return this.hands;
  }
}