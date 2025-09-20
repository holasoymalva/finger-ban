/**
 * Test setup configuration
 */

import { vi } from 'vitest';

// Mock DOM APIs that might not be available in test environment
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    active: true,
    getTracks: vi.fn(() => []),
    getVideoTracks: vi.fn(() => [])
  }))
});

// Mock ImageData constructor
global.ImageData = class ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
} as any;

// Mock HTMLVideoElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined)
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn()
});

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes && args[0].includes('MediaDevices')) {
    return;
  }
  originalWarn(...args);
};