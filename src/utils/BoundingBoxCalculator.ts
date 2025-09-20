/**
 * Utility functions for calculating bounding boxes around detected gestures
 */

import { Point3D, BoundingBox } from '../types';

export class BoundingBoxCalculator {
  private marginPercentage: number;

  constructor(marginPercentage: number = 0.2) {
    this.marginPercentage = marginPercentage;
  }

  /**
   * Calculate bounding box from hand landmarks
   */
  calculateFromLandmarks(landmarks: Point3D[], confidence: number = 1.0): BoundingBox {
    if (landmarks.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, confidence: 0 };
    }

    const bounds = this.findMinMaxCoordinates(landmarks);
    return this.createBoundingBoxWithMargin(bounds, confidence);
  }

  /**
   * Calculate bounding box focused on specific finger landmarks
   */
  calculateForFinger(landmarks: Point3D[], fingerIndices: number[], confidence: number = 1.0): BoundingBox {
    if (landmarks.length === 0 || fingerIndices.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, confidence: 0 };
    }

    const fingerLandmarks = fingerIndices
      .filter(index => index < landmarks.length)
      .map(index => landmarks[index]);

    if (fingerLandmarks.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, confidence: 0 };
    }

    const bounds = this.findMinMaxCoordinates(fingerLandmarks);
    return this.createBoundingBoxWithMargin(bounds, confidence);
  }

  /**
   * Calculate bounding box for middle finger gesture specifically
   */
  calculateForMiddleFinger(landmarks: Point3D[], confidence: number = 1.0): BoundingBox {
    // Include middle finger landmarks and some surrounding area
    const middleFingerIndices = [9, 10, 11, 12]; // MCP to TIP
    const surroundingIndices = [5, 8, 13, 16]; // Adjacent finger tips for context
    
    const relevantIndices = [...middleFingerIndices, ...surroundingIndices];
    return this.calculateForFinger(landmarks, relevantIndices, confidence);
  }

  /**
   * Convert normalized bounding box to pixel coordinates
   */
  toPixelCoordinates(boundingBox: BoundingBox, imageWidth: number, imageHeight: number): BoundingBox {
    return {
      x: Math.round(boundingBox.x * imageWidth),
      y: Math.round(boundingBox.y * imageHeight),
      width: Math.round(boundingBox.width * imageWidth),
      height: Math.round(boundingBox.height * imageHeight),
      confidence: boundingBox.confidence
    };
  }

  /**
   * Convert pixel bounding box to normalized coordinates
   */
  toNormalizedCoordinates(boundingBox: BoundingBox, imageWidth: number, imageHeight: number): BoundingBox {
    if (imageWidth === 0 || imageHeight === 0) {
      return { x: 0, y: 0, width: 0, height: 0, confidence: boundingBox.confidence };
    }

    return {
      x: boundingBox.x / imageWidth,
      y: boundingBox.y / imageHeight,
      width: boundingBox.width / imageWidth,
      height: boundingBox.height / imageHeight,
      confidence: boundingBox.confidence
    };
  }

  /**
   * Ensure bounding box is within valid bounds [0, 1] for normalized coordinates
   */
  clampToValidBounds(boundingBox: BoundingBox): BoundingBox {
    const x = Math.max(0, Math.min(1, boundingBox.x));
    const y = Math.max(0, Math.min(1, boundingBox.y));
    
    // Adjust width and height to stay within bounds
    const maxWidth = 1 - x;
    const maxHeight = 1 - y;
    const width = Math.max(0, Math.min(maxWidth, boundingBox.width));
    const height = Math.max(0, Math.min(maxHeight, boundingBox.height));

    return {
      x,
      y,
      width,
      height,
      confidence: boundingBox.confidence
    };
  }

  /**
   * Expand bounding box by a specific pixel amount
   */
  expandByPixels(boundingBox: BoundingBox, pixels: number, imageWidth: number, imageHeight: number): BoundingBox {
    const normalizedMarginX = pixels / imageWidth;
    const normalizedMarginY = pixels / imageHeight;

    return {
      x: boundingBox.x - normalizedMarginX,
      y: boundingBox.y - normalizedMarginY,
      width: boundingBox.width + (2 * normalizedMarginX),
      height: boundingBox.height + (2 * normalizedMarginY),
      confidence: boundingBox.confidence
    };
  }

  /**
   * Calculate intersection of two bounding boxes
   */
  calculateIntersection(box1: BoundingBox, box2: BoundingBox): BoundingBox {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const width = Math.max(0, x2 - x1);
    const height = Math.max(0, y2 - y1);

    return {
      x: x1,
      y: y1,
      width,
      height,
      confidence: Math.min(box1.confidence, box2.confidence)
    };
  }

  /**
   * Calculate union of two bounding boxes
   */
  calculateUnion(box1: BoundingBox, box2: BoundingBox): BoundingBox {
    const x1 = Math.min(box1.x, box2.x);
    const y1 = Math.min(box1.y, box2.y);
    const x2 = Math.max(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.max(box1.y + box1.height, box2.y + box2.height);

    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      confidence: Math.max(box1.confidence, box2.confidence)
    };
  }

  /**
   * Check if a point is inside a bounding box
   */
  containsPoint(boundingBox: BoundingBox, point: Point3D): boolean {
    return point.x >= boundingBox.x &&
           point.x <= boundingBox.x + boundingBox.width &&
           point.y >= boundingBox.y &&
           point.y <= boundingBox.y + boundingBox.height;
  }

  /**
   * Calculate area of bounding box
   */
  calculateArea(boundingBox: BoundingBox): number {
    return boundingBox.width * boundingBox.height;
  }

  /**
   * Set margin percentage for bounding box expansion
   */
  setMarginPercentage(percentage: number): void {
    this.marginPercentage = Math.max(0, Math.min(1, percentage));
  }

  /**
   * Get current margin percentage
   */
  getMarginPercentage(): number {
    return this.marginPercentage;
  }

  /**
   * Find minimum and maximum coordinates from landmarks
   */
  private findMinMaxCoordinates(landmarks: Point3D[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = landmarks[0].x;
    let maxX = landmarks[0].x;
    let minY = landmarks[0].y;
    let maxY = landmarks[0].y;

    for (const landmark of landmarks) {
      minX = Math.min(minX, landmark.x);
      maxX = Math.max(maxX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxY = Math.max(maxY, landmark.y);
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Create bounding box with margin from min/max coordinates
   */
  private createBoundingBoxWithMargin(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    confidence: number
  ): BoundingBox {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    // For single point or very small areas, ensure minimum size
    const minSize = 0.01; // Minimum bounding box size
    const effectiveWidth = Math.max(width, minSize);
    const effectiveHeight = Math.max(height, minSize);

    // Add margin
    const marginX = effectiveWidth * this.marginPercentage;
    const marginY = effectiveHeight * this.marginPercentage;

    return {
      x: bounds.minX - marginX,
      y: bounds.minY - marginY,
      width: effectiveWidth + (2 * marginX),
      height: effectiveHeight + (2 * marginY),
      confidence
    };
  }
}