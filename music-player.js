import { musicTracks } from './music-tracks.js';

// Floating background-music player shared by every page.
// Browsers block audible autoplay until the visitor interacts, so playback starts
// immediately when allowed and otherwise the player asks "Wanna play a song?".
const PREFERENCE_KEY = 'myasharah-music';
const MINIMISED_KEY = 'myasharah-music-minimised';
const STATE_KEY = 'myasharah-music-state';
const TARGET_VOLUME = 0.35;

const readStorage = (storage, key) => {
  try {
    return window[storage].getItem(key);
  } catch (error) {
    return null;
  }
};

const writeStorage = (storage, key, value) => {
  try {
    window[storage].setItem(key, value);
  } catch (error) {
    // Storage can be unavailable in strict privacy modes; the player still works.
  }
};

const icons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" /></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" /></svg>',
  previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2.5v14H6zM19 5.5v13L9.5 12 19 5.5Z" /></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 5H18v14h-2.5zM5 5.5v13L14.5 12 5 5.5Z" /></svg>',
  list: '<svg class="music-icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11M4 11h11M4 16h7M17 14.5V5l4 1.5M17 14.5a2.5 2.5 0 1 1-2.5-2.5 2.5 2.5 0 0 1 2.5 2.5Z" /></svg>',
  minimise: '<svg class="music-icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>',
  close: '<svg class="music-icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>',
};

const savedState = (() => {
  try {
    return JSON.parse(readStorage('sessionStorage', STATE_KEY) || 'null');
  } catch (error) {
    return null;
  }
})();

let trackIndex = musicTracks.findIndex((track) => track.id === savedState?.id);
if (trackIndex < 0) trackIndex = Math.floor(Math.random() * musicTracks.length);
let resumeTime = Number(savedState?.time) || 0;
let musicOff = readStorage('localStorage', PREFERENCE_KEY) === 'off';
let minimised = readStorage('localStorage', MINIMISED_KEY) === 'true';
let loading = false;
let fadeFrame;

const audio = new Audio();
// Only fetch metadata up front so mobile visitors do not download a song they never play.
audio.preload = 'metadata';
audio.volume = 0;

const player = document.createElement('section');
player.className = 'music-player';
player.setAttribute('aria-label', 'Background music');
player.innerHTML = `
  <button class="music-player-launcher" type="button" data-music-expand aria-label="Show music player">
    <span class="music-player-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  </button>
  <div class="music-player-bar" data-music-bar>
    <button class="music-player-toggle" type="button" data-music-toggle>
      <span class="music-player-toggle-icon" data-music-toggle-icon></span>
      <span class="music-player-spinner" aria-hidden="true"></span>
    </button>
    <span class="music-player-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i></span>
    <div class="music-player-meta">
      <span class="music-player-label" data-music-status></span>
      <span class="music-player-title" data-music-title data-no-translate></span>
    </div>
    <span class="music-player-wave music-player-bar-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <button class="music-player-button music-player-step" type="button" data-music-previous aria-label="Previous song">${icons.previous}</button>
    <button class="music-player-button music-player-step" type="button" data-music-next aria-label="Next song">${icons.next}</button>
    <button class="music-player-button" type="button" data-music-menu aria-label="Choose a song" aria-expanded="false" aria-controls="music-playlist">${icons.list}</button>
    <button class="music-player-button music-player-minimise" type="button" data-music-minimise aria-label="Minimise music player">${icons.minimise}</button>
  </div>
  <div class="music-player-playlist" id="music-playlist" role="region" aria-label="Song list" data-music-playlist>
    <div class="music-player-playlist-header">
      <p class="music-player-playlist-heading">Choose a song</p>
      <button class="music-player-button" type="button" data-music-close aria-label="Close song list">${icons.close}</button>
    </div>
    <ol>
      ${musicTracks
        .map(
          (track, index) =>
            `<li><button type="button" data-music-track="${index}"><span class="music-track-number">${String(index + 1).padStart(2, '0')}</span><span class="music-track-title" data-no-translate>${track.title}</span></button></li>`,
        )
        .join('')}
    </ol>
  </div>
  <div class="music-player-prompt" role="group" aria-labelledby="music-prompt-title" data-music-prompt>
    <span class="music-prompt-icon" aria-hidden="true">♪</span>
    <div class="music-prompt-copy">
      <p class="music-prompt-title" id="music-prompt-title">Wanna play a song?</p>
      <p class="music-prompt-text">Quiet music while you explore the portfolio.</p>
    </div>
    <div class="music-prompt-actions">
      <button class="music-prompt-yes" type="button" data-music-prompt-yes>${icons.play}<span>Yes, play</span></button>
      <button class="music-prompt-no" type="button" data-music-prompt-no>No thanks</button>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-music-announcer></p>
`;

