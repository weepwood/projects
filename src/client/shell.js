/**
 * App-shell behaviour: theme toggle and the mobile table of contents.
 * Kept deliberately small — everything else on the site is server-rendered.
 */
const root = document.documentElement;
const themeButton = document.getElementById('theme-toggle');
const nav = document.getElementById('site-nav');
const navToggle = document.getElementById('nav-toggle');

const syncTheme = () => {
  const dark = root.dataset.theme === 'dark';
  themeButton?.setAttribute('aria-pressed', String(dark));
  themeButton?.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题');
};

syncTheme();
themeButton?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {}
  syncTheme();
});

const setNav = (open) => {
  if (!nav || !navToggle) return;
  nav.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? '关闭目录' : '打开目录');
  const label = navToggle.querySelector('span');
  if (label) label.textContent = open ? '关闭' : '目录';
};

navToggle?.addEventListener('click', () => setNav(!nav?.classList.contains('is-open')));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setNav(false);
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setNav(false));
});
