/**
 * Component interfaces for the Finger Ban system
 */

import { HandLandmarks, GestureResult, BoundingBox, ProcessingConfig } from './core';

export interface CameraManager {
  initialize(): Promise<MediaStream>;
  getVideoElement(): HTMLVideoElement;
  stop(): void;
  isActive(): boolean;
}

export interface HandDetectionEngine {
  initialize(): Promise<void>;
  detectHands(imageData: ImageData): Promise<HandLandmarks[]>;
  dispose(): void;
}

export interface GestureClassifier {
  classifyGesture(landmarks: HandLandmarks): GestureResult;
  updateThreshold(threshold: number): void;
}

export interface CensorshipEngine {
  initialize(canvas: HTMLCanvasElement): void;
  applyCensorship(imageData: ImageData, regions: BoundingBox[]): ImageData;
  setPixelationLevel(level: number): void;
}

export interface FrameProcessor {
  processFrame(videoElement: HTMLVideoElement): Promise<void>;
  setConfig(config: Partial<ProcessingConfig>): void;
  getPerformanceMetrics(): PerformanceMetrics;
}

export interface PerformanceMonitor {
  startFrame(): void;
  endFrame(): void;
  getFPS(): number;
  getAverageProcessingTime(): number;
  shouldReduceQuality(): boolean;
}

export interface PerformanceMetrics {
  fps: number;
  averageProcessingTime: number;
  droppedFrames: number;
  memoryUsage: number;
}