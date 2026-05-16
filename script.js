// ============================================================
//  PoseAI — script.js (FINAL — MediaPipe + TM fallback)
//  1. Intenta con MediaPipe Hands (landmarks geométricos)
//  2. Si no detecta mano → usa Teachable Machine como fallback
// ============================================================

const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const TM_URL = "./"; // model.json y metadata.json en la raíz del repo

// ── Índices landmarks MediaPipe ───────────────────────────────
const FINGERS = [
  { name: "index", tip: 8, pip: 6, mcp: 5 },
  { name: "middle", tip: 12, pip: 10, mcp: 9 },
  { name: "ring", tip: 16, pip: 14, mcp: 13 },
  { name: "pinky", tip: 20, pip: 18, mcp: 17 },
];
const THUMB = { tip: 4, ip: 3, mcp: 2 };
const WRIST = 0;

// ── Estado ────────────────────────────────────────────────────
let handLandmarker = null;
let tmModel = null;
let tmMaxPredictions = 0;
let modelsLoaded = false;
let imageData = null;
let webcamStream = null;

const tmCanvas = document.createElement("canvas");
tmCanvas.style.display = "none";
document.body.appendChild(tmCanvas);

// ── DOM ───────────────────────────────────────────────────────
const videoEl = document.getElementById("videoEl");
const snapCanvas = document.getElementById("snapCanvas");
const previewImg = document.getElementById("previewImg");
const uploadZone = document.getElementById("uploadZone");
const analyzeBtn = document.getElementById("analyzeBtn");
const removeBtn = document.getElementById("removeBtn");
const fileInput = document.getElementById("fileInput");
const cameraBtn = document.getElementById("cameraBtn");
const cameraModal = document.getElementById("cameraModal");
const closeCamera = document.getElementById("closeCamera");
const captureBtn = document.getElementById("captureBtn");
const resultsSection = document.getElementById("resultsSection");
const resultCard = document.getElementById("resultCard");
const resultLoading = document.getElementById("resultLoading");
const thumbImg = document.getElementById("thumbImg");
const resetBtn = document.getElementById("resetBtn");

// ── Estilos ───────────────────────────────────────────────────
const extraStyles = document.createElement("style");
extraStyles.textContent = `
  .pose-loading {
    display:flex; flex-direction:column; align-items:center;
    gap:1rem; padding:2rem;
    color:rgba(255,255,255,0.5);
    font-family:'Space Mono',monospace; font-size:.8rem;
  }
  .pose-spinner {
    width:32px; height:32px;
    border:3px solid rgba(255,255,255,0.1);
    border-top-color:#c8ff00;
    border-radius:50%;
    animation:spin .8s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  .pose-result {
    display:flex; flex-direction:column; align-items:center;
    width:100%; padding:1.5rem 1rem; gap:.25rem;
  }
  .r-emoji { font-size:3.5rem; margin-bottom:.5rem; }
  .r-name  {
    font-family:'Syne',sans-serif; font-size:2rem; font-weight:800;
    color:#c8ff00; margin-bottom:.25rem;
  }
  .r-conf {
    font-family:'Space Mono',monospace; font-size:.72rem;
    color:rgba(255,255,255,0.4); margin-bottom:1.25rem;
    letter-spacing:.05em;
  }
  .r-method {
    font-family:'Space Mono',monospace; font-size:.65rem;
    color:rgba(255,255,255,0.25); margin-bottom:1rem;
  }
  .r-bars  { width:100%; display:flex; flex-direction:column; gap:.5rem; }
  .r-bar-row {
    display:grid; grid-template-columns:64px 1fr 48px;
    align-items:center; gap:.5rem;
    font-family:'Space Mono',monospace; font-size:.72rem;
    opacity:.4; transition:opacity .2s;
  }
  .r-bar-row.best { opacity:1; }
  .r-bar-label { color:rgba(255,255,255,.85); }
  .r-bar-pct   { color:rgba(255,255,255,.6); text-align:right; }
  .r-bar-track {
    background:rgba(255,255,255,.08); border-radius:99px;
    height:6px; overflow:hidden;
  }
  .r-bar-fill {
    height:100%; border-radius:99px; background:#c8ff00;
    transition:width .7s cubic-bezier(.4,0,.2,1);
  }
  .pose-error {
    display:flex; flex-direction:column; align-items:center;
    gap:.75rem; padding:2rem 1rem;
    color:rgba(255,255,255,.5);
    font-family:'Space Mono',monospace; font-size:.78rem;
    text-align:center; line-height:1.6;
  }
  .status-wrap {
    padding:.75rem; background:rgba(255,255,255,.05);
    border-radius:6px; margin-bottom:.75rem;
    font-family:'Space Mono',monospace; font-size:.78rem; line-height:1.8;
  }
  .status-line       { color:rgba(255,255,255,.6); }
  .status-line.error { color:#ff6b6b; }
  .status-line.ok    { color:#c8ff00; }
  .status-line.warn  { color:#ffb347; }
`;
document.head.appendChild(extraStyles);

