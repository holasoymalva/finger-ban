/**
 * Tests for MediaPipe model loader
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaPipeLoader } from '../MediaPipeLoader';

// Mock MediaPipe Hands
const mockHands = {
  setOptions: vi.fn(),
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  send: vi.fn(),
  onResults: vi.fn()
};

vi.mock('@mediapipe/hands', () => ({
  Hands: vi.fn().mockImplementation(() => mockHands)
}));

describe('MediaPipeLoader', () => {
  let loader: MediaPipeLoader;
  let progressCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation
    mockHands.initialize.mockResolvedValue(undefined);
    progressCallback = vi.fn();
    loader = new MediaPipeLoader({
      onProgress: progressCallback,
      maxRetries: 2,
      retryDelay: 100
    });
  });

  afterEach(() => {
    loader.dispose();
  });

  describe('loadModel', () => {
    it('should load MediaPipe model successfully', async () => {
      const hands = await loader.loadModel();

      expect(hands).toBe(mockHands);
      expect(loader.isModelLoaded()).toBe(true);
      expect(mockHands.setOptions).toHaveBeenCalledWith({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });
      expect(mockHands.initialize).toHaveBeenCalled();
    });

    it('should report progress during loading', async () => {
      await loader.loadModel();

      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'initializing',
        progress: 0,
        message: expect.stringContaining('Initializing MediaPipe')
      });

      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'downloading',
        progress: 25,
        message: 'Downloading MediaPipe model files...'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'loading',
        progress: 50,
        message: 'Configuring MediaPipe model...'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'ready',
        progress: 100,
        message: 'MediaPipe Hands model loaded successfully'
      });
    });

    it('should return same instance on multiple calls', async () => {
      const hands1 = await loader.loadModel();
      const hands2 = await loader.loadModel();

      expect(hands1).toBe(hands2);
      expect(mockHands.initialize).toHaveBeenCalledTimes(1);
    });

    it('should retry on initialization failure', async () => {
      mockHands.initialize
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const hands = await loader.loadModel();

      expect(hands).toBe(mockHands);
      expect(mockHands.initialize).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'error',
        progress: 0,
        message: expect.stringContaining('Loading failed (attempt 1/2)')
      });
    });

    it('should fail after max retries', async () => {
      mockHands.initialize.mockRejectedValue(new Error('Persistent error'));

      await expect(loader.loadModel()).rejects.toThrow('Failed to load MediaPipe Hands model after 2 attempts');

      expect(mockHands.initialize).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'error',
        progress: 0,
        message: expect.stringContaining('Failed to load MediaPipe after 2 attempts')
      });
    });

    it('should use custom model options', async () => {
      // Reset mock for this specific test
      mockHands.initialize.mockResolvedValue(undefined);
      
      const customLoader = new MediaPipeLoader({
        modelComplexity: 0,
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.6
      });

      await customLoader.loadModel();

      expect(mockHands.setOptions).toHaveBeenCalledWith({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.8,
        minTrackingConfidence: 0.6
      });

      customLoader.dispose();
    });
  });

  describe('getHands', () => {
    it('should return null when not loaded', () => {
      expect(loader.getHands()).toBeNull();
    });

    it('should return hands instance when loaded', async () => {
      await loader.loadModel();
      expect(loader.getHands()).toBe(mockHands);
    });
  });

  describe('isModelLoaded', () => {
    it('should return false when not loaded', () => {
      expect(loader.isModelLoaded()).toBe(false);
    });

    it('should return true when loaded', async () => {
      await loader.loadModel();
      expect(loader.isModelLoaded()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await loader.loadModel();
      loader.dispose();

      expect(mockHands.close).toHaveBeenCalled();
      expect(loader.isModelLoaded()).toBe(false);
      expect(loader.getHands()).toBeNull();
    });
  });
});