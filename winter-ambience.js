// Snow falling slowly behind the content, for the winter mood.
// A few small inline SVGs moved with CSS transforms only, so it stays light.
// Skipped for visitors who prefer reduced motion or have data saver on.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;

const flakeShapes = [
  // Six-point snowflake
  '<path fill="none" stroke-width="1.6" stroke-linecap="round" d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M12 2l-2 2.2M12 2l2 2.2M12 22l-2-2.2M12 22l2-2.2" />',
  // Soft dot
  '<circle cx="12" cy="12" r="5" stroke="none" />',
  // Small dot
  '<circle cx="12" cy="12" r="3.4" stroke="none" />',
];

const random = (min, max) => min + Math.random() * (max - min);

const createSnowFall = () => {
  if (document.querySelector('.snow-fall')) return;
  const count = window.innerWidth < 640 ? 10 : 18;
  const layer = document.createElement('div');
  layer.className = 'snow-fall';
  layer.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < count; index += 1) {
    const flake = document.createElement('span');
    flake.className = index % 3 === 2 ? 'flake flake-dim' : 'flake';
    const duration = random(14, 26);
    // Values go through CSSOM rather than inline style attributes
    flake.style.setProperty('--flake-x', `${random(0, 100).toFixed(1)}vw`);
    flake.style.setProperty('--flake-drift', `${random(-12, 12).toFixed(1)}vw`);
    flake.style.setProperty('--flake-size', `${random(6, 16).toFixed(0)}px`);
    flake.style.setProperty('--flake-duration', `${duration.toFixed(1)}s`);
    // Negative delays spread the flakes across the screen from the first frame
    flake.style.setProperty('--flake-delay', `${(-random(0, duration)).toFixed(1)}s`);
    flake.style.setProperty('--flake-sway', `${random(3, 6).toFixed(1)}s`);
    flake.innerHTML = `<svg viewBox="0 0 24 24">${flakeShapes[index % flakeShapes.length]}</svg>`;
    layer.append(flake);
  }

  document.body.prepend(layer);
};

if (!reduceMotion && !saveData) createSnowFall();
