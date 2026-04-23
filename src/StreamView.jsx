import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import defaultWheels from "./data/defaultWheels.json";
import WheelCard from "./components/WheelCard";
import { loadWheels } from "./utils/storage";
import "./App.css";

function withInitialResult(wheels) {
  return wheels.map((wheel) => ({
    ...wheel,
    result: wheel.result || "",
    colors: wheel.colors || [
      "#b91c1c",
      "#1f2937",
      "#7c3aed",
      "#0f766e",
      "#1d4ed8",
      "#92400e",
    ],
  }));
}

export default function StreamView() {
  const { wheelId } = useParams();
  
  const [wheels] = useState(() => {
    const saved = loadWheels();
    return saved ? withInitialResult(saved) : withInitialResult(defaultWheels);
  });

  const [selectedWheelId, setSelectedWheelId] = useState(() => {
    // Si hay wheelId en la URL, usarlo; si no, usar "killers"
    if (wheelId && wheels.some(w => w.id === wheelId)) {
      return wheelId;
    }
    return "killers";
  });
  
  const [results, setResults] = useState({});

  // Actualizar selectedWheelId cuando cambie el parámetro de la URL
  useEffect(() => {
    if (wheelId && wheels.some(w => w.id === wheelId)) {
      setSelectedWheelId(wheelId);
    }
  }, [wheelId, wheels]);

  const selectedWheel = useMemo(() => {
    return wheels.find((wheel) => wheel.id === selectedWheelId) || wheels[0];
  }, [wheels, selectedWheelId]);

  function handleSpin(id, winnerIndex, customResult) {
    setResults((current) => ({
      ...current,
      [id]: customResult || selectedWheel.options[winnerIndex] || "",
    }));
  }

  const wheelForRender = {
    ...selectedWheel,
    result: results[selectedWheel.id] || selectedWheel.result || "",
  };

  // Si hay wheelId en la URL, ocultar el selector
  const showSelector = !wheelId;

  return (
    <div className="stream-page">
      {showSelector && (
        <div className="stream-page__topbar">
          <label htmlFor="stream-wheel-select">Ruleta:</label>
          <select
            id="stream-wheel-select"
            value={selectedWheelId}
            onChange={(e) => setSelectedWheelId(e.target.value)}
          >
            {wheels.map((wheel) => (
              <option key={wheel.id} value={wheel.id}>
                {wheel.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="stream-page__content">
        <WheelCard
          wheel={wheelForRender}
          onSpin={handleSpin}
          onDurationChange={() => {}}
          onOptionChange={() => {}}
          onAddOption={() => {}}
          onRemoveOption={() => {}}
          onShuffle={() => {}}
          onColorChange={() => {}}
          onAddColor={() => {}}
          onRemoveColor={() => {}}
          cleanMode
          streamMode
        />
      </div>
    </div>
  );
}