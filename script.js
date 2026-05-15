// Cargar MediaPipe Hands
let handDetector;
let webcamStream = null;
let imageData = null;
// Teachable Machine Pose model
const TM_URL = './';
let tmModel = null;
let tmMaxPredictions = 0;
const tmCanvas = document.createElement('canvas');
tmCanvas.style.display = 'none';
document.body && document.body.appendChild(tmCanvas);
let modelsLoaded = false;

// Elemento del video
const videoEl = document.getElementById('videoEl');
const snapCanvas = document.getElementById('snapCanvas');
const previewImg = document.getElementById('previewImg');
const uploadZone = document.getElementById('uploadZone');
const analyzeBtn = document.getElementById('analyzeBtn');
const removeBtn = document.getElementById('removeBtn');
const fileInput = document.getElementById('fileInput');
const cameraBtn = document.getElementById('cameraBtn');
const cameraModal = document.getElementById('cameraModal');
const closeCamera = document.getElementById('closeCamera');
const captureBtn = document.getElementById('captureBtn');
const resultsSection = document.getElementById('resultsSection');
const resultCard = document.getElementById('resultCard');
const resultLoading = document.getElementById('resultLoading');

// Inicializar MediaPipe Hands
async function initializeHands() {
  if (!window.FilesetResolver) {
    throw new Error('FilesetResolver no está disponible. Asegúrate de cargar https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest antes de este script.');
  }

  const vision = await window.FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  if (!window.HandLandmarker) {
    throw new Error('HandLandmarker no está disponible en window. Verifica la carga de MediaPipe Tasks.');
  }

  handDetector = await window.HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    },
    runningMode: 'IMAGE',
    numHands: 1,
  });
}

// Ensure MediaPipe Tasks Vision script is loaded (fallback)
function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    // already available
    if (window.FilesetResolver) return resolve();
    // check if a tag already exists
    const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.includes(src));
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => setTimeout(resolve, 0);
    s.onerror = (e) => reject(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}

async function ensureTasksVision() {
  if (window.FilesetResolver) return;
  try {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest');
    // small delay to ensure globals are set
    await new Promise(r => setTimeout(r, 50));
  } catch (err) {
    throw new Error('No se pudo cargar MediaPipe Tasks Vision: ' + err.message);
  }
}

// Append status messages to the results card for diagnostics
function appendStatus(msg, isError = false) {
  try {
    resultsSection.classList.remove('hidden');
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.fontFamily = 'var(--mono)';
    el.style.fontSize = '0.9rem';
    el.style.padding = '4px 0';
    if (isError) el.style.color = 'red';
    // ensure resultCard exists
    if (resultCard) {
      // create or reuse a status container
      let statusWrap = resultCard.querySelector('.status-wrap');
      if (!statusWrap) {
        statusWrap = document.createElement('div');
        statusWrap.className = 'status-wrap';
        statusWrap.style.padding = '0.75rem';
        statusWrap.style.background = 'var(--surface2)';
        statusWrap.style.borderRadius = '6px';
        statusWrap.style.marginBottom = '0.75rem';
        resultCard.prepend(statusWrap);
      }
      statusWrap.appendChild(el);
    }
    console.log('[Status]', msg);
  } catch (e) {
    console.log('[Status fallback]', msg);
  }
}

// Ensure TensorFlow and Teachable Machine pose libs are loaded
async function ensureDependencies() {
  // tf
  if (!window.tf) {
    appendStatus('Cargando TensorFlow.js...');
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
    appendStatus('TensorFlow.js cargado');
  } else appendStatus('TensorFlow.js ya está disponible');

  // tmPose
  if (!window.tmPose) {
    appendStatus('Cargando Teachable Machine Pose...');
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js');
    appendStatus('Teachable Machine Pose cargado');
  } else appendStatus('Teachable Machine Pose ya está disponible');
}

// Drag and Drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--accent)';
  uploadZone.style.backgroundColor = 'rgba(200, 245, 66, 0.05)';
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = 'var(--border)';
  uploadZone.style.backgroundColor = 'transparent';
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--border)';
  uploadZone.style.backgroundColor = 'transparent';

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleImageFile(files[0]);
  }
});

// File input
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleImageFile(e.target.files[0]);
  }
});

