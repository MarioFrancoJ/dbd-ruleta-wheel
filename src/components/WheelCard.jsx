import { useEffect, useRef, useState } from "react";
import SpinWheel from "./SpinWheel";
import rolesData from "../data/rolesData.json";

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
  const tickIntervalRef = useRef(null);
  const currentSegmentRef = useRef(-1);

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) {
        cancelAnimationFrame(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
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

  function getCurrentSegmentAtPointer(currentRotation, totalSegments) {
    if (totalSegments === 0) return -1;
    
    // Normalizar la rotación actual a 0-360
    const normalizedRotation = ((currentRotation % 360) + 360) % 360;
    
    // El puntero está a 270° (izquierda)
    // Calcular qué segmento está bajo el puntero
    const pointerAngle = 270;
    const anglePerSegment = 360 / totalSegments;
    
    // Ajustar por la rotación de la ruleta
    const effectiveAngle = (pointerAngle - normalizedRotation + 360) % 360;
    
    // Calcular el índice del segmento
    const segmentIndex = Math.floor(effectiveAngle / anglePerSegment) % totalSegments;
    
    return segmentIndex;
  }

  function startTicking(duration, startRotation, endRotation) {
    const startTime = Date.now();
    const totalDuration = duration * 1000;
    const rotationDiff = endRotation - startRotation;
    
    // Inicializar con el segmento actual
    const initialSegment = getCurrentSegmentAtPointer(startRotation, wheel.options.length);
    currentSegmentRef.current = initialSegment;

    // Implementación precisa de cubic-bezier(0.17, 0.67, 0.2, 1)
    function cubicBezier(t) {
      const p0 = 0;
      const p1 = 0.17;
      const p2 = 0.2;
      const p3 = 1;
      
      // Resolver para x usando Newton-Raphson
      let x = t;
      for (let i = 0; i < 8; i++) {
        const z = 3 * (1 - x) * (1 - x) * x * p1 + 3 * (1 - x) * x * x * p2 + x * x * x - t;
        if (Math.abs(z) < 1e-3) break;
        const d = 3 * (1 - x) * (1 - x) * p1 + 6 * (1 - x) * x * (p2 - p1) + 3 * x * x * (1 - p2);
        if (Math.abs(d) < 1e-6) break;
        x = x - z / d;
      }
      
      // Calcular y usando el x encontrado
      const y = 3 * (1 - x) * (1 - x) * x * 0.67 + 3 * (1 - x) * x * x * 1 + x * x * x;
      return y;
    }

    function checkSegment() {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalDuration) {
        tickIntervalRef.current = null;
        return;
      }

      // Calcular la rotación actual basada en el progreso con easing correcto
      const progress = elapsed / totalDuration;
      const easeProgress = cubicBezier(progress);
      
      const currentRotation = startRotation + (rotationDiff * easeProgress);
      const currentSegment = getCurrentSegmentAtPointer(currentRotation, wheel.options.length);
      
      if (currentSegment !== currentSegmentRef.current && currentSegment !== -1) {
        currentSegmentRef.current = currentSegment;
        playTick();
      }

      tickIntervalRef.current = requestAnimationFrame(checkSegment);
    }

    checkSegment();
  }

  function stopTicking() {
    if (tickIntervalRef.current) {
      cancelAnimationFrame(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    currentSegmentRef.current = -1;
  }

  function handleSpin() {
    if (!wheel.options.length || isSpinning) return;
    setShowWinnerOverlay(false);

    const winnerIndex = Math.floor(Math.random() * wheel.options.length);
    const anglePerSegment = 360 / wheel.options.length;

    // El puntero está a la izquierda (270°)
    // Necesitamos rotar para que el centro del segmento ganador quede en el puntero
    const segmentCenter = winnerIndex * anglePerSegment + anglePerSegment / 2;
    const targetAngle = (segmentCenter - 270 + 360) % 360;

    // Normalizamos la rotación actual para evitar acumulación infinita
    const currentNormalized = rotation % 360;
    const extraSpins = 360 * 8;
    const finalRotation = rotation - currentNormalized + extraSpins + targetAngle;

    setIsSpinning(true);
    setRotation(finalRotation);
    startTicking(wheel.spinDuration, rotation, finalRotation);

    setTimeout(() => {
      // Lógica especial para rolesV2: seleccionar variante aleatoria
      if (wheel.id === "rolesV2") {
        const roleName = wheel.options[winnerIndex];
        const roleData = rolesData[roleName];
        
        if (roleData && roleData.variants) {
          const randomVariant = roleData.variants[Math.floor(Math.random() * roleData.variants.length)];
          
          // Crear objeto de resultado con toda la información
          const resultData = {
            roleName: roleName,
            roleImage: roleData.image,
            variant: randomVariant.name,
            difficulty: randomVariant.difficulty,
            perks: randomVariant.perks
          };
          
          onSpin(wheel.id, winnerIndex, resultData);
        } else {
          onSpin(wheel.id, winnerIndex);
        }
      } else {
        onSpin(wheel.id, winnerIndex);
      }
      
      setIsSpinning(false);
      stopTicking();
      playWinner();
      setShowWinnerOverlay(true);
    }, wheel.spinDuration * 1000);
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
        onClick={(e) => { e.preventDefault(); e.currentTarget.blur(); handleSpin(); }}
      >
        <SpinWheel
          options={wheel.options}
          rotation={rotation}
          spinDuration={wheel.spinDuration}
          colors={wheel.colors}
        />

        {showWinnerOverlay && (
          <div className="wheel-card__winner-overlay">
            {wheel.id === "rolesV2" && isRolesV2 ? (
              // Diseño especial para rolesV2
              <div className="roles-v2-result">
                <h2 className="roles-v2-result__title">{result.roleName}</h2>
                
                {resultImage && (
                  <img
                    src={resultImage}
                    alt={result.roleName}
                    className="roles-v2-result__image"
                  />
                )}
                
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
              max="20"
              value={wheel.spinDuration}
              onChange={(e) => onDurationChange(wheel.id, Number(e.target.value))}
            />
          </label>
          <div className="wheel-card__buttons">
            <button
              onClick={() => onShuffle(wheel.id)}
              disabled={isSpinning || wheel.options.length < 2}
            >
              Random
            </button>
          </div>
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
