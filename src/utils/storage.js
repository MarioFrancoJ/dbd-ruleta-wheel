const STORAGE_KEY = "dbd-wheels-config";

export function loadWheels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Error cargando ruletas:", error);
    return null;
  }
}

export function saveWheels(wheels) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wheels));
  } catch (error) {
    console.error("Error guardando ruletas:", error);
  }
}