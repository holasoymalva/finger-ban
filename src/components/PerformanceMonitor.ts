/**
 * Performance Monitor Component
 * Tracks FPS, processing times, and provides performance optimization recommendations
 */

import { PerformanceMonitor as IPerformanceMonitor, PerformanceMetrics } from '../types/interfaces';

export class PerformanceMonitor implements IPerformanceMonitor {
  private frameStartTime = 0;
  private frameEndTime = 0;
  private frameCount = 0;
  private lastFPSUpdate = 0;
  private currentFPS = 0;
  private targetFPS = 30;
  private processingTimes: number[] = [];
  private droppedFrames = 0;
  private lastFrameTime = 0;
  private readonly maxSamples = 60; // Keep last 60 samples for averaging

  constructor(targetFPS = 30) {
    this.targetFPS = targetFPS;
    this.lastFPSUpdate = performance.now();
    this.lastFrameTime = performance.now();
  }

  /**
   * Mark the start of frame processing
   */
  startFrame(): void {
    this.frameStartTime = performance.now();
    
    // Calculate time since last frame for FPS calculation
    const now = this.frameStartTime;
    const timeSinceLastFrame = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update FPS calculation
    this.frameCount++;
    const timeSinceLastFPSUpdate = now - this.lastFPSUpdate;
    
    if (timeSinceLastFPSUpdate >= 1000) { // Update FPS every second
      this.currentFPS = (this.frameCount * 1000) / timeSinceLastFPSUpdate;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }

    // Check for dropped frames (if time between frames is too long)
    const expectedFrameTime = 1000 / this.targetFPS;
    if (timeSinceLastFrame > expectedFrameTime * 1.5) {
      this.droppedFrames++;
    }
  }

  /**
   * Mark the end of frame processing
   */
  endFrame(): void {
    this.frameEndTime = performance.now();
    const processingTime = this.frameEndTime - this.frameStartTime;
    
    // Store processing time for averaging
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.maxSamples) {
      this.processingTimes.shift();
    }
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return Math.round(this.currentFPS * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get average processing time over recent frames
   */
  getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    
    const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
    return Math.round((sum / this.processingTimes.length) * 10) / 10;
  }

  /**
   * Determine if quality should be reduced based on performance
   */
  shouldReduceQuality(): boolean {
    const avgProcessingTime = this.getAverageProcessingTime();
    const maxAllowedTime = (1000 / this.targetFPS) * 0.8; // Use 80% of frame budget
    
    return (
      (this.currentFPS > 0 && this.currentFPS < this.targetFPS * 0.8) || // FPS is below 80% of target
      avgProcessingTime > maxAllowedTime ||     // Processing time is too high
      this.droppedFrames > 5                    // Too many dropped frames recently
    );
  }

  /**
   * Determine if the current frame should be processed or skipped
   */
  shouldProcessFrame(): boolean {
    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTime;
    const targetFrameTime = 1000 / this.targetFPS;
    
    // Skip frame if we're processing too fast (above target FPS)
    if (timeSinceLastFrame < targetFrameTime * 0.9) {
      return false;
    }

    // Always process if we're below target FPS
    return true;
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: this.getFPS(),
      averageProcessingTime: this.getAverageProcessingTime(),
      droppedFrames: this.droppedFrames,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Set target FPS for performance calculations
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = Math.max(1, Math.min(60, fps)); // Clamp between 1-60 FPS
  }

  /**
   * Reset performance counters
   */
  reset(): void {
    this.frameCount = 0;
    this.currentFPS = 0;
    this.processingTimes = [];
    this.droppedFrames = 0;
    this.lastFPSUpdate = performance.now();
    this.lastFrameTime = performance.now();
  }

  /**
   * Get memory usage information (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 10) / 10; // MB, rounded to 1 decimal
    }
    return 0;
  }

  /**
   * Get performance recommendations based on current metrics
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.fps < this.targetFPS * 0.8) {
      recommendations.push('Consider reducing video resolution or processing frequency');
    }

    if (metrics.averageProcessingTime > (1000 / this.targetFPS) * 0.8) {
      recommendations.push('Processing time is high - consider optimizing algorithms');
    }

    if (metrics.droppedFrames > 10) {
      recommendations.push('Many frames are being dropped - reduce processing load');
    }

    if (metrics.memoryUsage > 100) {
      recommendations.push('High memory usage detected - check for memory leaks');
    }

    return recommendations;
  }
}