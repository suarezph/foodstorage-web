// Runs in <head> before the first paint (a file, not inline, so the CSP stays script-src 'self'):
// sets <html data-theme="light|dark"> from the choice in Settings (src/lib/theme.js), so the page
// never flashes the wrong theme. "system" (the default) follows the operating system, live.
(function () {
  var KEY = 'foodstorage-theme';
  var choice = 'system';
  try {
    choice = localStorage.getItem(KEY) || 'system';
  } catch {
    // storage blocked: follow the system
  }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply() {
    var dark = choice === 'dark' || (choice !== 'light' && Boolean(mq && mq.matches));
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  apply();
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () {
      if (choice === 'system') apply();
    });
  }
  // The Settings page tells this script about a new choice (src/lib/theme.js).
  window.addEventListener('foodstorage-theme', function (e) {
    choice = e.detail;
    apply();
  });
})();
