# PoseAI — Analizador de Poses y Gestos en Tiempo Real

Aplicación web para detección de poses y reconocimiento de gestos en **tiempo real** utilizando **MediaPipe Hands** y modelos personalizados exportados desde **Teachable Machine**.

---

## 🚀 Características

- 📷 Subida de imágenes desde el dispositivo
- 📹 **Análisis en tiempo real** desde cámara web
- ✋ Detección de manos con MediaPipe
- 🪨📄✂️ Clasificación de gestos (_Piedra / Papel / Tijera_)
- 🧠 Integración con modelos de Teachable Machine (fallback)
- 📊 Visualización de probabilidades por clase
- ⚡ Procesamiento completamente en el navegador (GPU acelerado)

---

## 📁 Estructura del proyecto

```bash
PoseAI/
│
├── index.html          # Interfaz principal
├── script.js           # Lógica de detección y predicción
├── styles.css          # Estilos de la aplicación
├── model.json
├── weight.bin
└── metadata.json
```

---

## ✅ Requisitos

Antes de ejecutar el proyecto asegúrate de tener:

- Navegador moderno:
  - Google Chrome
  - Microsoft Edge
  - Firefox
- Conexión a Internet para cargar dependencias CDN
- Python instalado (opcional para servidor local)

---

## ▶️ Cómo ejecutar el proyecto

### 1. Clonar o descargar el proyecto

```bash
git clone <repositorio>
cd PoseAI
```

### 2. Iniciar un servidor local

Con Python:

```powershell
python -m http.server 8000
```

### 3. Abrir en el navegador

```txt
http://localhost:8000
```

---

## 🧠 Flujo de uso

### Opción 1: Análisis en tiempo real (cámara)

1. Abre la aplicación en el navegador.
2. Espera a que los modelos carguen automáticamente.
3. Haz clic en **"Tomar foto"** para abrir la cámara.
4. La aplicación comenzará a analizar **automáticamente en tiempo real** cada 500ms.
5. Mueve tu mano para ver los cambios en las predicciones al instante.
6. (Opcional) Haz clic en **"Capturar"** para congelar la imagen y cerrar la cámara.

### Opción 2: Análisis de imágenes estáticas

1. Abre la aplicación en el navegador.
2. Espera a que los modelos carguen automáticamente.
3. Sube una imagen o toma una foto (captura única).
4. Haz clic en **"Analizar pose"** para procesar la imagen.
5. Observa los resultados de detección y clasificación.

---

## 🔍 Resultados mostrados

### ✋ Detección con MediaPipe Hands

La aplicación detecta automáticamente:

- Localización de la palma y dedos
- Puntos clave (_landmarks_) en 3D
- Clasificación geométrica: Piedra, Papel o Tijera
- Nivel de confianza para cada gesto

### 🪨📄✂️ Gestos reconocidos

El sistema clasifica tres gestos principales:

- **Piedra**: Puño cerrado (confianza: ~97%)
- **Papel**: Mano abierta con dedos extendidos (confianza: ~97%)
- **Tijera**: Dedo índice y medio extendidos (confianza: ~95%)

### 🧠 Fallback: Teachable Machine

Si MediaPipe no detecta mano, el sistema intenta usar Teachable Machine como respaldo:

- Modelos personalizados entrenados
- Clases detectadas según configuración del modelo
- Probabilidades por clase
- Predicción más probable

---

## ⚡ Análisis en Tiempo Real

Cuando usas la cámara web:

- **Detección continua**: Se analiza cada frame automáticamente
- **Velocidad**: ~2 análisis por segundo (500ms)
- **GPU acelerado**: MediaPipe utiliza GPU cuando está disponible
- **Sin botón de análisis**: Los resultados se actualizan en vivo
- **Bajo latency**: Ideal para interacción en tiempo real

## 🛠️ Dependencias utilizadas

El proyecto utiliza:

- `@mediapipe/tasks-vision@0.10.3` - Detección de manos
- `TensorFlow.js` - Framework ML
- `teachablemachine-pose@0.8` - Modelos personalizados

Cargadas mediante CDN (no requiere instalación).

---

## ⚠️ Solución de problemas

### Los modelos no cargan

Abre las herramientas de desarrollo del navegador (**F12 → Network**) y verifica que carguen correctamente:

- `tf.min.js`
- `teachablemachine-pose.min.js`
- `@mediapipe/tasks-vision`

Todos deben responder con estado `200`.

---

### Error al cargar archivos `.task`

Si aparece un error `404` o `403`:

- Tu red puede bloquear `storage.googleapis.com`
- Descarga los assets manualmente
- Sirve los modelos localmente

---

### No detecta la mano

Prueba con:

- Buena iluminación
- Fondo limpio
- Mano visible en primer plano
- Imagen de mayor resolución

---

## 🧩 Personalización

Puedes reemplazar la carpeta:

```bash
my_model/
```

por cualquier modelo exportado desde:

- Teachable Machine Pose
- Teachable Machine Image

Siempre que incluya:

```bash
model.json
metadata.json
```

---

## 📌 Notas de desarrollo

El archivo `script.js` contiene la lógica de:

- Inicialización de modelos
- Acceso a cámara
- Procesamiento de imágenes
- Detección con MediaPipe
- Predicción con Teachable Machine
- Renderizado de resultados

---

## 💡 Mejoras futuras

- 🎥 Detección en tiempo real por webcam
- 📱 Compatibilidad móvil mejorada
- 🧍 Detección de pose corporal completa
- 🤖 Más clases de gestos personalizadas
- 📈 Historial de predicciones

---

## 📄 Licencia

Este proyecto está disponible bajo la **licencia MIT**. Eres libre de:

- ✅ Descargar y usar el proyecto
- ✅ Modificar y adaptar el código
- ✅ Distribuir copias
- ✅ Usar con fines comerciales o educativos

**Condiciones:**
- Incluye la licencia MIT en cualquier distribución
- Sin garantía (se proporciona "tal cual")

```
MIT License - https://opensource.org/licenses/MIT
```

---

## 👨‍💻 Autores

- **Keiner Fontalvo**
- **Joseph De la Rans**
- **Nelson Sierra**
- **Oscar Llanos**
