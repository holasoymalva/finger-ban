/**
 * Camera Manager Component
 * Handles camera access, stream management, and user permission flow
 */

import { CameraManager as ICameraManager } from '../types/interfaces';

export enum CameraError {
  NOT_ALLOWED = 'NotAllowedError',
  NOT_FOUND = 'NotFoundError',
  NOT_READABLE = 'NotReadableError',
  OVERCONSTRAINED = 'OverconstrainedError',
  ABORT = 'AbortError',
  UNKNOWN = 'UnknownError'
}

export interface CameraErrorInfo {
  type: CameraError;
  message: string;
  userMessage: string;
  canRetry: boolean;
}

export class CameraManager implements ICameraManager {
  private videoElement: HTMLVideoElement;
  private mediaStream: MediaStream | null = null;
  private isInitialized = false;

  constructor() {
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
  }

  /**
   * Initialize camera access and start video stream
   */
  async initialize(): Promise<MediaStream> {
    if (this.isInitialized && this.mediaStream) {
      return this.mediaStream;
    }

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Request camera access with optimal constraints
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        },
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up video element
      this.videoElement.srcObject = this.mediaStream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          this.videoElement.removeEventListener('error', onError);
          resolve();
        };

        const onError = (_event: Event) => {
          this.videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          this.videoElement.removeEventListener('error', onError);
          reject(new Error('Failed to load video stream'));
        };

        this.videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        this.videoElement.addEventListener('error', onError);
      });

      this.isInitialized = true;
      return this.mediaStream;

    } catch (error) {
      // Clean up on error
      this.cleanup();
      throw this.createCameraError(error);
    }
  }

  /**
   * Get the video element for rendering
   */
  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  /**
   * Stop camera stream and cleanup resources
   */
  stop(): void {
    this.cleanup();
  }

  /**
   * Check if camera is currently active
   */
  isActive(): boolean {
    return this.isInitialized && 
           this.mediaStream !== null && 
           this.mediaStream.active &&
           !this.videoElement.paused;
  }

  /**
   * Get current video stream settings
   */
  getStreamSettings(): MediaTrackSettings | null {
    if (!this.mediaStream) return null;
    
    const videoTrack = this.mediaStream.getVideoTracks()[0];
    return videoTrack ? videoTrack.getSettings() : null;
  }

  /**
   * Request permission explicitly (useful for UI flows)
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Try to get permission without actually starting the stream
      const tempStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Immediately stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if camera permission is already granted
   */
  async checkPermission(): Promise<PermissionState> {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return permission.state;
      }
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.videoElement.srcObject) {
      this.videoElement.srcObject = null;
    }

    this.isInitialized = false;
  }

  /**
   * Create user-friendly error information from camera errors
   */
  private createCameraError(error: any): CameraErrorInfo {
    const errorName = error.name || error.constructor.name || 'UnknownError';
    
    switch (errorName) {
      case 'NotAllowedError':
        return {
          type: CameraError.NOT_ALLOWED,
          message: error.message,
          userMessage: 'Camera access was denied. Please allow camera access and try again.',
          canRetry: true
        };
      
      case 'NotFoundError':
        return {
          type: CameraError.NOT_FOUND,
          message: error.message,
          userMessage: 'No camera found. Please connect a camera and try again.',
          canRetry: true
        };
      
      case 'NotReadableError':
        return {
          type: CameraError.NOT_READABLE,
          message: error.message,
          userMessage: 'Camera is already in use by another application. Please close other applications and try again.',
          canRetry: true
        };
      
      case 'OverconstrainedError':
        return {
          type: CameraError.OVERCONSTRAINED,
          message: error.message,
          userMessage: 'Camera does not support the required settings. Please try with a different camera.',
          canRetry: false
        };
      
      case 'AbortError':
        return {
          type: CameraError.ABORT,
          message: error.message,
          userMessage: 'Camera access was interrupted. Please try again.',
          canRetry: true
        };
      
      default:
        return {
          type: CameraError.UNKNOWN,
          message: error.message || 'Unknown camera error',
          userMessage: 'An unexpected error occurred while accessing the camera. Please try again.',
          canRetry: true
        };
    }
  }
}