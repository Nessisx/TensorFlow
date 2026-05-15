# PoseAI — Analizador de Poses y Gestos

Aplicación web para detección de poses y reconocimiento de gestos utilizando **MediaPipe Hands** y modelos personalizados exportados desde **Teachable Machine**.

---

## 🚀 Características

- 📷 Subida de imágenes desde el dispositivo
- 📸 Captura de fotos desde cámara
- ✋ Detección de manos con MediaPipe
- 🪨📄✂️ Clasificación de gestos (*Piedra / Papel / Tijera*)
- 🧠 Integración con modelos de Teachable Machine
- 📊 Visualización de probabilidades por clase
- ⚡ Procesamiento completamente en el navegador

---

## 📁 Estructura del proyecto

```bash
PoseAI/
│
├── index.html          # Interfaz principal
├── script.js           # Lógica de detección y predicción
├── styles.css          # Estilos de la aplicación
│
└── my_model/           # Modelo exportado desde Teachable Machine (opcional)
    ├── model.json
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

1. Abre la aplicación en el navegador.
2. Espera a que los modelos carguen automáticamente.
3. Sube una imagen o toma una foto.
4. Haz clic en **"Analizar pose"**.
5. Observa los resultados de detección y clasificación.

---

## 🔍 Resultados mostrados

### ✋ MediaPipe Hands

La aplicación detecta:

- Palma de la mano
- Dedos y articulaciones
- Puntos clave (*landmarks*)

### 🪨📄✂️ Clasificación de gestos

Reconoce:

- Piedra
- Papel
- Tijera

### 🧠 Teachable Machine

Si existe la carpeta `my_model/`, también mostrará:

- Clases detectadas
- Probabilidades por clase
- Predicción más probable

---

## 🛠️ Dependencias utilizadas

El proyecto utiliza:

- `@mediapipe/tasks-vision`
- `TensorFlow.js`
- `teachablemachine-pose`

Cargadas mediante CDN.

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

Proyecto educativo y experimental basado en:

- MediaPipe
- TensorFlow.js
- Google Teachable Machine

---

## 👨‍💻 Autor
Keiner Fontalvo
Joseph De la Rans
Nelson Sierra
Oscar Llanos

