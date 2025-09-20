/**
 * Example usage of Camera Manager component
 * This demonstrates how to integrate the Camera Manager with user feedback
 */

import { CameraManager, CameraErrorInfo } from '../CameraManager';

export class CameraManagerExample {
  private cameraManager: CameraManager;
  private statusElement: HTMLElement;
  private videoContainer: HTMLElement;

  constructor(statusElementId: string, videoContainerId: string) {
    this.cameraManager = new CameraManager();
    this.statusElement = document.getElementById(statusElementId)!;
    this.videoContainer = document.getElementById(videoContainerId)!;
  }

  /**
   * Initialize camera with user feedback
   */
  async initializeCamera(): Promise<void> {
    try {
      this.updateStatus('Checking camera permissions...', 'info');

      // Check permission first
      const permission = await this.cameraManager.checkPermission();
      
      if (permission === 'denied') {
        this.updateStatus('Camera access denied. Please enable camera permissions in your browser settings.', 'error');
        return;
      }

      this.updateStatus('Requesting camera access...', 'info');

      // Initialize camera
      const stream = await this.cameraManager.initialize();
      
      // Add video element to container
      const videoElement = this.cameraManager.getVideoElement();
      videoElement.style.width = '100%';
      videoElement.style.height = 'auto';
      videoElement.style.borderRadius = '8px';
      
      this.videoContainer.appendChild(videoElement);

      // Get stream settings for user feedback
      const settings = this.cameraManager.getStreamSettings();
      const resolution = settings ? `${settings.width}x${settings.height}` : 'Unknown';
      
      this.updateStatus(`Camera active (${resolution})`, 'success');

    } catch (error) {
      this.handleCameraError(error as CameraErrorInfo);
    }
  }

  /**
   * Stop camera and cleanup
   */
  stopCamera(): void {
    this.cameraManager.stop();
    
    // Clear video container
    this.videoContainer.innerHTML = '';
    
    this.updateStatus('Camera stopped', 'info');
  }

  /**
   * Check if camera is currently active
   */
  isCameraActive(): boolean {
    return this.cameraManager.isActive();
  }

  /**
   * Handle camera errors with user-friendly messages
   */
  private handleCameraError(error: CameraErrorInfo): void {
    this.updateStatus(error.userMessage, 'error');

    // Show retry button for retryable errors
    if (error.canRetry) {
      this.showRetryButton();
    }

    // Log technical details for debugging
    console.error('Camera Error:', {
      type: error.type,
      message: error.message,
      userMessage: error.userMessage,
      canRetry: error.canRetry
    });
  }

  /**
   * Update status display
   */
  private updateStatus(message: string, type: 'info' | 'success' | 'error'): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status status-${type}`;
  }

  /**
   * Show retry button for recoverable errors
   */
  private showRetryButton(): void {
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.className = 'retry-button';
    retryButton.onclick = () => {
      retryButton.remove();
      this.initializeCamera();
    };
    
    this.statusElement.appendChild(retryButton);
  }
}

// Usage example:
/*
// HTML:
// <div id="camera-status"></div>
// <div id="video-container"></div>
// <button id="start-camera">Start Camera</button>
// <button id="stop-camera">Stop Camera</button>

const cameraExample = new CameraManagerExample('camera-status', 'video-container');

document.getElementById('start-camera')?.addEventListener('click', () => {
  cameraExample.initializeCamera();
});

document.getElementById('stop-camera')?.addEventListener('click', () => {
  cameraExample.stopCamera();
});
*/