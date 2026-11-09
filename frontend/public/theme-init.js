// Runs before the first paint so the page never flashes the wrong theme.
// It is a file rather than an inline script because the CSP does not allow inline scripts.
(function () {
    var stored = null;

    try {
        stored = localStorage.getItem('theme');
    } catch (error) {
        stored = null;
    }

    var isDark =
        stored === 'dark' ||
        (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
})();
