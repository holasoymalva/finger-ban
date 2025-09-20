/**
 * Gesture Classifier for detecting middle finger gestures
 */

import { GestureClassifier as IGestureClassifier, HandLandmarks, GestureResult, BoundingBox, Point3D } from '../types';
import { BoundingBoxCalculator } from '../utils/BoundingBoxCalculator';

export class GestureClassifier implements IGestureClassifier {
  private detectionThreshold: number = 0.7;
  private boundingBoxCalculator: BoundingBoxCalculator;

  constructor(threshold: number = 0.7, marginPercentage: number = 0.2) {
    this.detectionThreshold = threshold;
    this.boundingBoxCalculator = new BoundingBoxCalculator(marginPercentage);
  }

  /**
   * Classify gesture from hand landmarks
   */
  classifyGesture(landmarks: HandLandmarks): GestureResult {
    const confidence = this.detectMiddleFingerGesture(landmarks.landmarks);
    const gesture = confidence >= this.detectionThreshold ? 'middle_finger' : 'none';
    
    // Use specialized bounding box calculation for middle finger gestures
    const boundingBox = gesture === 'middle_finger' 
      ? this.boundingBoxCalculator.calculateForMiddleFinger(landmarks.landmarks, confidence)
      : this.boundingBoxCalculator.calculateFromLandmarks(landmarks.landmarks, confidence);

    return {
      gesture,
      confidence,
      boundingBox
    };
  }

