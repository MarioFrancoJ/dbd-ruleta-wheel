import { useEffect, useState } from "react";
import WheelCard from "./components/WheelCard";
import defaultWheels from "./data/defaultWheels.json";
import { shuffleArray } from "./utils/shuffle";
import { loadWheels, saveWheels } from "./utils/storage";
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

export default function App() {
  const [wheels, setWheels] = useState(() => {
    const saved = loadWheels();
    return saved ? withInitialResult(saved) : withInitialResult(defaultWheels);
  });

  const [cleanMode, setCleanMode] = useState(false);
  const [selectedCleanWheelId, setSelectedCleanWheelId] = useState("killers");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dbd-theme') || 'dark';
  });

  useEffect(() => {
    saveWheels(wheels);
  }, [wheels]);

  useEffect(() => {
    localStorage.setItem('dbd-theme', theme);
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, [theme]);

  function updateWheel(id, updater) {
    setWheels((current) =>
      current.map((wheel) => {
        if (wheel.id !== id) return wheel;
        return updater(wheel);
      })
    );
  }

  function handleSpin(id, winnerIndex, customResult) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      result: customResult || wheel.options[winnerIndex] || "",
    }));
  }

  function handleDurationChange(id, value) {
    const safeValue = Number.isFinite(value)
      ? Math.max(1, Math.min(20, value))
      : 4;

    updateWheel(id, (wheel) => ({
      ...wheel,
      spinDuration: safeValue,
    }));
  }

  function handleOptionChange(id, index, value) {
    updateWheel(id, (wheel) => {
      const nextOptions = [...wheel.options];
      const currentOption = nextOptions[index];
      
      // Si la opción actual es un objeto, mantener la imagen
      if (typeof currentOption === "object" && currentOption.image) {
        nextOptions[index] = {
          ...currentOption,
          label: value
        };
      } else {
        nextOptions[index] = value;
      }

      return {
        ...wheel,
        options: nextOptions,
      };
    });
  }

  function handleAddOption(id) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      options: [...wheel.options, ""],
    }));
  }

  function handleRemoveOption(id, index) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      options: wheel.options.filter((_, i) => i !== index),
    }));
  }

  function handleShuffle(id) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      options: shuffleArray(wheel.options),
    }));
  }

  function handleColorChange(id, index, value) {
    updateWheel(id, (wheel) => {
      const nextColors = [...(wheel.colors || [])];
      nextColors[index] = value;

      return {
        ...wheel,
        colors: nextColors,
      };
    });
  }

  function handleAddColor(id) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      colors: [...(wheel.colors || []), "#ffffff"],
    }));
  }

  function handleRemoveColor(id, index) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      colors: (wheel.colors || []).filter(
        (_, i) => i !== index
      ),
    }));
  }

  function handleTitleChange(id, value) {
    updateWheel(id, (wheel) => ({ ...wheel, title: value }));
  }

  function handleResetAll() {
    localStorage.removeItem('dbd-wheels-config');
    setWheels(withInitialResult(defaultWheels));
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>DBD Roulette Manager</h1>
        <p>
          Administra y gira tus ruletas personalizadas de Dead by
          Daylight.
        </p>

        <div className="app__header-buttons">
          <button onClick={() => setCleanMode((prev) => !prev)}>
            {cleanMode ? "Volver al editor" : "Modo ruleta limpia"}
          </button>

          <button onClick={handleResetAll}>
            Restaurar ruletas por defecto
          </button>

          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {cleanMode && (
          <div className="app__clean-selector">
            <label htmlFor="clean-wheel-select">
              Ruleta visible:
            </label>

            <select
              id="clean-wheel-select"
              value={selectedCleanWheelId}
              onChange={(e) =>
                setSelectedCleanWheelId(
                  e.target.value
                )
              }
            >
              {wheels.map((wheel) => (
                <option
                  key={wheel.id}
                  value={wheel.id}
                >
                  {wheel.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <main
        className={`app__grid${
          cleanMode ? " app__grid--clean" : ""
        }`}
      >
        {wheels
          .filter(
            (wheel) =>
              !cleanMode ||
              wheel.id === selectedCleanWheelId
          )
          .map((wheel) => (
            <WheelCard
              key={wheel.id}
              wheel={wheel}
              onSpin={handleSpin}
              onDurationChange={
                handleDurationChange
              }
              onOptionChange={
                handleOptionChange
              }
              onAddOption={handleAddOption}
              onRemoveOption={
                handleRemoveOption
              }
              onShuffle={handleShuffle}
              onColorChange={handleColorChange}
              onAddColor={handleAddColor}
              onRemoveColor={handleRemoveColor}
              onTitleChange={handleTitleChange}
              cleanMode={cleanMode}
            />
          ))}
      </main>
    </div>
  );
}