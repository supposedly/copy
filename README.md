# \&copy;
A browser extension that lets you copy HTML entities as Unicode characters&nbsp;-- with minimal hassle.

Motivated by the incongruous amount of time I'd been spending on the *[Need a zero-width-space on your clipboard?](https://codepen.io/chriscoyier/pen/iLKwm)* codepen, modifying it to copy nbsp, rlm, lrm, combining chars...

## Usage
![Screenshot of the extension](https://i.imgur.com/oCSA6ou.png)
- Type your text into the box. It'll be previewed up top. Hit the green button to copy what's in the preview.
- Recently used entities will be added to the left column, and commonly used ones will be added to the right.
  Hover over these buttons to preview them, and click on any to copy what's in its preview.

## Browser support
- [x] Chrome
- [ ] Firefox
- [ ] Edge

## Potential todos
- Firefox, Edge support
- Names for common entities
- Typing entities by character name, a la Python `'\N{}'`