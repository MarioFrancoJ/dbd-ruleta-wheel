import { useEffect, useRef, useState } from "react";
import SpinWheel from "./SpinWheel";
import rolesData from "../data/rolesData.json";

const ELIMINATION_STORAGE_KEY = "dbd-elimination";

function loadEliminationState(wheelId) {
  try {
    const raw = localStorage.getItem(`${ELIMINATION_STORAGE_KEY}-${wheelId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveEliminationState(wheelId, state) {
  localStorage.setItem(`${ELIMINATION_STORAGE_KEY}-${wheelId}`, JSON.stringify(state));
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
  const [showEliminationModal, setShowEliminationModal] = useState(false);
  const [lastWinnerIndex, setLastWinnerIndex] = useState(null);

  // === Modo Eliminación (todas las ruletas) ===
  const [eliminationMode, setEliminationMode] = useState(() => {
    const saved = loadEliminationState(wheel.id);
    return saved.enabled || false;
  });
  const [usedIndices, setUsedIndices] = useState(() => {
    const saved = loadEliminationState(wheel.id);
    return saved.used || [];
  });

  // Persistir cambios en eliminación
  useEffect(() => {
    saveEliminationState(wheel.id, { enabled: eliminationMode, used: usedIndices });
  }, [eliminationMode, usedIndices, wheel.id]);

  const allUsed = eliminationMode && usedIndices.length >= wheel.options.length;

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

    // En modo Eliminación, mostrar modal de Ganó/Perdió
    if (eliminationMode) {
      setLastWinnerIndex(winnerIndex);
      setShowEliminationModal(true);
    }
  }

  function handleEliminationChoice(won) {
    // Solo eliminar el killer si ganó la partida
    if (won && lastWinnerIndex !== null && !usedIndices.includes(lastWinnerIndex)) {
      setUsedIndices(prev => [...prev, lastWinnerIndex]);
    }
    setShowEliminationModal(false);
    setShowWinnerOverlay(false);
    setLastWinnerIndex(null);
  }

  function handleSpin() {
    if (!wheel.options.length) return;

    // Si modo eliminación activo y todos usados, no girar
    if (allUsed) return;

    setShowWinnerOverlay(false);

    // Seleccionar ganador: si modo eliminación, solo entre disponibles
    let winnerIndex;
    if (eliminationMode) {
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
        onClick={(e) => { e.preventDefault(); e.currentTarget.blur(); if (!allUsed && !showEliminationModal) handleSpin(); }}
      >
        <SpinWheel
          options={wheel.options}
          rotation={rotation}
          spinDuration={wheel.spinDuration}
          colors={wheel.colors}
          usedIndices={eliminationMode ? usedIndices : []}
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

      {/* Modal Eliminación — fuera del visual, al lado derecho */}
      {showEliminationModal && (
        <div className="elimination-modal">
          <p className="elimination-modal__question">¿Resultado de la partida?</p>
          <div className="elimination-modal__buttons">
            <button
              className="elimination-modal__btn elimination-modal__btn--win"
              onClick={() => handleEliminationChoice(true)}
            >
              ✅ Ganó
            </button>
            <button
              className="elimination-modal__btn elimination-modal__btn--lose"
              onClick={() => handleEliminationChoice(false)}
            >
              ❌ Perdió
            </button>
          </div>
        </div>
      )}

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
                ↻ Restaurar eliminados
              </button>
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
        </>
      )}

      {!streamMode && (
        <>
          <div className="wheel-card__options">
            <h3>Opciones</h3>
            {wheel.options.map((option, index) => {
              const optionLabel = typeof option === "object" ? option.label : option;
              const isHidden = usedIndices.includes(index);
              return (
                <div key={`${wheel.id}-${index}`} className={`wheel-card__option-row${isHidden ? ' wheel-card__option-row--hidden' : ''}`}>
                  <input
                    type="text"
                    value={optionLabel}
                    onChange={(e) => onOptionChange(wheel.id, index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                  />
                  <button
                      className={`wheel-card__visibility-toggle${isHidden ? ' wheel-card__visibility-toggle--hidden' : ''}`}
                      onClick={() => {
                        if (isHidden) {
                          setUsedIndices(prev => prev.filter(i => i !== index));
                        } else {
                          setUsedIndices(prev => [...prev, index]);
                        }
                      }}
                      aria-label={isHidden ? 'Mostrar en ruleta' : 'Ocultar de ruleta'}
                      title={isHidden ? 'Mostrar en ruleta' : 'Ocultar de ruleta'}
                    >
                      {isHidden ? (
                        <svg width="22" height="22" viewBox="0 0 640 512" fill="currentColor">
                          <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6C566.7 148.1 469.9 48 320 48c-54.3 0-103.6 15.4-146.3 40.3L38.8 5.1zM223.1 149.5C261.4 116.2 289.8 96 320 96c88.4 0 160 71.6 160 160c0 19.3-3.4 37.8-9.7 54.9L223.1 149.5zM135.5 239.6c0 0 0 .1 0 .1l0 0-.1-.1zM320 416c-88.4 0-173.6-49.9-218.2-134.2c-2.4-4.5-2.4-9.9 0-14.4c16.8-31.7 40.3-60.7 68.5-84.1L109.6 135C66.5 172.6 35.3 218.4 17.5 262.3c-3.3 7.9-3.3 16.7 0 24.6C56.3 379.5 153.1 480 320 480c54.6 0 104.2-15.5 147.1-40.8l-59.8-46.9C378.3 406.4 350.2 416 320 416z"/>
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 576 512" fill="currentColor">
                          <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM288 192a64 64 0 1 1 0 128 64 64 0 1 1 0-128zm0 176a112 112 0 1 0 0-224 112 112 0 1 0 0 224z"/>
                        </svg>
                      )}
                    </button>
                  <button onClick={() => onRemoveOption(wheel.id, index)}>✕</button>
                </div>
              );
            })}
            <button className="wheel-card__add" onClick={() => onAddOption(wheel.id)}>
              Agregar opción
            </button>
          </div>
        </>
      )}

      {!cleanMode && !streamMode && (
        <>
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
                <button onClick={() => onRemoveColor(wheel.id, index)}>✕</button>
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
