// Background music playlist. With an empty list the player is not created at all.
//
// To add a song: put the MP3 in assets/music/ and add a line here, for example
//   { id: 'winter-piano', title: 'Winter Piano' }   ->   assets/music/winter-piano.mp3
// Paths stay relative so the site also works when it is served from a sub-folder (GitHub Pages).
export const musicTracks = [
  { id: 'the-rain', title: 'The Rain' },
  { id: 'the-girl-who-fell-from-the-sky', title: 'The Girl Who Fell from the Sky' },
  { id: 'setsuko-and-seita', title: 'Setsuko and Seita' },
  { id: 'my-neighbour-totoro', title: 'My Neighbour Totoro' },
  { id: 'cry-for-the-moon', title: 'Cry for the Moon' },
  { id: 'clair-de-lune', title: 'Clair de Lune — Debussy' },
  { id: 'mrs-magic', title: 'Mrs Magic (Piano Version)' },
  { id: 'a-town-with-an-ocean-view', title: 'A Town with an Ocean View' },
  { id: 'howls-moving-castle', title: "Howl's Moving Castle — Theme" },
].map((track) => ({ ...track, src: `assets/music/${track.id}.mp3` }));
