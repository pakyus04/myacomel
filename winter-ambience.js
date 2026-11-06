// The winter scene behind the content: an icy sky, snowy hills with a row of pines, and snow
// falling in three depths (small and slow far away, larger and quicker up close). At night the sky
// gets stars and a faint aurora. Everything is decorative and hidden from screen readers.
// Motion uses transforms (and opacity for the stars) only. The scene stays without motion for
// visitors who prefer reduced motion or have data saver on.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;
const still = reduceMotion || saveData;

const random = (min, max) => min + Math.random() * (max - min);
const SVG_NS = 'http://www.w3.org/2000/svg';

// A six-armed snowflake with small branches on every arm
const arm = '<path d="M12 12V1.5M12 4.6 9.8 2.6M12 4.6l2.2-2M12 7.6 9 5.2M12 7.6l3-2.4" />';
const crystal = `<g fill="none" stroke-width="1.3" stroke-linecap="round">${[0, 60, 120, 180, 240, 300]
  .map((angle) => `<g transform="rotate(${angle} 12 12)">${arm}</g>`)
  .join('')}</g>`;
const star = '<g fill="none" stroke-width="1.6" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" /></g>';
const dot = '<circle cx="12" cy="12" r="6" />';

const depths = [
  // [name, desktop count, phone count, size, fall duration, shapes]
  ['far', 16, 9, [4, 7], [24, 36], [dot, dot, star]],
  ['mid', 14, 8, [7, 12], [16, 26], [star, crystal, dot]],
  ['near', 8, 5, [13, 22], [11, 18], [crystal, crystal, star]],
];

// Pines along the ridge: x position (0–1440) and scale
const pines = [
  [40, 0.8], [92, 1.15], [138, 0.7], [300, 0.9], [342, 1.25], [390, 0.75], [612, 0.85],
  [930, 0.8], [978, 1.2], [1024, 0.9], [1196, 0.75], [1250, 1.1], [1300, 0.85], [1395, 1],
];
const pinePath = (x, s) =>
  `<g transform="translate(${x} ${150 - 4 * s}) scale(${s})">` +
  '<path class="pine" d="M0-64 L-13-38h7L-19-14h8L-25 10h50L11-14h8L6-38h7Z" />' +
  '<path class="pine-snow" d="M0-64 L-6-52 L0-55 L6-52Z M-6-38 L-10-31 L0-34 L10-31 L6-38Z M-11-14 L-15-7 L0-10 L15-7 L11-14Z" />' +
  '<rect class="pine" x="-3" y="10" width="6" height="8" /></g>';

const hills = `
  <svg class="winter-hills" viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice">
    <path class="hill-far" d="M0 150C120 112 230 104 360 126S600 168 760 136 1040 92 1200 112 1380 150 1440 140V220H0Z" />
    ${pines.map(([x, s]) => pinePath(x, s)).join('')}
    <path class="hill-near" d="M0 186C160 156 300 160 470 176S760 206 940 182 1250 150 1440 172V220H0Z" />
    <path class="hill-shine" d="M120 178C260 160 380 162 520 174M900 184C1040 168 1180 160 1320 166" />
  </svg>`;

const makeFlakes = (layer) => {
  const phone = window.innerWidth < 640;
  depths.forEach(([name, desktopCount, phoneCount, size, fall, shapes]) => {
    const count = phone ? phoneCount : desktopCount;
    for (let index = 0; index < count; index += 1) {
      const flake = document.createElement('span');
      flake.className = `flake flake-${name}`;
      const duration = random(...fall);
      // Values go through CSSOM rather than inline style attributes
      flake.style.setProperty('--flake-x', `${random(0, 100).toFixed(1)}vw`);
      flake.style.setProperty('--flake-drift', `${random(-12, 12).toFixed(1)}vw`);
      flake.style.setProperty('--flake-size', `${random(...size).toFixed(0)}px`);
      flake.style.setProperty('--flake-duration', `${duration.toFixed(1)}s`);
      // Negative delays spread the flakes across the screen from the first frame
      flake.style.setProperty('--flake-delay', `${(-random(0, duration)).toFixed(1)}s`);
      flake.style.setProperty('--flake-sway', `${random(3, 6).toFixed(1)}s`);
      flake.innerHTML = `<svg viewBox="0 0 24 24">${shapes[index % shapes.length]}</svg>`;
      layer.append(flake);
    }
  });
};

const makeStars = (layer) => {
  const sky = document.createElementNS(SVG_NS, 'svg');
  sky.setAttribute('class', 'winter-stars');
  sky.setAttribute('viewBox', '0 0 100 60');
  sky.setAttribute('preserveAspectRatio', 'none');
  for (let index = 0; index < 46; index += 1) {
    const point = document.createElementNS(SVG_NS, 'circle');
    point.setAttribute('cx', random(0, 100).toFixed(2));
    point.setAttribute('cy', random(0, 42).toFixed(2));
    point.setAttribute('r', random(0.05, 0.14).toFixed(3));
    if (index % 3 === 0) {
      point.setAttribute('class', 'twinkle');
      point.style.setProperty('--twinkle-delay', `${(-random(0, 5)).toFixed(1)}s`);
    }
    sky.append(point);
  }
  layer.append(sky);
};

const createScene = () => {
  if (document.querySelector('body > .snow-fall')) return;
  const layer = document.createElement('div');
  layer.className = 'snow-fall';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="winter-sky"></div><div class="winter-aurora"></div>';
  makeStars(layer);
  layer.insertAdjacentHTML('beforeend', hills);
  if (!still) makeFlakes(layer);
  document.body.prepend(layer);

  // The welcome link page covers the scene, so it gets a few flakes of its own
  const hub = document.querySelector('[data-hub]');
  if (hub && !still) {
    const hubSnow = document.createElement('div');
    hubSnow.className = 'hub-snow';
    hubSnow.setAttribute('aria-hidden', 'true');
    makeFlakes(hubSnow);
    hub.prepend(hubSnow);
  }
};

createScene();
