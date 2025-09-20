/**
 * Unit tests for Camera Manager component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CameraManager, CameraError } from '../CameraManager';

// Mock MediaDevices API
const mockGetUserMedia = vi.fn();
const mockPermissionsQuery = vi.fn();

// Mock MediaStream
const mockMediaStream = {
  active: true,
  getTracks: vi.fn(() => [
    {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        width: 1280,
        height: 720,
        frameRate: 30
      }))
    }
  ]),
  getVideoTracks: vi.fn(() => [
    {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        width: 1280,
        height: 720,
        frameRate: 30
      }))
    }
  ])
};

// Mock HTMLVideoElement
const mockVideoElement = {
  autoplay: false,
  muted: false,
  playsInline: false,
  srcObject: null,
  paused: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Setup global mocks
const mockNavigator = {
  mediaDevices: {
    getUserMedia: mockGetUserMedia
  },
  permissions: {
    query: mockPermissionsQuery
  }
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockVideoElement)
  },
  writable: true
});

describe('CameraManager', () => {
  let cameraManager: CameraManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Ensure navigator mock is properly set
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    // Reset mock implementations
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' });
    
    // Reset video element mock
    Object.assign(mockVideoElement, {
      autoplay: false,
      muted: false,
      playsInline: false,
      srcObject: null,
      paused: false
    });

    cameraManager = new CameraManager();
  });

  afterEach(() => {
    cameraManager.stop();
  });

  describe('Constructor', () => {
    it('should create video element with correct properties', () => {
      expect(document.createElement).toHaveBeenCalledWith('video');
      expect(mockVideoElement.autoplay).toBe(true);
      expect(mockVideoElement.muted).toBe(true);
      expect(mockVideoElement.playsInline).toBe(true);
    });

    it('should not be active initially', () => {
      expect(cameraManager.isActive()).toBe(false);
    });
  });

  describe('initialize()', () => {
    it('should successfully initialize camera with correct constraints', async () => {
      // Mock successful video loading
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(callback, 0);
        }
      });

      const stream = await cameraManager.initialize();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        },
        audio: false
      });

      expect(stream).toBe(mockMediaStream);
      expect(mockVideoElement.srcObject).toBe(mockMediaStream);
    });

    it('should return existing stream if already initialized', async () => {
      // Mock successful video loading
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(callback, 0);
        }
      });

      const stream1 = await cameraManager.initialize();
      const stream2 = await cameraManager.initialize();

      expect(stream1).toBe(stream2);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should handle NotAllowedError correctly', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(error);

      try {
        await cameraManager.initialize();
        expect.fail('Should have thrown an error');
      } catch (cameraError: any) {
        expect(cameraError.type).toBe(CameraError.NOT_ALLOWED);
        expect(cameraError.userMessage).toContain('Camera access was denied');
        expect(cameraError.canRetry).toBe(true);
      }
    });

    it('should handle NotFoundError correctly', async () => {
      const error = new Error('No camera found');
      error.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(error);

      try {
        await cameraManager.initialize();
        expect.fail('Should have thrown an error');
      } catch (cameraError: any) {
        expect(cameraError.type).toBe(CameraError.NOT_FOUND);
        expect(cameraError.userMessage).toContain('No camera found');
        expect(cameraError.canRetry).toBe(true);
      }
    });

    it('should handle video loading errors', async () => {
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(callback, 0);
        }
      });

      try {
        await cameraManager.initialize();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to load video stream');
      }
    });

    it('should throw error when getUserMedia is not supported', async () => {
      // Mock unsupported browser
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      });

      try {
        await cameraManager.initialize();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Camera access not supported');
      }
      
      // Restore navigator mock
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true
      });
    });
  });

  describe('getVideoElement()', () => {
    it('should return the video element', () => {
      const videoElement = cameraManager.getVideoElement();
      expect(videoElement).toBe(mockVideoElement);
    });
  });

  describe('isActive()', () => {
    it('should return false when not initialized', () => {
      expect(cameraManager.isActive()).toBe(false);
    });

    it('should return true when properly initialized and active', async () => {
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(callback, 0);
        }
      });

      await cameraManager.initialize();
      expect(cameraManager.isActive()).toBe(true);
    });

    it('should return false when video is paused', async () => {
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(callback, 0);
        }
      });

      await cameraManager.initialize();
      mockVideoElement.paused = true;
      
      expect(cameraManager.isActive()).toBe(false);
    });
  });

  describe('stop()', () => {
    it('should stop all tracks and cleanup resources', async () => {
      const mockTrack = { stop: vi.fn() };
      const mockStreamWithTrack = {
        ...mockMediaStream,
        getTracks: vi.fn(() => [mockTrack])
      };
      
      mockGetUserMedia.mockResolvedValueOnce(mockStreamWithTrack);
      
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(callback, 0);
        }
      });

      await cameraManager.initialize();
      cameraManager.stop();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockVideoElement.srcObject).toBe(null);
      expect(cameraManager.isActive()).toBe(false);
    });

    it('should handle cleanup when not initialized', () => {
      expect(() => cameraManager.stop()).not.toThrow();
    });
  });

  describe('getStreamSettings()', () => {
    it('should return null when no stream is active', () => {
      const settings = cameraManager.getStreamSettings();
      expect(settings).toBe(null);
    });

    it('should return stream settings when active', async () => {
      mockVideoElement.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadedmetadata') {
          setTimeout(callback, 0);
        }
      });

      await cameraManager.initialize();
      const settings = cameraManager.getStreamSettings();

      expect(settings).toEqual({
        width: 1280,
        height: 720,
        frameRate: 30
      });
    });
  });

  describe('requestPermission()', () => {
    it('should return true when permission is granted', async () => {
      const tempStream = { getTracks: () => [{ stop: vi.fn() }] };
      
      // Create a separate mock for this test to avoid interference
      const tempGetUserMedia = vi.fn().mockResolvedValue(tempStream);
      Object.defineProperty(global, 'navigator', {
        value: {
          ...mockNavigator,
          mediaDevices: {
            getUserMedia: tempGetUserMedia
          }
        },
        writable: true
      });

      const hasPermission = await cameraManager.requestPermission();

      expect(hasPermission).toBe(true);
      expect(tempGetUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: false
      });
      
      // Restore original mock
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true
      });
    });

    it('should return false when permission is denied', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      const hasPermission = await cameraManager.requestPermission();

      expect(hasPermission).toBe(false);
    });
  });

  describe('checkPermission()', () => {
    it('should return permission state when supported', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

      const permission = await cameraManager.checkPermission();

      expect(permission).toBe('granted');
      expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'camera' });
    });

    it('should return prompt when permissions API is not supported', async () => {
      const tempNavigator = { ...mockNavigator };
      delete (tempNavigator as any).permissions;
      
      Object.defineProperty(global, 'navigator', {
        value: tempNavigator,
        writable: true
      });

      const permission = await cameraManager.checkPermission();

      expect(permission).toBe('prompt');
      
      // Restore navigator mock
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true
      });
    });

    it('should return prompt when permissions query fails', async () => {
      mockPermissionsQuery.mockRejectedValue(new Error('Not supported'));

      const permission = await cameraManager.checkPermission();

      expect(permission).toBe('prompt');
    });
  });
});