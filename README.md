# Nur Myasharah — professional portfolio

A static portfolio with a quiet **winter** design: frosted paper, deep ink-blue text, one
glacier-blue accent, gently falling snow, and a "winter night" dark mode. No build step, no
libraries and no external requests — system fonts only.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: welcome greeting, link page, introduction and links to every page |
| `profil.html` | Profile: about me, education and professional skills |
| `penyelidikan.html` | Research: final-year research, methodology and findings |
| `kepimpinan.html` | Leadership: roles, achievements, facilitation and community work |
| `perjalanan.html` | Journey: university timeline and activity domains |
| `hubungi.html` | Contact: email, copy-email button and social links |

The bottom bar moves between pages without reloading (`router.js`), so music and the snow keep
going. All links and file paths are **relative**, so the site also works from a sub-folder such as
`https://<user>.github.io/<repo>/`.

## Language and theme

- **EN | BM** switches the language. The HTML is written in English; the Bahasa Melayu text lives in
  `i18n-ms.js`, keyed by the exact English text. Text that is already in Malay has `lang="ms"` in the
  HTML and is never translated. When you add or change English text, add the same text to
  `i18n-ms.js` too.
- **Sun / moon** switches light and dark mode.
- On the first visit both follow the device settings; the choices are then remembered.

## Adding songs

The music player is hidden while the playlist is empty.

1. Put MP3 files in `assets/music/`, e.g. `assets/music/winter-piano.mp3`.
2. List them in `music-tracks.js`:

   ```js
   export const musicTracks = [
     { id: 'winter-piano', title: 'Winter Piano' },
   ].map((track) => ({ ...track, src: `assets/music/${track.id}.mp3` }));
   ```

Only add music that is royalty-free or that you are licensed to use.

## Changing social links

Social links appear in three places in the HTML:

- the link page in `index.html` (the `hub-links` list),
- the contact page `hubungi.html` (the `social-links` list),
- the footer of every page (`footer-social`).

Change the URL and the visible handle in each place. Remove a whole `<li>` (or `<a>` in the footer)
to hide a platform.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.
