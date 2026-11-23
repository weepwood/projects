/**
 * Theme toggle. The initial `data-theme` is set by a tiny inline script in the
 * layout (so there is no flash), and this module only owns the interaction.
 */
const button = document.getElementById('theme-toggle');
const root = document.documentElement;

const sync = () => {
  const dark = root.dataset.theme === 'dark';
  button?.setAttribute('aria-pressed', String(dark));
  button?.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
};

sync();
button?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {}
  sync();
});