const bar = player.querySelector('[data-music-bar]');
const toggleButton = player.querySelector('[data-music-toggle]');
const toggleIcon = player.querySelector('[data-music-toggle-icon]');
const statusLabel = player.querySelector('[data-music-status]');
const titleLabel = player.querySelector('[data-music-title]');
const menuButton = player.querySelector('[data-music-menu]');
const expandButton = player.querySelector('[data-music-expand]');
const minimiseButton = player.querySelector('[data-music-minimise]');
const playlist = player.querySelector('[data-music-playlist]');
const announcer = player.querySelector('[data-music-announcer]');
const trackButtons = [...player.querySelectorAll('[data-music-track]')];
const musicPrompt = player.querySelector('[data-music-prompt]');
let playlistOpen = false;
let promptOpen = false;

const isPlaying = () => !audio.paused && !audio.ended;

const updateMediaSession = () => {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: musicTracks[trackIndex].title,
    artist: 'Nur Myasharah | Portfolio',
    artwork: [{ src: new URL('assets/favicon.svg', document.baseURI).href, sizes: 'any', type: 'image/svg+xml' }],
  });
  navigator.mediaSession.playbackState = isPlaying() ? 'playing' : 'paused';
};

const render = () => {
  const playing = isPlaying();
  const track = musicTracks[trackIndex];
  player.classList.toggle('is-playing', playing);
  // Lets page decorations react to the music
  document.documentElement.classList.toggle('music-playing', playing);
  player.classList.toggle('is-loading', loading);
  player.classList.toggle('is-minimised', minimised);
  toggleIcon.innerHTML = playing ? icons.pause : icons.play;
  toggleButton.setAttribute('aria-label', playing ? 'Turn music off' : 'Turn music on');
  toggleButton.setAttribute('aria-pressed', String(playing));
  toggleButton.setAttribute('aria-busy', String(loading));
  statusLabel.textContent = loading ? 'Loading…' : playing ? 'Now playing' : musicOff ? 'Music off' : 'Tap to play';
  titleLabel.textContent = track.title;
  expandButton.setAttribute('aria-label', playing ? `Show music player, playing ${track.title}` : 'Show music player');
  trackButtons.forEach((button, index) => {
    if (index === trackIndex) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  // Hidden parts stay out of the tab order and the accessibility tree.
  bar.inert = minimised;
  expandButton.inert = !minimised;
  playlist.inert = !playlistOpen;
  musicPrompt.inert = !promptOpen;
  updateMediaSession();
};

const fadeTo = (target, duration = 900) => {
  cancelAnimationFrame(fadeFrame);
  const start = audio.volume;
  const startTime = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      audio.volume = Math.min(Math.max(start + (target - start) * progress, 0), 1);
      if (progress < 1) fadeFrame = requestAnimationFrame(step);
      else resolve();
    };
    fadeFrame = requestAnimationFrame(step);
  });
};

const saveState = () => {
  writeStorage(
    'sessionStorage',
    STATE_KEY,
    JSON.stringify({ id: musicTracks[trackIndex].id, time: audio.currentTime || resumeTime }),
  );
};

const loadTrack = (index) => {
  trackIndex = (index + musicTracks.length) % musicTracks.length;
  audio.src = musicTracks[trackIndex].src;
  if (resumeTime) {
    const seek = resumeTime;
    resumeTime = 0;
    audio.addEventListener(
      'loadedmetadata',
      () => {
        if (seek < audio.duration) audio.currentTime = seek;
      },
      { once: true },
    );
  }
  render();
};

const play = async () => {
  if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
    loading = true;
    render();
  }
  try {
    await audio.play();
    fadeTo(TARGET_VOLUME);
    return true;
  } catch (error) {
    loading = false;
    render();
    return false;
  }
};

const turnOn = () => {
  musicOff = false;
  writeStorage('localStorage', PREFERENCE_KEY, 'on');
  return play();
};

const turnOff = async () => {
  musicOff = true;
  writeStorage('localStorage', PREFERENCE_KEY, 'off');
  await fadeTo(0, 300);
  audio.pause();
  render();
};

const selectTrack = async (index) => {
  // A short fade-out avoids an abrupt cut when switching songs.
  if (isPlaying()) await fadeTo(0, 220);
  audio.volume = 0;
  loadTrack(index);
  announcer.textContent = `Now playing ${musicTracks[trackIndex].title}`;
  turnOn();
};

