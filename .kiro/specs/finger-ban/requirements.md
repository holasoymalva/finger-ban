# Requirements Document

## Introduction

Finger Ban es un sistema de reconocimiento de imágenes en tiempo real desarrollado en JavaScript que detecta automáticamente gestos ofensivos (específicamente el gesto del dedo medio 🖕) en transmisiones de video y los censura aplicando un efecto de pixelado/difuminado sobre la zona detectada. El sistema está diseñado como un MVP que puede procesar video en tiempo real y modificar la imagen de salida para ocultar contenido inapropiado.

## Requirements

### Requirement 1

**User Story:** Como usuario del sistema, quiero que el sistema detecte automáticamente gestos ofensivos en video en tiempo real, para que pueda censurar contenido inapropiado sin intervención manual.

#### Acceptance Criteria

1. WHEN el sistema recibe un frame de video THEN SHALL analizar la imagen en busca de gestos del dedo medio
2. WHEN se detecta un gesto del dedo medio THEN el sistema SHALL identificar las coordenadas exactas del gesto
3. IF la confianza de detección es mayor al 70% THEN el sistema SHALL marcar el gesto como válido para censura
4. WHEN se procesa un frame THEN el sistema SHALL completar el análisis en menos de 100ms para mantener fluidez en tiempo real

### Requirement 2

**User Story:** Como usuario del sistema, quiero que los gestos detectados sean censurados con un efecto visual, para que el contenido ofensivo quede oculto de manera efectiva.

#### Acceptance Criteria

1. WHEN se detecta un gesto válido THEN el sistema SHALL aplicar un efecto de pixelado sobre la región detectada
2. WHEN se aplica el efecto de censura THEN SHALL cubrir completamente el área del gesto con un margen de seguridad del 20%
3. IF el gesto se mueve entre frames THEN el sistema SHALL actualizar la posición del efecto de censura dinámicamente
4. WHEN se aplica el pixelado THEN el efecto SHALL ser lo suficientemente denso para hacer irreconocible el gesto original

### Requirement 3

**User Story:** Como usuario del sistema, quiero acceder al sistema a través de una interfaz web, para que pueda usar la funcionalidad desde mi navegador sin instalaciones adicionales.

#### Acceptance Criteria

1. WHEN accedo a la aplicación web THEN SHALL mostrar una interfaz para activar la cámara
2. WHEN activo la cámara THEN el sistema SHALL solicitar permisos de acceso a la cámara del dispositivo
3. IF se otorgan los permisos THEN el sistema SHALL mostrar el video en tiempo real con procesamiento activo
4. WHEN el sistema está activo THEN SHALL mostrar indicadores visuales del estado de detección

### Requirement 4

**User Story:** Como desarrollador del sistema, quiero que el reconocimiento de imágenes funcione completamente en el cliente, para que no se requiera enviar datos de video a servidores externos por privacidad.

#### Acceptance Criteria

1. WHEN se inicializa el sistema THEN SHALL cargar todos los modelos de ML necesarios en el navegador
2. WHEN se procesa video THEN todo el análisis SHALL ejecutarse localmente usando WebGL/WebAssembly
3. IF no hay conexión a internet después de la carga inicial THEN el sistema SHALL continuar funcionando normalmente
4. WHEN se procesa un frame THEN no SHALL enviar datos de imagen a servicios externos

### Requirement 5

**User Story:** Como usuario del sistema, quiero que el rendimiento sea fluido en dispositivos modernos, para que la experiencia de uso sea satisfactoria.

#### Acceptance Criteria

1. WHEN se ejecuta en un dispositivo con GPU moderna THEN el sistema SHALL mantener al menos 24 FPS
2. WHEN se detecta hardware limitado THEN el sistema SHALL ajustar automáticamente la calidad de procesamiento
3. IF el rendimiento cae por debajo de 15 FPS THEN el sistema SHALL mostrar una advertencia al usuario
4. WHEN se procesa video de 720p THEN el sistema SHALL funcionar sin interrupciones en hardware estándar