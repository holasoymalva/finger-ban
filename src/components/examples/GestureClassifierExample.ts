/**
 * Example usage of GestureClassifier with bounding box calculations
 */

import { GestureClassifier } from '../GestureClassifier';
import { HandLandmarks, Point3D } from '../../types';

export class GestureClassifierExample {
  private classifier: GestureClassifier;

  constructor() {
    // Initialize with 70% confidence threshold and 20% margin
    this.classifier = new GestureClassifier(0.7, 0.2);
  }

  /**
   * Example: Basic gesture classification
   */
  basicGestureDetection(): void {
    console.log('=== Basic Gesture Detection Example ===');

    // Create sample hand landmarks (middle finger extended)
    const landmarks = this.createSampleMiddleFingerLandmarks();
    
    // Classify the gesture
    const result = this.classifier.classifyGesture(landmarks);
    
    console.log('Gesture detected:', result.gesture);
    console.log('Confidence:', result.confidence.toFixed(3));
    console.log('Bounding box (normalized):', {
      x: result.boundingBox.x.toFixed(3),
      y: result.boundingBox.y.toFixed(3),
      width: result.boundingBox.width.toFixed(3),
      height: result.boundingBox.height.toFixed(3)
    });
  }

  /**
   * Example: Converting to pixel coordinates for different image sizes
   */
  pixelCoordinateConversion(): void {
    console.log('\n=== Pixel Coordinate Conversion Example ===');

    const landmarks = this.createSampleMiddleFingerLandmarks();
    const result = this.classifier.classifyGesture(landmarks);

    // Convert to different image sizes
    const imageSizes = [
      { width: 640, height: 480, name: 'VGA' },
      { width: 1280, height: 720, name: 'HD' },
      { width: 1920, height: 1080, name: 'Full HD' }
    ];

    imageSizes.forEach(size => {
      const pixelBox = this.classifier.convertToPixelCoordinates(
        result.boundingBox, 
        size.width, 
        size.height
      );

      console.log(`${size.name} (${size.width}x${size.height}):`, {
        x: Math.round(pixelBox.x),
        y: Math.round(pixelBox.y),
        width: Math.round(pixelBox.width),
        height: Math.round(pixelBox.height)
      });
    });
  }

  /**
   * Example: Advanced bounding box operations
   */
  advancedBoundingBoxOperations(): void {
    console.log('\n=== Advanced Bounding Box Operations Example ===');

    const landmarks = this.createSampleMiddleFingerLandmarks();
    const result = this.classifier.classifyGesture(landmarks);
    const calculator = this.classifier.getBoundingBoxCalculator();

    // Convert to pixel coordinates for a 1280x720 image
    const imageWidth = 1280;
    const imageHeight = 720;
    const pixelBox = calculator.toPixelCoordinates(result.boundingBox, imageWidth, imageHeight);

    console.log('Original bounding box (pixels):', {
      x: Math.round(pixelBox.x),
      y: Math.round(pixelBox.y),
      width: Math.round(pixelBox.width),
      height: Math.round(pixelBox.height)
    });

    // Expand by 10 pixels for extra coverage
    const expandedBox = calculator.expandByPixels(pixelBox, 10, imageWidth, imageHeight);
    const expandedPixelBox = calculator.toPixelCoordinates(expandedBox, imageWidth, imageHeight);

    console.log('Expanded by 10 pixels:', {
      x: Math.round(expandedPixelBox.x),
      y: Math.round(expandedPixelBox.y),
      width: Math.round(expandedPixelBox.width),
      height: Math.round(expandedPixelBox.height)
    });

    // Clamp to valid bounds
    const clampedBox = calculator.clampToValidBounds(expandedBox);
    console.log('Clamped to valid bounds (normalized):', {
      x: clampedBox.x.toFixed(3),
      y: clampedBox.y.toFixed(3),
      width: clampedBox.width.toFixed(3),
      height: clampedBox.height.toFixed(3)
    });

    // Calculate area
    const area = calculator.calculateArea(result.boundingBox);
    console.log('Bounding box area (normalized):', area.toFixed(6));
  }

