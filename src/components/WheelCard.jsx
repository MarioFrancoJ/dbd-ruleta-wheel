import { useEffect, useRef, useState } from "react";
import SpinWheel from "./SpinWheel";
import rolesData from "../data/rolesData.json";

const ELIMINATION_STORAGE_KEY = "dbd-elimination-used";

function loadEliminationState() {
  try {
    const raw = localStorage.getItem(ELIMINATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveEliminationState(state) {
  localStorage.setItem(ELIMINATION_STORAGE_KEY, JSON.stringify(state));
}

export default function WheelCard({
  wheel,
  onSpin,
  onDurationChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onShuffle,
  onColorChange,
  onAddColor,
  onRemoveColor,
  onTitleChange,
  cleanMode = false,
  streamMode = false,
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);

  // === Modo Eliminación (solo para killers) ===
  const isKillers = wheel.id === "killers";
  const [eliminationMode, setEliminationMode] = useState(() => {
    if (!isKillers) return false;
    const saved = loadEliminationState();
    return saved.enabled || false;
  });
  const [usedIndices, setUsedIndices] = useState(() => {
    if (!isKillers) return [];
    const saved = loadEliminationState();
    return saved.used || [];
  });

  // Persistir cambios en eliminación
  useEffect(() => {
    if (!isKillers) return;
    saveEliminationState({ enabled: eliminationMode, used: usedIndices });
  }, [eliminationMode, usedIndices, isKillers]);

  const allUsed = isKillers && eliminationMode && usedIndices.length >= wheel.options.length;

  // Refs para controlar la animación RAF
  const rafRef = useRef(null);
  const spinStateRef = useRef(null);
  const currentRotRef = useRef(0);
  const currentSegmentRef = useRef(-1);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  function playTick() {
    const audio = new Audio("/sounds/tick.wav");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }

  function playWinner() {
    const audio = new Audio("/sounds/winner.wav");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }

  function getCurrentSegmentAtPointer(rot, totalSegments) {
    if (totalSegments === 0) return -1;
    const norm = ((rot % 360) + 360) % 360;
    const anglePerSegment = 360 / totalSegments;
    const effectiveAngle = (270 - norm + 360) % 360;
    return Math.floor(effectiveAngle / anglePerSegment) % totalSegments;
  }

  // cubic-bezier(0.17, 0.67, 0.2, 1)
  function cubicBezier(t) {
    const p1 = 0.17, p2 = 0.2;
    let x = t;
    for (let i = 0; i < 8; i++) {
      const z = 3*(1-x)*(1-x)*x*p1 + 3*(1-x)*x*x*p2 + x*x*x - t;
      if (Math.abs(z) < 1e-3) break;
      const d = 3*(1-x)*(1-x)*p1 + 6*(1-x)*x*(p2-p1) + 3*x*x*(1-p2);
      if (Math.abs(d) < 1e-6) break;
      x = x - z/d;
    }
    return 3*(1-x)*(1-x)*x*0.67 + 3*(1-x)*x*x*1 + x*x*x;
  }

  function animate(timestamp) {
    const state = spinStateRef.current;
    if (!state) return;

    const elapsed = timestamp - state.startTime;
    const progress = Math.min(elapsed / state.duration, 1);
    const eased = cubicBezier(progress);
    const currentRot = state.startRot + (state.endRot - state.startRot) * eased;

    // Actualizar rotación en tiempo real
    currentRotRef.current = currentRot;
    setRotation(currentRot);

    // Tick de audio
    const seg = getCurrentSegmentAtPointer(currentRot, wheel.options.length);
    if (seg !== currentSegmentRef.current && seg !== -1) {
      currentSegmentRef.current = seg;
      playTick();
    }

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // Animación terminada naturalmente
      rafRef.current = null;
      spinStateRef.current = null;
      setIsSpinning(false);
      finishSpin(state.winnerIndex);
    }
  }

  function finishSpin(winnerIndex) {
    // Modo eliminación: marcar killer como usado
    if (isKillers && eliminationMode && !usedIndices.includes(winnerIndex)) {
      setUsedIndices(prev => [...prev, winnerIndex]);
    }

    if (wheel.id === "rolesV2") {
      const roleName = wheel.options[winnerIndex];
      const roleData = rolesData[roleName];
      if (roleData && roleData.variants) {
        const randomVariant = roleData.variants[Math.floor(Math.random() * roleData.variants.length)];
        onSpin(wheel.id, winnerIndex, {
          roleName,
          roleImage: roleData.image,
          variant: randomVariant.name,
          difficulty: randomVariant.difficulty,
          perks: randomVariant.perks,
        });
      } else {
        onSpin(wheel.id, winnerIndex);
      }
    } else {
      onSpin(wheel.id, winnerIndex);
    }
    playWinner();
    setShowWinnerOverlay(true);
  }

  function handleSpin() {
    if (!wheel.options.length) return;

    // Si modo eliminación activo y todos usados, no girar
    if (allUsed) return;

    setShowWinnerOverlay(false);

    // Seleccionar ganador: si modo eliminación, solo entre disponibles
    let winnerIndex;
    if (isKillers && eliminationMode) {
      const availableIndices = wheel.options
        .map((_, i) => i)
        .filter(i => !usedIndices.includes(i));
      if (availableIndices.length === 0) return;
      winnerIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      winnerIndex = Math.floor(Math.random() * wheel.options.length);
    }
    const anglePerSegment = 360 / wheel.options.length;
    const segmentCenter = winnerIndex * anglePerSegment + anglePerSegment / 2;
    const targetAngle = (270 - segmentCenter + 360) % 360;
    const startRot = currentRotRef.current;
    const startNorm = startRot % 360;
    const endRot = startRot - startNorm + 360 * 8 + targetAngle;

    currentSegmentRef.current = getCurrentSegmentAtPointer(startRot, wheel.options.length);

    // Si ya estaba girando, cancelar el RAF anterior antes de iniciar uno nuevo
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    spinStateRef.current = {
      startRot,
      endRot,
      duration: wheel.spinDuration * 1000,
      winnerIndex,
      startTime: null,
    };

    setIsSpinning(true);

    // Iniciamos en el primer frame para capturar el timestamp real
    rafRef.current = requestAnimationFrame((ts) => {
      spinStateRef.current.startTime = ts;
      animate(ts);
    });
  }

  function cancelSpin() {
    if (!isSpinning) return;

    // Cancelar el RAF inmediatamente
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    spinStateRef.current = null;
    currentSegmentRef.current = -1;

    // La ruleta se queda exactamente donde está (currentRotRef ya tiene el valor actual)
    setRotation(currentRotRef.current);
    setIsSpinning(false);
    setShowWinnerOverlay(false);
  }

  // Extraer label e imagen del resultado de forma segura
  const result = wheel.result;
  
  // Determinar si es rolesV2 y tiene datos especiales
  const isRolesV2 = wheel.id === "rolesV2" && result && typeof result === "object" && result.roleName;
  
  let resultLabel, resultImage;
  
  if (isRolesV2) {
    resultLabel = result.roleName;
    resultImage = result.roleImage;
  } else {
    resultLabel = result
      ? (typeof result === "object" ? result.label : result)
      : null;
    resultImage = result && typeof result === "object" ? result.image : null;
  }

  const cleanClass = cleanMode ? " wheel-card--clean" : "";
  const streamClass = streamMode ? " wheel-card--stream" : "";
  const visualClass = showWinnerOverlay
    ? "wheel-card__visual wheel-card__visual--winner"
    : "wheel-card__visual";

  return (
    <div className={`wheel-card${cleanClass}${streamClass}`}>
      <div className="wheel-card__header">
        {!cleanMode && !streamMode ? (
          <input
            className="wheel-card__title-input"
            type="text"
            value={wheel.title}
            onChange={(e) => onTitleChange(wheel.id, e.target.value)}
          />
        ) : (
          <h2>{wheel.title}</h2>
        )}
      </div>

      <div
        className={`${visualClass} wheel-card__visual--clickable`}
        tabIndex={-1}
        onMouseDown={(e) => { e.preventDefault(); e.currentTarget.blur(); }}
        onClick={(e) => { e.preventDefault(); e.currentTarget.blur(); if (!allUsed) handleSpin(); }}
      >
        <SpinWheel
          options={wheel.options}
          rotation={rotation}
          spinDuration={wheel.spinDuration}
          colors={wheel.colors}
          usedIndices={isKillers && eliminationMode ? usedIndices : []}
        />

        {showWinnerOverlay && (
          <div className="wheel-card__winner-overlay">
            {wheel.id === "rolesV2" && isRolesV2 ? (
              // Diseño especial para rolesV2
              <div className="roles-v2-result">
                <h2 className="roles-v2-result__title">{result.roleName}</h2>
                
                <div className="roles-v2-result__perks">
                  {result.perks && result.perks.map((perk, index) => (
                    <img
                      key={index}
                      src={`/Images/Perks/${perk.image}`}
                      alt={perk.name}
                      className="roles-v2-result__perk-icon"
                      title={perk.name}
                    />
                  ))}
                </div>
                
                <div className="roles-v2-result__perk-names">
                  {result.perks && result.perks.map((perk, index) => (
                    <span key={index}>{perk.name}</span>
                  ))}
                </div>
                
                <div className="roles-v2-result__bottom">
                  <div className="roles-v2-result__info">
                    <span className="roles-v2-result__label">Variante</span>
                    <span className="roles-v2-result__value">{result.variant}</span>
                    <span className="roles-v2-result__separator">-</span>
                    <span className="roles-v2-result__label">Dificultad</span>
                    <span className={`roles-v2-result__value ${
                      result.difficulty === 'Fácil' ? 'roles-v2-result__value--facil' :
                      result.difficulty === 'Media' ? 'roles-v2-result__value--media' :
                      result.difficulty === 'Difícil' ? 'roles-v2-result__value--dificil' : ''
                    }`}>
                      {result.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Diseño normal para otras ruletas
              <>
                {resultImage && (
                  <img
                    key={resultImage}
                    src={resultImage}
                    alt={resultLabel}
                    className="wheel-card__winner-image"
                  />
                )}
                {resultLabel && (
                  <strong className="wheel-card__winner-text">
                    {resultLabel}
                  </strong>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!streamMode && (
        <div className="wheel-card__controls">
          <label>
            Tiempo de giro (segundos)
            <input
              type="number"
              min="1"
              max="120"
              value={wheel.spinDuration}
              onChange={(e) => onDurationChange(wheel.id, Number(e.target.value))}
            />
          </label>

          {allUsed && (
            <div className="elimination-message">
              Todos los killers ya fueron utilizados. Reinicia la ruleta.
            </div>
          )}

          <div className="wheel-card__buttons">
            <button
              onClick={() => onShuffle(wheel.id)}
              disabled={isSpinning || wheel.options.length < 2}
            >
              Random
            </button>
            <button
              className="wheel-card__stop-btn"
              onClick={cancelSpin}
              disabled={!isSpinning}
            >
              ⏹ Detener
            </button>
            {isKillers && (
              <>
                <div className="mode-toggle">
                  <span className={`mode-toggle__label ${!eliminationMode ? 'mode-toggle__label--active' : ''}`}>Clásico</span>
                  <button
                    type="button"
                    className={`mode-toggle__switch ${eliminationMode ? 'mode-toggle__switch--on' : ''}`}
                    onClick={() => setEliminationMode(!eliminationMode)}
                    aria-label="Cambiar modo"
                  >
                    <span className="mode-toggle__knob" />
                  </button>
                  <span className={`mode-toggle__label ${eliminationMode ? 'mode-toggle__label--active' : ''}`}>Eliminación</span>
                </div>
                {eliminationMode && (
                  <button
                    className="elimination-toggle__reset"
                    onClick={() => setUsedIndices([])}
                  >
                    ↻ Reiniciar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {streamMode && (
        <div className="wheel-card__stream-controls">
          <button
            className="wheel-card__stop-btn"
            onClick={cancelSpin}
            disabled={!isSpinning}
          >
            ⏹ Detener
          </button>
        </div>
      )}

      {!cleanMode && !streamMode && (
        <>
          <div className="wheel-card__result">
            <strong>Resultado:</strong>
            <p>{resultLabel || "Sin resultado todavía"}</p>
          </div>

          <div className="wheel-card__options">
            <h3>Opciones</h3>
            {wheel.options.map((option, index) => {
              const optionLabel = typeof option === "object" ? option.label : option;
              return (
                <div key={`${wheel.id}-${index}`} className="wheel-card__option-row">
                  <input
                    type="text"
                    value={optionLabel}
                    onChange={(e) => onOptionChange(wheel.id, index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                  />
                  <button onClick={() => onRemoveOption(wheel.id, index)}>Eliminar</button>
                </div>
              );
            })}
            <button className="wheel-card__add" onClick={() => onAddOption(wheel.id)}>
              Agregar opción
            </button>
          </div>

          <div className="wheel-card__colors">
            <h3>Colores</h3>
            {(wheel.colors || []).map((color, index) => (
              <div key={`${wheel.id}-color-${index}`} className="wheel-card__color-row">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(wheel.id, index, e.target.value)}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => onColorChange(wheel.id, index, e.target.value)}
                />
                <button onClick={() => onRemoveColor(wheel.id, index)}>Eliminar</button>
              </div>
            ))}
            <button className="wheel-card__add" onClick={() => onAddColor(wheel.id)}>
              Agregar color
            </button>
          </div>
        </>
      )}
    </div>
  );
}
