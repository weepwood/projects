/**
 * Catalog filtering against server-rendered rows. No payload, no templating:
 * every row already exists in the DOM with its own data attributes, so the
 * filter only toggles `hidden`. Sorting reorders the same nodes.
 */
const list = document.getElementById('catalog-list');
const summary = document.getElementById('catalog-summary');
const search = document.getElementById('catalog-search');
const category = document.getElementById('catalog-category');
const status = document.getElementById('catalog-status');
const sort = document.getElementById('catalog-sort');
const reset = document.getElementById('catalog-reset');
const empty = document.getElementById('catalog-empty');

if (list && search && category && status && sort) {
  const rows = [...list.querySelectorAll('.row')];
  const total = rows.length;

  const apply = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;

    for (const row of rows) {
      const matches =
        (!query || row.dataset.text.includes(query)) &&
        (!category.value || row.dataset.category === category.value) &&
        (!status.value || row.dataset.status === status.value);
      row.hidden = !matches;
      if (matches) visible += 1;
    }

    const key = sort.value;
    const ordered = [...rows].sort((a, b) => {
      if (key === 'stars') return Number(b.dataset.stars) - Number(a.dataset.stars);
      if (key === 'name') return a.dataset.name.localeCompare(b.dataset.name, 'zh-Hans-CN');
      if (key === 'category') return a.dataset.category.localeCompare(b.dataset.category);
      return b.dataset.pushed.localeCompare(a.dataset.pushed);
    });
    for (const row of ordered) list.append(row);

    if (summary) summary.textContent = `显示 ${visible} / ${total} 个项目`;
    if (empty) empty.hidden = visible !== 0;
  };

  let pending = 0;
  const schedule = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(apply);
  };

  for (const element of [search, category, status, sort]) {
    element.addEventListener(element === search ? 'input' : 'change', schedule);
  }
  reset?.addEventListener('click', () => {
    search.value = '';
    category.value = '';
    status.value = '';
    sort.value = 'pushed';
    apply();
  });

  apply();
}
