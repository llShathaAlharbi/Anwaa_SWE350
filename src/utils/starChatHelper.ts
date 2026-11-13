export function getCleanStarName(rawName: string): string {
  if (!rawName) return '';
  // Strip parentheses and secondary names after comma or dash
  return rawName
    .replace(/\s*\([^)]*\)/g, '')
    .split(/[،,]/)[0]
    .trim();
}

export function getRandomStarQuestion(rawStarName: string): string {
  const cleanName = getCleanStarName(rawStarName) || rawStarName.trim();
  const templates = [
    `ما سبب تسمية ${cleanName} بهذا الاسم؟`,
    `ما معنى اسم ${cleanName}؟`,
    `أين يقع ${cleanName} في السماء؟`,
    `حدثني عن ${cleanName} في التراث العربي.`,
  ];
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

export function askAssistantAboutStar(
  navigate: (path: string, options?: { state?: unknown }) => void,
  rawStarName: string,
  starNumber?: number
) {
  const question = getRandomStarQuestion(rawStarName);
  const cleanName = getCleanStarName(rawStarName);
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  navigate('/chat', {
    state: {
      autoQuestion: question,
      starName: cleanName,
      starNumber,
      requestId,
    },
  });
}
