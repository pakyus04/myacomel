// Background music playlist. Empty by default: with no tracks the player is not created at all.
//
// To add songs: put MP3 files in assets/music/ and list them here, for example
//   { id: 'winter-piano', title: 'Winter Piano' }   ->   assets/music/winter-piano.mp3
// Only add music that is royalty-free or that you hold a licence for.
// Paths stay relative so the site also works when it is served from a sub-folder (GitHub Pages).
export const musicTracks = [
  // { id: 'winter-piano', title: 'Winter Piano' },
].map((track) => ({ ...track, src: `assets/music/${track.id}.mp3` }));