  /**
   * Example: Adjusting detection parameters
   */
  parameterAdjustment(): void {
    console.log('\n=== Parameter Adjustment Example ===');

    const landmarks = this.createSampleMiddleFingerLandmarks();

    // Test with different thresholds
    const thresholds = [0.5, 0.7, 0.9];
    
    thresholds.forEach(threshold => {
      this.classifier.updateThreshold(threshold);
      const result = this.classifier.classifyGesture(landmarks);
      
      console.log(`Threshold ${threshold}: ${result.gesture} (confidence: ${result.confidence.toFixed(3)})`);
    });

    // Test with different margins
    console.log('\nTesting different margin percentages:');
    const margins = [0.1, 0.2, 0.3];
    
    margins.forEach(margin => {
      this.classifier.setMarginPercentage(margin);
      const result = this.classifier.classifyGesture(landmarks);
      
      console.log(`Margin ${margin}: Box size ${result.boundingBox.width.toFixed(3)} x ${result.boundingBox.height.toFixed(3)}`);
    });
  }

  /**
   * Example: Processing multiple hands
   */
  multipleHandsProcessing(): void {
    console.log('\n=== Multiple Hands Processing Example ===');

    const hands = [
      {
        name: 'Left Hand (middle finger)',
        landmarks: this.createSampleMiddleFingerLandmarks('Left')
      },
      {
        name: 'Right Hand (open)',
        landmarks: this.createSampleOpenHandLandmarks('Right')
      }
    ];

    hands.forEach(hand => {
      const result = this.classifier.classifyGesture(hand.landmarks);
      console.log(`${hand.name}: ${result.gesture} (confidence: ${result.confidence.toFixed(3)})`);
    });
  }

  /**
   * Run all examples
   */
  runAllExamples(): void {
    this.basicGestureDetection();
    this.pixelCoordinateConversion();
    this.advancedBoundingBoxOperations();
    this.parameterAdjustment();
    this.multipleHandsProcessing();
  }

  /**
   * Create sample landmarks for middle finger gesture
   */
  private createSampleMiddleFingerLandmarks(handedness: 'Left' | 'Right' = 'Right'): HandLandmarks {
    const landmarks: Point3D[] = [];
    
    // Wrist
    landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
    
    // Thumb (folded)
    landmarks[1] = { x: 0.48, y: 0.78, z: 0 };
    landmarks[2] = { x: 0.46, y: 0.76, z: 0 };
    landmarks[3] = { x: 0.44, y: 0.74, z: 0 };
    landmarks[4] = { x: 0.42, y: 0.72, z: 0 };
    
    // Index finger (folded)
    landmarks[5] = { x: 0.48, y: 0.75, z: 0 };
    landmarks[6] = { x: 0.47, y: 0.72, z: 0 };
    landmarks[7] = { x: 0.46, y: 0.74, z: 0 };
    landmarks[8] = { x: 0.45, y: 0.76, z: 0 };
    
    // Middle finger (extended)
    landmarks[9] = { x: 0.50, y: 0.75, z: 0 };
    landmarks[10] = { x: 0.50, y: 0.60, z: 0 };
    landmarks[11] = { x: 0.50, y: 0.45, z: 0 };
    landmarks[12] = { x: 0.50, y: 0.30, z: 0 };
    
    // Ring finger (folded)
    landmarks[13] = { x: 0.52, y: 0.75, z: 0 };
    landmarks[14] = { x: 0.53, y: 0.72, z: 0 };
    landmarks[15] = { x: 0.54, y: 0.74, z: 0 };
    landmarks[16] = { x: 0.55, y: 0.76, z: 0 };
    
    // Pinky (folded)
    landmarks[17] = { x: 0.55, y: 0.75, z: 0 };
    landmarks[18] = { x: 0.57, y: 0.72, z: 0 };
    landmarks[19] = { x: 0.58, y: 0.74, z: 0 };
    landmarks[20] = { x: 0.60, y: 0.76, z: 0 };

    return {
      landmarks,
      handedness,
      confidence: 0.9
    };
  }

  /**
   * Create sample landmarks for open hand
   */
  private createSampleOpenHandLandmarks(handedness: 'Left' | 'Right' = 'Right'): HandLandmarks {
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
      handedness,
      confidence: 0.9
    };
  }
}

// Example usage
if (typeof window === 'undefined') {
  // Node.js environment (for testing)
  const example = new GestureClassifierExample();
  example.runAllExamples();
}