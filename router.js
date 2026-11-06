// Page-to-page navigation without a full reload.
// The browser normally throws the whole page away on every link, which cut the background music
// for a moment. Here internal links fetch the next page and swap its content in place, so the music
// player (and the falling snow) are never torn down. The swap runs inside a View Transition:
// only opacity and transform animate, which the browser hands to the GPU for a smooth frame rate.
// Anything unusual (a failed fetch, a non-HTML response) falls back to an ordinary page load.

const PERSISTENT = '.music-player, .snow-fall';
const RUNTIME_BODY_CLASSES = ['has-music-player'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const pageCache = new Map(); // path -> Promise<{ html, url }>
let navigating = null;
// The page on screen; history entries for in-page anchors share it and need no swap
let currentPage = '';
let onPageChange = () => {};

const pathKey = (url) => `${url.pathname}${url.search}`;
const pageId = (url) => `${url.pathname.replace(/\.html$/, '').replace(/\/index$/, '/')}${url.search}`;

const isPageLink = (link) => {
  if (!link || !link.href || link.hasAttribute('download') || link.closest('[data-no-router]')) return false;
  if (link.target && link.target !== '_self') return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (/^\/(api|assets)\//.test(url.pathname)) return false;
  // Pages are a folder ("/", "/myacomel/"), "page.html" or a clean "/page" URL
  return url.pathname === '/' || /\.html$/.test(url.pathname) || !/\.[a-z0-9]+$/i.test(url.pathname);
};

const samePage = (url) => pageId(url) === currentPage;

const fetchPage = (url) => {
  const key = pathKey(url);
  if (!pageCache.has(key)) {
    const request = fetch(key, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(async (response) => {
        const type = response.headers.get('content-type') || '';
        if (!response.ok || !type.includes('text/html')) throw new Error(`Cannot route to ${key}`);
        return { html: await response.text(), url: response.url };
      })
      .catch((error) => {
        pageCache.delete(key);
        throw error;
      });
    pageCache.set(key, request);
  }
  return pageCache.get(key);
};

const prefetch = (link) => {
  if (!isPageLink(link)) return;
  const url = new URL(link.href, window.location.href);
  if (!samePage(url)) fetchPage(url).catch(() => {});
};

// Replaces everything in <body> except the persistent elements, which are never detached
// (detaching would restart the snow's animation; the music's <audio> is not in the DOM at all).
const swapDocument = (nextDocument) => {
  document.title = nextDocument.title;
  const nextDescription = nextDocument.querySelector('meta[name="description"]')?.content;
  const description = document.querySelector('meta[name="description"]');
  if (description && nextDescription) description.content = nextDescription;

  const nextBody = nextDocument.body;
  // Scripts already run once; the welcome and link page only belong to a fresh visit
  nextBody.querySelectorAll('script, [data-hello], [data-hub]').forEach((node) => node.remove());

  const keep = RUNTIME_BODY_CLASSES.filter((name) => document.body.classList.contains(name));
  document.body.className = nextBody.className;
  keep.forEach((name) => document.body.classList.add(name));

  [...document.body.childNodes].forEach((node) => {
    if (!(node instanceof Element && node.matches(PERSISTENT))) node.remove();
  });

  const fragment = document.createDocumentFragment();
  [...nextBody.childNodes].forEach((node) => fragment.append(document.adoptNode(node)));
  const snow = document.body.querySelector(':scope > .snow-fall');
  if (snow) snow.after(fragment);
  else document.body.prepend(fragment);
};

const scrollToTarget = (hash, top) => {
  const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
  if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  else window.scrollTo({ top: top || 0, behavior: 'instant' });
};

// Keyboard and screen-reader users land at the start of the new page's content
const focusNewPage = () => {
  const main = document.querySelector('main');
  if (!main) return;
  main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
};

// Fallback for browsers without View Transitions: a short fade on the content only
const fallbackTransition = async (update) => {
  const oldMain = document.querySelector('main');
  if (oldMain && !reduceMotion.matches) {
    await oldMain
      .animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 140, easing: 'ease-in', fill: 'forwards' })
      .finished.catch(() => {});
  }
  await update();
  const newMain = document.querySelector('main');
  if (newMain && !reduceMotion.matches) {
    newMain.animate(
      [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  }
};

const navigate = async (url, { push = true, scrollTop = 0 } = {}) => {
  const token = {};
  navigating = token;
  document.documentElement.classList.add('is-navigating');

  let page;
  try {
    page = await fetchPage(url);
  } catch (error) {
    window.location.assign(url.href);
    return;
  }
  // A newer click won; drop this one
  if (navigating !== token) return;

  const nextDocument = new DOMParser().parseFromString(page.html, 'text/html');
  const finalUrl = new URL(page.url || url.href);
  finalUrl.hash = url.hash;

  // Async so page set-up (e.g. sizing the activity bars) finishes before the new page is shown
  const update = async () => {
    if (push) window.history.pushState({ scrollTop: 0 }, '', finalUrl.href);
    swapDocument(nextDocument);
    currentPage = pageId(finalUrl);
    await onPageChange();
    scrollToTarget(url.hash, scrollTop);
    focusNewPage();
  };

  try {
    if (document.startViewTransition && !reduceMotion.matches) {
      await document.startViewTransition(update).finished;
    } else {
      await fallbackTransition(update);
    }
  } catch (error) {
    // A skipped transition still applied the update; nothing to undo
  } finally {
    if (navigating === token) {
      navigating = null;
      document.documentElement.classList.remove('is-navigating');
    }
  }
};

const rememberScroll = () => {
  const state = { ...(window.history.state || {}), scrollTop: window.scrollY };
  window.history.replaceState(state, '', window.location.href);
};

export const startRouter = (pageChanged) => {
  if (!window.fetch || !window.history.pushState || !window.DOMParser) return;
  onPageChange = pageChanged;
  currentPage = pageId(new URL(window.location.href));
  window.history.scrollRestoration = 'manual';
  window.history.replaceState({ ...(window.history.state || {}), scrollTop: window.scrollY }, '', window.location.href);

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!isPageLink(link)) return;
    const url = new URL(link.href, window.location.href);
    // In-page anchors keep the browser's own behaviour
    if (samePage(url) && url.hash) return;
    event.preventDefault();
    if (samePage(url)) {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
      return;
    }
    rememberScroll();
    navigate(url);
  });

  window.addEventListener('popstate', (event) => {
    const url = new URL(window.location.href);
    if (samePage(url)) {
      scrollToTarget(url.hash, event.state?.scrollTop);
      return;
    }
    navigate(url, { push: false, scrollTop: event.state?.scrollTop || 0 });
  });

  // Fetch the HTML of a page as soon as the visitor shows intent, so the swap feels instant
  ['pointerenter', 'focusin', 'touchstart'].forEach((type) => {
    document.addEventListener(type, (event) => prefetch(event.target.closest?.('a')), { capture: true, passive: true });
  });

  // The pages in the bottom bar are small: warm them up once the browser is idle
  const warmUp = () => document.querySelectorAll('.dock a').forEach(prefetch);
  if ('requestIdleCallback' in window) window.requestIdleCallback(warmUp, { timeout: 4000 });
  else window.setTimeout(warmUp, 2500);
};
