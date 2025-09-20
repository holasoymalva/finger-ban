/**
 * FrameProcessor Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrameProcessor } from '../FrameProcessor';
import { ProcessingConfig } from '../../types/core';

// Mock canvas and context
const mockContext = {
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }))
};

const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  width: 640,
  height: 480
} as unknown as HTMLCanvasElement;

// Mock video element
const createMockVideoElement = () => ({
  videoWidth: 640,
  videoHeight: 480,
  paused: false,
  currentTime: 0
} as any as HTMLVideoElement);

// Mock requestAnimationFrame
let animationFrameCallbacks: (() => void)[] = [];
let animationFrameId = 0;

const mockRequestAnimationFrame = vi.fn((callback: () => void) => {
  const id = ++animationFrameId;
  animationFrameCallbacks.push(callback);
  return id;
});

const mockCancelAnimationFrame = vi.fn((_id: number) => {
  // Simple mock implementation
});

// Mock performance.now
const mockPerformanceNow = vi.fn(() => Date.now());

describe('FrameProcessor', () => {
  let frameProcessor: FrameProcessor;
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    animationFrameCallbacks = [];
    animationFrameId = 0;

    // Setup global mocks
    global.requestAnimationFrame = mockRequestAnimationFrame as any;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    global.performance = { now: mockPerformanceNow } as any;

    // Create instances
    frameProcessor = new FrameProcessor(mockCanvas);
    mockVideoElement = createMockVideoElement();
  });

  afterEach(() => {
    frameProcessor.stop();
  });

  describe('constructor', () => {
    it('should create FrameProcessor with canvas', () => {
      expect(frameProcessor).toBeInstanceOf(FrameProcessor);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should throw error if canvas context is not available', () => {
      const badCanvas = {
        getContext: vi.fn(() => null)
      } as unknown as HTMLCanvasElement;

      expect(() => new FrameProcessor(badCanvas)).toThrow('Failed to get 2D context from canvas');
    });
  });

  describe('configuration', () => {
    it('should set default configuration', () => {
      const config = frameProcessor.getConfig();
      expect(config.targetFPS).toBe(30);
      expect(config.detectionThreshold).toBe(0.7);
      expect(config.pixelationLevel).toBe(10);
      expect(config.marginPercentage).toBe(0.2);
      expect(config.maxProcessingTime).toBe(100);
    });

    it('should update configuration partially', () => {
      const newConfig: Partial<ProcessingConfig> = {
        targetFPS: 60,
        detectionThreshold: 0.8
      };

      frameProcessor.setConfig(newConfig);
      const config = frameProcessor.getConfig();

      expect(config.targetFPS).toBe(60);
      expect(config.detectionThreshold).toBe(0.8);
      expect(config.pixelationLevel).toBe(10); // Should remain unchanged
    });
  });

  describe('frame processing', () => {
    it('should process a single frame', async () => {
      const imageData = new ImageData(640, 480);
      mockContext.getImageData.mockReturnValue(imageData);

      await frameProcessor.processFrame(mockVideoElement);

      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockVideoElement, 0, 0, 640, 480
      );
      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 640, 480);
    });

    it('should resize canvas when video dimensions change', async () => {
      const largeVideoElement = {
        ...mockVideoElement,
        videoWidth: 1280,
        videoHeight: 720
      } as any as HTMLVideoElement;

      await frameProcessor.processFrame(largeVideoElement);

      expect(mockCanvas.width).toBe(1280);
      expect(mockCanvas.height).toBe(720);
    });

    it('should skip processing if video has no dimensions', async () => {
      const emptyVideoElement = {
        ...mockVideoElement,
        videoWidth: 0,
        videoHeight: 0
      } as any as HTMLVideoElement;

      await frameProcessor.processFrame(emptyVideoElement);

      expect(mockContext.drawImage).not.toHaveBeenCalled();
    });

    it('should call frame callback when set', async () => {
      const frameCallback = vi.fn().mockResolvedValue(undefined);
      const imageData = new ImageData(640, 480);
      mockContext.getImageData.mockReturnValue(imageData);

      frameProcessor.setFrameCallback(frameCallback);
      await frameProcessor.processFrame(mockVideoElement);

      expect(frameCallback).toHaveBeenCalledWith(imageData);
    });

    it('should handle frame callback errors gracefully', async () => {
      const frameCallback = vi.fn().mockRejectedValue(new Error('Callback error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      frameProcessor.setFrameCallback(frameCallback);
      await frameProcessor.processFrame(mockVideoElement);

      expect(consoleSpy).toHaveBeenCalledWith('Error processing frame:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('processing loop', () => {
    it('should start processing loop', () => {
      expect(frameProcessor.isActive()).toBe(false);

      frameProcessor.start(mockVideoElement);

      expect(frameProcessor.isActive()).toBe(true);
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('should not start multiple loops', () => {
      frameProcessor.start(mockVideoElement);
      const firstCallCount = mockRequestAnimationFrame.mock.calls.length;

      frameProcessor.start(mockVideoElement);
      const secondCallCount = mockRequestAnimationFrame.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should stop processing loop', () => {
      frameProcessor.start(mockVideoElement);
      expect(frameProcessor.isActive()).toBe(true);

      frameProcessor.stop();

      expect(frameProcessor.isActive()).toBe(false);
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should continue processing loop until stopped', () => {
      frameProcessor.start(mockVideoElement);
      
      // Simulate animation frame callback
      const callback = animationFrameCallbacks[0];
      expect(callback).toBeDefined();
      
      // Execute callback should schedule next frame
      callback();
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
    });
  });

  describe('performance metrics', () => {
    it('should return performance metrics', () => {
      const metrics = frameProcessor.getPerformanceMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('should track performance during processing', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000) // startFrame
        .mockReturnValueOnce(1050); // endFrame

      await frameProcessor.processFrame(mockVideoElement);
      const metrics = frameProcessor.getPerformanceMetrics();

      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('canvas access', () => {
    it('should return canvas element', () => {
      const canvas = frameProcessor.getCanvas();
      expect(canvas).toBe(mockCanvas);
    });
  });

  describe('error handling', () => {
    it('should handle canvas drawing errors', async () => {
      mockContext.drawImage.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await frameProcessor.processFrame(mockVideoElement);

      expect(consoleSpy).toHaveBeenCalledWith('Error processing frame:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle processing loop errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock processFrame to throw error
      const originalProcessFrame = frameProcessor.processFrame;
      frameProcessor.processFrame = vi.fn().mockRejectedValue(new Error('Processing error'));

      frameProcessor.start(mockVideoElement);
      
      // Execute animation frame callback
      const callback = animationFrameCallbacks[0];
      callback();

      // Should continue processing despite error
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
      frameProcessor.processFrame = originalProcessFrame;
    });
  });
});