/**
 * Tests for HandDetectionEngine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HandDetectionEngine } from '../HandDetectionEngine';
import { Results } from '@mediapipe/hands';

// Create a partial Results type for testing
type MockResults = Pick<Results, 'multiHandLandmarks' | 'multiHandedness'>;

// Mock MediaPipeLoader
const mockMediaPipeLoader = {
  loadModel: vi.fn(),
  dispose: vi.fn(),
  isModelLoaded: vi.fn().mockReturnValue(true),
  getHands: vi.fn()
};

const mockHands = {
  onResults: vi.fn(),
  send: vi.fn(),
  close: vi.fn()
};

vi.mock('../../utils/MediaPipeLoader', () => ({
  MediaPipeLoader: vi.fn().mockImplementation(() => mockMediaPipeLoader)
}));

// Mock canvas and context
let mockCanvas: any;
let mockContext: any;

// Mock document.createElement
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        mockCanvas = {
          width: 0,
          height: 0,
          getContext: vi.fn()
        };
        mockContext = {
          putImageData: vi.fn()
        };
        mockCanvas.getContext.mockReturnValue(mockContext);
        return mockCanvas;
      }
      return {};
    })
  }
});

describe('HandDetectionEngine', () => {
  let engine: HandDetectionEngine;
  let mockImageData: ImageData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMediaPipeLoader.loadModel.mockResolvedValue(mockHands);
    mockMediaPipeLoader.getHands.mockReturnValue(mockHands);
    
    engine = new HandDetectionEngine();
    
    // Create mock ImageData
    const data = new Uint8ClampedArray(4 * 640 * 480); // RGBA for 640x480
    mockImageData = new ImageData(data, 640, 480);
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await engine.initialize();

      expect(mockMediaPipeLoader.loadModel).toHaveBeenCalled();
      expect(engine.isReady()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await engine.initialize();
      await engine.initialize();

      expect(mockMediaPipeLoader.loadModel).toHaveBeenCalledTimes(1);
    });

    it('should throw error if MediaPipe loading fails', async () => {
      mockMediaPipeLoader.loadModel.mockRejectedValue(new Error('Loading failed'));

      await expect(engine.initialize()).rejects.toThrow('Failed to initialize HandDetectionEngine: Loading failed');
    });
  });

  describe('detectHands', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should detect hands successfully', async () => {
      const mockResults: MockResults = {
        multiHandLandmarks: [
          [
            { x: 0.5, y: 0.5, z: 0.1 },
            { x: 0.6, y: 0.4, z: 0.2 },
            // ... more landmarks would be here in real usage
          ]
        ],
        multiHandedness: [
          { label: 'Right', score: 0.95, index: 0 }
        ]
      };

      // Mock the onResults callback to immediately call with results
      mockHands.onResults.mockImplementation((callback: (results: Results) => void) => {
        setTimeout(() => callback(mockResults as Results), 0);
      });

      const results = await engine.detectHands(mockImageData);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        landmarks: [
          { x: 0.5, y: 0.5, z: 0.1 },
          { x: 0.6, y: 0.4, z: 0.2 }
        ],
        handedness: 'Right',
        confidence: 0.95
      });

      expect(mockHands.send).toHaveBeenCalled();
    });

    it('should handle multiple hands', async () => {
      const mockResults: MockResults = {
        multiHandLandmarks: [
          [{ x: 0.3, y: 0.3, z: 0.1 }],
          [{ x: 0.7, y: 0.7, z: 0.2 }]
        ],
        multiHandedness: [
          { label: 'Left', score: 0.85, index: 0 },
          { label: 'Right', score: 0.90, index: 1 }
        ]
      };

      mockHands.onResults.mockImplementation((callback: (results: Results) => void) => {
        setTimeout(() => callback(mockResults as Results), 0);
      });

      const results = await engine.detectHands(mockImageData);

      expect(results).toHaveLength(2);
      expect(results[0].handedness).toBe('Left');
      expect(results[0].confidence).toBe(0.85);
      expect(results[1].handedness).toBe('Right');
      expect(results[1].confidence).toBe(0.90);
    });

    it('should return empty array when no hands detected', async () => {
      const mockResults: MockResults = {
        multiHandLandmarks: [],
        multiHandedness: []
      };

      mockHands.onResults.mockImplementation((callback: (results: Results) => void) => {
        setTimeout(() => callback(mockResults as Results), 0);
      });

      const results = await engine.detectHands(mockImageData);

      expect(results).toHaveLength(0);
    });

    it('should handle landmarks without z coordinate', async () => {
      const mockResults: MockResults = {
        multiHandLandmarks: [
          [{ x: 0.5, y: 0.5, z: 0 }] // No z coordinate
        ],
        multiHandedness: [
          { label: 'Right', score: 0.95, index: 0 }
        ]
      };

      mockHands.onResults.mockImplementation((callback: (results: Results) => void) => {
        setTimeout(() => callback(mockResults as Results), 0);
      });

      const results = await engine.detectHands(mockImageData);

      expect(results[0].landmarks[0].z).toBe(0);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedEngine = new HandDetectionEngine();

      await expect(uninitializedEngine.detectHands(mockImageData))
        .rejects.toThrow('HandDetectionEngine not initialized. Call initialize() first.');
    });

    it('should handle detection errors', async () => {
      mockHands.send.mockImplementation(() => {
        throw new Error('MediaPipe processing error');
      });

      await expect(engine.detectHands(mockImageData))
        .rejects.toThrow('Hand detection failed: MediaPipe processing error');
    });
  });

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      expect(engine.isReady()).toBe(false);
    });

    it('should return true when initialized', async () => {
      await engine.initialize();
      expect(engine.isReady()).toBe(true);
    });
  });

  describe('getMediaPipeHands', () => {
    it('should return null when not initialized', () => {
      expect(engine.getMediaPipeHands()).toBeNull();
    });

    it('should return hands instance when initialized', async () => {
      await engine.initialize();
      expect(engine.getMediaPipeHands()).toBe(mockHands);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await engine.initialize();
      engine.dispose();

      expect(mockMediaPipeLoader.dispose).toHaveBeenCalled();
      expect(engine.isReady()).toBe(false);
      expect(engine.getMediaPipeHands()).toBeNull();
    });
  });
});