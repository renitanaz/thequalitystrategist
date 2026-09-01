(function () {
  // Runs synchronously in <head>, before the body paints, so the
  // page never flashes light-then-dark. A saved choice in
  // localStorage wins; otherwise fall back to the OS-level preference.
  var stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch (e) {}
  var theme = stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function sync() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
    }
    sync();

    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {}
      sync();
    });
  });
})();
