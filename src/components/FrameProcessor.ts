/**
 * Frame Processor Component
 * Handles frame extraction from video stream to canvas and manages real-time processing loop
 */

import { FrameProcessor as IFrameProcessor, PerformanceMetrics } from '../types/interfaces';
import { ProcessingConfig } from '../types/core';
import { PerformanceMonitor } from './PerformanceMonitor';

export class FrameProcessor implements IFrameProcessor {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private isProcessing = false;
  private animationFrameId: number | null = null;
  private performanceMonitor: PerformanceMonitor;
  private config: ProcessingConfig;
  private onFrameProcessed?: (imageData: ImageData) => Promise<void>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.context = context;
    this.performanceMonitor = new PerformanceMonitor();
    
    // Default configuration
    this.config = {
      targetFPS: 30,
      detectionThreshold: 0.7,
      pixelationLevel: 10,
      marginPercentage: 0.2,
      maxProcessingTime: 100 // 100ms max processing time per frame
    };
  }

  /**
   * Set configuration for frame processing
   */
  setConfig(config: Partial<ProcessingConfig>): void {
    this.config = { ...this.config, ...config };
    this.performanceMonitor.setTargetFPS(this.config.targetFPS);
  }

  /**
   * Set callback function to be called when a frame is processed
   */
  setFrameCallback(callback: (imageData: ImageData) => Promise<void>): void {
    this.onFrameProcessed = callback;
  }

  /**
   * Start the frame processing loop
   */
  start(videoElement: HTMLVideoElement): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processLoop(videoElement);
  }

  /**
   * Stop the frame processing loop
   */
  stop(): void {
    this.isProcessing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Process a single frame from the video element
   */
  async processFrame(videoElement: HTMLVideoElement): Promise<void> {
    if (!videoElement.videoWidth || !videoElement.videoHeight) {
      return;
    }

    this.performanceMonitor.startFrame();

    try {
      // Extract frame to canvas
      const imageData = this.extractFrame(videoElement);
      
      // Call frame processing callback if set
      if (this.onFrameProcessed) {
        await this.onFrameProcessed(imageData);
      }

    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      this.performanceMonitor.endFrame();
    }
  }

  /**
   * Extract frame from video element to canvas and return ImageData
   */
  private extractFrame(videoElement: HTMLVideoElement): ImageData {
    const { videoWidth, videoHeight } = videoElement;
    
    // Resize canvas if needed
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }

    // Draw video frame to canvas
    this.context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
    
    // Extract ImageData
    return this.context.getImageData(0, 0, videoWidth, videoHeight);
  }

  /**
   * Main processing loop using requestAnimationFrame
   */
  private processLoop(videoElement: HTMLVideoElement): void {
    if (!this.isProcessing) {
      return;
    }

    // Check if we should skip this frame based on performance
    const shouldProcess = this.performanceMonitor.shouldProcessFrame();
    
    if (shouldProcess) {
      this.processFrame(videoElement).catch(error => {
        console.error('Frame processing error:', error);
      });
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => {
      this.processLoop(videoElement);
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Check if frame processing is currently active
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get current processing configuration
   */
  getConfig(): ProcessingConfig {
    return { ...this.config };
  }
}