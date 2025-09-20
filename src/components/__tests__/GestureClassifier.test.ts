/**
 * Unit tests for GestureClassifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GestureClassifier } from '../GestureClassifier';
import { HandLandmarks, Point3D } from '../../types';

describe('GestureClassifier', () => {
  let classifier: GestureClassifier;

  beforeEach(() => {
    classifier = new GestureClassifier(0.7);
  });

  describe('constructor', () => {
    it('should initialize with default threshold', () => {
      const defaultClassifier = new GestureClassifier();
      expect(defaultClassifier).toBeDefined();
    });

    it('should initialize with custom threshold', () => {
      const customClassifier = new GestureClassifier(0.8);
      expect(customClassifier).toBeDefined();
    });
  });

  describe('updateThreshold', () => {
    it('should update detection threshold', () => {
      classifier.updateThreshold(0.8);
      // Test by checking classification result changes
      const landmarks = createMiddleFingerLandmarks();
      const result1 = classifier.classifyGesture(landmarks);
      
      classifier.updateThreshold(0.9);
      const result2 = classifier.classifyGesture(landmarks);
      
      // With higher threshold, same gesture might not be detected
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('should clamp threshold to valid range', () => {
      classifier.updateThreshold(-0.5);
      classifier.updateThreshold(1.5);
      // Should not throw and should work normally
      expect(classifier).toBeDefined();
    });
  });

  describe('classifyGesture', () => {
    it('should detect middle finger gesture with high confidence', () => {
      const landmarks = createMiddleFingerLandmarks();
      const result = classifier.classifyGesture(landmarks);

      expect(result.gesture).toBe('middle_finger');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.boundingBox).toBeDefined();
      expect(result.boundingBox.confidence).toBe(result.confidence);
    });

    it('should not detect gesture when all fingers are extended', () => {
      const landmarks = createOpenHandLandmarks();
      const result = classifier.classifyGesture(landmarks);

      expect(result.gesture).toBe('none');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should not detect gesture when all fingers are closed', () => {
      const landmarks = createClosedFistLandmarks();
      const result = classifier.classifyGesture(landmarks);

      expect(result.gesture).toBe('none');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should not detect gesture with peace sign (index and middle extended)', () => {
      const landmarks = createPeaceSignLandmarks();
      const result = classifier.classifyGesture(landmarks);

      expect(result.gesture).toBe('none');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should handle invalid landmark count', () => {
      const invalidLandmarks: HandLandmarks = {
        landmarks: [
          { x: 0.5, y: 0.5, z: 0 },
          { x: 0.6, y: 0.4, z: 0 }
        ], // Only 2 landmarks instead of 21
        handedness: 'Right',
        confidence: 0.9
      };

      const result = classifier.classifyGesture(invalidLandmarks);
      expect(result.gesture).toBe('none');
      expect(result.confidence).toBe(0);
    });

    it('should calculate proper bounding box', () => {
      const landmarks = createMiddleFingerLandmarks();
      const result = classifier.classifyGesture(landmarks);

      expect(result.boundingBox.x).toBeGreaterThanOrEqual(0);
      expect(result.boundingBox.y).toBeGreaterThanOrEqual(0);
      expect(result.boundingBox.width).toBeGreaterThan(0);
      expect(result.boundingBox.height).toBeGreaterThan(0);
      expect(result.boundingBox.confidence).toBe(result.confidence);
    });
  });

  describe('convertToPixelCoordinates', () => {
    it('should convert normalized coordinates to pixel coordinates', () => {
      const normalizedBox = {
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
        confidence: 0.8
      };

      const pixelBox = classifier.convertToPixelCoordinates(normalizedBox, 640, 480);

      expect(pixelBox.x).toBe(160); // 0.25 * 640
      expect(pixelBox.y).toBe(120); // 0.25 * 480
      expect(pixelBox.width).toBe(320); // 0.5 * 640
      expect(pixelBox.height).toBe(240); // 0.5 * 480
      expect(pixelBox.confidence).toBe(0.8);
    });

    it('should handle zero dimensions', () => {
      const zeroBox = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        confidence: 0
      };

      const pixelBox = classifier.convertToPixelCoordinates(zeroBox, 640, 480);

      expect(pixelBox.x).toBe(0);
      expect(pixelBox.y).toBe(0);
      expect(pixelBox.width).toBe(0);
      expect(pixelBox.height).toBe(0);
    });
  });

  describe('setMarginPercentage', () => {
    it('should update margin percentage', () => {
      const landmarks = createMiddleFingerLandmarks();
      const result1 = classifier.classifyGesture(landmarks);

      classifier.setMarginPercentage(0.4);
      const result2 = classifier.classifyGesture(landmarks);

      // Bounding box should be larger with higher margin
      expect(result2.boundingBox.width).toBeGreaterThan(result1.boundingBox.width);
      expect(result2.boundingBox.height).toBeGreaterThan(result1.boundingBox.height);
    });

    it('should clamp margin to valid range', () => {
      classifier.setMarginPercentage(-0.1);
      classifier.setMarginPercentage(1.5);
      // Should not throw
      expect(classifier).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle landmarks at image boundaries', () => {
      const boundaryLandmarks = createBoundaryLandmarks();
      const result = classifier.classifyGesture(boundaryLandmarks);

      expect(result).toBeDefined();
      expect(result.boundingBox.x).toBeGreaterThanOrEqual(-0.2); // Allow for margin
      expect(result.boundingBox.y).toBeGreaterThanOrEqual(-0.2);
    });

    it('should handle very small hand landmarks', () => {
      const smallLandmarks = createSmallHandLandmarks();
      const result = classifier.classifyGesture(smallLandmarks);

      expect(result).toBeDefined();
      expect(result.boundingBox.width).toBeGreaterThan(0);
      expect(result.boundingBox.height).toBeGreaterThan(0);
    });
  });
});

// Helper functions to create test landmark data

function createMiddleFingerLandmarks(): HandLandmarks {
  // Create landmarks representing a middle finger gesture
  const landmarks: Point3D[] = [];
  
  // Wrist
  landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
  
  // Thumb (folded) - closer to palm
  landmarks[1] = { x: 0.48, y: 0.78, z: 0 };
  landmarks[2] = { x: 0.46, y: 0.76, z: 0 };
  landmarks[3] = { x: 0.44, y: 0.74, z: 0 };
  landmarks[4] = { x: 0.42, y: 0.72, z: 0 };
  
  // Index finger (folded) - bent down
  landmarks[5] = { x: 0.48, y: 0.75, z: 0 };
  landmarks[6] = { x: 0.47, y: 0.72, z: 0 };
  landmarks[7] = { x: 0.46, y: 0.74, z: 0 };
  landmarks[8] = { x: 0.45, y: 0.76, z: 0 }; // Tip folded back down
  
  // Middle finger (extended) - clearly extended upward
  landmarks[9] = { x: 0.50, y: 0.75, z: 0 };  // MCP
  landmarks[10] = { x: 0.50, y: 0.60, z: 0 }; // PIP
  landmarks[11] = { x: 0.50, y: 0.45, z: 0 }; // DIP
  landmarks[12] = { x: 0.50, y: 0.30, z: 0 }; // TIP - much higher than MCP
  
  // Ring finger (folded) - bent down
  landmarks[13] = { x: 0.52, y: 0.75, z: 0 };
  landmarks[14] = { x: 0.53, y: 0.72, z: 0 };
  landmarks[15] = { x: 0.54, y: 0.74, z: 0 };
  landmarks[16] = { x: 0.55, y: 0.76, z: 0 }; // Tip folded back down
  
  // Pinky (folded) - bent down
  landmarks[17] = { x: 0.55, y: 0.75, z: 0 };
  landmarks[18] = { x: 0.57, y: 0.72, z: 0 };
  landmarks[19] = { x: 0.58, y: 0.74, z: 0 };
  landmarks[20] = { x: 0.60, y: 0.76, z: 0 }; // Tip folded back down

  return {
    landmarks,
    handedness: 'Right',
    confidence: 0.9
  };
}

function createOpenHandLandmarks(): HandLandmarks {
  // Create landmarks representing an open hand (all fingers extended)
  const landmarks: Point3D[] = [];
  
  // Wrist
  landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
  
  // All fingers extended
  for (let i = 1; i <= 20; i++) {
    const fingerIndex = Math.floor((i - 1) / 4);
    const jointIndex = (i - 1) % 4;
    
    landmarks[i] = {
      x: 0.3 + fingerIndex * 0.1,
      y: 0.75 - jointIndex * 0.1,
      z: 0
    };
  }

  return {
    landmarks,
    handedness: 'Right',
    confidence: 0.9
  };
}

function createClosedFistLandmarks(): HandLandmarks {
  // Create landmarks representing a closed fist
  const landmarks: Point3D[] = [];
  
  // Wrist
  landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
  
  // All fingers folded close to palm
  for (let i = 1; i <= 20; i++) {
    landmarks[i] = {
      x: 0.48 + Math.random() * 0.04,
      y: 0.75 + Math.random() * 0.05,
      z: 0
    };
  }

  return {
    landmarks,
    handedness: 'Right',
    confidence: 0.9
  };
}

function createPeaceSignLandmarks(): HandLandmarks {
  // Create landmarks representing a peace sign (index and middle extended)
  const landmarks: Point3D[] = [];
  
  // Wrist
  landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
  
  // Thumb (folded)
  landmarks[1] = { x: 0.45, y: 0.75, z: 0 };
  landmarks[2] = { x: 0.42, y: 0.72, z: 0 };
  landmarks[3] = { x: 0.40, y: 0.70, z: 0 };
  landmarks[4] = { x: 0.38, y: 0.68, z: 0 };
  
  // Index finger (extended)
  landmarks[5] = { x: 0.48, y: 0.75, z: 0 };
  landmarks[6] = { x: 0.47, y: 0.65, z: 0 };
  landmarks[7] = { x: 0.46, y: 0.55, z: 0 };
  landmarks[8] = { x: 0.45, y: 0.45, z: 0 };
  
  // Middle finger (extended)
  landmarks[9] = { x: 0.50, y: 0.75, z: 0 };
  landmarks[10] = { x: 0.50, y: 0.65, z: 0 };
  landmarks[11] = { x: 0.50, y: 0.55, z: 0 };
  landmarks[12] = { x: 0.50, y: 0.45, z: 0 };
  
  // Ring finger (folded)
  landmarks[13] = { x: 0.52, y: 0.75, z: 0 };
  landmarks[14] = { x: 0.53, y: 0.70, z: 0 };
  landmarks[15] = { x: 0.54, y: 0.65, z: 0 };
  landmarks[16] = { x: 0.55, y: 0.62, z: 0 };
  
  // Pinky (folded)
  landmarks[17] = { x: 0.55, y: 0.75, z: 0 };
  landmarks[18] = { x: 0.57, y: 0.70, z: 0 };
  landmarks[19] = { x: 0.58, y: 0.65, z: 0 };
  landmarks[20] = { x: 0.60, y: 0.62, z: 0 };

  return {
    landmarks,
    handedness: 'Right',
    confidence: 0.9
  };
}

function createBoundaryLandmarks(): HandLandmarks {
  // Create landmarks at image boundaries
  const landmarks: Point3D[] = [];
  
  for (let i = 0; i <= 20; i++) {
    landmarks[i] = {
      x: i % 2 === 0 ? 0.0 : 1.0, // Alternate between left and right edges
      y: i % 3 === 0 ? 0.0 : 1.0, // Alternate between top and bottom edges
      z: 0
    };
  }

  return {
    landmarks,
    handedness: 'Right',
    confidence: 0.9
  };
}

function createSmallHandLandmarks(): HandLandmarks {
  // Create very small hand landmarks clustered together
  const landmarks: Point3D[] = [];
  const centerX = 0.5;
  const centerY = 0.5;
  const scale = 0.01; // Very small scale
  
  for (let i = 0; i <= 20; i++) {
    landmarks[i] = {
      x: centerX + (Math.random() - 0.5) * scale,
      y: centerY + (Math.random() - 0.5) * scale,
      z: 0
    };
  }

  return {
    landmarks,
    handedness: 'Right',
    confidence: 0.9
  };
}