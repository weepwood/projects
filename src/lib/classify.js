/**
 * Classification is scored, not first-match: a repository that mentions both
 * "dashboard" and "visualization" should land where its strongest signals are,
 * and low-confidence results must be visible to the caller instead of being
 * silently written into the catalog.
 *
 * `taxonomy` comes from content/projects.json so category ids stay stable while
 * labels remain editable.
 */

const SIGNALS = {
  efficiency: [
    ['tab', 4],
    ['bookmark', 3],
    ['session', 2],
    ['clipboard', 3],
    ['note', 2],
    ['标签页', 4],
    ['书签', 3],
    ['会话', 2],
    ['剪贴板', 3],
    ['笔记', 2],
    ['效率', 2],
  ],
  media: [
    ['photo', 4],
    ['video', 4],
    ['image', 2],
    ['gallery', 3],
    ['album', 3],
    ['thumbnail', 3],
    ['照片', 4],
    ['视频', 4],
    ['图片', 2],
    ['相册', 3],
    ['缩略图', 3],
    ['媒体', 2],
  ],
  devtools: [
    ['cli', 3],
    ['converter', 3],
    ['debug', 3],
    ['packet', 4],
    ['capture', 2],
    ['regex', 3],
    ['generator', 2],
    ['playground', 2],
    ['sdk', 2],
    ['api', 1],
    ['转换', 3],
    ['抓包', 4],
    ['调试', 3],
    ['命令行', 3],
    ['生成器', 2],
    ['协议', 3],
  ],
  design: [
    ['design', 4],
    ['ui', 2],
    ['component', 3],
    ['icon', 3],
    ['theme', 3],
    ['css', 2],
    ['motion', 3],
    ['typography', 3],
    ['style', 2],
    ['组件', 3],
    ['图标', 3],
    ['设计', 4],
    ['主题', 3],
    ['动效', 3],
    ['排版', 3],
    ['风格', 2],
  ],
  learning: [
    ['tutorial', 4],
    ['course', 4],
    ['guide', 3],
    ['algorithm', 4],
    ['math', 4],
    ['visuali', 2],
    ['learn', 3],
    ['lecture', 3],
    ['教程', 4],
    ['指南', 3],
    ['算法', 4],
    ['数学', 4],
    ['可视化', 2],
    ['学习', 3],
    ['原理', 3],
  ],
  games: [
    ['game', 5],
    ['chess', 4],
    ['puzzle', 4],
    ['particle', 2],
    ['shader', 2],
    ['physics', 2],
    ['three', 2],
    ['simulation', 2],
    ['toy', 3],
    ['游戏', 5],
    ['象棋', 4],
    ['迷宫', 4],
    ['粒子', 2],
    ['物理', 2],
    ['仿真', 2],
    ['互动', 2],
  ],
  apps: [
    ['dashboard', 4],
    ['admin', 4],
    ['management', 4],
    ['platform', 3],
    ['cms', 4],
    ['blog', 3],
    ['system', 2],
    ['backend', 3],
    ['database', 3],
    ['管理系统', 4],
    ['后台', 4],
    ['平台', 3],
    ['博客', 3],
    ['系统', 2],
    ['服务端', 3],
  ],
  mirrors: [
    ['mirror', 6],
    ['clone', 5],
    ['replica', 5],
    ['boilerplate', 4],
    ['template', 3],
    ['fork of', 5],
    ['镜像', 6],
    ['复刻', 5],
    ['副本', 5],
    ['模板', 3],
  ],
};

/** Dependencies that say more about a project than its prose does. */
const DEPENDENCY_SIGNALS = {
  efficiency: { browsers: 3 },
  design: { tailwindcss: 2, '@radix-ui/react-dialog': 2, '@mui/material': 2 },
  games: { three: 3, phaser: 4, 'pixi.js': 3, '@react-three/fiber': 3, cannon: 3 },
  learning: { katex: 2, mermaid: 2, d3: 2, echarts: 2 },
  apps: { express: 2, fastify: 2, '@supabase/supabase-js': 2, prisma: 2 },
};

