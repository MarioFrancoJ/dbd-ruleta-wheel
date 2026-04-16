export function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function getRandomItem(array) {
  if (!array.length) return "";
  return array[Math.floor(Math.random() * array.length)];
}