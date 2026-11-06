// Runs before first paint on every page: applies the saved theme and language, and decides whether
// the home-page welcome plays, so nothing flashes in the wrong state.
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  let theme;
  let lang;
  let introSeen = false;
  try {
    theme = window.localStorage.getItem('myasharah-theme');
    lang = window.localStorage.getItem('myasharah-lang');
    introSeen = window.sessionStorage.getItem('myasharah-intro-seen') === 'true';
  } catch (error) {
    // Storage can be blocked; fall back to the device settings below.
  }

  // First visit: follow the device's dark-mode setting and language
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (lang !== 'ms' && lang !== 'en') {
    lang = /^(ms|id)\b/i.test(navigator.language || '') ? 'ms' : 'en';
  }

  root.dataset.theme = theme;
  root.lang = lang;

  // Hide the English text until it has been swapped, with a safety timeout
  if (lang === 'ms') {
    root.classList.add('i18n-pending');
    window.setTimeout(() => root.classList.remove('i18n-pending'), 1500);
  }

  const forceIntro = new URLSearchParams(window.location.search).get('intro') === '1';
  if (introSeen && !forceIntro) root.classList.add('intro-seen');
})();