const DEPENDENCY_TAGS = new Map([
  ['react', 'React'],
  ['next', 'Next.js'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['vite', 'Vite'],
  ['three', 'Three.js'],
  ['@react-three/fiber', 'React Three Fiber'],
  ['echarts', 'ECharts'],
  ['d3', 'D3.js'],
  ['pixi.js', 'PixiJS'],
  ['phaser', 'Phaser'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['@supabase/supabase-js', 'Supabase'],
  ['tailwindcss', 'Tailwind CSS'],
  ['astro', 'Astro'],
  ['typescript', 'TypeScript'],
]);

const INFERRED_TAGS = [
  ['WebGL', /\bwebgl\b/i],
  ['WebGPU', /\bwebgpu\b/i],
  ['Canvas', /\bcanvas\b/i],
  ['AI', /\b(ai|llm|gpt|chatgpt|claude|智能)\b/i],
  ['算法', /\b(algorithm|leetcode|算法)\b/i],
  ['数学', /\b(math|algebra|数学|代数)\b/i],
  ['可视化', /\b(visuali[sz]|可视化)\b/i],
  ['离线可用', /\b(offline|离线)\b/i],
  ['本地优先', /\b(local-first|本地优先|无需账号)\b/i],
];

export function normalizeText(...parts) {
  return parts
    .flat(Infinity)
    .filter((part) => part != null && part !== '')
    .map(String)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanReadmeSummary(readme) {
  if (!readme) return '';
  const text = String(readme)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*>]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  // CJK sentences are not followed by a space, so the terminator itself splits.
  const firstSentence = text.split(/(?<=[。！？.!?])(?:\s|(?=\S))/)[0] || text;
  return firstSentence.slice(0, 180).trim();
}

/**
 * @returns {{category: string, confidence: number, scores: Record<string, number>}}
 */
export function inferCategory(project, taxonomy) {
  const ids = taxonomy.categories.map((category) => category.id);
  const fallback = taxonomy.defaultCategory ?? 'other';
  const text = normalizeText(
    project.name,
    project.description,
    project.topics,
    project.readme,
    project.manifestText,
  ).toLowerCase();
  const nameText = normalizeText(project.name, project.topics).toLowerCase();
  const scores = Object.fromEntries(ids.map((id) => [id, 0]));

  for (const [id, signals] of Object.entries(SIGNALS)) {
    if (!(id in scores)) continue;
    for (const [needle, weight] of signals) {
      if (!text.includes(needle)) continue;
      // Matches in the name/topics describe what the project *is*; matches in
      // the README often describe what it *uses*. Weight them differently.
      scores[id] += nameText.includes(needle) ? weight * 2 : weight;
    }
  }

  const dependencies = new Set([
    ...Object.keys(project.packageJson?.dependencies ?? {}),
    ...Object.keys(project.packageJson?.devDependencies ?? {}),
  ]);
  if ((project.topics ?? []).some((topic) => /browser-extension|chrome-extension/.test(topic))) {
    scores.efficiency = (scores.efficiency ?? 0) + 3;
  }
  for (const [id, signals] of Object.entries(DEPENDENCY_SIGNALS)) {
    if (!(id in scores)) continue;
    for (const [dependency, weight] of Object.entries(signals)) {
      if (dependencies.has(dependency)) scores[id] += weight;
    }
  }
  if (project.language === 'Rust' || project.language === 'Go') scores.devtools = (scores.devtools ?? 0) + 1;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [topId, topScore] = ranked[0] ?? [fallback, 0];
  const runnerUp = ranked[1]?.[1] ?? 0;

  if (topScore < 3) return { category: fallback, confidence: 0.3, scores };

  // Confidence reflects margin over the runner-up, not an arbitrary constant.
  const total = ranked.reduce((sum, [, score]) => sum + score, 0) || 1;
  const margin = (topScore - runnerUp) / topScore;
  const share = topScore / total;
  const confidence = Math.min(0.98, Math.max(0.35, 0.45 + margin * 0.3 + share * 0.3));

  return { category: topId, confidence: Number(confidence.toFixed(2)), scores };
}

export function inferTags(project) {
  const tags = new Set();
  if (project.language) tags.add(project.language);
  for (const topic of project.topics ?? []) {
    const value = String(topic).trim();
    if (value) tags.add(value);
  }
  const dependencies = {
    ...(project.packageJson?.dependencies ?? {}),
    ...(project.packageJson?.devDependencies ?? {}),
  };
  for (const dependency of Object.keys(dependencies)) {
    if (DEPENDENCY_TAGS.has(dependency)) tags.add(DEPENDENCY_TAGS.get(dependency));
  }
  const text = normalizeText(project.name, project.description, project.readme);
  for (const [tag, pattern] of INFERRED_TAGS) if (pattern.test(text)) tags.add(tag);
  return [...tags].slice(0, 8);
}
