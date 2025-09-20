// MediaPipe configuration for web deployment
window.MediaPipeConfig = {
  locateFile: (file) => {
    // Use CDN for MediaPipe files
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
};