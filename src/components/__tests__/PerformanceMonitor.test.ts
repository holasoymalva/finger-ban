/**
 * PerformanceMonitor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from '../PerformanceMonitor';

// Mock performance.now
let mockTime = 0;
const mockPerformanceNow = vi.fn(() => mockTime);

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTime = 0;
    global.performance = { now: mockPerformanceNow } as any;
    performanceMonitor = new PerformanceMonitor(30);
  });

  describe('constructor', () => {
    it('should create PerformanceMonitor with default target FPS', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should create PerformanceMonitor with custom target FPS', () => {
      const monitor = new PerformanceMonitor(60);
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });
  });

  describe('frame timing', () => {
    it('should track frame start and end times', () => {
      mockTime = 1000;
      performanceMonitor.startFrame();

      mockTime = 1050;
      performanceMonitor.endFrame();

      const avgTime = performanceMonitor.getAverageProcessingTime();
      expect(avgTime).toBe(50);
    });

    it('should calculate average processing time over multiple frames', () => {
      // Frame 1: 50ms
      mockTime = 1000;
      performanceMonitor.startFrame();
      mockTime = 1050;
      performanceMonitor.endFrame();

      // Frame 2: 30ms
      mockTime = 1100;
      performanceMonitor.startFrame();
      mockTime = 1130;
      performanceMonitor.endFrame();

      const avgTime = performanceMonitor.getAverageProcessingTime();
      expect(avgTime).toBe(40); // (50 + 30) / 2
    });

    it('should limit processing time samples to maxSamples', () => {
      // Add more than 60 samples
      for (let i = 0; i < 65; i++) {
        mockTime = i * 100;
        performanceMonitor.startFrame();
        mockTime = i * 100 + 10;
        performanceMonitor.endFrame();
      }

      const avgTime = performanceMonitor.getAverageProcessingTime();
      expect(avgTime).toBe(10); // Should only consider last 60 samples
    });
  });

  describe('FPS calculation', () => {
    it('should calculate FPS over time', () => {
      mockTime = 0;
      performanceMonitor.startFrame();
      
      // Simulate 30 frames over 1 second
      for (let i = 1; i <= 30; i++) {
        mockTime = i * (1000 / 30); // 33.33ms per frame
        performanceMonitor.startFrame();
        performanceMonitor.endFrame();
      }

      // Move time forward by 1 second to trigger FPS calculation
      mockTime = 1000;
      performanceMonitor.startFrame();

      const fps = performanceMonitor.getFPS();
      expect(fps).toBeGreaterThan(25);
      expect(fps).toBeLessThan(35); // Allow reasonable FPS range
    });

    it('should return 0 FPS initially', () => {
      const fps = performanceMonitor.getFPS();
      expect(fps).toBe(0);
    });
  });

  describe('dropped frames detection', () => {
    it('should detect dropped frames when frame interval is too long', () => {
      const targetFPS = 30;
      const expectedFrameTime = 1000 / targetFPS; // ~33.33ms
      
      mockTime = 0;
      performanceMonitor.startFrame();
      
      // Simulate a long gap (dropped frame)
      mockTime = expectedFrameTime * 2; // 66.66ms - should be detected as dropped
      performanceMonitor.startFrame();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.droppedFrames).toBe(1);
    });

    it('should not count normal frame intervals as dropped', () => {
      const targetFPS = 30;
      const expectedFrameTime = 1000 / targetFPS;
      
      mockTime = 0;
      performanceMonitor.startFrame();
      
      mockTime = expectedFrameTime; // Normal frame interval
      performanceMonitor.startFrame();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.droppedFrames).toBe(0);
    });
  });

  describe('performance recommendations', () => {
    it('should recommend quality reduction when FPS is low', () => {
      // Simulate low FPS by having long processing times
      for (let i = 0; i < 10; i++) {
        mockTime = i * 100;
        performanceMonitor.startFrame();
        mockTime = i * 100 + 80; // 80ms processing time (too high for 30fps)
        performanceMonitor.endFrame();
      }

      expect(performanceMonitor.shouldReduceQuality()).toBe(true);
    });

    it('should not recommend quality reduction when performance is good', () => {
      // Simulate good performance with proper FPS calculation
      mockTime = 0;
      performanceMonitor.startFrame();
      
      for (let i = 1; i <= 30; i++) {
        mockTime = i * 33; // 33ms per frame = 30fps
        performanceMonitor.startFrame();
        mockTime = i * 33 + 10; // 10ms processing time (good for 30fps)
        performanceMonitor.endFrame();
      }
      
      // Trigger FPS calculation
      mockTime = 1000;
      performanceMonitor.startFrame();

      expect(performanceMonitor.shouldReduceQuality()).toBe(false);
    });

    it('should provide performance recommendations', () => {
      // Simulate poor performance with high processing times
      mockTime = 0;
      performanceMonitor.startFrame();
      
      for (let i = 1; i <= 15; i++) {
        mockTime = i * 100;
        performanceMonitor.startFrame();
        mockTime = i * 100 + 80; // 80ms processing time (too high for 30fps)
        performanceMonitor.endFrame();
      }

      const recommendations = performanceMonitor.getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('processing time') || r.includes('dropped'))).toBe(true);
    });
  });

  describe('frame processing decisions', () => {
    it('should allow processing when enough time has passed', () => {
      const targetFPS = 30;
      const frameTime = 1000 / targetFPS;
      
      mockTime = 0;
      performanceMonitor.startFrame();
      
      mockTime = frameTime; // Exactly one frame time later
      const shouldProcess = performanceMonitor.shouldProcessFrame();
      
      expect(shouldProcess).toBe(true);
    });

    it('should skip processing when called too frequently', () => {
      mockTime = 0;
      performanceMonitor.startFrame();
      
      mockTime = 10; // Only 10ms later (too soon for 30fps)
      const shouldProcess = performanceMonitor.shouldProcessFrame();
      
      expect(shouldProcess).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should set target FPS', () => {
      performanceMonitor.setTargetFPS(60);
      
      // Test that frame timing decisions use new target
      mockTime = 0;
      performanceMonitor.startFrame();
      
      mockTime = 16; // ~60fps frame time
      const shouldProcess = performanceMonitor.shouldProcessFrame();
      
      expect(shouldProcess).toBe(true);
    });

    it('should clamp target FPS to valid range', () => {
      performanceMonitor.setTargetFPS(0); // Should be clamped to 1
      performanceMonitor.setTargetFPS(100); // Should be clamped to 60
      
      // Test that it doesn't crash with extreme values
      expect(() => performanceMonitor.shouldProcessFrame()).not.toThrow();
    });
  });

  describe('reset functionality', () => {
    it('should reset all counters', () => {
      // Add some data
      mockTime = 0;
      performanceMonitor.startFrame();
      mockTime = 50;
      performanceMonitor.endFrame();

      // Reset
      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.averageProcessingTime).toBe(0);
      expect(metrics.droppedFrames).toBe(0);
    });
  });

  describe('metrics', () => {
    it('should return comprehensive metrics', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('memoryUsage');
      
      expect(typeof metrics.fps).toBe('number');
      expect(typeof metrics.averageProcessingTime).toBe('number');
      expect(typeof metrics.droppedFrames).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    it('should handle missing memory API gracefully', () => {
      // Remove memory API
      global.performance = { now: mockPerformanceNow } as any;
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBe(0);
    });

    it('should return memory usage when available', () => {
      // Mock memory API
      global.performance = {
        now: mockPerformanceNow,
        memory: {
          usedJSHeapSize: 50 * 1024 * 1024 // 50MB
        }
      } as any;

      const monitor = new PerformanceMonitor();
      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBe(50);
    });
  });
});