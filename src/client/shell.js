/**
 * App-shell behaviour: theme toggle and the mobile navigation drawer. Kept
 * deliberately small — everything else on the site is server-rendered.
 */
const root = document.documentElement;
const app = document.getElementById('app');
const themeButton = document.getElementById('theme-toggle');
const toggle = document.getElementById('sidebar-toggle');

const syncTheme = () => {
  const dark = root.dataset.theme !== 'light';
  themeButton?.setAttribute('aria-pressed', String(dark));
  themeButton?.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题');
};

syncTheme();
themeButton?.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {}
  syncTheme();
});

const setSidebar = (open) => {
  if (!app) return;
  app.dataset.sidebar = open ? 'open' : 'closed';
  toggle?.setAttribute('aria-expanded', String(open));
  toggle?.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
};

toggle?.addEventListener('click', () => {
  setSidebar(app?.dataset.sidebar !== 'open');
});

// Clicking the scrim or pressing Escape closes the drawer; following a link
// closes it too, otherwise the new page appears behind an open drawer.
app?.addEventListener('click', (event) => {
  if (event.target === app) setSidebar(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebar(false);
});
app?.querySelectorAll('.sidebar a').forEach((link) => {
  link.addEventListener('click', () => setSidebar(false));
});
