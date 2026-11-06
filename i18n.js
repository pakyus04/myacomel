// English / Bahasa Melayu switching.
// The HTML is written in English. In Bahasa Melayu mode every text node and translatable attribute is
// swapped using i18n-ms.js; the English original is kept so switching back restores it exactly.
// Content added later (the copy-email label, music player text) is translated as it appears.
import { ms, msPatterns } from './i18n-ms.js';

const STORAGE_KEY = 'myasharah-lang';
const ATTRIBUTES = ['alt', 'aria-label', 'placeholder', 'title'];
const SKIP = 'script, style, svg, [data-no-translate]';

const originalText = new WeakMap(); // Text node -> English text
const originalAttrs = new WeakMap(); // Element -> { attribute: English value }
let originalTitle = document.title;
const descriptionMeta = document.querySelector('meta[name="description"]');
let originalDescription = descriptionMeta?.content;

export const getLanguage = () => (document.documentElement.lang === 'ms' ? 'ms' : 'en');

const translate = (value) => {
  const key = value.replace(/\s+/g, ' ').trim();
  if (!key) return null;
  if (Object.hasOwn(ms, key)) return ms[key];
  for (const [pattern, build] of msPatterns) {
    const match = key.match(pattern);
    if (match) return build(match);
  }
  return null;
};

// Keeps the surrounding spaces of the original so inline layout does not shift
const withSpacing = (original, translated) => {
  const lead = original.match(/^\s*/)[0];
  const trail = original.match(/\s*$/)[0];
  return `${lead}${translated}${trail}`;
};

const translateTextNode = (node, lang) => {
  if (node.parentElement?.closest(SKIP)) return;
  if (!originalText.has(node)) originalText.set(node, node.nodeValue);
  const english = originalText.get(node);
  const translated = lang === 'ms' ? translate(english) : null;
  const next = translated ? withSpacing(english, translated) : english;
  if (node.nodeValue !== next) node.nodeValue = next;
};

const translateAttributes = (element, lang) => {
  if (element.closest(SKIP) && !element.matches('svg')) return;
  for (const attribute of ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const stored = originalAttrs.get(element) ?? {};
    if (!(attribute in stored)) {
      stored[attribute] = element.getAttribute(attribute);
      originalAttrs.set(element, stored);
    }
    const english = stored[attribute];
    const next = (lang === 'ms' && translate(english)) || english;
    if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
  }
};

const translateTree = (root, lang) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateAttributes(root, lang);
  root.querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(',')).forEach((el) => translateAttributes(el, lang));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node, lang);
};

let observer;

const applyLanguage = (lang) => {
  observer?.disconnect();
  translateTree(document.body, lang);
  document.title = (lang === 'ms' && translate(originalTitle)) || originalTitle;
  if (descriptionMeta) descriptionMeta.content = (lang === 'ms' && translate(originalDescription)) || originalDescription;
  observer?.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
};

// Translates anything the page changes after load. Our own edits happen while disconnected.
observer = new MutationObserver((mutations) => {
  const lang = getLanguage();
  observer.disconnect();
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      // The page wrote new English text into an existing node: that becomes its new original
      originalText.set(mutation.target, mutation.target.nodeValue);
      translateTextNode(mutation.target, lang);
    } else if (mutation.type === 'attributes') {
      const stored = originalAttrs.get(mutation.target) ?? {};
      stored[mutation.attributeName] = mutation.target.getAttribute(mutation.attributeName);
      originalAttrs.set(mutation.target, stored);
      translateAttributes(mutation.target, lang);
    } else {
      mutation.addedNodes.forEach((node) => translateTree(node, lang));
    }
  }
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
});

export const setLanguage = (lang) => {
  const next = lang === 'ms' ? 'ms' : 'en';
  document.documentElement.lang = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch (error) {
    // Storage can be blocked; the choice then lasts for this page only.
  }
  applyLanguage(next);
  document.dispatchEvent(new CustomEvent('languagechange', { detail: next }));
};

/** Translates a string the scripts build themselves (used for labels that change with state). */
export const t = (english) => (getLanguage() === 'ms' && translate(english)) || english;

export const initLanguage = () => {
  originalTitle = document.title;
  applyLanguage(getLanguage());
  document.documentElement.classList.remove('i18n-pending');
};

/**
 * Called by the page router after it swaps in a new page without reloading: records the new page's
 * English title and description, then translates the whole page at once so it never shows in English.
 */
export const refreshPage = () => {
  originalTitle = document.title;
  originalDescription = descriptionMeta?.content;
  applyLanguage(getLanguage());
};
