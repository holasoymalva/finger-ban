/**
 * Core data structures for the Finger Ban system
 */

export interface Point3D {
  x: number;  // Normalized [0-1]
  y: number;  // Normalized [0-1]
  z: number;  // Depth information
}

export interface BoundingBox {
  x: number;      // Top-left X coordinate
  y: number;      // Top-left Y coordinate
  width: number;  // Box width
  height: number; // Box height
  confidence: number; // Detection confidence [0-1]
}

export interface ProcessingConfig {
  targetFPS: number;
  detectionThreshold: number;
  pixelationLevel: number;
  marginPercentage: number;
  maxProcessingTime: number;
}

export interface HandLandmarks {
  landmarks: Point3D[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface GestureResult {
  gesture: 'middle_finger' | 'none';
  confidence: number;
  boundingBox: BoundingBox;
}