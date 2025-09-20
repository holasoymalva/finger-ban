import cv2
import mediapipe as mp
import numpy as np
import math
import sys

class FingerBanDetector:
    def __init__(self):
        """Initialize the MediaPipe hands detector and drawing utilities."""
        try:
            self.mp_hands = mp.solutions.hands
            self.hands = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.5
            )
            self.mp_drawing = mp.solutions.drawing_utils
            self.mp_drawing_styles = mp.solutions.drawing_styles
            print("✓ MediaPipe initialized successfully")
        except Exception as e:
            print(f"Error initializing MediaPipe: {e}")
            raise
        
    def is_middle_finger_up(self, landmarks):
        """
        Detect if middle finger is extended while other fingers are down.
        Returns True if middle finger gesture is detected.
        """
        try:
            # Get landmark positions
            thumb_tip = landmarks[4]
            thumb_ip = landmarks[3]
            
            index_tip = landmarks[8]
            index_pip = landmarks[6]
            
            middle_tip = landmarks[12]
            middle_pip = landmarks[10]
            
            ring_tip = landmarks[16]
            ring_pip = landmarks[14]
            
            pinky_tip = landmarks[20]
            pinky_pip = landmarks[18]
            
            # Check if middle finger is extended (tip above pip joint)
            middle_extended = middle_tip.y < middle_pip.y
            
            # Check if other fingers are folded (tip below pip joint)
            index_folded = index_tip.y > index_pip.y
            ring_folded = ring_tip.y > ring_pip.y
            pinky_folded = pinky_tip.y > pinky_pip.y
            
            # Thumb check is more complex due to its orientation
            # For a more robust detection, we check relative position
            thumb_folded = abs(thumb_tip.x - thumb_ip.x) < 0.05
            
            # Middle finger gesture: middle finger up, others down
            return middle_extended and index_folded and ring_folded and pinky_folded
        except Exception as e:
            print(f"Error in gesture detection: {e}")
            return False
    
    def blur_hand_region(self, image, landmarks, blur_intensity=51):
        """Apply blur effect to the detected hand region."""
        try:
            h, w, _ = image.shape
            
            # Get hand bounding box
            x_coords = [int(landmark.x * w) for landmark in landmarks]
            y_coords = [int(landmark.y * h) for landmark in landmarks]
            
            x_min, x_max = max(0, min(x_coords) - 50), min(w, max(x_coords) + 50)
            y_min, y_max = max(0, min(y_coords) - 50), min(h, max(y_coords) + 50)
            
            # Extract hand region
            hand_region = image[y_min:y_max, x_min:x_max]
            
            if hand_region.size > 0:
                # Apply blur
                blurred_region = cv2.GaussianBlur(hand_region, (blur_intensity, blur_intensity), 0)
                
                # Replace original region with blurred version
                image[y_min:y_max, x_min:x_max] = blurred_region
            
            return image
        except Exception as e:
            print(f"Error applying blur: {e}")
            return image
    
    def process_frame(self, frame):
        """Process a single frame for middle finger detection."""
        try:
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb_frame)
            
            middle_finger_detected = False
            
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    # Check for middle finger gesture
                    if self.is_middle_finger_up(hand_landmarks.landmark):
                        middle_finger_detected = True
                        # Blur the hand region
                        frame = self.blur_hand_region(frame, hand_landmarks.landmark)
                        
                        # Draw warning text
                        cv2.putText(frame, "INAPPROPRIATE GESTURE DETECTED!", 
                                  (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    else:
                        # Draw hand landmarks for normal gestures
                        self.mp_drawing.draw_landmarks(
                            frame, 
                            hand_landmarks, 
                            self.mp_hands.HAND_CONNECTIONS,
                            self.mp_drawing_styles.get_default_hand_landmarks_style(),
                            self.mp_drawing_styles.get_default_hand_connections_style()
                        )
            
            return frame, middle_finger_detected
        except Exception as e:
            print(f"Error processing frame: {e}")
            return frame, False

def main():
    """Main function to run the finger ban detector."""
    print("Starting Finger Ban Detector...")
    
    # Check for dependencies
    try:
        import cv2
        import mediapipe as mp
        import numpy as np
        print("✓ All dependencies available")
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        sys.exit(1)
    
    print("Press 'q' to quit, 'r' to reset detection counter")
    
    # Initialize detector
    try:
        detector = FingerBanDetector()
    except Exception as e:
        print(f"Failed to initialize detector: {e}")
        sys.exit(1)
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam")
        print("Please ensure your camera is connected and not being used by another application")
        sys.exit(1)
    
    detection_count = 0
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame")
                break
            
            # Flip frame horizontally for mirror effect
            frame = cv2.flip(frame, 1)
            
            # Process frame
            processed_frame, detected = detector.process_frame(frame)
            
            if detected:
                detection_count += 1
            
            # Add detection counter
            cv2.putText(processed_frame, f"Detections: {detection_count}", 
                       (processed_frame.shape[1] - 200, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Add instructions
            cv2.putText(processed_frame, "Press 'q' to quit, 'r' to reset", 
                       (10, processed_frame.shape[0] - 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Display frame
            cv2.imshow('Finger Ban Detector', processed_frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                detection_count = 0
                print("Detection counter reset")
    
    except KeyboardInterrupt:
        print("\nApplication interrupted by user")
    except Exception as e:
        print(f"Error during execution: {e}")
    finally:
        # Cleanup
        cap.release()
        cv2.destroyAllWindows()
        print("Finger Ban Detector stopped")

if __name__ == "__main__":
    main()