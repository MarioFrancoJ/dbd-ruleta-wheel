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

// Migra configuraciones guardadas del modelo antiguo (dos ruletas de roles:
// "roles" (Roles Libres) y "rolesV2" (Roles Predeterminados)) al nuevo modelo
// híbrido de una sola ruleta "roles" con versiones y perks embebidos.
// Si la config ya está migrada, la devuelve tal cual.
// Migra la ruleta de perks: renombra el id antiguo "hardcore-items" al nuevo
// Asegura que la ruleta genérica "custom" exista (al final) en la config.
function ensureCustomWheel(wheels) {
  if (!Array.isArray(wheels)) return wheels;
  if (wheels.some((w) => w.id === "custom")) return wheels;
  const defaultCustom = defaultWheels.find((w) => w.id === "custom");
  if (!defaultCustom) return wheels;
  return [...wheels, { ...defaultCustom, result: "" }];
}

// "perks-survivors" y asegura que estén las perks nuevas (Shane/Aurora).
function migratePerksWheel(wheels) {
  if (!Array.isArray(wheels)) return wheels;

  const defaultPerks = defaultWheels.find((w) => w.id === "perks-survivors");
  const defaultPerkImages = defaultPerks
    ? new Set(defaultPerks.options.map((o) => o.image))
    : new Set();

  const renamed = wheels.map((w) => {
    if (w.id !== "perks-survivors" && w.id !== "hardcore-items") return w;

    // Renombrar id si venía del antiguo
    const next = { ...w, id: "perks-survivors" };

    // Añadir cualquier perk por defecto que falte (p.ej. las 6 nuevas),
    // respetando las opciones que el usuario ya tuviera.
    if (defaultPerks && Array.isArray(next.options)) {
      const currentImages = new Set(
        next.options
          .filter((o) => o && typeof o === "object")
          .map((o) => o.image)
      );
      const missing = defaultPerks.options.filter(
        (o) => defaultPerkImages.has(o.image) && !currentImages.has(o.image)
      );
      if (missing.length) {
        next.options = [...next.options, ...missing];
      }
    }
    return next;
  });

  return ensureCustomWheel(renamed);
}

function migrateWheels(saved) {
  if (!Array.isArray(saved)) return saved;

  const hasHybrid = saved.some((w) => w.id === "roles" && w.type === "roles");
  if (hasHybrid) return migratePerksWheel(saved);

  const defaultRoles = defaultWheels.find(
    (w) => w.id === "roles" && w.type === "roles"
  );

  const oldRolesV2 = saved.find((w) => w.id === "rolesV2");
  const oldRoles = saved.find((w) => w.id === "roles");

  // Construir la ruleta híbrida partiendo de los datos por defecto (que ya
  // traen los roles + versiones), pero respetando duración/colores/opciones
  // que el usuario pudiera haber tenido en su ruleta de predeterminados.
  const base = defaultRoles || {
    id: "roles",
    title: "Roles",
    type: "roles",
    showPerks: true,
    spinDuration: 13,
    colors: [],
    options: [],
    roles: {},
  };

  const hybrid = {
    ...base,
    spinDuration:
      (oldRolesV2 && oldRolesV2.spinDuration) ||
      (oldRoles && oldRoles.spinDuration) ||
      base.spinDuration,
    colors:
      (oldRolesV2 && oldRolesV2.colors) ||
      (oldRoles && oldRoles.colors) ||
      base.colors,
    result: "",
  };

  const result = [];
  let inserted = false;
  for (const w of saved) {
    if (w.id === "roles" || w.id === "rolesV2") {
      if (!inserted) {
        result.push(hybrid);
        inserted = true;
      }
      // omitir las ruletas antiguas de roles
      continue;
    }
    result.push(w);
  }
  if (!inserted) result.push(hybrid);

  return migratePerksWheel(result);
}

