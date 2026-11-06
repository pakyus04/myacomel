import { getLanguage, initLanguage, refreshPage, setLanguage, t } from './i18n.js';
import { startRouter } from './router.js';
import { musicTracks } from './music-tracks.js';

const hello = document.querySelector('[data-hello]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Language and theme ----------
// boot.js applies the saved choices before paint; these controls change them.
// Listeners sit on the document because the page router replaces the header on every page change.

const syncLanguageButtons = () => {
  const lang = getLanguage();
  document
    .querySelectorAll('[data-set-lang]')
    .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.setLang === lang)));
};

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  // English labels; the language layer translates them when Bahasa Melayu is on
  document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('aria-pressed', String(dark));
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1220' : '#f4f7fb');
};

const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

document.addEventListener('click', (event) => {
  const languageButton = event.target.closest('[data-set-lang]');
  if (languageButton) {
    setLanguage(languageButton.dataset.setLang);
    syncLanguageButtons();
    return;
  }
  if (!event.target.closest('[data-theme-toggle]')) return;
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    window.localStorage.setItem('myasharah-theme', next);
  } catch (error) {
    // Storage can be blocked; the choice then lasts for this page only.
  }
});

applyTheme(currentTheme());
syncLanguageButtons();
initLanguage();

// ---------- Welcome ("hello") opening ----------
// Plays once per browser session on the home page; boot.js marks repeat visits before paint.

if (hello) {
  if (document.documentElement.classList.contains('intro-seen')) {
    hello.remove();
    document.querySelector('[data-hub]')?.remove();
  } else {
    const word = hello.querySelector('[data-hello-word]');
    const greetings = [
      ['Hello', 'en'],
      ['Hai', 'ms'],
      ['Bonjour', 'fr'],
      ['Hola', 'es'],
      ['こんにちは', 'ja'],
      ['안녕하세요', 'ko'],
      ['Ciao', 'it'],
      ['Selamat datang', 'ms'],
    ];
    const timers = [];
    let finished = false;

    try {
      window.sessionStorage.setItem('myasharah-intro-seen', 'true');
    } catch (error) {
      // Storage can be unavailable in strict privacy modes; the welcome still works.
    }

    // After the greetings, a link page offers the website, email and social media accounts.
    // The home page stays hidden behind it until "My website" (or Escape) is chosen.
    const hub = document.querySelector('[data-hub]');
    const enterButton = hub?.querySelector('[data-hub-enter]');

    const enterWebsite = () => {
      if (!hub || hub.classList.contains('is-leaving')) return;
      window.removeEventListener('keydown', handleHubKeydown);
      hub.classList.add('is-leaving');
      document.body.classList.remove('hello-playing');
      window.setTimeout(() => hub.remove(), prefersReducedMotion ? 200 : 600);
    };

    const handleHubKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        enterWebsite();
        return;
      }
      // Keep keyboard focus inside the link page while it is open
      if (event.key !== 'Tab') return;
      const focusable = [...hub.querySelectorAll('a, button')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(window.clearTimeout);
      window.removeEventListener('keydown', finish);

      if (hub) {
        hub.hidden = false;
        enterButton?.addEventListener('click', enterWebsite);
        window.addEventListener('keydown', handleHubKeydown);
        enterButton?.focus({ preventScroll: true });
      } else {
        document.body.classList.remove('hello-playing');
      }

      hello.classList.add('is-leaving');
      window.setTimeout(() => hello.remove(), prefersReducedMotion ? 300 : 900);
    };

    const showGreeting = (index) => {
      const [text, lang] = greetings[index];
      word.textContent = text;
      word.lang = lang;
      // Restart the small entrance animation for each word
      word.classList.remove('is-in');
      word.classList.toggle('is-quick', index > 0 && index < greetings.length - 1);
      void word.offsetWidth;
      word.classList.add('is-in');
    };

    document.body.classList.add('hello-playing');
    hello.querySelector('[data-hello-skip]')?.addEventListener('click', finish);
    hello.addEventListener('click', finish);
    window.addEventListener('keydown', finish);

    if (prefersReducedMotion) {
      showGreeting(0);
      timers.push(window.setTimeout(finish, 700));
    } else {
      // First word lingers, the middle ones flick past, the last one settles before the reveal
      let at = 0;
      greetings.forEach((_, index) => {
        timers.push(window.setTimeout(() => showGreeting(index), at));
        at += index === 0 ? 600 : 150;
      });
      timers.push(window.setTimeout(finish, at + 500));
    }
  }
}

// ---------- Copy email ----------
// One listener for every page; the router swaps the button in and out.

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.className = 'sr-only';
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('Copy failed');
};

// Fallback when the clipboard is blocked: select the address so it can be copied by hand
const selectEmail = () => {
  const link = document.querySelector('[data-email-link]');
  if (!link) return;
  const range = document.createRange();
  range.selectNodeContents(link);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
};

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-email]');
  if (!button) return;
  const label = button.querySelector('[data-copy-label]');
  const status = document.querySelector('[data-copy-status]');
  const email = button.dataset.copyEmail;
  window.clearTimeout(button.resetTimer);
  try {
    await copyText(email);
    label.textContent = 'Copied';
    button.classList.add('is-copied');
    if (status) status.textContent = t('Email address copied');
  } catch (error) {
    selectEmail();
    label.textContent = 'Press Ctrl+C to copy';
    if (status) status.textContent = t('Email address selected. Press Ctrl+C to copy.');
  }
  button.resetTimer = window.setTimeout(() => {
    label.textContent = 'Copy email';
    button.classList.remove('is-copied');
  }, 2400);
});

// ---------- Page progress ----------
// A thin bar at the top that fills as the page scrolls; transform only, once per frame.

let progressFrame;
const updateProgress = () => {
  progressFrame = undefined;
  const bar = document.querySelector('[data-page-progress]');
  if (!bar) return;
  const range = document.documentElement.scrollHeight - window.innerHeight;
  const progress = range > 0 ? Math.min(window.scrollY / range, 1) : 0;
  bar.style.setProperty('transform', `scaleX(${progress})`);
};

const requestProgress = () => {
  if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
};

window.addEventListener('scroll', requestProgress, { passive: true });
window.addEventListener('resize', requestProgress, { passive: true });

// ---------- Per-page features ----------
// Run on the first load and again whenever the router swaps in another page.

const initPage = () => {
  const yearElement = document.querySelector('[data-year]');
  if (yearElement) yearElement.textContent = new Date().getFullYear();

  // Activity domain bars: widths come from aria-valuenow, set through CSSOM
  document.querySelectorAll('.domain-meter[aria-valuenow]').forEach((meter) => {
    const max = Number(meter.getAttribute('aria-valuemax')) || 10;
    const value = Math.min(max, Math.max(0, Number(meter.getAttribute('aria-valuenow')) || 0));
    meter.firstElementChild?.style.setProperty('width', `${(value / max) * 100}%`);
  });

  requestProgress();
};

initPage();

// ---------- Background music ----------
// Only loaded when there are songs to play; with an empty list nothing is added to the page.

if (musicTracks.length > 0) {
  import('./music-player.js').catch(() => {
    // The site works without music.
  });
}

// ---------- Page transitions ----------
// The router keeps the music playing across pages; after each swap the new page is set up,
// its controls synced and its text translated before it appears.

startRouter(async () => {
  initPage();
  applyTheme(currentTheme());
  syncLanguageButtons();
  refreshPage();
});
