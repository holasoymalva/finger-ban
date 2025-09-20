# Installation Guide

## Prerequisites

- Python 3.7 or higher
- Webcam/camera device
- Operating system: Windows, macOS, or Linux

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/holasoymalva/finger-ban.git
   cd finger-ban
   ```

2. **Check system compatibility**:
   ```bash
   python setup_check.py
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python main.py
   ```

## Detailed Installation

### Using pip

```bash
# Install all dependencies at once
pip install -r requirements.txt

# Or install individually
pip install opencv-python>=4.8.0
pip install mediapipe>=0.10.13
pip install numpy>=1.21.0
```

### Using conda

```bash
conda create -n finger-ban python=3.9
conda activate finger-ban
pip install -r requirements.txt
```

### Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv finger-ban-env

# Activate virtual environment
# On Windows:
finger-ban-env\Scripts\activate
# On macOS/Linux:
source finger-ban-env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Troubleshooting

### Common Installation Issues

1. **Permission errors**:
   ```bash
   pip install --user -r requirements.txt
   ```

2. **Network timeouts**:
   ```bash
   pip install --timeout 60 opencv-python mediapipe numpy
   ```

3. **Platform-specific issues**:
   - **macOS**: May need to install Xcode command line tools
   - **Linux**: May need to install additional system packages:
     ```bash
     sudo apt-get update
     sudo apt-get install python3-opencv python3-pip
     ```

### Camera Issues

1. **Camera not detected**:
   - Ensure camera is not used by another application
   - Try different camera indices (0, 1, 2) in main.py
   - Check camera permissions in system settings

2. **Performance issues**:
   - Close other applications using the camera
   - Reduce detection confidence in MediaPipe settings
   - Ensure good lighting conditions

### Dependency Conflicts

If you encounter dependency conflicts:

```bash
# Create a fresh environment
python -m venv fresh-env
source fresh-env/bin/activate  # or fresh-env\Scripts\activate on Windows
pip install --upgrade pip
pip install -r requirements.txt
```

## Testing Installation

Run the setup check script to verify everything is working:

```bash
python setup_check.py
```

This will:
- Check if all dependencies are installed
- Run a demo of the detection algorithm
- Provide guidance if issues are found

## Development Setup

For contributors:

```bash
# Clone repository
git clone https://github.com/holasoymalva/finger-ban.git
cd finger-ban

# Create development environment
python -m venv dev-env
source dev-env/bin/activate  # or dev-env\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run tests
python setup_check.py
```