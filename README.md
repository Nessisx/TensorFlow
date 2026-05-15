# PoseAI — Analizador de Poses (Teachable Machine + MediaPipe)

Breve guía de uso

- Requisitos:
  - Navegador moderno (Chrome/Edge/Firefox)
  - Conexión a Internet para cargar dependencias CDN (o servirlas localmente)

- Estructura del proyecto esperada:
  - `index.html`
  - `script.js`
  - `styles.css`
  - `my_model/` — (opcional) carpeta con `model.json` y `metadata.json` exportados desde Teachable Machine

Cómo ejecutar localmente

1. Desde la carpeta del proyecto ejecuta un servidor HTTP simple (ejemplo con Python):

```powershell
python -m http.server 8000
```

2. Abre en el navegador: `http://localhost:8000`

Flujo de uso

- Sube una imagen con "Subir imagen" o toma una foto con "Tomar foto".
- La aplicación intentará cargar automáticamente los modelos al iniciar. Si la carga falla, usa el botón "Cargar modelos" para reintentar manualmente.
- Cuando los modelos terminen de cargarse verás que el botón "Analizar pose" se habilita; haz clic para analizar la imagen.
- Resultados mostrados:
  - Detección de puntos clave de la mano (MediaPipe) y clasificación del gesto (Piedra/Papel/Tijera) basada en reglas.
  - Predicción del modelo de Teachable Machine (lista de clases y probabilidades) si `my_model/` está presente.

Solución de problemas rápida

- Los scripts de MediaPipe o TM no cargan (errores en consola): revisa la pestaña Network en DevTools y confirma que las dependencias CDN (`@mediapipe/tasks-vision`, `tf.min.js`, `teachablemachine-pose.min.js`) cargaron con estado 200.
- Si la carga del archivo `.task` de MediaPipe falla (404/403): tu red puede bloquear el acceso a `storage.googleapis.com`; en ese caso descarga los assets y sirve localmente.
- Si no detecta la mano: prueba con imágenes de buena resolución donde la mano esté en primer plano y bien iluminada.

Notas de desarrollo

- `script.js` contiene la lógica de: carga de modelos, UI de subida, detección de MediaPipe Hands y predicción con Teachable Machine.
- Puedes reemplazar `my_model/` por cualquier export de Teachable Machine Pose (model.json + metadata.json).

---
Made quick by your assistant. If you want exact local fallbacks, tell me and I will add them.
