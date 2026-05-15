// ── Teachable Machine Pose ──────────────────────────────────────────────────
const TM_URL = './';          // model.json y metadata.json están en la raíz
let tmModel        = null;
let tmMaxPredictions = 0;
let modelsLoaded   = false;

const tmCanvas = document.createElement('canvas');
tmCanvas.style.display = 'none';
document.body.appendChild(tmCanvas);

// ── Referencias DOM ──────────────────────────────────────────────────────────
const videoEl        = document.getElementById('videoEl');
const snapCanvas     = document.getElementById('snapCanvas');
const previewImg     = document.getElementById('previewImg');
const uploadZone     = document.getElementById('uploadZone');
const analyzeBtn     = document.getElementById('analyzeBtn');
const removeBtn      = document.getElementById('removeBtn');
const fileInput      = document.getElementById('fileInput');
const cameraBtn      = document.getElementById('cameraBtn');
const cameraModal    = document.getElementById('cameraModal');
const closeCamera    = document.getElementById('closeCamera');
const captureBtn     = document.getElementById('captureBtn');
const resultsSection = document.getElementById('resultsSection');
const resultCard     = document.getElementById('resultCard');
const resultLoading  = document.getElementById('resultLoading');

let webcamStream = null;
let imageData    = null;

// ── Utilidades ───────────────────────────────────────────────────────────────
function appendStatus(msg, isError = false) {
  try {
    resultsSection.classList.remove('hidden');
    let statusWrap = resultCard.querySelector('.status-wrap');
    if (!statusWrap) {
      statusWrap = document.createElement('div');
      statusWrap.className = 'status-wrap';
      statusWrap.style.cssText =
        'padding:.75rem;background:var(--surface2);border-radius:6px;margin-bottom:.75rem;';
      resultCard.prepend(statusWrap);
    }
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `font-family:var(--mono);font-size:.9rem;padding:4px 0;${isError ? 'color:red;' : ''}`;
    statusWrap.appendChild(el);
    console.log('[Status]', msg);
  } catch (e) {
    console.log('[Status fallback]', msg);
  }
}

function setModelsReady(ready) {
  modelsLoaded = ready;
  analyzeBtn.disabled = !ready || !imageData;
}