export default function App() {
  const [wheels, setWheels] = useState(() => {
    const saved = loadWheels();
    return saved
      ? withInitialResult(migrateWheels(saved))
      : withInitialResult(defaultWheels);
  });

  const [cleanMode, setCleanMode] = useState(false);
  const [selectedCleanWheelId, setSelectedCleanWheelId] = useState("killers");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dbd-theme') || 'dark';
  });

  // Sincronización entre ventanas del navegador
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Solo reaccionar a cambios en la configuración de ruletas
      if (e.key === 'dbd-wheels-config' && e.newValue) {
        try {
          const newWheels = JSON.parse(e.newValue);
          setWheels(withInitialResult(migrateWheels(newWheels)));
        } catch (error) {
          console.error('Error parsing wheels from storage:', error);
        }
      }
      
      // Sincronizar selección de ruleta en modo limpio
      if (e.key === 'dbd-selected-wheel' && e.newValue) {
        setSelectedCleanWheelId(e.newValue);
      }
      
      // Sincronizar modo limpio
      if (e.key === 'dbd-clean-mode' && e.newValue !== null) {
        setCleanMode(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    saveWheels(wheels);
  }, [wheels]);

  useEffect(() => {
    localStorage.setItem('dbd-theme', theme);
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, [theme]);

  // Guardar selección de ruleta para sincronización
  useEffect(() => {
    localStorage.setItem('dbd-selected-wheel', selectedCleanWheelId);
  }, [selectedCleanWheelId]);

  // Guardar modo limpio para sincronización
  useEffect(() => {
    localStorage.setItem('dbd-clean-mode', cleanMode.toString());
  }, [cleanMode]);

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
      ? Math.max(1, Math.min(120, value))
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

  // Agrega múltiples opciones (objetos { label, image } o strings) a una ruleta,
  // evitando duplicados por imagen (o por label si no tienen imagen).
  function handleAddOptions(id, newOptions) {
    if (!Array.isArray(newOptions) || newOptions.length === 0) return;
    updateWheel(id, (wheel) => {
      const keyOf = (o) =>
        o && typeof o === "object" ? o.image || o.label : String(o);
      const existing = new Set(wheel.options.map(keyOf));
      const toAdd = newOptions.filter((o) => !existing.has(keyOf(o)));
      if (toAdd.length === 0) return wheel;
      return { ...wheel, options: [...wheel.options, ...toAdd] };
    });
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

  function handleRolesChange(id, nextRoles, nextOptions) {
    updateWheel(id, (wheel) => ({
      ...wheel,
      roles: nextRoles,
      options: nextOptions !== undefined ? nextOptions : wheel.options,
    }));
  }

  function handleShowPerksChange(id, value) {
    updateWheel(id, (wheel) => ({ ...wheel, showPerks: value }));
  }

  function handleResetAll() {
    localStorage.removeItem('dbd-wheels-config');
    setWheels(withInitialResult(defaultWheels));
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>DBD Roulette Manager</h1>

        <div className="app__header-buttons">
          <button onClick={() => setCleanMode((prev) => !prev)}>
            {cleanMode ? "Editar" : "Proyectar"}
          </button>

          <button onClick={handleResetAll}>
            Por defecto
          </button>

          {cleanMode && (
            <>
              <label htmlFor="clean-wheel-select" className="app__header-label">
                Ruleta visible:
              </label>
              <select
                id="clean-wheel-select"
                className="app__header-select"
                value={selectedCleanWheelId}
                onChange={(e) => setSelectedCleanWheelId(e.target.value)}
              >
                {wheels.map((wheel) => (
                  <option key={wheel.id} value={wheel.id}>
                    {wheel.title}
                  </option>
                ))}
              </select>
            </>
          )}

          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
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
              onRolesChange={handleRolesChange}
              onShowPerksChange={handleShowPerksChange}
              onAddOptions={handleAddOptions}
              cleanMode={cleanMode}
            />
          ))}
      </main>
    </div>
  );
}