// Manejar imagen cargada
function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imageData = e.target.result;
    previewImg.src = imageData;
    previewImg.classList.remove('hidden');
    removeBtn.classList.remove('hidden');
    uploadZone.style.cursor = 'default';
    uploadZone.querySelector('.upload-inner').classList.add('hidden');
    analyzeBtn.disabled = !modelsLoaded;
  };
  reader.readAsDataURL(file);
}

// Eliminar imagen
removeBtn.addEventListener('click', () => {
  imageData = null;
  previewImg.src = '';
  previewImg.classList.add('hidden');
  removeBtn.classList.add('hidden');
  uploadZone.querySelector('.upload-inner').classList.remove('hidden');
  analyzeBtn.disabled = true;
  resultsSection.classList.add('hidden');
  fileInput.value = '';
});

// Cámara - Abrir modal
cameraBtn.addEventListener('click', async () => {
  cameraModal.classList.remove('hidden');
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    videoEl.srcObject = webcamStream;
  } catch (err) {
    alert('No se pudo acceder a la cámara. Verifica los permisos.');
    console.error(err);
    cameraModal.classList.add('hidden');
  }
});

// Cámara - Cerrar modal
closeCamera.addEventListener('click', () => {
  stopCamera();
  cameraModal.classList.add('hidden');
});

// Detener cámara
function stopCamera() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
    webcamStream = null;
  }
}

// Capturar foto desde cámara
captureBtn.addEventListener('click', () => {
  const ctx = snapCanvas.getContext('2d');
  snapCanvas.width = videoEl.videoWidth;
  snapCanvas.height = videoEl.videoHeight;
  ctx.drawImage(videoEl, 0, 0);
  
  imageData = snapCanvas.toDataURL('image/jpeg');
  previewImg.src = imageData;
  previewImg.classList.remove('hidden');
  removeBtn.classList.remove('hidden');
  uploadZone.querySelector('.upload-inner').classList.add('hidden');
  analyzeBtn.disabled = !modelsLoaded;
  
  stopCamera();
  cameraModal.classList.add('hidden');
});

// Analizar gesto de mano
analyzeBtn.addEventListener('click', async () => {
  if (!modelsLoaded || !imageData) return;

  resultsSection.classList.remove('hidden');
  resultLoading.classList.remove('hidden');
  resultCard.innerHTML = '';

  const img = new Image();
  img.onload = async () => {
    const tmResult = await predictFromImageWithTM(img);
    displayResults(null, img, tmResult);  // null = sin MediaPipe
    resultLoading.classList.add('hidden');
  };
  img.src = imageData;
});

// Mostrar resultados
function displayResults(result, imageElement, tmResult) {
  if (!result.landmarks || result.landmarks.length === 0) {
    resultCard.innerHTML = '<p>No se detectó ninguna mano en la imagen</p>';
    return;
  }

  const landmarks = result.landmarks[0];
  
  // Crear canvas para dibujar
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;
  const ctx = canvas.getContext('2d');
  
  // Dibujar imagen original
  ctx.drawImage(imageElement, 0, 0);
  
  // Dibujar puntos clave de la mano
  drawHand(ctx, landmarks);
  
  // Detectar gesto (piedra, papel, tijera)
  const gesture = detectGesture(landmarks);
  
  // Mostrar resultados
  const canvasDataUrl = canvas.toDataURL();
  // build TM prediction list
  let tmHtml = '';
  if (tmResult && tmResult.prediction) {
    tmHtml += '<div style="margin-bottom:1rem; font-family: var(--mono); background: var(--surface2); padding:0.75rem; border-radius:6px;">';
    tmHtml += '<strong>Teachable Machine — probabilidades:</strong><br/>';
    tmResult.prediction.forEach(p => {
      tmHtml += `<div style="display:flex;justify-content:space-between;padding:2px 0;">` +
                `<span>${p.className}</span>` +
                `<span>${(p.probability*100).toFixed(1)}%</span>` +
                `</div>`;
    });
    tmHtml += '</div>';
  }

  resultCard.innerHTML = `
    <img src="${canvasDataUrl}" style="width: 100%; border-radius: 8px; margin-bottom: 1.5rem;">
    <div class="gesture-result">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 4rem; margin-bottom: 0.5rem;">
          ${gesture.emoji}
        </div>
        <h2 style="color: var(--accent); font-size: 2rem; margin: 0;">${gesture.name}</h2>
        <p style="color: var(--text-muted); font-family: var(--mono); margin-top: 0.5rem;">Confianza: ${(gesture.confidence * 100).toFixed(0)}%</p>
      </div>
      ${tmHtml}
      <div style="font-family: var(--mono); font-size: 0.85rem; background: var(--surface2); padding: 1rem; border-radius: 8px; line-height: 1.6;">
        <p><strong>Detalles del gesto:</strong></p>
        <p>${gesture.details}</p>
      </div>
      <p style="margin-top: 1.5rem; color: var(--text-muted); font-family: var(--mono); font-size: 0.75rem;">
        Puntos de mano detectados: ${landmarks.length}
      </p>
    </div>
  `;
}

