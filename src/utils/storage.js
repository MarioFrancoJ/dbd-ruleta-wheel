const STORAGE_KEY = "dbd-wheels-config";
const VERSION_KEY = "dbd-wheels-version";
const CURRENT_VERSION = "2.0"; // Versión con soporte de imágenes

export function loadWheels() {
  try {
    const version = localStorage.getItem(VERSION_KEY);
    
    // Si la versión no coincide, retornar null para forzar recarga
    if (version !== CURRENT_VERSION) {
      console.log("Versión antigua detectada, actualizando...");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      return null;
    }
    
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
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  } catch (error) {
    console.error("Error guardando ruletas:", error);
  }
}