// ── Cargar modelo Teachable Machine ──────────────────────────────────────────
async function ensureDependencies() {
  if (!window.tf) {
    appendStatus('Cargando TensorFlow.js…');
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
  } else appendStatus('TensorFlow.js listo ✓');

  if (!window.tmPose) {
    appendStatus('Cargando Teachable Machine Pose…');
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js');
  } else appendStatus('Teachable Machine Pose listo ✓');
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (src.includes('tfjs') && window.tf)      return resolve();
    if (src.includes('teachable') && window.tmPose) return resolve();
    const existing = Array.from(document.scripts).find(s => s.src.includes(src));
    if (existing) { existing.onload = resolve; existing.onerror = reject; return; }
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = () => setTimeout(resolve, 0);
    s.onerror = () => reject(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}

async function initializeTmModel() {
  if (!window.tmPose) throw new Error('tmPose no disponible');
  appendStatus('Cargando modelo desde ' + TM_URL + 'model.json…');
  tmModel = await tmPose.load(TM_URL + 'model.json', TM_URL + 'metadata.json');
  tmMaxPredictions = tmModel.getTotalClasses();
  appendStatus(`Modelo cargado ✓  (${tmMaxPredictions} clases)`);
}

// ── Predicción ────────────────────────────────────────────────────────────────
async function predictFromImage(img) {
  tmCanvas.width  = img.naturalWidth  || img.width;
  tmCanvas.height = img.naturalHeight || img.height;
  const ctx = tmCanvas.getContext('2d');
  ctx.clearRect(0, 0, tmCanvas.width, tmCanvas.height);
  ctx.drawImage(img, 0, 0, tmCanvas.width, tmCanvas.height);

  const { pose, posenetOutput } = await tmModel.estimatePose(tmCanvas);
  const prediction = await tmModel.predict(posenetOutput);
  return { pose, prediction };
}

// ── Mostrar resultados ────────────────────────────────────────────────────────
function displayResults(img, tmResult) {
  const top = tmResult.prediction.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  const emojis = { Piedra: '🪨', Papel: '📄', Tijera: '✂️' };
  const emoji  = emojis[top.className] ?? '❓';

  let predHtml = '<div style="margin-top:1rem;font-family:var(--mono);background:var(--surface2);padding:.75rem;border-radius:6px;">';
  tmResult.prediction.forEach(p => {
    const pct   = (p.probability * 100).toFixed(1);
    const isBest = p.className === top.className;
    predHtml += `
      <div style="display:flex;justify-content:space-between;padding:4px 0;${isBest ? 'color:var(--accent);font-weight:700;' : ''}">
        <span>${p.className}</span>
        <span>${pct}%</span>
      </div>
      <div style="height:4px;background:var(--border);border-radius:2px;margin-bottom:6px;">
        <div style="height:100%;width:${pct}%;background:${isBest ? 'var(--accent)' : 'var(--border)'};border-radius:2px;transition:width .4s;"></div>
      </div>`;
  });
  predHtml += '</div>';

  resultCard.innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;">
      <div style="font-size:4rem;margin-bottom:.5rem;">${emoji}</div>
      <h2 style="color:var(--accent);font-size:2rem;margin:0;">${top.className}</h2>
      <p style="color:var(--text-muted);font-family:var(--mono);margin-top:.5rem;">
        Confianza: ${(top.probability * 100).toFixed(0)}%
      </p>
    </div>
    ${predHtml}
  `;
}

// ── Drag & Drop / File input ──────────────────────────────────────────────────
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--accent)';
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = 'var(--border)';
});
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--border)';
  if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if (e.target.files.length > 0) handleImageFile(e.target.files[0]);
});

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    imageData = e.target.result;
    previewImg.src = imageData;
    previewImg.classList.remove('hidden');
    removeBtn.classList.remove('hidden');
    uploadZone.querySelector('.upload-inner').classList.add('hidden');
    analyzeBtn.disabled = !modelsLoaded;
  };
  reader.readAsDataURL(file);
}

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

// ── Cámara ────────────────────────────────────────────────────────────────────
cameraBtn.addEventListener('click', async () => {
  cameraModal.classList.remove('hidden');
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    videoEl.srcObject = webcamStream;
  } catch (err) {
    alert('No se pudo acceder a la cámara.');
    cameraModal.classList.add('hidden');
  }
});
closeCamera.addEventListener('click', () => { stopCamera(); cameraModal.classList.add('hidden'); });
function stopCamera() {
  if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = null; }
}
captureBtn.addEventListener('click', () => {
  const ctx = snapCanvas.getContext('2d');
  snapCanvas.width  = videoEl.videoWidth;
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

// ── Analizar ──────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  if (!modelsLoaded || !imageData) return;

  resultsSection.classList.remove('hidden');
  resultLoading.classList.remove('hidden');
  resultCard.innerHTML = '';

  try {
    const img = new Image();
    img.onload = async () => {
      try {
        const tmResult = await predictFromImage(img);
        displayResults(img, tmResult);
      } catch (err) {
        resultCard.innerHTML = `<p style="color:red;">Error al analizar: ${err.message}</p>`;
      } finally {
        resultLoading.classList.add('hidden');
      }
    };
    img.src = imageData;
  } catch (err) {
    resultCard.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    resultLoading.classList.add('hidden');
  }
});

// ── Arranque ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setModelsReady(false);
  try {
    appendStatus('Iniciando…');
    await ensureDependencies();
    await initializeTmModel();
    appendStatus('✅ Todo listo. Sube una imagen para analizar.');
    setModelsReady(true);
  } catch (err) {
    const msg = 'Error al cargar: ' + (err?.message ?? err);
    appendStatus(msg, true);
    setModelsReady(false);
  }
});
