/**
 * Main entry point for Finger Ban application
 */

import { runFrameProcessorExample } from './components/examples/FrameProcessorExample';

console.log('Finger Ban - Real-time Gesture Censorship System');
console.log('Project structure initialized successfully');

// Export components for use
export { FrameProcessor } from './components/FrameProcessor';
export { PerformanceMonitor } from './components/PerformanceMonitor';
export { CameraManager } from './components/CameraManager';
export * from './types';

// Make example available globally for testing
(window as any).runFrameProcessorExample = runFrameProcessorExample;