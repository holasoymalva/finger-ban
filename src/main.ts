/**
 * Main application entry point for Finger Ban demo
 */

import { GestureClassifier } from './components/GestureClassifier';
import { GestureClassifierExample } from './components/examples/GestureClassifierExample';
import { HandDetectionEngine } from './components/HandDetectionEngine';

class FingerBanDemo {
  private classifier: GestureClassifier;
  private handDetector: HandDetectionEngine;
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stream: MediaStream | null = null;
  private isDetecting = false;
  private animationId: number | null = null;
  private isHandDetectorInitialized = false;
  
  // Metrics
  private frameCount = 0;
  private lastFpsTime = 0;
  private gesturesDetected = 0;
  private handsDetected = 0;
  private processingTimes: number[] = [];

  constructor() {
    this.classifier = new GestureClassifier(0.7, 0.2);
    this.handDetector = new HandDetectionEngine();
    this.video = document.getElementById('video') as HTMLVideoElement;
    this.canvas = document.getElementById('overlay') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.initializeEventListeners();
    this.initializeHandDetector();
    this.updateStatus('Sistema inicializando...', 'info');
  }

  private async initializeHandDetector(): Promise<void> {
    try {
      this.updateStatus('Inicializando detector de manos...', 'info');
      await this.handDetector.initialize();
      this.isHandDetectorInitialized = true;
      this.updateStatus('Sistema listo - Haz clic en "Iniciar Cámara" para comenzar', 'success');
      this.logEvent('Detector de manos inicializado correctamente', 'info');
    } catch (error) {
      this.updateStatus('Error al inicializar detector: ' + (error as Error).message, 'error');
      this.logEvent('Error de inicialización: ' + (error as Error).message, 'error');
    }
  }

