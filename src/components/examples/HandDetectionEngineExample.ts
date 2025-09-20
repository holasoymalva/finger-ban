/**
 * Example usage of HandDetectionEngine
 */

import { HandDetectionEngine } from '../HandDetectionEngine';
import { HandLandmarks } from '../../types';

export class HandDetectionEngineExample {
  private engine: HandDetectionEngine;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.engine = new HandDetectionEngine({
      onProgress: (progress) => {
        console.log(`Loading progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
      },
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    // Create canvas for processing
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Initialize the hand detection engine
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing HandDetectionEngine...');
      await this.engine.initialize();
      console.log('HandDetectionEngine initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize HandDetectionEngine:', error);
      throw error;
    }
  }

  /**
   * Process a video element and detect hands
   */
  async processVideoFrame(videoElement: HTMLVideoElement): Promise<HandLandmarks[]> {
    if (!this.engine.isReady()) {
      throw new Error('Engine not initialized');
    }

    // Set canvas size to match video
    this.canvas.width = videoElement.videoWidth;
    this.canvas.height = videoElement.videoHeight;

    // Draw video frame to canvas
    this.ctx.drawImage(videoElement, 0, 0);

    // Get image data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Detect hands
    const hands = await this.engine.detectHands(imageData);

    // Log results
    console.log(`Detected ${hands.length} hands:`);
    hands.forEach((hand, index) => {
      console.log(`  Hand ${index + 1}: ${hand.handedness} (confidence: ${hand.confidence.toFixed(2)})`);
      console.log(`    Landmarks: ${hand.landmarks.length} points`);
    });

    return hands;
  }

  /**
   * Process an image file and detect hands
   */
  async processImageFile(file: File): Promise<HandLandmarks[]> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Set canvas size to match image
          this.canvas.width = img.width;
          this.canvas.height = img.height;

          // Draw image to canvas
          this.ctx.drawImage(img, 0, 0);

          // Get image data
          const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

          // Detect hands
          const hands = await this.engine.detectHands(imageData);
          resolve(hands);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create a simple demo that processes camera feed
   */
  async startCameraDemo(): Promise<void> {
    try {
      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      console.log('Camera demo started. Processing frames...');

      // Process frames at regular intervals
      const processFrame = async () => {
        try {
          const hands = await this.processVideoFrame(video);
          
          // You could draw the results here or pass them to other components
          if (hands.length > 0) {
            console.log(`Frame processed: ${hands.length} hands detected`);
          }
        } catch (error) {
          console.error('Frame processing error:', error);
        }

        // Schedule next frame
        setTimeout(processFrame, 100); // Process at ~10 FPS
      };

      // Start processing
      processFrame();

    } catch (error) {
      console.error('Camera demo failed:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.engine.dispose();
    console.log('HandDetectionEngine disposed');
  }
}

// Example usage:
/*
const example = new HandDetectionEngineExample();

// Initialize and start camera demo
example.initialize()
  .then(() => example.startCameraDemo())
  .catch(error => console.error('Demo failed:', error));

// Or process a single image file
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
fileInput.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    try {
      await example.initialize();
      const hands = await example.processImageFile(file);
      console.log('Detected hands in image:', hands);
    } catch (error) {
      console.error('Image processing failed:', error);
    }
  }
});
*/