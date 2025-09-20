/**
 * FrameProcessor Usage Example
 * Demonstrates how to use the FrameProcessor with CameraManager for real-time video processing
 */

import { FrameProcessor } from '../FrameProcessor';
import { CameraManager } from '../CameraManager';
import { ProcessingConfig } from '../../types/core';

export class FrameProcessorExample {
  private cameraManager: CameraManager;
  private frameProcessor: FrameProcessor;
  private canvas: HTMLCanvasElement;
  private outputCanvas: HTMLCanvasElement;
  private outputContext: CanvasRenderingContext2D;

  constructor() {
    this.cameraManager = new CameraManager();
    
    // Create processing canvas (hidden)
    this.canvas = document.createElement('canvas');
    this.frameProcessor = new FrameProcessor(this.canvas);
    
    // Create output canvas for display
    this.outputCanvas = document.createElement('canvas');
    const context = this.outputCanvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context for output canvas');
    }
    this.outputContext = context;
    
    this.setupFrameProcessing();
  }

  /**
   * Initialize and start the frame processing pipeline
   */
  async start(): Promise<void> {
    try {
      // Initialize camera
      await this.cameraManager.initialize();
      const videoElement = this.cameraManager.getVideoElement();
      
      // Configure frame processor for optimal performance
      const config: Partial<ProcessingConfig> = {
        targetFPS: 30,
        maxProcessingTime: 33 // ~30fps budget
      };
      this.frameProcessor.setConfig(config);
      
      // Start frame processing
      this.frameProcessor.start(videoElement);
      
      console.log('Frame processing started');
      this.logPerformanceMetrics();
      
    } catch (error) {
      console.error('Failed to start frame processing:', error);
      throw error;
    }
  }

  /**
   * Stop frame processing and cleanup
   */
  stop(): void {
    this.frameProcessor.stop();
    this.cameraManager.stop();
    console.log('Frame processing stopped');
  }

  /**
   * Get the output canvas for display
   */
  getOutputCanvas(): HTMLCanvasElement {
    return this.outputCanvas;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return this.frameProcessor.getPerformanceMetrics();
  }

  /**
   * Setup frame processing callback
   */
  private setupFrameProcessing(): void {
    this.frameProcessor.setFrameCallback(async (imageData: ImageData) => {
      // This is where you would add your processing logic
      // For now, just copy the frame to output canvas
      await this.processFrame(imageData);
    });
  }

  /**
   * Process individual frame (placeholder for actual processing)
   */
  private async processFrame(imageData: ImageData): Promise<void> {
    // Resize output canvas if needed
    if (this.outputCanvas.width !== imageData.width || 
        this.outputCanvas.height !== imageData.height) {
      this.outputCanvas.width = imageData.width;
      this.outputCanvas.height = imageData.height;
    }

    // For this example, just copy the frame to output
    // In a real implementation, this is where you would:
    // 1. Detect hands using MediaPipe
    // 2. Classify gestures
    // 3. Apply censorship effects
    this.outputContext.putImageData(imageData, 0, 0);
  }

  /**
   * Log performance metrics periodically
   */
  private logPerformanceMetrics(): void {
    const logMetrics = () => {
      if (this.frameProcessor.isActive()) {
        const metrics = this.frameProcessor.getPerformanceMetrics();
        console.log('Performance Metrics:', {
          fps: metrics.fps,
          avgProcessingTime: `${metrics.averageProcessingTime}ms`,
          droppedFrames: metrics.droppedFrames,
          memoryUsage: `${metrics.memoryUsage}MB`
        });
        
        // Log again in 5 seconds
        setTimeout(logMetrics, 5000);
      }
    };
    
    // Start logging after 1 second
    setTimeout(logMetrics, 1000);
  }
}

/**
 * Example usage function
 */
export async function runFrameProcessorExample(): Promise<FrameProcessorExample> {
  const example = new FrameProcessorExample();
  
  try {
    await example.start();
    
    // Add output canvas to page for visualization
    const outputCanvas = example.getOutputCanvas();
    outputCanvas.style.border = '2px solid #333';
    outputCanvas.style.maxWidth = '100%';
    outputCanvas.style.height = 'auto';
    
    document.body.appendChild(outputCanvas);
    
    // Add performance display
    const metricsDiv = document.createElement('div');
    metricsDiv.style.marginTop = '10px';
    metricsDiv.style.fontFamily = 'monospace';
    document.body.appendChild(metricsDiv);
    
    // Update metrics display
    const updateMetrics = () => {
      const metrics = example.getPerformanceMetrics();
      metricsDiv.innerHTML = `
        <strong>Performance Metrics:</strong><br>
        FPS: ${metrics.fps}<br>
        Avg Processing Time: ${metrics.averageProcessingTime}ms<br>
        Dropped Frames: ${metrics.droppedFrames}<br>
        Memory Usage: ${metrics.memoryUsage}MB
      `;
    };
    
    setInterval(updateMetrics, 1000);
    
    return example;
    
  } catch (error) {
    console.error('Example failed:', error);
    throw error;
  }
}

// Export for use in browser console or other modules
(window as any).runFrameProcessorExample = runFrameProcessorExample;