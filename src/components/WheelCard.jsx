import { useEffect, useRef, useState } from "react";
import SpinWheel from "./SpinWheel";

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

  function startTicking(duration) {
    const startTime = Date.now();
    const totalDuration = duration * 1000;
    currentSegmentRef.current = -1;

    function checkSegment() {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalDuration) {
        tickIntervalRef.current = null;
        return;
      }

      // Obtener la rotación actual del elemento
      const wheelElement = document.querySelector('.spin-wheel');
      if (wheelElement) {
        const style = window.getComputedStyle(wheelElement);
        const transform = style.transform;
        
        if (transform && transform !== 'none') {
          const matrix = transform.match(/matrix\(([^)]+)\)/);
          if (matrix) {
            const values = matrix[1].split(',').map(parseFloat);
            const a = values[0];
            const b = values[1];
            const currentRotation = Math.atan2(b, a) * (180 / Math.PI);
            
            const currentSegment = getCurrentSegmentAtPointer(currentRotation, wheel.options.length);
            
            if (currentSegment !== currentSegmentRef.current && currentSegment !== -1) {
              currentSegmentRef.current = currentSegment;
              playTick();
            }
          }
        }
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
    startTicking(wheel.spinDuration);

    setTimeout(() => {
      onSpin(wheel.id, winnerIndex);
      setIsSpinning(false);
      stopTicking();
      playWinner();
      setShowWinnerOverlay(true);
    }, wheel.spinDuration * 1000);
  }

  // Extraer label e imagen del resultado de forma segura
  const result = wheel.result;
  const resultLabel = result
    ? (typeof result === "object" ? result.label : result)
    : null;
  const resultImage = result && typeof result === "object" ? result.image : null;

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