// Load Teachable Machine Pose model
async function initializeTmModel() {
  try {
    if (!window.tmPose) return;
    const modelURL = TM_URL + 'model.json';
    const metadataURL = TM_URL + 'metadata.json';
    tmModel = await tmPose.load(modelURL, metadataURL);
    tmMaxPredictions = tmModel.getTotalClasses();
    console.log('Teachable Machine model loaded, classes:', tmMaxPredictions);
  } catch (err) {
    console.warn('No se pudo cargar el modelo de Teachable Machine:', err);
  }
}

function setModelsReady(ready) {
  modelsLoaded = ready;
  analyzeBtn.disabled = !ready || !imageData;
  if (ready) {
    // hide any loading message in results
    try { resultsSection.classList.add('hidden'); } catch (e) {}
  } else {
    try {
      resultsSection.classList.remove('hidden');
      resultCard.innerHTML = '<p>Cargando modelos... por favor espera.</p>';
    } catch (e) {}
  }
}

// Manual load models button (retry)
const loadModelsBtn = document.createElement('button');
loadModelsBtn.id = 'loadModelsBtn';
loadModelsBtn.className = 'btn btn-outline';
loadModelsBtn.textContent = 'Cargar modelos';
loadModelsBtn.style.marginLeft = '8px';
loadModelsBtn.addEventListener('click', async () => {
  setModelsReady(false);
  try {
    await ensureTasksVision();
    await initializeHands();
    await initializeTmModel();
    setModelsReady(true);
    alert('Modelos cargados correctamente');
  } catch (err) {
    console.error('Error cargando modelos (manual):', err);
    alert('Error cargando modelos: ' + (err && err.message ? err.message : err));
    setModelsReady(false);
  }
});

// append loadModelsBtn to action-buttons if present
const actionButtons = document.querySelector('.action-buttons');
if (actionButtons) actionButtons.appendChild(loadModelsBtn);

// Predict from an Image element using TM model (returns pose + full predictions)
async function predictFromImageWithTM(img) {
  if (!tmModel) throw new Error('TM model not loaded');
  // resize canvas to image
  tmCanvas.width = img.naturalWidth || img.width;
  tmCanvas.height = img.naturalHeight || img.height;
  const tctx = tmCanvas.getContext('2d');
  tctx.clearRect(0,0,tmCanvas.width, tmCanvas.height);
  tctx.drawImage(img, 0, 0, tmCanvas.width, tmCanvas.height);

  const { pose, posenetOutput } = await tmModel.estimatePose(tmCanvas);
  const prediction = await tmModel.predict(posenetOutput);
  return { pose, prediction };
}

