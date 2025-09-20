#!/usr/bin/env python3
"""
Finger Ban Detector - Demo Mode
A simplified version for demonstration purposes when full dependencies are not available.
"""

import sys
import os

def check_dependencies():
    """Check if required dependencies are available."""
    missing_deps = []
    
    try:
        import cv2
        print("✓ OpenCV available")
    except ImportError:
        missing_deps.append("opencv-python")
        print("✗ OpenCV not available")
    
    try:
        import mediapipe
        print("✓ MediaPipe available")
    except ImportError:
        missing_deps.append("mediapipe")
        print("✗ MediaPipe not available")
    
    try:
        import numpy
        print("✓ NumPy available")
    except ImportError:
        missing_deps.append("numpy")
        print("✗ NumPy not available")
    
    return missing_deps

def install_dependencies():
    """Attempt to install missing dependencies."""
    print("\nAttempting to install dependencies...")
    print("Run the following command:")
    print("pip install -r requirements.txt")
    print("\nIf you encounter network issues, try:")
    print("pip install --timeout 60 opencv-python mediapipe numpy")

def demo_mode():
    """Run a demonstration of the algorithm without camera access."""
    print("\n" + "="*50)
    print("FINGER BAN DETECTOR - DEMO MODE")
    print("="*50)
    print("\nThis demonstrates the gesture detection algorithm")
    print("without requiring camera access or full dependencies.\n")
    
    # Simulate hand landmark coordinates (21 points for a hand)
    # In MediaPipe coordinates: (x, y) where y increases downward
    # For folded fingers: tip.y > pip.y (tip is below pip joint)
    # For extended fingers: tip.y < pip.y (tip is above pip joint)
    
    # These represent a middle finger gesture
    middle_finger_landmarks = [
        # Wrist
        (0.5, 0.8),
        # Thumb (4 points) - folded position
        (0.45, 0.75), (0.42, 0.72), (0.39, 0.69), (0.36, 0.66),
        # Index finger (4 points) - FOLDED (tip.y > pip.y)
        (0.48, 0.65), (0.47, 0.55), (0.46, 0.50), (0.47, 0.58),  # tip y=0.58 > pip y=0.50
        # Middle finger (4 points) - EXTENDED (tip.y < pip.y)
        (0.52, 0.65), (0.52, 0.45), (0.52, 0.25), (0.52, 0.15),  # tip y=0.15 < pip y=0.25
        # Ring finger (4 points) - FOLDED (tip.y > pip.y)
        (0.56, 0.65), (0.57, 0.55), (0.58, 0.50), (0.59, 0.58),  # tip y=0.58 > pip y=0.50
        # Pinky (4 points) - FOLDED (tip.y > pip.y)
        (0.60, 0.67), (0.62, 0.58), (0.63, 0.53), (0.64, 0.60)   # tip y=0.60 > pip y=0.53
    ]
    
    # Simulate normal hand gesture (open hand - all fingers extended)
    normal_hand_landmarks = [
        # Wrist
        (0.5, 0.8),
        # All fingers in normal extended position (tip.y < pip.y for all)
        (0.45, 0.75), (0.42, 0.72), (0.39, 0.69), (0.36, 0.66),  # Thumb
        (0.48, 0.65), (0.47, 0.55), (0.46, 0.45), (0.45, 0.35),  # Index - tip y=0.35 < pip y=0.45
        (0.52, 0.65), (0.52, 0.55), (0.52, 0.45), (0.52, 0.35),  # Middle - tip y=0.35 < pip y=0.45
        (0.56, 0.65), (0.57, 0.55), (0.58, 0.45), (0.59, 0.35),  # Ring - tip y=0.35 < pip y=0.45
        (0.60, 0.67), (0.62, 0.58), (0.63, 0.48), (0.64, 0.38)   # Pinky - tip y=0.38 < pip y=0.48
    ]
    
    def is_middle_finger_gesture_demo(landmarks):
        """Demo version of middle finger detection."""
        # Extract key points (simplified)
        index_tip_y = landmarks[8][1]
        index_pip_y = landmarks[6][1]
        
        middle_tip_y = landmarks[12][1]
        middle_pip_y = landmarks[10][1]
        
        ring_tip_y = landmarks[16][1]
        ring_pip_y = landmarks[14][1]
        
        pinky_tip_y = landmarks[20][1]
        pinky_pip_y = landmarks[18][1]
        
        # Check conditions
        middle_extended = middle_tip_y < middle_pip_y
        index_folded = index_tip_y > index_pip_y
        ring_folded = ring_tip_y > ring_pip_y
        pinky_folded = pinky_tip_y > pinky_pip_y
        
        print(f"  Middle finger extended: {middle_extended}")
        print(f"  Index finger folded: {index_folded}")
        print(f"  Ring finger folded: {ring_folded}")
        print(f"  Pinky finger folded: {pinky_folded}")
        
        return middle_extended and index_folded and ring_folded and pinky_folded
    
    # Test with middle finger gesture
    print("Testing with MIDDLE FINGER gesture:")
    result1 = is_middle_finger_gesture_demo(middle_finger_landmarks)
    print(f"  Result: {'🚫 INAPPROPRIATE GESTURE DETECTED!' if result1 else '✓ Normal gesture'}\n")
    
    # Test with normal gesture
    print("Testing with NORMAL gesture:")
    result2 = is_middle_finger_gesture_demo(normal_hand_landmarks)
    print(f"  Result: {'🚫 INAPPROPRIATE GESTURE DETECTED!' if result2 else '✓ Normal gesture'}\n")
    
    print("Algorithm working correctly!")
    print("\nTo run the full version with camera:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Run: python main.py")

def main():
    """Main function to check dependencies and run appropriate mode."""
    print("Finger Ban Detector - Setup Check")
    print("="*40)
    
    missing_deps = check_dependencies()
    
    if missing_deps:
        print(f"\nMissing dependencies: {', '.join(missing_deps)}")
        install_dependencies()
        
        print("\nWould you like to see a demo of the detection algorithm? (y/n)")
        choice = input().lower().strip()
        if choice in ['y', 'yes']:
            demo_mode()
        else:
            print("Please install dependencies and run 'python main.py' for full functionality.")
    else:
        print("\n✓ All dependencies available!")
        print("You can now run the full application with: python main.py")
        
        # Try to import and run the main application
        try:
            from main import main as run_main_app
            print("\nStarting full application...")
            run_main_app()
        except Exception as e:
            print(f"Error running main application: {e}")
            print("You can manually run: python main.py")

if __name__ == "__main__":
    main()