  private initializeEventListeners(): void {
    // Camera controls
    document.getElementById('start-camera')?.addEventListener('click', () => this.startCamera());
    document.getElementById('stop-camera')?.addEventListener('click', () => this.stopCamera());
    document.getElementById('start-detection')?.addEventListener('click', () => this.startDetection());
    document.getElementById('stop-detection')?.addEventListener('click', () => this.stopDetection());
    
    // Settings controls
    const confidenceSlider = document.getElementById('confidence-threshold') as HTMLInputElement;
    confidenceSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.classifier.updateThreshold(value);
      document.getElementById('confidence-value')!.textContent = value.toString();
      this.logEvent(`Umbral de confianza actualizado: ${value}`, 'info');
    });
    
    const marginSlider = document.getElementById('margin-percentage') as HTMLInputElement;
    marginSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.classifier.setMarginPercentage(value);
      document.getElementById('margin-value')!.textContent = `${Math.round(value * 100)}%`;
      this.logEvent(`Margen de censura actualizado: ${Math.round(value * 100)}%`, 'info');
    });
    
    // Demo buttons
    document.getElementById('test-classifier')?.addEventListener('click', () => this.testClassifier());
    document.getElementById('test-bounding-box')?.addEventListener('click', () => this.testBoundingBox());
  }

  private async startCamera(): Promise<void> {
    try {
      this.updateStatus('Solicitando acceso a la cámara...', 'info');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      this.video.srcObject = this.stream;
      
      this.video.onloadedmetadata = () => {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        this.updateStatus('Cámara iniciada correctamente', 'success');
        this.logEvent('Cámara iniciada - Resolución: ' + this.video.videoWidth + 'x' + this.video.videoHeight, 'info');
        
        // Update button states
        (document.getElementById('start-camera') as HTMLButtonElement).disabled = true;
        (document.getElementById('stop-camera') as HTMLButtonElement).disabled = false;
        (document.getElementById('start-detection') as HTMLButtonElement).disabled = false;
      };
      
    } catch (error) {
      this.updateStatus('Error al acceder a la cámara: ' + (error as Error).message, 'error');
      this.logEvent('Error de cámara: ' + (error as Error).message, 'error');
    }
  }

  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.video.srcObject = null;
    this.stopDetection();
    
    this.updateStatus('Cámara detenida', 'info');
    this.logEvent('Cámara detenida', 'info');
    
    // Update button states
    (document.getElementById('start-camera') as HTMLButtonElement).disabled = false;
    (document.getElementById('stop-camera') as HTMLButtonElement).disabled = true;
    (document.getElementById('start-detection') as HTMLButtonElement).disabled = true;
    (document.getElementById('stop-detection') as HTMLButtonElement).disabled = true;
  }

  public cleanup(): void {
    this.stopDetection();
    this.stopCamera();
    
    if (this.handDetector) {
      this.handDetector.dispose();
    }
  }

  private startDetection(): void {
    if (!this.stream) {
      this.updateStatus('Primero debes iniciar la cámara', 'error');
      return;
    }
    
    if (!this.isHandDetectorInitialized) {
      this.updateStatus('El detector de manos aún no está listo', 'error');
      return;
    }
    
    this.isDetecting = true;
    this.lastFpsTime = performance.now();
    this.frameCount = 0;
    
    this.processFrame();
    
    this.updateStatus('Detección de gestos activa', 'success');
    this.logEvent('Detección de gestos iniciada', 'info');
    
    // Update button states
    (document.getElementById('start-detection') as HTMLButtonElement).disabled = true;
    (document.getElementById('stop-detection') as HTMLButtonElement).disabled = false;
  }

  private stopDetection(): void {
    this.isDetecting = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.updateStatus('Detección de gestos detenida', 'info');
    this.logEvent('Detección de gestos detenida', 'info');
    
    // Update button states
    (document.getElementById('start-detection') as HTMLButtonElement).disabled = false;
    (document.getElementById('stop-detection') as HTMLButtonElement).disabled = true;
  }

  private async processFrame(): Promise<void> {
    if (!this.isDetecting) return;
    
    const startTime = performance.now();
    
    try {
      // Real hand detection and gesture classification
      await this.detectHandsAndGestures();
    } catch (error) {
      console.warn('Error in frame processing:', error);
      // Fall back to simulation if real detection fails
      this.simulateHandDetection();
    }
    
    const processingTime = performance.now() - startTime;
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 30) {
      this.processingTimes.shift();
    }
    
    // Update metrics
    this.updateMetrics();
    
    // Continue processing
    this.animationId = requestAnimationFrame(() => this.processFrame());
  }

  private async detectHandsAndGestures(): Promise<void> {
    // Clear previous drawings
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Get image data from video
    const imageData = this.getImageDataFromVideo();
    if (!imageData) return;
    
    try {
      // Detect hands using MediaPipe
      const hands = await this.handDetector.detectHands(imageData);
      
      if (hands.length > 0) {
        this.handsDetected += hands.length;
        
        // Process each detected hand
        for (const hand of hands) {
          const gestureResult = this.classifier.classifyGesture(hand);
          
          if (gestureResult.gesture === 'middle_finger') {
            this.gesturesDetected++;
            this.drawGestureDetection(gestureResult.boundingBox);
            this.logEvent(`¡Gesto ofensivo detectado! (Confianza: ${(gestureResult.confidence * 100).toFixed(1)}%)`, 'gesture');
          } else {
            this.drawHandDetection(gestureResult.boundingBox);
          }
        }
      }
    } catch (error) {
      // If MediaPipe fails, fall back to simulation
      console.warn('MediaPipe detection failed, using simulation:', error);
      this.simulateHandDetection();
    }
    
    this.frameCount++;
  }

  private getImageDataFromVideo(): ImageData | null {
    if (!this.video.videoWidth || !this.video.videoHeight) {
      return null;
    }
    
    // Create a temporary canvas to extract image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.video.videoWidth;
    tempCanvas.height = this.video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Draw video frame to canvas
    tempCtx.drawImage(this.video, 0, 0);
    
    // Get image data
    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  }

  private simulateHandDetection(): void {
    // More realistic simulation - only detect occasionally and with lower frequency
    const shouldDetectHand = Math.random() > 0.7; // 30% chance of detecting a hand
    
    if (shouldDetectHand) {
      this.handsDetected++;
      
      // Much lower chance of false positive gesture detection
      const shouldDetectGesture = Math.random() > 0.95; // Only 5% chance of detecting gesture
      
      if (shouldDetectGesture) {
        this.gesturesDetected++;
        this.drawSimulatedGestureDetection();
        this.logEvent('¡Gesto ofensivo detectado! (Simulación)', 'gesture');
      } else {
        this.drawSimulatedHandDetection();
      }
    }
    
    this.frameCount++;
  }

  private drawHandDetection(boundingBox: any): void {
    // Convert normalized coordinates to pixel coordinates
    const pixelBox = this.classifier.convertToPixelCoordinates(
      boundingBox, 
      this.canvas.width, 
      this.canvas.height
    );
    
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);
    
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '14px Arial';
    this.ctx.fillText('Mano detectada', pixelBox.x, pixelBox.y - 5);
  }

  private drawGestureDetection(boundingBox: any): void {
    // Convert normalized coordinates to pixel coordinates
    const pixelBox = this.classifier.convertToPixelCoordinates(
      boundingBox, 
      this.canvas.width, 
      this.canvas.height
    );
    
    // Draw censorship box
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    this.ctx.fillRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);
    
    // Draw pixelation effect
    const pixelationLevel = parseInt((document.getElementById('pixelation-level') as HTMLInputElement)?.value || '20');
    for (let px = pixelBox.x; px < pixelBox.x + pixelBox.width; px += pixelationLevel) {
      for (let py = pixelBox.y; py < pixelBox.y + pixelBox.height; py += pixelationLevel) {
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px, py, pixelationLevel, pixelationLevel);
      }
    }
    
    // Draw border
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(pixelBox.x, pixelBox.y, pixelBox.width, pixelBox.height);
    
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText('CENSURADO', pixelBox.x, pixelBox.y - 5);
  }

  // Fallback simulation functions
  private drawSimulatedHandDetection(): void {
    const x = Math.random() * (this.canvas.width - 200);
    const y = Math.random() * (this.canvas.height - 200);
    const width = 150 + Math.random() * 100;
    const height = 150 + Math.random() * 100;
    
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
    
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '14px Arial';
    this.ctx.fillText('Mano detectada (sim)', x, y - 5);
  }

  private drawSimulatedGestureDetection(): void {
    const x = Math.random() * (this.canvas.width - 200);
    const y = Math.random() * (this.canvas.height - 200);
    const width = 100 + Math.random() * 50;
    const height = 100 + Math.random() * 50;
    
    // Draw censorship box
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    this.ctx.fillRect(x, y, width, height);
    
    // Draw pixelation effect
    const pixelationLevel = parseInt((document.getElementById('pixelation-level') as HTMLInputElement)?.value || '20');
    for (let px = x; px < x + width; px += pixelationLevel) {
      for (let py = y; py < y + height; py += pixelationLevel) {
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px, py, pixelationLevel, pixelationLevel);
      }
    }
    
    // Draw border
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, width, height);
    
    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText('CENSURADO (sim)', x, y - 5);
  }

  private updateMetrics(): void {
    // Calculate FPS
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      document.getElementById('fps-value')!.textContent = fps.toString();
      
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    
    // Update processing time
    if (this.processingTimes.length > 0) {
      const avgTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      document.getElementById('processing-time')!.textContent = Math.round(avgTime).toString();
    }
    
    // Update counters
    document.getElementById('gestures-detected')!.textContent = this.gesturesDetected.toString();
    document.getElementById('hands-detected')!.textContent = this.handsDetected.toString();
  }

  private testClassifier(): void {
    const resultsDiv = document.getElementById('classifier-results')!;
    resultsDiv.innerHTML = '<div class="log-entry info">Ejecutando pruebas del clasificador...</div>';
    
    try {
      const example = new GestureClassifierExample();
      
      // Capture console output
      const originalLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(args.join(' '));
      };
      
      example.runAllExamples();
      
      // Restore console.log
      console.log = originalLog;
      
      // Display results
      resultsDiv.innerHTML = logs.map(log => 
        `<div class="log-entry info">${log}</div>`
      ).join('');
      
      this.logEvent('Pruebas del clasificador completadas', 'info');
      
    } catch (error) {
      resultsDiv.innerHTML = `<div class="log-entry" style="color: red;">Error: ${(error as Error).message}</div>`;
      this.logEvent('Error en las pruebas: ' + (error as Error).message, 'error');
    }
  }

  private testBoundingBox(): void {
    const resultsDiv = document.getElementById('classifier-results')!;
    resultsDiv.innerHTML = '<div class="log-entry info">Probando cálculos de bounding box...</div>';
    
    try {
      const calculator = this.classifier.getBoundingBoxCalculator();
      
      // Test with sample landmarks
      const landmarks = [
        { x: 0.3, y: 0.3, z: 0 },
        { x: 0.7, y: 0.7, z: 0 }
      ];
      
      const bbox = calculator.calculateFromLandmarks(landmarks, 0.9);
      const pixelBox = calculator.toPixelCoordinates(bbox, 640, 480);
      
      const results = [
        'Bounding Box Test Results:',
        `Normalized: x=${bbox.x.toFixed(3)}, y=${bbox.y.toFixed(3)}, w=${bbox.width.toFixed(3)}, h=${bbox.height.toFixed(3)}`,
        `Pixel coords: x=${Math.round(pixelBox.x)}, y=${Math.round(pixelBox.y)}, w=${Math.round(pixelBox.width)}, h=${Math.round(pixelBox.height)}`,
        `Confidence: ${bbox.confidence}`,
        `Area: ${calculator.calculateArea(bbox).toFixed(6)}`
      ];
      
      resultsDiv.innerHTML = results.map(result => 
        `<div class="log-entry info">${result}</div>`
      ).join('');
      
      this.logEvent('Pruebas de bounding box completadas', 'info');
      
    } catch (error) {
      resultsDiv.innerHTML = `<div class="log-entry" style="color: red;">Error: ${(error as Error).message}</div>`;
      this.logEvent('Error en las pruebas: ' + (error as Error).message, 'error');
    }
  }

  private updateStatus(message: string, type: 'success' | 'error' | 'info'): void {
    const statusDiv = document.getElementById('system-status')!;
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  private logEvent(message: string, type: 'info' | 'error' | 'gesture'): void {
    const logDiv = document.getElementById('event-log')!;
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
    
    // Keep only last 50 entries
    while (logDiv.children.length > 50) {
      logDiv.removeChild(logDiv.firstChild!);
    }
  }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const demo = new FingerBanDemo();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    demo.cleanup();
  });
});