const setPlaylistOpen = (open, { restoreFocus = false } = {}) => {
  if (open === playlistOpen) return;
  playlistOpen = open;
  player.classList.toggle('playlist-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  render();
  if (open) {
    const current = trackButtons[trackIndex] || trackButtons[0];
    current.scrollIntoView({ block: 'nearest' });
    current.focus({ preventScroll: true });
  } else if (restoreFocus) {
    menuButton.focus();
  }
};

const setPromptOpen = (open) => {
  if (open === promptOpen) return;
  promptOpen = open;
  player.classList.toggle('prompt-open', open);
  if (open) {
    setPlaylistOpen(false);
    announcer.textContent = 'Wanna play a song?';
  }
  render();
};

// Wait for the homepage welcome and link page to finish so the question is not hidden behind them.
const welcomeDone = () =>
  !document.body.classList.contains('hello-playing') && !document.querySelector('[data-hello]');

const whenWelcomeDone = (callback) => {
  if (welcomeDone()) {
    callback();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!welcomeDone()) return;
    observer.disconnect();
    callback();
  });
  observer.observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] });
};

const setMinimised = (value) => {
  minimised = value;
  writeStorage('localStorage', MINIMISED_KEY, String(value));
  if (value) setPlaylistOpen(false);
  render();
  (value ? expandButton : toggleButton).focus({ preventScroll: true });
};

toggleButton.addEventListener('click', () => (isPlaying() ? turnOff() : turnOn()));
player.querySelector('[data-music-previous]').addEventListener('click', () => selectTrack(trackIndex - 1));
player.querySelector('[data-music-next]').addEventListener('click', () => selectTrack(trackIndex + 1));
menuButton.addEventListener('click', () => setPlaylistOpen(!playlistOpen));
player.querySelector('[data-music-close]').addEventListener('click', () => setPlaylistOpen(false, { restoreFocus: true }));
minimiseButton.addEventListener('click', () => setMinimised(true));
expandButton.addEventListener('click', () => setMinimised(false));

player.querySelector('[data-music-prompt-yes]').addEventListener('click', () => {
  setPromptOpen(false);
  turnOn();
  toggleButton.focus({ preventScroll: true });
});

player.querySelector('[data-music-prompt-no]').addEventListener('click', () => {
  setPromptOpen(false);
  turnOff();
  announcer.textContent = 'Music off. Use the play button any time.';
});

trackButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectTrack(Number(button.dataset.musicTrack));
    setPlaylistOpen(false, { restoreFocus: true });
  });
});

player.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (promptOpen) setPromptOpen(false);
  setPlaylistOpen(false, { restoreFocus: true });
});

// pointerdown also fires for taps on iOS, where click does not reach the document.
document.addEventListener('pointerdown', (event) => {
  if (!player.contains(event.target)) setPlaylistOpen(false);
});

// Step aside while a form field is focused so the on-screen keyboard never covers it.
const isTextField = (element) => element?.matches?.('input, textarea, select, [contenteditable="true"]');
document.addEventListener('focusin', (event) => {
  if (!player.contains(event.target)) player.classList.toggle('is-tucked', isTextField(event.target));
});
document.addEventListener('focusout', () => {
  requestAnimationFrame(() => player.classList.toggle('is-tucked', isTextField(document.activeElement)));
});

audio.addEventListener('play', () => {
  setPromptOpen(false);
  render();
});
audio.addEventListener('pause', render);
audio.addEventListener('waiting', () => {
  loading = true;
  render();
});
audio.addEventListener('playing', () => {
  loading = false;
  render();
});
audio.addEventListener('ended', () => {
  loadTrack(trackIndex + 1);
  play();
});
audio.addEventListener('error', () => {
  // Skip a track that fails to load instead of leaving the player silent.
  loading = false;
  if (!musicOff) {
    loadTrack(trackIndex + 1);
    play();
  }
});

// Lock-screen and notification controls on phones.
if ('mediaSession' in navigator) {
  const actions = {
    play: () => turnOn(),
    pause: () => turnOff(),
    previoustrack: () => selectTrack(trackIndex - 1),
    nexttrack: () => selectTrack(trackIndex + 1),
  };
  Object.entries(actions).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      // Older browsers do not support every action.
    }
  });
}

// Remember the song and position so playback continues on the next page.
window.addEventListener('pagehide', saveState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveState();
});

document.body.append(player);
document.body.classList.add('has-music-player');
loadTrack(trackIndex);

if (!musicOff) {
  play().then((started) => {
    // Autoplay was blocked: ask the visitor instead of starting music on a random tap.
    if (!started) whenWelcomeDone(() => window.setTimeout(() => !isPlaying() && !musicOff && setPromptOpen(true), 700));
  });
}
