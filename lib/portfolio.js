'use strict';
const { safeHttpUrl } = require('./automation');
function isListed(repo, portfolio, excluded) {
  return repo.private === false && !excluded.has(repo.full_name) && Boolean(safeHttpUrl(repo.html_url)) &&
    (Boolean(safeHttpUrl(repo.homepage)) || Object.hasOwn(portfolio, repo.full_name));
}
module.exports = { isListed };
