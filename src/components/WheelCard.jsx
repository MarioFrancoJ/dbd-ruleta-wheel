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
  cleanMode = false,
  streamMode = false,
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const tickTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tickTimeoutRef.current) {
        clearTimeout(tickTimeoutRef.current);
        tickTimeoutRef.current = null;
      }
    };
  }, []);

  function playTick() {
    const audio = new Audio("/sounds/tick.wav");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }

  function startTicking(duration) {
    const startTime = Date.now();
    const totalDuration = duration * 1000;

    function scheduleNextTick() {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / totalDuration;

      if (progress >= 1) {
        tickTimeoutRef.current = null;
        return;
      }

      playTick();

      const nextDelay = 60 + progress * 220;
      tickTimeoutRef.current = setTimeout(scheduleNextTick, nextDelay);
    }

    scheduleNextTick();
  }

  function stopTicking() {
    if (tickTimeoutRef.current) {
      clearTimeout(tickTimeoutRef.current);
      tickTimeoutRef.current = null;
    }
  }

  function handleSpin() {
    if (!wheel.options.length || isSpinning) return;

    setShowWinnerOverlay(false);

    const winnerIndex = Math.floor(Math.random() * wheel.options.length);
    const anglePerSegment = 360 / wheel.options.length;
    const targetAngle =
      360 - (winnerIndex * anglePerSegment + anglePerSegment / 2);
    const extraSpins = 360 * 6;
    const finalRotation = rotation + extraSpins + targetAngle;

    setIsSpinning(true);
    setRotation(finalRotation);
    startTicking(wheel.spinDuration);

    setTimeout(() => {
      onSpin(wheel.id, winnerIndex);
      setIsSpinning(false);
      stopTicking();
      setShowWinnerOverlay(true);
    }, wheel.spinDuration * 1000);
  }

  const cleanClass = cleanMode ? " wheel-card--clean" : "";
  const streamClass = streamMode ? " wheel-card--stream" : "";
  const visualClass = showWinnerOverlay
    ? "wheel-card__visual wheel-card__visual--winner"
    : "wheel-card__visual";

  return (
    <div className={`wheel-card${cleanClass}${streamClass}`}>
      <div className="wheel-card__header">
        <h2>{wheel.title}</h2>
      </div>

      <div
        className={`${visualClass} wheel-card__visual--clickable`}
        onClick={handleSpin}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSpin();
          }
        }}
      >
        <SpinWheel
          options={wheel.options}
          rotation={rotation}
          spinDuration={wheel.spinDuration}
          colors={wheel.colors}
        />

        {showWinnerOverlay && (
          <div className="wheel-card__winner-overlay">
            <div className="wheel-card__winner-box">
{wheel.result && (
  <>
    {wheel.result.image && (
      <img
        src={wheel.result.image}
        alt={wheel.result.label}
        className="wheel-card__winner-image"
      />
    )}

    <strong className="wheel-card__winner-text">
      {wheel.result.label || wheel.result}
    </strong>
  </>
)}
            </div>
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
            <p>{wheel.result || "Sin resultado todavía"}</p>
          </div>

          <div className="wheel-card__options">
            <h3>Opciones</h3>

            {wheel.options.map((option, index) => (
              <div
                key={`${wheel.id}-${index}`}
                className="wheel-card__option-row"
              >
                <input
                  type="text"
                  value={option.label || option}
                  onChange={(e) =>
                    onOptionChange(wheel.id, index, e.target.value)
                  }
                  placeholder={`Opción ${index + 1}`}
                />

                <button onClick={() => onRemoveOption(wheel.id, index)}>
                  Eliminar
                </button>
              </div>
            ))}

            <button
              className="wheel-card__add"
              onClick={() => onAddOption(wheel.id)}
            >
              Agregar opción
            </button>
          </div>

          <div className="wheel-card__colors">
            <h3>Colores</h3>

            {(wheel.colors || []).map((color, index) => (
              <div
                key={`${wheel.id}-color-${index}`}
                className="wheel-card__color-row"
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) =>
                    onColorChange(wheel.id, index, e.target.value)
                  }
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) =>
                    onColorChange(wheel.id, index, e.target.value)
                  }
                />
                <button onClick={() => onRemoveColor(wheel.id, index)}>
                  Eliminar
                </button>
              </div>
            ))}

            <button
              className="wheel-card__add"
              onClick={() => onAddColor(wheel.id)}
            >
              Agregar color
            </button>
          </div>
        </>
      )}
    </div>
  );
}