  /**
   * Update the detection threshold
   */
  updateThreshold(threshold: number): void {
    this.detectionThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Detect middle finger gesture based on finger positions and angles
   */
  private detectMiddleFingerGesture(landmarks: Point3D[]): number {
    if (landmarks.length < 21) {
      return 0; // Invalid landmark count
    }

    // MediaPipe hand landmark indices
    const WRIST = 0;
    const INDEX_TIP = 8;
    const MIDDLE_TIP = 12;
    const RING_TIP = 16;
    const PINKY_TIP = 20;
    
    const INDEX_MCP = 5;
    const MIDDLE_MCP = 9;
    const RING_MCP = 13;
    const PINKY_MCP = 17;

    try {
      // Calculate finger extensions
      const indexExtended = this.isFingerExtended(landmarks, INDEX_MCP, INDEX_TIP, WRIST);
      const middleExtended = this.isFingerExtended(landmarks, MIDDLE_MCP, MIDDLE_TIP, WRIST);
      const ringExtended = this.isFingerExtended(landmarks, RING_MCP, RING_TIP, WRIST);
      const pinkyExtended = this.isFingerExtended(landmarks, PINKY_MCP, PINKY_TIP, WRIST);

      // Middle finger gesture: only middle finger extended
      if (middleExtended && !indexExtended && !ringExtended && !pinkyExtended) {
        // Calculate additional confidence factors
        const angleConfidence = this.calculateMiddleFingerAngleConfidence(landmarks);
        const positionConfidence = this.calculateMiddleFingerPositionConfidence(landmarks);
        
        // Combine confidence scores
        const baseConfidence = 0.8;
        const finalConfidence = baseConfidence * angleConfidence * positionConfidence;
        
        return Math.min(1, finalConfidence);
      }

      return 0;
    } catch (error) {
      console.warn('Error in gesture detection:', error);
      return 0;
    }
  }

  /**
   * Check if a finger is extended based on landmark positions
   */
  private isFingerExtended(landmarks: Point3D[], mcpIndex: number, tipIndex: number, wristIndex: number): boolean {
    const mcp = landmarks[mcpIndex];
    const tip = landmarks[tipIndex];
    const wrist = landmarks[wristIndex];

    // For thumb, use different logic due to different orientation
    if (mcpIndex === 2) { // Thumb MCP
      return this.isThumbExtended(landmarks);
    }

    // Calculate distances
    const wristToMcp = this.calculateDistance(wrist, mcp);
    const wristToTip = this.calculateDistance(wrist, tip);
    
    // A finger is extended if tip is farther from wrist than MCP
    const extensionRatio = wristToTip / (wristToMcp + 0.001);
    
    // Also check if the finger is pointing away from palm (y-direction for most fingers)
    const fingerDirection = tip.y - mcp.y;
    const isPointingUp = fingerDirection < -0.05; // Negative y means pointing up
    
    return extensionRatio > 1.2 && isPointingUp;
  }

  /**
   * Special logic for thumb extension detection
   */
  private isThumbExtended(landmarks: Point3D[]): boolean {
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const wrist = landmarks[0];
    
    // Thumb extends sideways, not upward
    const wristToMcp = this.calculateDistance(wrist, thumbMcp);
    const wristToTip = this.calculateDistance(wrist, thumbTip);
    
    const extensionRatio = wristToTip / (wristToMcp + 0.001);
    
    // Thumb should be extended sideways from the hand
    const thumbDirection = Math.abs(thumbTip.x - thumbMcp.x);
    const isSideways = thumbDirection > 0.03;
    
    return extensionRatio > 1.1 && isSideways;
  }

  /**
   * Calculate confidence based on middle finger angle relative to hand
   */
  private calculateMiddleFingerAngleConfidence(landmarks: Point3D[]): number {
    const WRIST = 0;
    const MIDDLE_MCP = 9;
    const MIDDLE_TIP = 12;

    const wrist = landmarks[WRIST];
    const middleMcp = landmarks[MIDDLE_MCP];
    const middleTip = landmarks[MIDDLE_TIP];

    // Calculate angle of middle finger relative to hand orientation
    const handVector = {
      x: middleMcp.x - wrist.x,
      y: middleMcp.y - wrist.y
    };

    const fingerVector = {
      x: middleTip.x - middleMcp.x,
      y: middleTip.y - middleMcp.y
    };

    // Calculate angle between hand and finger vectors
    const dotProduct = handVector.x * fingerVector.x + handVector.y * fingerVector.y;
    const handMagnitude = Math.sqrt(handVector.x ** 2 + handVector.y ** 2);
    const fingerMagnitude = Math.sqrt(fingerVector.x ** 2 + fingerVector.y ** 2);

    if (handMagnitude === 0 || fingerMagnitude === 0) {
      return 0.5; // Default confidence if vectors are invalid
    }

    const cosAngle = dotProduct / (handMagnitude * fingerMagnitude);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // Clamp to valid range

    // Middle finger should be roughly aligned with hand direction (small angle)
    // Convert angle to confidence (0 degrees = 1.0 confidence, 90 degrees = 0.0 confidence)
    const angleConfidence = Math.max(0, 1 - (angle / (Math.PI / 2)));

    return angleConfidence;
  }

  /**
   * Calculate confidence based on middle finger position relative to other fingers
   */
  private calculateMiddleFingerPositionConfidence(landmarks: Point3D[]): number {
    const INDEX_TIP = 8;
    const MIDDLE_TIP = 12;
    const RING_TIP = 16;

    const indexTip = landmarks[INDEX_TIP];
    const middleTip = landmarks[MIDDLE_TIP];
    const ringTip = landmarks[RING_TIP];

    // Middle finger should be higher (lower y value) than adjacent fingers when extended
    const middleHigherThanIndex = middleTip.y < indexTip.y;
    const middleHigherThanRing = middleTip.y < ringTip.y;

    // Calculate relative position confidence
    let positionConfidence = 0.5; // Base confidence

    if (middleHigherThanIndex) positionConfidence += 0.25;
    if (middleHigherThanRing) positionConfidence += 0.25;

    return Math.min(1, positionConfidence);
  }

  /**
   * Calculate Euclidean distance between two 3D points
   */
  private calculateDistance(point1: Point3D, point2: Point3D): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get the bounding box calculator instance
   */
  getBoundingBoxCalculator(): BoundingBoxCalculator {
    return this.boundingBoxCalculator;
  }

  /**
   * Convert normalized coordinates to pixel coordinates
   */
  convertToPixelCoordinates(boundingBox: BoundingBox, imageWidth: number, imageHeight: number): BoundingBox {
    return this.boundingBoxCalculator.toPixelCoordinates(boundingBox, imageWidth, imageHeight);
  }

  /**
   * Set margin percentage for bounding box calculation
   */
  setMarginPercentage(percentage: number): void {
    this.boundingBoxCalculator.setMarginPercentage(percentage);
  }
}