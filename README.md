# Finger Ban - Real-time Middle Finger Detection

A computer vision project that detects and censors inappropriate middle finger gestures in real-time using webcam input.

## Features

- **Real-time Detection**: Uses MediaPipe for accurate hand landmark detection
- **Gesture Recognition**: Specifically identifies middle finger gestures
- **Auto-Censoring**: Automatically blurs detected inappropriate gestures
- **Live Counter**: Tracks number of detections during session
- **User-Friendly Interface**: Simple controls and visual feedback

## Requirements

- Python 3.7 or higher
- Webcam/camera device
- Operating system: Windows, macOS, or Linux

## Installation

1. Clone the repository:
```bash
git clone https://github.com/holasoymalva/finger-ban.git
cd finger-ban
```

2. Install required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

Run the application:
```bash
python main.py
```

### Controls

- **q**: Quit the application
- **r**: Reset detection counter

### How it Works

1. The application captures video from your default camera
2. MediaPipe processes each frame to detect hand landmarks
3. Custom algorithm analyzes finger positions to identify middle finger gestures
4. When detected, the hand region is automatically blurred
5. A warning message appears on screen
6. Detection counter keeps track of inappropriate gestures

## Technical Details

### Detection Algorithm

The middle finger detection works by analyzing hand landmarks:

- **Middle Finger Extended**: Middle finger tip is above the PIP joint
- **Other Fingers Folded**: Index, ring, and pinky fingers are bent down
- **Thumb Position**: Thumb is in a natural folded position

### Key Components

- `FingerBanDetector`: Main class handling detection logic
- `is_middle_finger_up()`: Core gesture recognition algorithm
- `blur_hand_region()`: Applies gaussian blur to inappropriate gestures
- `process_frame()`: Handles real-time video processing

## Dependencies

- **OpenCV (cv2)**: Video capture and image processing
- **MediaPipe**: Hand landmark detection and tracking
- **NumPy**: Numerical operations and array handling

## Troubleshooting

### Camera Issues
- Ensure your camera is not being used by another application
- Try changing the camera index in `cv2.VideoCapture(0)` to `1` or `2`

### Performance Issues
- Lower the detection confidence in MediaPipe initialization
- Reduce video resolution if needed

### Detection Accuracy
- Ensure good lighting conditions
- Keep hands clearly visible to the camera
- Avoid background clutter

## Privacy Notice

This application processes video locally on your device. No video data is transmitted or stored externally.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool is designed for educational and content moderation purposes. Use responsibly and in accordance with local laws and regulations.