// ── Status log ────────────────────────────────────────────────
function appendStatus(msg, type = "") {
  try {
    resultsSection.classList.remove("hidden");
    let wrap = resultCard.querySelector(".status-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "status-wrap";
      resultCard.prepend(wrap);
    }
    const line = document.createElement("div");
    line.className = "status-line" + (type ? " " + type : "");
    line.textContent = msg;
    wrap.appendChild(line);
    console.log("[PoseAI]", msg);
  } catch (e) {
    console.log("[PoseAI]", msg);
  }
}

function setModelsReady(ready) {
  modelsLoaded = ready;
  analyzeBtn.disabled = !ready || !imageData;
}

// ════════════════════════════════════════════════════════════
//  MÉTODO 1: MediaPipe Hands (landmarks geométricos)
// ════════════════════════════════════════════════════════════

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function isExtended(lm, finger) {
  const tipDist = dist(lm[finger.tip], lm[WRIST]);
  const mcpDist = dist(lm[finger.mcp], lm[WRIST]);
  return tipDist / Math.max(mcpDist, 0.01) > 1.6;
}

function isThumbExtended(lm) {
  const indexMcp = lm[5];
  return dist(lm[THUMB.tip], indexMcp) > dist(lm[THUMB.ip], indexMcp) * 1.2;
}

function classifyByLandmarks(lm) {
  const ext = FINGERS.map((f) => isExtended(lm, f));
  const thu = isThumbExtended(lm);
  const [idx, mid, ring, pink] = ext;
  const extCount = ext.filter(Boolean).length;

  const tijeraScore =
    (idx ? 1 : 0) + (mid ? 1 : 0) + (!ring ? 1 : 0) + (!pink ? 1 : 0);
  const papelScore = extCount + (thu ? 1 : 0);

  let gesture, confidence, all;

  if (extCount <= 1 && !thu) {
    gesture = "Piedra";
    confidence = extCount === 0 ? 0.97 : 0.82;
    all = [
      { className: "Piedra", probability: confidence },
      { className: "Papel", probability: extCount === 0 ? 0.02 : 0.12 },
      { className: "Tijera", probability: extCount === 0 ? 0.01 : 0.06 },
    ];
  } else if (tijeraScore >= 3 && extCount <= 2) {
    const conf = tijeraScore === 4 ? 0.95 : 0.78;
    gesture = "Tijera";
    confidence = conf;
    all = [
      { className: "Tijera", probability: conf },
      { className: "Papel", probability: tijeraScore === 4 ? 0.03 : 0.15 },
      { className: "Piedra", probability: tijeraScore === 4 ? 0.02 : 0.07 },
    ];
  } else if (papelScore >= 4) {
    const conf = papelScore === 5 ? 0.97 : 0.85;
    gesture = "Papel";
    confidence = conf;
    all = [
      { className: "Papel", probability: conf },
      { className: "Tijera", probability: papelScore === 5 ? 0.02 : 0.1 },
      { className: "Piedra", probability: papelScore === 5 ? 0.01 : 0.05 },
    ];
  } else if (extCount >= 3) {
    gesture = "Papel";
    confidence = 0.7;
    all = [
      { className: "Papel", probability: 0.7 },
      { className: "Tijera", probability: 0.2 },
      { className: "Piedra", probability: 0.1 },
    ];
  } else {
    gesture = "Tijera";
    confidence = 0.55;
    all = [
      { className: "Tijera", probability: 0.55 },
      { className: "Papel", probability: 0.25 },
      { className: "Piedra", probability: 0.2 },
    ];
  }

  const total = all.reduce((s, x) => s + x.probability, 0);
  all = all.map((x) => ({ ...x, probability: x.probability / total }));
  return {
    className: gesture,
    probability: confidence,
    all,
    method: "MediaPipe Hands",
  };
}

