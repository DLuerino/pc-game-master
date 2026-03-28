/**
 * PC Game Master: ¿Me Corre?
 * script.js — Lógica principal modular
 * ─────────────────────────────────────
 * Para agregar más juegos: añadí una entrada nueva al objeto `gamesData`.
 * Para agregar más GPUs/CPUs: actualizá `src/js/hardware_db.json`.
 */

"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   1. BASE DE DATOS DE HARDWARE (JSON externo)
   ══════════════════════════════════════════════════════════════════════════ */

let hardwareDatabase = { gpus: {}, cpus: {} };

async function loadHardwareDatabase() {
  try {
    const response = await fetch("./src/js/hardware_db.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.gpus || !data?.cpus) throw new Error("Estructura inválida en hardware_db.json");
    hardwareDatabase = data;
  } catch (error) {
    console.warn("No se pudo cargar hardware_db.json; usando fallback por nombre.", error);
    hardwareDatabase = { gpus: {}, cpus: {} };
  }
}

function estimateGpuBenchmarkByName(name = "") {
  const n = name.toLowerCase();
  if (n.includes("rtx 4090")) return 1000;
  if (n.includes("rtx 4080") || n.includes("rtx 4070 ti")) return 930;
  if (n.includes("rtx 40")) return 820;
  if (n.includes("rtx 30")) return 680;
  if (n.includes("rtx 20")) return 540;
  if (n.includes("rx 79")) return 950;
  if (n.includes("rx 78")) return 830;
  if (n.includes("rx 7")) return 680;
  if (n.includes("rx 6")) return 560;
  if (n.includes("rx 5")) return 430;
  if (n.includes("rx 4")) return 300;
  if (n.includes("gtx 16")) return 350;
  if (n.includes("gtx 10")) return 300;
  if (n.includes("arc")) return 600;
  return 500;
}

function estimateCpuBenchmarkByName(name = "") {
  const n = name.toLowerCase();
  if (n.includes("i9-14") || n.includes("14900")) return 1000;
  if (n.includes("i7-14") || n.includes("14700")) return 940;
  if (n.includes("i5-14")) return 860;
  if (n.includes("i9-13") || n.includes("13900")) return 980;
  if (n.includes("i7-13") || n.includes("13700")) return 920;
  if (n.includes("i5-13") || n.includes("13600")) return 810;
  if (n.includes("i7-12") || n.includes("12700")) return 780;
  if (n.includes("i5-12") || n.includes("12400")) return 610;
  if (n.includes("i9-11") || n.includes("11900")) return 680;
  if (n.includes("i7-11") || n.includes("11700")) return 610;
  if (n.includes("i5-11") || n.includes("11400")) return 510;
  if (n.includes("i9-10") || n.includes("10900")) return 620;
  if (n.includes("i7-10") || n.includes("10700")) return 550;
  if (n.includes("i5-10") || n.includes("10400")) return 430;
  if (n.includes("i9-9") || n.includes("9900")) return 500;
  if (n.includes("i7-9") || n.includes("9700")) return 420;
  if (n.includes("i5-9") || n.includes("9400")) return 340;
  if (n.includes("ryzen 7 3")) return 560;
  if (n.includes("ryzen 5 3")) return 500;
  if (n.includes("ryzen 7 2")) return 420;
  if (n.includes("ryzen 5 2")) return 360;
  if (n.includes("ryzen 7 1")) return 320;
  if (n.includes("ryzen 5 1")) return 300;
  if (n.includes("ryzen 9 7")) return 900;
  if (n.includes("ryzen 7 7")) return 760;
  if (n.includes("ryzen 5 7")) return 680;
  if (n.includes("ryzen 9 5")) return 740;
  if (n.includes("ryzen 7 5")) return 620;
  if (n.includes("ryzen 5 5")) return 530;
  return 560;
}

function getGpuUpscalingFactor(gpu) {
  if (!gpu) return 1.4;
  return gpu.upscalingFactor || (String(gpu.name).includes("RTX") ? 1.6 : 1.4);
}

function getGpuData(gpuKey, gpuLabel = "") {
  const known = hardwareDatabase.gpus[gpuKey];
  if (known) return { ...known };
  const lookupName = gpuLabel || String(gpuKey || "GPU");
  return {
    name: lookupName,
    benchmark: estimateGpuBenchmarkByName(lookupName),
    vram: 8,
    architecture: lookupName.toUpperCase().includes("RTX") ? "nvidia-rtx" : "fallback",
    upscalingFactor: lookupName.toUpperCase().includes("RTX") ? 1.6 : 1.4,
  };
}

function getCpuData(cpuKey, cpuLabel = "") {
  const known = hardwareDatabase.cpus[cpuKey];
  if (known) return { ...known };
  const lookupName = cpuLabel || String(cpuKey || "CPU");
  return { name: lookupName, benchmark: estimateCpuBenchmarkByName(lookupName) };
}

/* ══════════════════════════════════════════════════════════════════════════
   2. BASE DE DATOS DE JUEGOS
   ──────────────────────────────────────────────────────────────────────────
   Estructura base de cada juego:
   {
     name: string,
     genre: string,
     year: number,
     emoji: string,
     minRam: number,
     minVram: number,
     difficulty: number,        // 1-10 (escala de dificultad)
   }
   ══════════════════════════════════════════════════════════════════════════ */

const baseGamesData = {
  "Diablo IV": {
    name: "Diablo IV",
    genre: "Action RPG",
    year: 2023,
    emoji: "👹",
    minRam: 8,
    minVram: 4,
    difficulty: 6,
  },

  "Cyberpunk 2077": {
    name: "Cyberpunk 2077",
    genre: "Action RPG / Open World",
    year: 2020,
    emoji: "🌃",
    minRam: 12,
    minVram: 6,
    difficulty: 9,
  },

  "Elden Ring": {
    name: "Elden Ring",
    genre: "Action RPG / Soulslike",
    year: 2022,
    emoji: "⚔️",
    minRam: 12,
    minVram: 4,
    difficulty: 7,
  },

  "World of Warcraft": {
    name: "World of Warcraft",
    genre: "MMORPG",
    year: 2004,
    emoji: "🐉",
    minRam: 8,
    minVram: 2,
    difficulty: 2,
  },

  "League of Legends": {
    name: "League of Legends",
    genre: "MOBA",
    year: 2009,
    emoji: "🏆",
    minRam: 4,
    minVram: 1,
    difficulty: 2,
    optimizationMultiplier: 2.55,
  },

  "Counter-Strike 2": {
    name: "Counter-Strike 2",
    genre: "FPS competitivo",
    year: 2023,
    emoji: "🎯",
    minRam: 8,
    minVram: 2,
    difficulty: 3,
  },

  /* ── AGREGA MÁS JUEGOS AQUÍ — usa difficulty: 1-10 ── */
};

let gamesData = { ...baseGamesData };
let gameCatalog = [];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inferEmoji(gameName) {
  const n = gameName.toLowerCase();
  if (n.includes("ring") || n.includes("souls")) return "⚔️";
  if (n.includes("cyber")) return "🌃";
  if (n.includes("war") || n.includes("duty")) return "🎯";
  if (n.includes("dota") || n.includes("league")) return "🏆";
  if (n.includes("witcher")) return "🐺";
  if (n.includes("gta") || n.includes("theft")) return "🚗";
  if (n.includes("monster")) return "🐲";
  return "🎮";
}

function parseFirstNumber(regex, text, fallback) {
  const match = text.match(regex);
  if (!match) return fallback;
  return Number.parseInt(match[1], 10);
}

function getOptimizationMultiplierByName(gameName = "") {
  const n = gameName.toLowerCase();
  // Competitivos / eSports: mantener > 1.5 para FPS altos en 1080p
  if (n.includes("counter-strike") || n.includes("cs2")) return 2.85;
  if (n.includes("league") || n.includes("valorant") || n.includes("dota")) return 2.65;
  if (n.includes("warcraft") || n.includes("wow")) return 1.8;
  if (n.includes("diablo")) return 1.15;
  // AAA con FSR/DLSS muy efectivos (open world / acción)
  if (n.includes("cyberpunk")) return 0.62;
  if (n.includes("elden")) return 0.92;
  if (n.includes("witcher") || n.includes("hogwarts") || n.includes("starfield")) return 0.58;
  if (n.includes("red dead") || n.includes("gta")) return 0.82;
  return 1.0;
}

function isEsportsGame(gameName = "") {
  const n = gameName.toLowerCase();
  return n.includes("counter-strike") || n.includes("cs2") || n.includes("league") || n.includes("valorant") || n.includes("dota");
}

function parseGameProfileFromRequirements(record) {
  const raw = `${record.min_req || ""} ${record.rec_req || ""}`;
  const minRam = clamp(parseFirstNumber(/(\d+)\s*GB\s+de\s+RAM/i, raw, 8), 4, 32);

  const graphicsSection = ((record.min_req || "").match(/(gr[aá]ficos|video)[^<]*<\/li>/i) || [record.min_req || ""])[0];
  const minVram = clamp(parseFirstNumber(/(\d+)\s*GB/i, graphicsSection, 4), 1, 16);

  return {
    name: record.name,
    genre: "Juego de PC",
    year: new Date().getFullYear(),
    emoji: inferEmoji(record.name),
    minRam,
    minVram,
    difficulty: record.difficulty || 5,
  };
}

async function loadGamesFromJson() {
  try {
    const response = await fetch("./src/js/games_db.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const records = await response.json();
    if (!Array.isArray(records) || records.length === 0) throw new Error("JSON sin juegos");

    const merged = {};
    records.forEach(record => {
      if (!record || !record.name) return;
      const canonicalName = Object.keys(baseGamesData).find(name => name.toLowerCase() === record.name.toLowerCase());
      if (canonicalName) {
        merged[canonicalName] = { ...baseGamesData[canonicalName] };
      } else {
        merged[record.name] = parseGameProfileFromRequirements(record);
      }
    });

    gamesData = Object.keys(merged).length > 0 ? merged : { ...baseGamesData };
  } catch (error) {
    console.warn("No se pudo cargar games_db.json; usando catálogo local.", error);
    gamesData = { ...baseGamesData };
  }

  gameCatalog = Object.keys(gamesData);
}

/* ══════════════════════════════════════════════════════════════════════════
   3. FAQ DATA — Para SEO
   ══════════════════════════════════════════════════════════════════════════ */

const faqData = [
  {
    q: "¿Cómo optimizo Windows 11 para jugar mejor?",
    a: `Hay varios pasos clave para sacarle el máximo rendimiento a Windows 11 al jugar:
<br><br>
<strong>1. Activar Modo Juego:</strong> Ir a Configuración → Juegos → Modo Juego y activarlo. Esto prioriza recursos de CPU y GPU para el juego activo.
<br><br>
<strong>2. Desactivar Xbox Game Bar y capturas en segundo plano:</strong> En Configuración → Juegos → Xbox Game Bar, apagarlo si no lo usás. El grabado en segundo plano consume hasta un 10% del rendimiento.
<br><br>
<strong>3. Plan de energía alto rendimiento:</strong> En Panel de control → Opciones de energía → Elegir plan de energía de alto rendimiento. En laptops, esto es crítico.
<br><br>
<strong>4. Drivers actualizados:</strong> Mantener los drivers de GPU siempre actualizados (AMD Adrenalin / NVIDIA GeForce Experience). Una actualización de driver puede mejorar FPS hasta un 15% en juegos optimizados.
<br><br>
<strong>5. Desactivar aplicaciones en segundo plano:</strong> Ctrl+Alt+Supr → Administrador de tareas → Ver qué consume CPU/RAM y cerrarlo antes de jugar.`,
  },
  {
    q: "¿Cuánta RAM necesito para jugar en 2025?",
    a: `La RAM óptima para gaming en 2025 es <strong>16 GB</strong> como mínimo funcional. Aquí el desglose:
<br><br>
<strong>8 GB RAM:</strong> Suficiente para juegos antiguos o eSports competitivos (LoL, CS2, Valorant). En AAA modernos como Cyberpunk 2077 o Hogwarts Legacy podés notar stuttering y tiempos de carga más largos.
<br><br>
<strong>16 GB RAM:</strong> El estándar actual. Permite jugar cualquier título moderno con comodidad y mantener el navegador abierto al mismo tiempo.
<br><br>
<strong>32 GB RAM:</strong> Ideal si jugás títulos de mundo abierto muy exigentes, usás mods pesados (Skyrim, Minecraft con shaderpacks) o hacés streaming mientras jugás.
<br><br>
También importa el tipo y frecuencia: <strong>DDR4-3200 MHz</strong> o superior es recomendable. Con procesadores AMD Ryzen, la velocidad de RAM afecta directamente el rendimiento del procesador gráfico integrado.`,
  },
  {
    q: "¿Qué es el VRAM y por qué importa en los juegos?",
    a: `La <strong>VRAM (Video RAM)</strong> es la memoria dedicada de tu tarjeta gráfica, y es fundamental para el rendimiento en juegos modernos.
<br><br>
<strong>¿Qué almacena la VRAM?</strong> Texturas del juego, sombras, efectos de iluminación, fotogramas renderizados. Cuanto más alta la resolución y calidad gráfica, más VRAM necesitás.
<br><br>
<strong>Guía por cantidad de VRAM:</strong><br>
• <strong>4 GB:</strong> Suficiente para 1080p en calidad baja/media en juegos de hace 2-3 años.<br>
• <strong>6 GB:</strong> Aceptable para 1080p en la mayoría de juegos actuales en calidad media.<br>
• <strong>8 GB:</strong> El estándar actual para 1080p en calidad alta y 1440p en media.<br>
• <strong>12 GB+:</strong> Necesario para 1440p Ultra o 4K, y para juegos con texturas en alta resolución (4K texture packs).
<br><br>
Si tu VRAM se satura, el juego empieza a usar la RAM del sistema como reemplazo, lo que causa bajones de FPS severos y stuttering. Por eso, la RX 6600 XT con 8 GB y la RTX 3060 con 12 GB son tan populares para gaming en 1080p/1440p.`,
  },
  {
    q: "¿Qué es mejor para gaming: AMD o NVIDIA en 2025?",
    a: `Ambas marcas ofrecen excelentes opciones en 2025, y la mejor elección depende de tu uso específico:
<br><br>
<strong>AMD Radeon (RX 6000 / RX 7000):</strong><br>
✅ Mejor relación precio/rendimiento en rasterización pura<br>
✅ Más VRAM por el precio (ej: RX 6700 XT 12GB vs RTX 3060 Ti 8GB)<br>
✅ Open source: compatibilidad en Linux superior<br>
❌ Ray tracing inferior en equivalentes de precio<br>
❌ FSR (FidelityFX Super Resolution) es bueno pero no tan eficiente como DLSS 3
<br><br>
<strong>NVIDIA GeForce (RTX 3000 / RTX 4000):</strong><br>
✅ DLSS 3 con Frame Generation: hasta 2x más FPS en juegos compatibles<br>
✅ Mejor Ray Tracing y Path Tracing<br>
✅ Ecosistema maduro: RTX Video, NVENC encoder para streaming<br>
❌ Menos VRAM por el precio en gama media<br>
❌ Precio premium vs AMD en misma clase de rendimiento
<br><br>
<strong>Veredicto 2025:</strong> Para jugar en 1080p con presupuesto ajustado → AMD. Para Ray Tracing, 1440p/4K o streaming con calidad → NVIDIA.`,
  },
  {
    q: "¿Cómo mejorar los FPS sin cambiar hardware?",
    a: `Antes de invertir en nuevo hardware, probá estas optimizaciones de software que pueden subir tus FPS entre un 10% y un 30%:
<br><br>
<strong>Configuración de juego:</strong><br>
• Bajá Sombras a Media: es el ajuste que más CPU/GPU consume, con poco impacto visual en movimiento<br>
• Desactivá Oclusión Ambiental (AO) o bajala a SSAO (en lugar de HBAO+/GTAO)<br>
• Activá FSR 2/3 (AMD) o DLSS (NVIDIA) si el juego lo soporta — podés ganar 30-50% de FPS<br>
• Limitá los FPS al doble del Hz de tu monitor para evitar recalentamiento innecesario
<br><br>
<strong>Sistema operativo:</strong><br>
• Desfragmentá el HDD o revisá el estado del SSD (CrystalDiskInfo es gratis)<br>
• Desactivá el arranque rápido de Windows (causa issues de rendimiento en algunos sistemas)<br>
• Actualizá DirectX y Visual C++ Redistributable desde Microsoft
<br><br>
<strong>Drivers y software:</strong><br>
• AMD: activá Radeon Anti-Lag 2 y desactivá Virtual Super Resolution<br>
• NVIDIA: en Panel de Control NVIDIA → Administrar configuración 3D → Activar "Modo de baja latencia" en Máximo<br>
• Desactivá Vsync en el juego (usá G-Sync o FreeSync en su lugar si tenés el monitor compatible)`,
  },
  {
    q: "¿Qué resolución debo elegir: 1080p, 1440p o 4K?",
    a: `La resolución ideal depende de tu monitor, GPU y tipo de juego:
<br><br>
<strong>1080p (Full HD):</strong> La resolución más popular en gaming. Ideal para GPUs de gama media como RX 6600 XT, RTX 3060 o RTX 4060. Para juegos competitivos (LoL, CS2, Valorant), 1080p + alta tasa de refresco (144Hz+) es la combinación ganadora.
<br><br>
<strong>1440p (2K / QHD):</strong> El sweet spot en 2025 para gaming premium. Requiere GPU como RX 6700 XT, RTX 3070 o superior. Ofrece imagen notablemente más nítida que 1080p, especialmente en monitores de 27"+.
<br><br>
<strong>4K (Ultra HD):</strong> Para los setups más potentes. Necesitás una RX 7900 XTX, RTX 4080 o RTX 4090 para jugar en Ultra/Alto con buena tasa de fotogramas. DLSS 3 y FSR 3 ayudan mucho en esta resolución.
<br><br>
<strong>Consejo:</strong> No tiene sentido tener una GPU de 4K con un monitor de 1080p, ni viceversa. Equilibrá tu GPU con la resolución de tu monitor actual.`,
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   4. MOTOR DE ANÁLISIS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Calcula el resultado de compatibilidad dado el hardware y el juego.
 * @param {string} gpuKey - Clave de hardwareDatabase.gpus
 * @param {string} cpuKey - Clave de hardwareDatabase.cpus
 * @param {number} ram    - GB de RAM
 * @param {string} gameName - Nombre del juego en gamesData
 * @param {boolean} scalingEnabled - aplica bonus de DLSS/FSR si esta activo
 * @param {string} gpuLabel - texto visible del selector GPU
 * @param {string} cpuLabel - texto visible del selector CPU
 * @returns {object} resultado
 */
function analyzeCompatibility(gpuKey, cpuKey, ram, gameName, scalingEnabled, gpuLabel = "", cpuLabel = "") {
  const gpu  = getGpuData(gpuKey, gpuLabel);
  const cpu  = getCpuData(cpuKey, cpuLabel);
  const game = gamesData[gameName];

  if (!gpu || !cpu || !game) return null;

  const issues = [];
  const warnings = [];
  
  const difficulty = game.difficulty || 5;
  const engineOpt = game.engine_optimization || 1.0;
  const cpuDep = game.cpu_dependency || 1.0;
  const minPtsNeeded = Math.round(difficulty * 10);
  
  if (gpu.benchmark < minPtsNeeded) issues.push(`GPU insuficiente: necesitás ${minPtsNeeded} pts, tenés ${gpu.benchmark} pts`);
  if (ram < game.minRam) issues.push(`RAM insuficiente (mínimo ${game.minRam} GB)`);
  if (gpu.vram < game.minVram) issues.push(`VRAM insuficiente (mínimo ${game.minVram} GB)`);

  // Fórmula con engine_optimization:
  // baseFps = (gpuPower / (difficulty * 1.5)) * 1.1 * engine_optimization
  const baseFps = (gpu.benchmark / (difficulty * 1.5)) * 1.1 * engineOpt;
  
  // Impacto de CPU según cpu_dependency:
  // cpuImpact = (cpu.benchmark / gpu.benchmark) * cpu_dependency
  // finalFps = baseFps * (0.7 + 0.3 * cpuImpact)
  const cpuImpact = (cpu.benchmark / gpu.benchmark) * cpuDep;
  let finalFps = baseFps * (0.7 + (0.3 * cpuImpact));
  
  // Aplicar FSR/DLSS: +40% si está habilitado
  let fsrMultiplier = 1.0;
  let optimizationNote = "";
  if (scalingEnabled) {
    fsrMultiplier = 1.4;
    const techName = (gpu.name || "").toLowerCase().includes("rtx") ? "DLSS" : "FSR";
    optimizationNote = `${techName} activo (+40% FPS)`;
  }
  finalFps *= fsrMultiplier;
  
  // Penalización por VRAM insuficiente
  let vramPenaltyApplied = false;
  if (gpu.vram < game.minVram) {
    finalFps *= 0.70;
    vramPenaltyApplied = true;
    warnings.push("VRAM insuficiente: stuttering esperado");
  }

  // Penalización por RAM borderline
  let ramPenaltyApplied = false;
  if (ram < game.minRam) {
    finalFps *= 0.80;
    ramPenaltyApplied = true;
  } else if (ram < game.minRam + 4) {
    finalFps *= 0.92;
    warnings.push("RAM borderline - posible stuttering");
  }

  // CPU Bottleneck: si CPU < GPU, Hard Cap en 100 FPS
  let bottleneckApplied = false;
  const cpuGpuRatio = cpu.benchmark / gpu.benchmark;
  if (cpuGpuRatio < 1.0) {
    bottleneckApplied = true;
    finalFps = Math.min(finalFps, 100);
    warnings.push(`CPU Bottleneck: CPU al ${Math.round(cpuGpuRatio * 100)}% de GPU (Hard Cap: 100 FPS)`);
  }

  const fpsAverage = clamp(Math.round(finalFps), 10, 200);
  const fpsMin = clamp(Math.round(fpsAverage * 0.85), 10, 200);
  const fpsMax = clamp(Math.round(fpsAverage * 1.15), 10, 200);

  // Determinación de TIER basada en FPS:
  // > 60: Calidad Alta (Verde)
  // 30-60: Calidad Media (Amarillo)
  // < 30: Calidad Baja (Rojo)
  let tier = "LOW";
  if (finalFps > 60) {
    tier = "HIGH";
  } else if (finalFps >= 30) {
    tier = "MEDIUM";
  } else {
    tier = "LOW";
  }

  const monitorNotes = [];
  if (fpsMax > 60) monitorNotes.push("Rendimiento ideal para 60Hz+");
  if (fpsMax >= 144) monitorNotes.push("Perfecto para 144Hz+");

  return {
    tier,
    fpsMin,
    fpsMax,
    fpsAverage,
    rawFps: Math.round(finalFps * 10) / 10,
    fsrMultiplier,
    scalingEnabled,
    optimizationNote,
    engineOpt,
    cpuDep,
    cpuImpact: Math.round(cpuImpact * 100) / 100,
    bottleneckApplied,
    cpuGpuRatio: Math.round(cpuGpuRatio * 100),
    vramPenaltyApplied,
    ramPenaltyApplied,
    difficulty,
    warnings,
    monitorNotes,
    gpu, cpu, ram, game,
    issues,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   5. RENDERIZADO DE RESULTADOS
   ══════════════════════════════════════════════════════════════════════════ */

const tierLabels = {
  LOW:      { label: "CALIDAD BAJA",    emoji: "⚠️", desc: "Menos de 30 FPS - Rojo", color: "#ef4444" },
  MEDIUM:   { label: "CALIDAD MEDIA",   emoji: "✅", desc: "30-60 FPS - Amarillo", color: "#eab308" },
  HIGH:     { label: "CALIDAD ALTA",    emoji: "🔥", desc: "Más de 60 FPS - Verde", color: "#22c55e" },
};

const tierBarWidths = { LOW: "30%", MEDIUM: "60%", HIGH: "100%" };

function renderResult(result) {
  if (!result) return "<p class='text-red-400 font-mono text-sm'>Error al calcular. Verificá los datos.</p>";

  const t = result.tier;
  const tInfo = tierLabels[t];
  const barWidth = tierBarWidths[t];

  const issuesHtml = result.issues.length > 0
    ? `<div class="mt-4 space-y-1">
        ${result.issues.map(w => `<div class="flex items-center gap-2 text-yellow-400 font-mono text-xs"><span>⚠</span><span>${w}</span></div>`).join("")}
       </div>`
    : "";

  const warningsHtml = result.warnings && result.warnings.length > 0
    ? `<div class="mt-3 space-y-1 border-t border-[#1a2e1a] pt-3">
        ${result.warnings.map(w => `<p class="text-[#eab308] font-mono text-xs">⚠ ${w}</p>`).join("")}
       </div>`
    : "";

  const notesSection = result.monitorNotes && result.monitorNotes.length > 0
    ? `<div class="mt-3 pt-3 border-t border-[#1a2e1a] space-y-1">
        ${result.monitorNotes.map(n => `<p class="text-[11px] text-[#7aa57a] font-mono">${n}</p>`).join("")}
       </div>`
    : "";

  const perfModeColor = result.scalingEnabled ? "#39ff14" : "#7a9a7a";
  const perfModeText = result.scalingEnabled 
    ? "MODO: ESCALADO ACTIVO (1.4x)" 
    : "MODO: RESOLUCIÓN NATIVA";

  const fpsSection = `
    <div class="text-center">
        <div class="text-[10px] font-mono text-[#4a6a4a] mb-1 tracking-widest uppercase">FPS estimados · 1080p</div>
        <div class="fps-number font-orbitron font-black text-5xl md:text-6xl" style="color: ${tInfo.color}">
          ${result.fpsMin}<span class="text-2xl opacity-50">–</span>${result.fpsMax}
        </div>
        <div class="text-[#4a6a4a] font-mono text-xs mt-1">fotogramas por segundo</div>
        <span id="performance-mode" class="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider" style="color: ${perfModeColor}; background: ${result.scalingEnabled ? 'rgba(57,255,20,0.1)' : 'rgba(122,154,122,0.1)'}; border: 1px solid ${perfModeColor}40;">${perfModeText}</span>
       </div>`;

  return `
    <div class="result-card game-card rounded-2xl overflow-hidden" style="box-shadow: inset 0 0 40px rgba(57,255,20,0.04);">

      <!-- Header de resultado -->
      <div class="bg-[#0a120a] border-b border-[#1a2e1a] px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-[10px] font-mono text-[#4a6a4a] tracking-widest mb-1">// RESULTADO PARA</div>
          <div class="font-orbitron font-black text-white text-xl">${result.game.emoji} ${result.game.name}</div>
          <div class="text-[#3a5a3a] font-mono text-xs mt-0.5">${result.game.genre} · ${result.game.year}</div>
        </div>
        <div class="text-right">
          <div class="text-2xl mb-1">${tInfo.emoji}</div>
          <div class="font-orbitron font-bold text-sm tier-${t}">${tInfo.label}</div>
          <div class="text-[#3a5a3a] font-mono text-[10px] mt-0.5">${tInfo.desc}</div>
        </div>
      </div>

      <div class="p-6 space-y-6">

        <!-- FPS y barra de rendimiento -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          ${fpsSection}

          <div>
            <div class="text-[10px] font-mono text-[#4a6a4a] mb-3 tracking-widest uppercase">Rendimiento general</div>
            <!-- Barras de calidad -->
            ${["LOW","MEDIUM","HIGH"].map(lvl => {
              const isActive = (
                (lvl === "LOW" && ["LOW","MEDIUM","HIGH"].includes(t)) ||
                (lvl === "MEDIUM" && ["MEDIUM","HIGH"].includes(t)) ||
                (lvl === "HIGH" && t === "HIGH")
              );
              const labels = { LOW:"Baja (Rojo)", MEDIUM:"Media (Amarillo)", HIGH:"Alta (Verde)" };
              const colors = { LOW: "#ef4444", MEDIUM: "#eab308", HIGH: "#22c55e" };
              const width = { LOW: "30%", MEDIUM: "60%", HIGH: "100%" };
              return `
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-20 text-[10px] font-mono text-right ${isActive ? "" : "text-[#2a3a2a]"}" style="${isActive ? `color: ${colors[lvl]}` : ""}">${labels[lvl]}</div>
                  <div class="flex-1 h-2 bg-[#0d110d] rounded-full overflow-hidden border border-[#1a2e1a]">
                    ${isActive ? `<div class="h-full rounded-full" style="width:${width[lvl]}; background-color: ${colors[lvl]}"></div>` : ""}
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>

        ${renderCommunityTips(result)}

        <!-- Specs de tu PC -->
        <div class="bg-[#0a0e0a] rounded-xl p-4 border border-[#1a2e1a]">
          <div class="text-[10px] font-mono text-[#4a6a4a] mb-3 tracking-widest uppercase">// Tu configuración analizada</div>
          <div class="grid grid-cols-3 gap-3">
            <div class="text-center">
              <div class="text-[10px] font-mono text-[#3a5a3a] mb-1">GPU</div>
              <div class="font-mono text-xs text-[#7a9a7a]">${result.gpu.name}</div>
            </div>
            <div class="text-center border-x border-[#1a2e1a]">
              <div class="text-[10px] font-mono text-[#3a5a3a] mb-1">CPU</div>
              <div class="font-mono text-xs text-[#7a9a7a]">${result.cpu.name}</div>
            </div>
            <div class="text-center">
              <div class="text-[10px] font-mono text-[#3a5a3a] mb-1">RAM</div>
              <div class="font-mono text-xs text-[#7a9a7a]">${result.ram} GB</div>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-[#1a2e1a] grid grid-cols-1 md:grid-cols-3 gap-2">
            <p class="text-[11px] font-mono text-[#6f926f]">GPU Power: <span class="text-[#9fd89f]">${result.gpu.benchmark} pts</span></p>
            <p class="text-[11px] font-mono text-[#6f926f]">CPU Score: <span class="text-[#9fd89f]">${result.cpu.benchmark} pts</span></p>
            <p class="text-[11px] font-mono text-[#6f926f]">Dificultad: <span class="text-[#9fd89f]">${result.difficulty}/10</span></p>
          </div>
          ${issuesHtml}
          ${warningsHtml}
          ${notesSection}
        </div>

        <!-- Tips según el resultado -->
        ${renderTips(result)}

      </div>
    </div>
  `;
}

function renderCommunityTips(result) {
  const gameName = (result?.game?.name || "").toLowerCase();
  let tips = [];

  if (gameName.includes("cyberpunk")) {
    tips = [
      "Bajá Nubes Volumétricas y Reflejos SSR a Medio para estabilizar picos de GPU.",
      "Activá FSR o DLSS en modo Calidad para subir FPS sin perder demasiada nitidez.",
      "Desactivá Ray Tracing en presets medios si priorizás fluidez sobre fidelidad visual."
    ];
  } else if (gameName.includes("red dead") || gameName.includes("rdr2")) {
    tips = [
      "Reducí Calidad de Agua y Física de Agua: son de los ajustes más costosos en RDR2.",
      "Bajá TAA Sharpen y Sombras Lejanas para evitar stutter en zonas con mucha vegetación.",
      "Usá FSR en modo Calidad y dejá Texturas en Alto para equilibrar imagen y rendimiento."
    ];
  } else {
    tips = [
      "Cerrá apps en segundo plano antes de jugar para liberar RAM y CPU.",
      "Mantené drivers de GPU actualizados y activá el modo de energía de alto rendimiento.",
      "Probá bajar sombras primero: suele dar la mejor mejora de FPS con poco impacto visual."
    ];
  }

  return `
    <div class="bg-[#0a120a] rounded-xl border border-[#1a2e1a] p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 class="font-orbitron text-sm sm:text-base text-[#9fd89f] tracking-wide">Configuración Recomendada por Usuarios</h3>
        <span class="text-[10px] font-mono text-[#4a6a4a]">// Tips de la comunidad</span>
      </div>

      <ul class="space-y-2 mb-4">
        ${tips.map((tip) => `<li class="text-xs sm:text-sm text-[#7a9a7a] font-mono leading-relaxed">• ${tip}</li>`).join("")}
      </ul>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <a
          href="https://forms.gle/m9mU318bhJvzAGRP6"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-orbitron font-bold text-xs sm:text-sm tracking-wide text-black bg-[#39ff14] hover:brightness-110 transition"
        >
          <span>💬</span>
          <span>Reportar mis FPS Reales</span>
        </a>
        <p class="text-[11px] sm:text-xs font-mono text-[#5f7f5f]">Ayúdanos a calibrar el motor para Latinoamérica</p>
      </div>
      <div class="mt-4">
        <button id="btn-generate-report" onclick="generateReport()" class="w-full py-3 px-4 rounded-xl font-mono text-sm tracking-wider transition-all duration-200 flex items-center justify-center gap-2" style="background: linear-gradient(135deg, #0d110d 0%, #1a2e1a 100%); border: 1px solid #39ff14; color: #39ff14;" onmouseover="this.style.boxShadow='0 0 20px rgba(57,255,20,0.4)'" onmouseout="this.style.boxShadow='none'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          📸 Generar Ficha Técnica
        </button>
      </div>
    </div>
  `;
}

function renderTips(result) {
  const t = result.tier;
  if (t === "LOW") {
    return `<div class="rounded-xl p-4 border" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3);">
      <div class="text-[10px] font-mono mb-2 tracking-widest" style="color: #ef4444;">// TIPS PARA MEJORAR (ROJO)</div>
      <ul class="space-y-1.5">
        <li class="font-mono text-xs" style="color: rgba(239,68,68,0.8);">→ Bajá sombras a "Baja" o "Apagado" — mayor impacto en FPS</li>
        <li class="font-mono text-xs" style="color: rgba(239,68,68,0.8);">→ Activá FSR 2 (AMD) o DLSS (NVIDIA) si el juego lo soporta</li>
        <li class="font-mono text-xs" style="color: rgba(239,68,68,0.8);">→ Reducí la resolución a 900p puede darte un 20-30% más de FPS</li>
      </ul>
    </div>`;
  }
  if (t === "MEDIUM") {
    return `<div class="rounded-xl p-4 border" style="background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.3);">
      <div class="text-[10px] font-mono mb-2 tracking-widest" style="color: #eab308;">// TIPS PARA EXPRIMIR MÁS (AMARILLO)</div>
      <ul class="space-y-1.5">
        <li class="font-mono text-xs" style="color: rgba(234,179,8,0.8);">→ Activá ReBAR (Resizable BAR) en BIOS si tu placa lo soporta</li>
        <li class="font-mono text-xs" style="color: rgba(234,179,8,0.8);">→ Ajustá las sombras — podés subirlas a Alta con poco impacto</li>
        <li class="font-mono text-xs" style="color: rgba(234,179,8,0.8);">→ Activá DLSS/FSR si el juego lo soporta</li>
      </ul>
    </div>`;
  }
  if (t === "HIGH") {
    return `<div class="rounded-xl p-4 border" style="background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3);">
      <div class="text-[10px] font-mono mb-2 tracking-widest" style="color: #22c55e;">// ¡LISTO PARA JUGAR! (VERDE)</div>
      <ul class="space-y-1.5">
        <li class="font-mono text-xs" style="color: rgba(34,197,94,0.8);">→ Tu PC está optimizada para este juego — activá Ray Tracing si está disponible</li>
        <li class="font-mono text-xs" style="color: rgba(34,197,94,0.8);">→ Considerá usar G-Sync o FreeSync para una experiencia aún más fluida</li>
        <li class="font-mono text-xs" style="color: rgba(34,197,94,0.8);">→ Si querés, podés subir a 1440p o 4K con este hardware</li>
      </ul>
    </div>`;
  }
  return "";
}

/* ══════════════════════════════════════════════════════════════════════════
   6. SHARE CARD GENERATOR
   ══════════════════════════════════════════════════════════════════════════ */

function generateReport() {
  const resultArea = document.getElementById("result-area");
  if (!resultArea || !resultArea.innerHTML.trim()) {
    alert("Primero realizá un análisis para generar la ficha.");
    return;
  }

  const result = window._currentResult;
  if (!result) {
    alert("No se encontró el resultado del análisis.");
    return;
  }

  const template = document.getElementById("share-card-template");
  if (!template) return;

  const tierColors = { LOW: "#ef4444", MEDIUM: "#eab308", HIGH: "#22c55e", ULTRA: "#00cfff" };
  const tierNames = { LOW: "CALIDAD BAJA", MEDIUM: "CALIDAD MEDIA", HIGH: "CALIDAD ALTA", ULTRA: "RENDIMIENTO ULTRA" };
  const tierBg = { LOW: "rgba(239,68,68,0.15)", MEDIUM: "rgba(234,179,8,0.15)", HIGH: "rgba(34,197,94,0.15)", ULTRA: "rgba(0,207,255,0.15)" };

  const perfModeText = result.scalingEnabled ? "MODO: ESCALADO ACTIVO (1.4x)" : "MODO: RESOLUCIÓN NATIVA";
  const perfModeColor = result.scalingEnabled ? "#39ff14" : "#7a9a7a";

  template.innerHTML = `
    <div style="width: 540px; padding: 40px 36px; background: #080a08; font-family: 'Share Tech Mono', monospace; color: #c8d8c8; box-sizing: border-box; border: 2px solid #39ff14; box-shadow: 0 0 40px rgba(57,255,20,0.2);">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #1a2e1a;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border: 2px solid #39ff14; border-radius: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(57,255,20,0.4);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#39ff14" stroke-width="2"><rect x="2" y="4" width="20" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M9 9h1M14 9h1M11.5 11V9.5M11.5 9.5H10M11.5 9.5H13"/></svg>
          </div>
          <span style="font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 16px; color: #39ff14; text-shadow: 0 0 10px rgba(57,255,20,0.5); letter-spacing: 2px;">PC GAME MASTER</span>
        </div>
        <div style="font-size: 10px; color: #4a6a4a; letter-spacing: 1px;">REPORTE DE RENDIMIENTO</div>
      </div>

      <!-- Game Name & Tier -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 11px; color: #4a6a4a; letter-spacing: 3px; margin-bottom: 8px;">// ANÁLISIS PARA</div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 12px;">${result.game.emoji} ${result.game.name}</div>
        <div style="display: inline-block; padding: 8px 20px; background: ${tierBg[result.tier] || tierBg.HIGH}; border: 1px solid ${tierColors[result.tier] || tierColors.HIGH}; border-radius: 6px;">
          <span style="font-size: 14px; font-weight: 700; color: ${tierColors[result.tier] || tierColors.HIGH}; text-shadow: 0 0 10px ${tierColors[result.tier] || tierColors.HIGH};">${tierNames[result.tier] || tierNames.HIGH}</span>
        </div>
      </div>

      <!-- FPS Display -->
      <div style="text-align: center; padding: 24px; background: #0d110d; border: 1px solid #1a2e1a; border-radius: 12px; margin-bottom: 20px;">
        <div style="font-size: 10px; color: #4a6a4a; letter-spacing: 3px; margin-bottom: 8px;">FPS ESTIMADOS · 1080P</div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 64px; font-weight: 900; color: ${tierColors[result.tier] || tierColors.HIGH}; text-shadow: 0 0 30px ${tierColors[result.tier] || tierColors.HIGH}; line-height: 1;">
          ${result.fpsMin}<span style="font-size: 36px; opacity: 0.5; margin: 0 8px;">–</span>${result.fpsMax}
        </div>
        <div style="font-size: 12px; color: #4a6a4a; margin-top: 8px;">fotogramas por segundo</div>
        <div style="margin-top: 12px;">
          <span style="display: inline-block; padding: 4px 12px; font-size: 10px; letter-spacing: 1px; color: ${perfModeColor}; background: ${result.scalingEnabled ? 'rgba(57,255,20,0.1)' : 'rgba(122,154,122,0.1)'}; border: 1px solid ${perfModeColor}; border-radius: 4px;">${perfModeText}</span>
        </div>
      </div>

      <!-- Specs Grid -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
        <div style="text-align: center; padding: 16px 12px; background: #0a0e0a; border: 1px solid #1a2e1a; border-radius: 8px;">
          <div style="font-size: 9px; color: #4a6a4a; letter-spacing: 2px; margin-bottom: 6px;">GPU</div>
          <div style="font-size: 12px; color: #7a9a7a; font-weight: 500;">${result.gpu.name}</div>
        </div>
        <div style="text-align: center; padding: 16px 12px; background: #0a0e0a; border: 1px solid #1a2e1a; border-radius: 8px;">
          <div style="font-size: 9px; color: #4a6a4a; letter-spacing: 2px; margin-bottom: 6px;">CPU</div>
          <div style="font-size: 12px; color: #7a9a7a; font-weight: 500;">${result.cpu.name}</div>
        </div>
        <div style="text-align: center; padding: 16px 12px; background: #0a0e0a; border: 1px solid #1a2e1a; border-radius: 8px;">
          <div style="font-size: 9px; color: #4a6a4a; letter-spacing: 2px; margin-bottom: 6px;">RAM</div>
          <div style="font-size: 12px; color: #7a9a7a; font-weight: 500;">${result.ram} GB</div>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display: flex; justify-content: center; gap: 24px; padding: 14px; background: #0a0e0a; border: 1px solid #1a2e1a; border-radius: 8px; margin-bottom: 24px;">
        <div style="text-align: center;">
          <div style="font-size: 18px; color: #9fd89f; font-weight: 700;">${result.gpu.benchmark} <span style="font-size: 10px; color: #4a6a4a;">PTS</span></div>
          <div style="font-size: 9px; color: #4a6a4a; letter-spacing: 1px;">GPU POWER</div>
        </div>
        <div style="width: 1px; background: #1a2e1a;"></div>
        <div style="text-align: center;">
          <div style="font-size: 18px; color: #9fd89f; font-weight: 700;">${result.cpu.benchmark} <span style="font-size: 10px; color: #4a6a4a;">PTS</span></div>
          <div style="font-size: 9px; color: #4a6a4a; letter-spacing: 1px;">CPU SCORE</div>
        </div>
        <div style="width: 1px; background: #1a2e1a;"></div>
        <div style="text-align: center;">
          <div style="font-size: 18px; color: #9fd89f; font-weight: 700;">${result.difficulty}/10</div>
          <div style="font-size: 9px; color: #4a6a4a; letter-spacing: 1px;">DIFICULTAD</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid #1a2e1a;">
        <div style="font-size: 10px; color: #2a4a2a; letter-spacing: 1px;">${result.game.genre} · ${result.game.year}</div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 10px; color: #2a4a2a; letter-spacing: 1px;">pcgamemaster.github.io</div>
          <div style="width: 32px; height: 32px; border: 1px solid #1a2e1a; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39ff14" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
        </div>
      </div>
    </div>
  `;

  template.classList.remove("hidden");

  setTimeout(() => {
    html2canvas(template, {
      backgroundColor: "#080a08",
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      template.classList.add("hidden");

      const filename = `PC-Master-Report-${result.game.name.replace(/\s+/g, "-")}.png`;

      const handleShare = (blob) => {
        const canShare = navigator.canShare && navigator.canShare({
          files: [new File([blob], filename, { type: "image/png" })]
        });

        if (canShare) {
          navigator.share({
            files: [new File([blob], filename, { type: "image/png" })],
            title: "Mi PC Master Report",
            text: "¡Mirá cómo corre el juego en mi PC!"
          }).catch(err => {
            if (err.name !== "AbortError") {
              console.error("Share failed:", err);
              fallbackDownload(blob, filename);
            }
          });
        } else {
          fallbackDownload(blob, filename);
        }
      };

      const fallbackDownload = (blob, fname) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = fname;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        showDownloadNotice();
      };

      canvas.toBlob(handleShare, "image/png");
    }).catch(err => {
      template.classList.add("hidden");
      console.error("Error generating report:", err);
      alert("Error al generar la ficha técnica.");
    });
  }, 100);
}

function showDownloadNotice() {
  const notice = document.createElement("div");
  notice.id = "download-notice";
  notice.innerHTML = `
    <div style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 9999; 
         background: #0d110d; border: 1px solid #39ff14; border-radius: 12px; padding: 14px 24px;
         box-shadow: 0 0 30px rgba(57,255,20,0.3); font-family: 'Share Tech Mono', monospace;">
      <div style="color: #39ff14; font-size: 13px; display: flex; align-items: center; gap: 10px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39ff14" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Imagen descargada, ¡ya podés compartirla!
      </div>
    </div>
  `;
  document.body.appendChild(notice);
  setTimeout(() => {
    notice.style.transition = "opacity 0.3s ease";
    notice.style.opacity = "0";
    setTimeout(() => notice.remove(), 300);
  }, 3000);
}

/* ══════════════════════════════════════════════════════════════════════════
   7. FAQ RENDERER
   ══════════════════════════════════════════════════════════════════════════ */

function renderFAQ() {
  const container = document.getElementById("faq-container");
  if (!container) return;

  container.innerHTML = faqData.map((item, idx) => `
    <div class="faq-item game-card rounded-xl overflow-hidden" data-idx="${idx}">
      <button class="faq-toggle w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#0f160f] transition-colors">
        <div class="flex items-start gap-3">
          <span class="text-neon font-orbitron text-xs mt-0.5 shrink-0" style="color:#39ff14">Q${String(idx+1).padStart(2,"0")}</span>
          <span class="font-mono text-sm text-[#8aaa8a] font-medium">${item.q}</span>
        </div>
        <span class="faq-icon text-[#39ff14] text-xl leading-none shrink-0">+</span>
      </button>
      <div class="faq-content hidden px-5 text-[#5a7a5a] font-body text-sm leading-relaxed">
        <div class="pb-4 border-t border-[#1a2e1a] pt-4">${item.a}</div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(".faq-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const content = item.querySelector(".faq-content");
      const isOpen = item.classList.contains("open");

      // Cerrar todos
      container.querySelectorAll(".faq-item").forEach(el => {
        el.classList.remove("open");
        el.querySelector(".faq-content").classList.remove("open");
        el.querySelector(".faq-content").classList.add("hidden");
        el.querySelector(".faq-icon").textContent = "+";
      });

      // Abrir el clickeado si estaba cerrado
      if (!isOpen) {
        item.classList.add("open");
        content.classList.remove("hidden");
        content.classList.add("open");
        btn.querySelector(".faq-icon").textContent = "−";
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   7. GAME SEARCH & CHIPS
   ══════════════════════════════════════════════════════════════════════════ */

let selectedGame = "";
let hasRenderedResult = false;

function getCurrentSelections() {
  const gpuSelect = document.getElementById("select-gpu");
  const cpuSelect = document.getElementById("select-cpu");
  return {
    gpuKey: gpuSelect.value,
    cpuKey: cpuSelect.value,
    gpuLabel: gpuSelect.options[gpuSelect.selectedIndex]?.text || "",
    cpuLabel: cpuSelect.options[cpuSelect.selectedIndex]?.text || "",
    ramVal: document.getElementById("select-ram").value,
    scalingEnabled: document.getElementById("toggle-upscaling")?.checked ?? true,
  };
}

function canAnalyzeNow({ gpuKey, cpuKey, ramVal }) {
  return Boolean(gpuKey && cpuKey && ramVal && selectedGame);
}

function runAnalysis({ showValidation = false, withLoader = false, smoothScroll = false } = {}) {
  const resultArea = document.getElementById("result-area");
  const current = getCurrentSelections();

  if (!canAnalyzeNow(current)) {
    if (showValidation) {
      showValidationError(resultArea, { ...current, selectedGame });
    }
    return false;
  }

  const renderFinalResult = () => {
    const result = analyzeCompatibility(
      current.gpuKey,
      current.cpuKey,
      Number.parseInt(current.ramVal, 10),
      selectedGame,
      current.scalingEnabled,
      current.gpuLabel,
      current.cpuLabel
    );
    window._currentResult = result;
    resultArea.classList.remove("hidden");
    resultArea.innerHTML = renderResult(result);
    hasRenderedResult = true;
    if (smoothScroll) {
      resultArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  if (!withLoader) {
    renderFinalResult();
    return true;
  }

  resultArea.classList.remove("hidden");
  resultArea.innerHTML = `
    <div class="game-card rounded-2xl p-10 flex flex-col items-center justify-center gap-4">
      <div class="loader"></div>
      <p class="font-mono text-[#3a5a3a] text-sm">Analizando compatibilidad...</p>
    </div>`;
  setTimeout(renderFinalResult, 500);
  return true;
}

function setupGameSearch() {
  const input = document.getElementById("game-search");
  const suggestions = document.getElementById("game-suggestions");
  const chips = document.getElementById("game-chips");
  if (!input || !suggestions || !chips) return;

  const gameNames = [...gameCatalog];
  chips.innerHTML = `<span class="text-[10px] font-mono text-[#2a4a2a] self-center mr-1">RÁPIDO:</span>`;

  // Generar chips de acceso rápido
  gameNames.slice(0, 8).forEach(name => {
    const chip = document.createElement("button");
    chip.className = "game-chip text-[10px] px-3 py-1.5 rounded-full transition-all";
    chip.textContent = `${gamesData[name].emoji} ${name}`;
    chip.dataset.game = name;
    chip.addEventListener("click", () => {
      selectGame(name);
      chips.querySelectorAll(".game-chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
    });
    chips.appendChild(chip);
  });

  // Búsqueda en tiempo real
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { suggestions.classList.add("hidden"); return; }

    const matches = gameNames.filter(n => n.toLowerCase().includes(q));
    if (matches.length === 0) { suggestions.classList.add("hidden"); return; }

    suggestions.innerHTML = matches.map(n => `
      <div class="suggestion-item px-4 py-3 text-sm flex items-center gap-2" data-game="${n}">
        <span>${gamesData[n].emoji}</span><span>${n}</span>
        <span class="ml-auto text-[10px] text-[#2a4a2a]">${gamesData[n].genre}</span>
      </div>
    `).join("");

    suggestions.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        selectGame(item.dataset.game);
        suggestions.classList.add("hidden");
        // Actualizar chips
        chips.querySelectorAll(".game-chip").forEach(c => {
          c.classList.toggle("selected", c.dataset.game === item.dataset.game);
        });
      });
    });

    suggestions.classList.remove("hidden");
  });

  // Cerrar suggestions al clickear afuera
  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.add("hidden");
    }
  });
}

function selectGame(name) {
  selectedGame = name;
  const input = document.getElementById("game-search");
  if (input) input.value = name;
  runAnalysis({ showValidation: false, withLoader: false, smoothScroll: false });
}

/* ══════════════════════════════════════════════════════════════════════════
   8. BOTÓN ANALIZAR
   ══════════════════════════════════════════════════════════════════════════ */

function setupAnalyzeButton() {
  const btn = document.getElementById("btn-analyze");
  const scalingToggle = document.getElementById("toggle-upscaling");

  if (!btn) return;
  btn.addEventListener("click", () => {
    runAnalysis({ showValidation: true, withLoader: true, smoothScroll: true });
  });

  if (scalingToggle) {
    scalingToggle.addEventListener("change", () => {
      if (hasRenderedResult) {
        runAnalysis({ showValidation: false, withLoader: false, smoothScroll: false });
      }
    });
  }
}

function showValidationError(area, { gpuKey, cpuKey, ramVal, selectedGame }) {
  const missing = [];
  if (!gpuKey)       missing.push("GPU");
  if (!cpuKey)       missing.push("CPU");
  if (!ramVal)       missing.push("RAM");
  if (!selectedGame) missing.push("Juego");

  area.classList.remove("hidden");
  area.innerHTML = `
    <div class="game-card rounded-2xl p-6 border border-red-900/50">
      <div class="flex items-center gap-3">
        <span class="text-2xl">⚠️</span>
        <div>
          <div class="font-orbitron text-red-400 text-sm mb-1">CAMPOS INCOMPLETOS</div>
          <div class="font-mono text-xs text-[#5a3a3a]">Seleccioná: <strong class="text-red-400">${missing.join(", ")}</strong> para continuar</div>
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   9. INIT
   ══════════════════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", async () => {
  await loadHardwareDatabase();
  await loadGamesFromJson();
  setupGameSearch();
  setupAnalyzeButton();
  renderFAQ();

  // Animación de entrada del hero
  const hero = document.querySelector("section");
  if (hero) {
    hero.style.opacity = "0";
    hero.style.transform = "translateY(12px)";
    requestAnimationFrame(() => {
      hero.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      hero.style.opacity = "1";
      hero.style.transform = "translateY(0)";
    });
  }
});
