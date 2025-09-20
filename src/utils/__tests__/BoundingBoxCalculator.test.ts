/**
 * Unit tests for BoundingBoxCalculator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BoundingBoxCalculator } from '../BoundingBoxCalculator';
import { Point3D, BoundingBox } from '../../types';

describe('BoundingBoxCalculator', () => {
  let calculator: BoundingBoxCalculator;

  beforeEach(() => {
    calculator = new BoundingBoxCalculator(0.2);
  });

  describe('constructor', () => {
    it('should initialize with default margin', () => {
      const defaultCalculator = new BoundingBoxCalculator();
      expect(defaultCalculator.getMarginPercentage()).toBe(0.2);
    });

    it('should initialize with custom margin', () => {
      const customCalculator = new BoundingBoxCalculator(0.3);
      expect(customCalculator.getMarginPercentage()).toBe(0.3);
    });
  });

  describe('calculateFromLandmarks', () => {
    it('should calculate bounding box from landmarks', () => {
      const landmarks: Point3D[] = [
        { x: 0.2, y: 0.3, z: 0 },
        { x: 0.8, y: 0.7, z: 0 },
        { x: 0.5, y: 0.5, z: 0 }
      ];

      const result = calculator.calculateFromLandmarks(landmarks, 0.9);

      expect(result.confidence).toBe(0.9);
      expect(result.x).toBeLessThan(0.2); // Should include margin
      expect(result.y).toBeLessThan(0.3);
      expect(result.width).toBeGreaterThan(0.6); // 0.8 - 0.2 = 0.6 + margin
      expect(result.height).toBeGreaterThan(0.4); // 0.7 - 0.3 = 0.4 + margin
    });

    it('should handle empty landmarks', () => {
      const result = calculator.calculateFromLandmarks([], 0.5);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle single landmark', () => {
      const landmarks: Point3D[] = [{ x: 0.5, y: 0.5, z: 0 }];
      const result = calculator.calculateFromLandmarks(landmarks, 0.8);

      expect(result.confidence).toBe(0.8);
      expect(result.width).toBeGreaterThan(0); // Should have margin even for single point
      expect(result.height).toBeGreaterThan(0);
    });
  });

  describe('calculateForFinger', () => {
    it('should calculate bounding box for specific finger indices', () => {
      const landmarks: Point3D[] = createTestLandmarks();
      const fingerIndices = [9, 10, 11, 12]; // Middle finger

      const result = calculator.calculateForFinger(landmarks, fingerIndices, 0.85);

      expect(result.confidence).toBe(0.85);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should handle invalid indices', () => {
      const landmarks: Point3D[] = createTestLandmarks();
      const invalidIndices = [100, 200]; // Out of bounds

      const result = calculator.calculateForFinger(landmarks, invalidIndices, 0.5);

      expect(result.confidence).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('should handle empty finger indices', () => {
      const landmarks: Point3D[] = createTestLandmarks();
      const result = calculator.calculateForFinger(landmarks, [], 0.5);

      expect(result.confidence).toBe(0);
    });
  });

  describe('calculateForMiddleFinger', () => {
    it('should calculate bounding box for middle finger gesture', () => {
      const landmarks: Point3D[] = createTestLandmarks();
      const result = calculator.calculateForMiddleFinger(landmarks, 0.9);

      expect(result.confidence).toBe(0.9);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });
  });

  describe('coordinate transformations', () => {
    it('should convert to pixel coordinates', () => {
      const normalizedBox: BoundingBox = {
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
        confidence: 0.8
      };

      const pixelBox = calculator.toPixelCoordinates(normalizedBox, 640, 480);

      expect(pixelBox.x).toBe(160); // 0.25 * 640
      expect(pixelBox.y).toBe(120); // 0.25 * 480
      expect(pixelBox.width).toBe(320); // 0.5 * 640
      expect(pixelBox.height).toBe(240); // 0.5 * 480
      expect(pixelBox.confidence).toBe(0.8);
    });

    it('should convert to normalized coordinates', () => {
      const pixelBox: BoundingBox = {
        x: 160,
        y: 120,
        width: 320,
        height: 240,
        confidence: 0.8
      };

      const normalizedBox = calculator.toNormalizedCoordinates(pixelBox, 640, 480);

      expect(normalizedBox.x).toBeCloseTo(0.25);
      expect(normalizedBox.y).toBeCloseTo(0.25);
      expect(normalizedBox.width).toBeCloseTo(0.5);
      expect(normalizedBox.height).toBeCloseTo(0.5);
      expect(normalizedBox.confidence).toBe(0.8);
    });

    it('should handle zero image dimensions', () => {
      const pixelBox: BoundingBox = {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        confidence: 0.5
      };

      const result = calculator.toNormalizedCoordinates(pixelBox, 0, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('clampToValidBounds', () => {
    it('should clamp negative coordinates to zero', () => {
      const box: BoundingBox = {
        x: -0.1,
        y: -0.2,
        width: 0.5,
        height: 0.5,
        confidence: 0.8
      };

      const clamped = calculator.clampToValidBounds(box);

      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBeLessThanOrEqual(1);
      expect(clamped.height).toBeLessThanOrEqual(1);
    });

    it('should clamp coordinates exceeding 1.0', () => {
      const box: BoundingBox = {
        x: 0.8,
        y: 0.9,
        width: 0.5, // Would exceed bounds
        height: 0.5,
        confidence: 0.8
      };

      const clamped = calculator.clampToValidBounds(box);

      expect(clamped.x).toBe(0.8);
      expect(clamped.y).toBe(0.9);
      expect(clamped.width).toBeCloseTo(0.2); // Adjusted to stay within bounds
      expect(clamped.height).toBeCloseTo(0.1);
    });
  });

  describe('expandByPixels', () => {
    it('should expand bounding box by pixel amount', () => {
      const box: BoundingBox = {
        x: 0.5,
        y: 0.5,
        width: 0.2,
        height: 0.2,
        confidence: 0.8
      };

      const expanded = calculator.expandByPixels(box, 10, 640, 480);

      const expectedMarginX = 10 / 640;
      const expectedMarginY = 10 / 480;

      expect(expanded.x).toBeCloseTo(0.5 - expectedMarginX);
      expect(expanded.y).toBeCloseTo(0.5 - expectedMarginY);
      expect(expanded.width).toBeCloseTo(0.2 + 2 * expectedMarginX);
      expect(expanded.height).toBeCloseTo(0.2 + 2 * expectedMarginY);
    });
  });

  describe('bounding box operations', () => {
    it('should calculate intersection of two boxes', () => {
      const box1: BoundingBox = {
        x: 0.2, y: 0.2, width: 0.4, height: 0.4, confidence: 0.8
      };
      const box2: BoundingBox = {
        x: 0.4, y: 0.4, width: 0.4, height: 0.4, confidence: 0.9
      };

      const intersection = calculator.calculateIntersection(box1, box2);

      expect(intersection.x).toBe(0.4);
      expect(intersection.y).toBe(0.4);
      expect(intersection.width).toBeCloseTo(0.2); // Overlap width
      expect(intersection.height).toBeCloseTo(0.2); // Overlap height
      expect(intersection.confidence).toBe(0.8); // Min confidence
    });

    it('should calculate union of two boxes', () => {
      const box1: BoundingBox = {
        x: 0.2, y: 0.2, width: 0.2, height: 0.2, confidence: 0.8
      };
      const box2: BoundingBox = {
        x: 0.6, y: 0.6, width: 0.2, height: 0.2, confidence: 0.9
      };

      const union = calculator.calculateUnion(box1, box2);

      expect(union.x).toBe(0.2);
      expect(union.y).toBe(0.2);
      expect(union.width).toBeCloseTo(0.6); // 0.8 - 0.2
      expect(union.height).toBeCloseTo(0.6); // 0.8 - 0.2
      expect(union.confidence).toBe(0.9); // Max confidence
    });

    it('should handle non-overlapping boxes for intersection', () => {
      const box1: BoundingBox = {
        x: 0.1, y: 0.1, width: 0.2, height: 0.2, confidence: 0.8
      };
      const box2: BoundingBox = {
        x: 0.7, y: 0.7, width: 0.2, height: 0.2, confidence: 0.9
      };

      const intersection = calculator.calculateIntersection(box1, box2);

      expect(intersection.width).toBe(0);
      expect(intersection.height).toBe(0);
    });
  });

  describe('utility functions', () => {
    it('should check if point is inside bounding box', () => {
      const box: BoundingBox = {
        x: 0.2, y: 0.2, width: 0.4, height: 0.4, confidence: 0.8
      };

      const insidePoint: Point3D = { x: 0.4, y: 0.4, z: 0 };
      const outsidePoint: Point3D = { x: 0.8, y: 0.8, z: 0 };

      expect(calculator.containsPoint(box, insidePoint)).toBe(true);
      expect(calculator.containsPoint(box, outsidePoint)).toBe(false);
    });

    it('should calculate area of bounding box', () => {
      const box: BoundingBox = {
        x: 0.2, y: 0.2, width: 0.4, height: 0.3, confidence: 0.8
      };

      const area = calculator.calculateArea(box);
      expect(area).toBe(0.12); // 0.4 * 0.3
    });
  });

  describe('margin management', () => {
    it('should set and get margin percentage', () => {
      calculator.setMarginPercentage(0.3);
      expect(calculator.getMarginPercentage()).toBe(0.3);
    });

    it('should clamp margin percentage to valid range', () => {
      calculator.setMarginPercentage(-0.1);
      expect(calculator.getMarginPercentage()).toBe(0);

      calculator.setMarginPercentage(1.5);
      expect(calculator.getMarginPercentage()).toBe(1);
    });

    it('should affect bounding box calculation', () => {
      const landmarks: Point3D[] = [
        { x: 0.4, y: 0.4, z: 0 },
        { x: 0.6, y: 0.6, z: 0 }
      ];

      calculator.setMarginPercentage(0.1);
      const smallMargin = calculator.calculateFromLandmarks(landmarks);

      calculator.setMarginPercentage(0.5);
      const largeMargin = calculator.calculateFromLandmarks(landmarks);

      expect(largeMargin.width).toBeGreaterThan(smallMargin.width);
      expect(largeMargin.height).toBeGreaterThan(smallMargin.height);
    });
  });

  describe('edge cases with different hand sizes', () => {
    it('should handle very small hand landmarks', () => {
      const smallLandmarks: Point3D[] = [
        { x: 0.49, y: 0.49, z: 0 },
        { x: 0.51, y: 0.51, z: 0 }
      ];

      const result = calculator.calculateFromLandmarks(smallLandmarks, 0.8);

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.8);
    });

    it('should handle very large hand landmarks', () => {
      const largeLandmarks: Point3D[] = [
        { x: 0.0, y: 0.0, z: 0 },
        { x: 1.0, y: 1.0, z: 0 }
      ];

      const result = calculator.calculateFromLandmarks(largeLandmarks, 0.9);

      expect(result.width).toBeGreaterThan(1.0); // Should include margin
      expect(result.height).toBeGreaterThan(1.0);
      expect(result.confidence).toBe(0.9);
    });

    it('should handle landmarks at different positions', () => {
      const positions = [
        [{ x: 0.1, y: 0.1, z: 0 }, { x: 0.2, y: 0.2, z: 0 }], // Top-left
        [{ x: 0.8, y: 0.1, z: 0 }, { x: 0.9, y: 0.2, z: 0 }], // Top-right
        [{ x: 0.1, y: 0.8, z: 0 }, { x: 0.2, y: 0.9, z: 0 }], // Bottom-left
        [{ x: 0.8, y: 0.8, z: 0 }, { x: 0.9, y: 0.9, z: 0 }]  // Bottom-right
      ];

      positions.forEach((landmarks, index) => {
        const result = calculator.calculateFromLandmarks(landmarks, 0.7);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.confidence).toBe(0.7);
      });
    });
  });
});

// Helper function to create test landmarks
function createTestLandmarks(): Point3D[] {
  const landmarks: Point3D[] = [];
  
  // Create 21 landmarks (standard MediaPipe hand landmarks)
  for (let i = 0; i <= 20; i++) {
    landmarks[i] = {
      x: 0.3 + (i % 5) * 0.1,
      y: 0.3 + Math.floor(i / 5) * 0.1,
      z: 0
    };
  }
  
  return landmarks;
}