// ════════════════════════════════════════════════════════════
//  MÉTODO 2: Teachable Machine (fallback)
// ════════════════════════════════════════════════════════════

async function classifyByTM(img) {
  if (!tmModel) throw new Error("Teachable Machine no disponible");

  tmCanvas.width = img.naturalWidth || img.width || 224;
  tmCanvas.height = img.naturalHeight || img.height || 224;
  const ctx = tmCanvas.getContext("2d");
  ctx.clearRect(0, 0, tmCanvas.width, tmCanvas.height);
  ctx.drawImage(img, 0, 0, tmCanvas.width, tmCanvas.height);

  const { pose, posenetOutput } = await tmModel.estimatePose(tmCanvas);
  const prediction = await tmModel.predict(posenetOutput);

  const top = prediction.reduce((a, b) =>
    a.probability > b.probability ? a : b,
  );
  const all = prediction.map((p) => ({
    className: p.className,
    probability: p.probability,
  }));

  return {
    className: top.className,
    probability: top.probability,
    all,
    method: "Teachable Machine",
  };
}

// ════════════════════════════════════════════════════════════
//  ANÁLISIS PRINCIPAL — MediaPipe primero, TM de fallback
// ════════════════════════════════════════════════════════════

async function analyzeImage(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
  });

  // ── Intento 1: MediaPipe ──────────────────────────────────
  if (handLandmarker) {
    const results = handLandmarker.detect(img);
    console.log("MediaPipe result:", results);

    if (results.landmarks && results.landmarks.length > 0) {
      console.log("✅ Mano detectada por MediaPipe");
      return classifyByLandmarks(results.landmarks[0]);
    }
    console.warn("⚠️ MediaPipe no detectó mano, usando Teachable Machine...");
  }

  // ── Intento 2: Teachable Machine ─────────────────────────
  if (tmModel) {
    console.log("🔄 Usando Teachable Machine como fallback");
    return await classifyByTM(img);
  }

  throw new Error(
    "No se pudo detectar la mano.\n" +
      "Intenta con mejor iluminación y la mano completamente visible.",
  );
}

// ── Render resultado ──────────────────────────────────────────
function displayResults(result) {
  const emojis = { Piedra: "🪨", Papel: "📄", Tijera: "✂️" };
  const sorted = [...result.all].sort((a, b) => b.probability - a.probability);

  const barsHtml = sorted
    .map((p) => {
      const pct = (p.probability * 100).toFixed(1);
      const isBest = p.className === result.className;
      return `
      <div class="r-bar-row ${isBest ? "best" : ""}">
        <span class="r-bar-label">${p.className}</span>
        <div class="r-bar-track">
          <div class="r-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="r-bar-pct">${pct}%</span>
      </div>`;
    })
    .join("");

  resultCard.innerHTML = `
    <div class="pose-result">
      <div class="r-emoji">${emojis[result.className] ?? "❓"}</div>
      <div class="r-name">${result.className}</div>
      <div class="r-conf">Confianza: ${(result.probability * 100).toFixed(0)}%</div>
      <div class="r-method">via ${result.method}</div>
      <div class="r-bars">${barsHtml}</div>
    </div>`;
}

// ── Botón analizar ────────────────────────────────────────────
analyzeBtn.addEventListener("click", async () => {
  if (!modelsLoaded || !imageData) return;

  resultsSection.classList.remove("hidden");
  if (thumbImg) thumbImg.src = imageData;
  if (resultLoading) resultLoading.classList.remove("hidden");

  resultCard.innerHTML = `
    <div class="pose-loading">
      <div class="pose-spinner"></div>
      <span>Procesando imagen…</span>
    </div>`;

  try {
    const result = await analyzeImage(imageData);
    if (resultLoading) resultLoading.classList.add("hidden");
    displayResults(result);
  } catch (err) {
    if (resultLoading) resultLoading.classList.add("hidden");
    resultCard.innerHTML = `
      <div class="pose-error">
        <span style="font-size:2rem">✋</span>
        <span>${err.message.replace(/\n/g, "<br>")}</span>
      </div>`;
  }
});