// Dibujar esqueleto de mano
function drawHand(ctx, landmarks) {
  // Conexiones entre dedos según MediaPipe Hands
  const connections = [
    // Pulgar
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Índice
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Medio
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Anular
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Meñique
    [0, 17], [17, 18], [18, 19], [19, 20],
  ];

  const imgWidth = ctx.canvas.width;
  const imgHeight = ctx.canvas.height;

  // Dibujar conexiones
  ctx.strokeStyle = 'rgba(200, 245, 66, 0.7)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  connections.forEach(([start, end]) => {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];
    
    if (startPoint && endPoint && startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x * imgWidth, startPoint.y * imgHeight);
      ctx.lineTo(endPoint.x * imgWidth, endPoint.y * imgHeight);
      ctx.stroke();
    }
  });

  // Dibujar puntos
  ctx.fillStyle = 'rgba(200, 245, 66, 1)';
  landmarks.forEach((landmark) => {
    if (landmark && landmark.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(landmark.x * imgWidth, landmark.y * imgHeight, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

// Detectar gesto (Piedra, Papel, Tijera)
function detectGesture(landmarks) {
  // Índices de puntos clave según MediaPipe Hands
  // 0: Muñeca
  // 1-4: Pulgar
  // 5-8: Índice
  // 9-12: Medio
  // 13-16: Anular
  // 17-20: Meñique

  // Función auxiliar: calcular distancia
  function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  // Función auxiliar: detectar si un dedo está levantado
  function isFingerUp(fingerTip, fingerPIP, palmBase) {
    return fingerTip.y < fingerPIP.y;
  }

  const wrist = landmarks[0];
  
  // Dedos tip (puntas)
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // Dedos PIP (articulación media)
  const thumbPIP = landmarks[3];
  const indexPIP = landmarks[6];
  const middlePIP = landmarks[10];
  const ringPIP = landmarks[14];
  const pinkyPIP = landmarks[18];

  // Knuckles (nudillos)
  const indexKnuckle = landmarks[5];
  const middleKnuckle = landmarks[9];
  const ringKnuckle = landmarks[13];
  const pinkyKnuckle = landmarks[17];

  // Detectar dedos levantados
  const thumbUp = isFingerUp(thumbTip, thumbPIP, wrist);
  const indexUp = isFingerUp(indexTip, indexPIP, wrist);
  const middleUp = isFingerUp(middleTip, middlePIP, wrist);
  const ringUp = isFingerUp(ringTip, ringPIP, wrist);
  const pinkyUp = isFingerUp(pinkyTip, pinkyPIP, wrist);

  // Distancia entre dedos
  const indexMiddleDistance = distance(indexTip, middleTip);
  const palmSize = distance(wrist, indexKnuckle);
  const indexMiddleNormalized = indexMiddleDistance / palmSize;

  // Calcular cuántos dedos están levantados
  const fingersUp = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  // PAPEL: Todos los dedos levantados (mano abierta)
  if (fingersUp === 4 && (thumbUp || !thumbUp)) {
    return {
      name: 'PAPEL ✋',
      emoji: '📄',
      confidence: 0.95,
      details: 'Mano completamente abierta con todos los dedos levantados. ¡Ganaste contra Piedra!',
    };
  }

  // TIJERA: Índice y medio separados levantados, otros bajados
  if (indexUp && middleUp && !ringUp && !pinkyUp && indexMiddleNormalized > 0.15) {
    return {
      name: 'TIJERA ✌️',
      emoji: '✂️',
      confidence: 0.92,
      details: 'Índice y medio levantados y separados. ¡Ganaste contra Papel!',
    };
  }

  // PIEDRA: Todos los dedos doblados (puño cerrado)
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
    return {
      name: 'PIEDRA ✊',
      emoji: '🪨',
      confidence: 0.93,
      details: 'Puño cerrado. ¡Ganaste contra Tijera!',
    };
  }

  // Gesto no reconocido
  return {
    name: 'Gesto no reconocido',
    emoji: '❓',
    confidence: 0.5,
    details: 'Intenta mostrar Piedra (puño), Papel (mano abierta) o Tijera (dos dedos separados).',
  };
}

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
  (async () => {
    try {
      setModelsReady(false);
      appendStatus('Iniciando carga de dependencias...');
      await ensureDependencies();
      appendStatus('Dependencias cargadas. Cargando MediaPipe Tasks...');
      await ensureTasksVision();
      appendStatus('MediaPipe Tasks disponible. Inicializando HandLandmarker...');
      await initializeHands();
      appendStatus('HandLandmarker inicializado. Cargando modelo Teachable Machine (si existe)...');
      await initializeTmModel();
      appendStatus('Todos los modelos cargados. Listo.');
      setModelsReady(true);
    } catch (err) {
      console.error('Error al inicializar MediaPipe Hands o TM model:', err);
      const msg = 'Error al cargar el modelo de IA: ' + (err && err.message ? err.message : err);
      appendStatus(msg, true);
      alert(msg);
      try {
        resultCard.innerHTML = `<p style="color: red;">${msg}</p>`;
        resultsSection.classList.remove('hidden');
      } catch (e) {}
      setModelsReady(false);
    }
  })();
});