// ── Manejo de imagen ──────────────────────────────────────────
function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imageData = e.target.result;
    previewImg.src = imageData;
    previewImg.classList.remove("hidden");
    removeBtn.classList.remove("hidden");
    uploadZone.querySelector(".upload-inner")?.classList.add("hidden");
    analyzeBtn.disabled = !modelsLoaded;
  };
  reader.readAsDataURL(file);
}

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () =>
  uploadZone.classList.remove("drag-over"),
);
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleImageFile(e.target.files[0]);
});

removeBtn.addEventListener("click", () => {
  imageData = null;
  previewImg.src = "";
  previewImg.classList.add("hidden");
  removeBtn.classList.add("hidden");
  uploadZone.querySelector(".upload-inner")?.classList.remove("hidden");
  analyzeBtn.disabled = true;
  resultsSection.classList.add("hidden");
  resultCard.innerHTML = "";
  fileInput.value = "";
});

if (resetBtn) resetBtn.addEventListener("click", () => removeBtn.click());

// ── Cámara ────────────────────────────────────────────────────
cameraBtn.addEventListener("click", async () => {
  cameraModal.classList.remove("hidden");
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    videoEl.srcObject = webcamStream;
  } catch {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoEl.srcObject = webcamStream;
    } catch {
      alert("No se pudo acceder a la cámara.");
      cameraModal.classList.add("hidden");
    }
  }
});

function stopCamera() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
  }
}
closeCamera.addEventListener("click", () => {
  stopCamera();
  cameraModal.classList.add("hidden");
});
captureBtn.addEventListener("click", () => {
  snapCanvas.width = videoEl.videoWidth;
  snapCanvas.height = videoEl.videoHeight;
  snapCanvas.getContext("2d").drawImage(videoEl, 0, 0);
  imageData = snapCanvas.toDataURL("image/jpeg");
  previewImg.src = imageData;
  previewImg.classList.remove("hidden");
  removeBtn.classList.remove("hidden");
  uploadZone.querySelector(".upload-inner")?.classList.add("hidden");
  analyzeBtn.disabled = !modelsLoaded;
  stopCamera();
  cameraModal.classList.add("hidden");
});

// ── Helpers para cargar scripts externos ──────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => setTimeout(resolve, 50);
    s.onerror = () => reject(new Error("No se pudo cargar: " + src));
    document.head.appendChild(s);
  });
}

// ── Arranque — carga ambos modelos en paralelo ────────────────
document.addEventListener("DOMContentLoaded", async () => {
  setModelsReady(false);

  appendStatus("Iniciando PoseAI…");

  const results = await Promise.allSettled([
    // ── Cargar MediaPipe ────────────────────────────────────
    (async () => {
      appendStatus("Cargando MediaPipe Hands…");
      const { HandLandmarker, FilesetResolver } =
        await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm");
      const filesetResolver =
        await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
        runningMode: "IMAGE",
        numHands: 1,
      });
      appendStatus("MediaPipe Hands listo ✓", "ok");
    })(),

    // ── Cargar Teachable Machine ────────────────────────────
    (async () => {
      appendStatus("Cargando Teachable Machine (fallback)…");
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js",
      );
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js",
      );
      if (!window.tmPose) throw new Error("tmPose no disponible");
      tmModel = await window.tmPose.load(
        TM_URL + "model.json",
        TM_URL + "metadata.json",
      );
      tmMaxPredictions = tmModel.getTotalClasses();
      appendStatus(
        `Teachable Machine listo ✓ (${tmMaxPredictions} clases)`,
        "ok",
      );
    })(),
  ]);

  // Verificar qué cargó
  const mpOk = results[0].status === "fulfilled";
  const tmOk = results[1].status === "fulfilled";

  if (!mpOk)
    appendStatus(
      "⚠️ MediaPipe no cargó: " + results[0].reason?.message,
      "warn",
    );
  if (!tmOk)
    appendStatus(
      "⚠️ Teachable Machine no cargó: " + results[1].reason?.message,
      "warn",
    );

  if (!mpOk && !tmOk) {
    appendStatus("❌ No se pudo cargar ningún modelo.", "error");
    setModelsReady(false);
    return;
  }

  appendStatus("✅ Todo listo. Sube una imagen para analizar.", "ok");
  setModelsReady(true);
});
