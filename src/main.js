const PARSER = new DOMParser();
const ENTITY_PATTERN = /&(?:(?:#[0-9]+|#x[0-9a-f]+|[a-z0-9]+);|[a-z][a-z0-9]{1,5})/gi;

window.onload = function() {
  const textbox = document.getElementById('input');
  document.getElementById('submit').addEventListener('click', () => copy(textbox.value));
  textbox.addEventListener('keyup', event => { if (event.key === 'Enter') copy(textbox.value); });
  textbox.addEventListener('input', e => preview(e.target.value));
  textbox.focus();
  populateRecents();
  populateFavorites();
};


/**
 * Parse an HTML-escaped string into unescaped text
 * @param {string} s String to parse as HTML
 * @param {string} attr JS attribute to return from newly parsed body
 *  (e.g. 'textContent' or 'innerHTML')
 */
function parse(s, attr = 'textContent') {
  return PARSER.parseFromString(s, 'text/html').body[attr];
}


/**
 * Set DOM's 'preview' element to the parsed contents of an HTML-escaped string,
 * accounting for emptiness by instead inserting a ZWSP
 * @param {string} string String to preview
 */
function preview(string) {
  document.getElementById('preview').innerHTML = string === '' ? '&#8203;' : parse(string, 'innerHTML');
}


/**
 * The main operation. Takes a string, unescapes it, copies that to clipboard,
 * and then updates the "recent" and "favorites" statistics with any HTML
 * entities present in that string.
 * Handles non-semicolon-terminated entities, but normalizes these in the latter
 * step.
 * @param {string} string String to copy and update from
 */
function copy(string) {
  navigator.clipboard.writeText(
    parse(string)
  ).then(() =>
    string.match(ENTITY_PATTERN)
      .map(s => {
        const parsed = parse(s);
        if (parsed === s) {
          // if there was no change then we know s is invalid
          return '';
        }
        const parsedSymbolCount = numSymbols(parsed);
        if (parsedSymbolCount === 1) {
          // if only one symbol resulted then we know s is valid
          // Also, normalize w/ semicolon
          return s.endsWith(';') ? s : s + ';';
        }
        // else we know that at least the beginning of s is a valid entity
        // So we strip the last (parsedSymbolCount - 1) chars off of s, meaning if
        // s == '&ampabc' and parsed == '&abc', we strip that 'abc' to leave the entity
        // Also, normalize w/ semicolon
        return s.slice(0, 1-parsedSymbolCount) + ';';
      })
      .filter(s => s !== '')
      .reduce(
        (acc, s) => acc.then(() => updateStatsWith(s, true)),
        Promise.resolve()
      )
  ).then(() => Promise.all([
    populateRecents(true),
    populateFavorites(true),
  ]));
}


/**
 * Same as copy(), but for when there is only a single entity and nothing else to be copied
 * @param {string} entity String containing a single entity to copy and update with
 */
function copyOne(entity) {
  navigator.clipboard.writeText(
    parse(entity)
  ).then(() => updateStatsWith(entity, false));
}


/**
 * Update "recents" and ""
 * @param {string} entity String containing a single HTML entity to update with
 * @param {boolean} multiple Whether this update is part of a multiple-entity run or not
 */
function updateStatsWith(entity, multiple = false) {
  return Promise.all([updateRecents(entity, multiple), updateFavorites(entity, multiple)]);
}


/**
 * Update the "recently used" queue
 * @param {string} entity String containing a single HTML entity to update with
 * @param {boolean} multiple Whether this update is part of a multiple-entity run or not
 */
function updateRecents(entity, multiple) {
  return new Promise(resolve => {
    chrome.storage.local.get({recents: []}, items => {
      const arr = items.recents;
      if (arr[0] !== entity) {
        arr.unshift(entity);
        if (arr.length > 3) {
          arr.pop();
        }
      }
      chrome.storage.local.set({recents: arr}, () => {
        if (multiple) {
          resolve();
        } else {
          return populateRecents(true);
        }
      });
    });
  });
}


/**
 * Update the "your favorites" list
 * @param {string} entity String containing a single HTML entity to update with
 * @param {boolean} multiple Whether this update is part of a multiple-entity run or not
 */
function updateFavorites(entity, multiple) {
  return new Promise(resolve => {
    chrome.storage.local.get({favorites: {}}, items => {
      const obj = items.favorites;
      if (!obj.hasOwnProperty(entity)) {
        obj[entity] = {score: 0, age: 0};
      }
      Object.entries(obj).forEach(([key, o]) => {
        if (key === entity) {
          o.score++;
        } else if (++o.age % 4 === 0) {
          o.score--;
        }
        if (o.score < 0) {
          delete obj[key];
        }
      });
      chrome.storage.local.set({favorites: obj}, () => {
        if (multiple) {
          resolve();
        } else {
          return populateFavorites(true);
        }
      });
    });
  });
}


/**
 * Update the div that displays most-recently-copied entities
 * @param {boolean} clearFirst Whether to clear the div before populating
 */
function populateRecents(clearFirst = false) {
  const mainDiv = document.getElementById('recents');
  if (clearFirst) {
    clearChildren(mainDiv);
  }
  return new Promise(resolve => {
    chrome.storage.local.get({recents: []}, items => {
      items.recents.forEach(el => {
        const div = document.createElement('div');
        div.className = 'btn-container';
        div.appendChild(newButton(el, 'recent', () => copyOne(el)));
        div.appendChild(newPre(el));
        div.appendChild(document.createElement('br'));
        mainDiv.appendChild(div);
      });
      resolve();
    })
  });
}


/**
 * Update the div that displays most-copied entities
 * @param {boolean} clearFirst Whether to clear the div before populating
 */
function populateFavorites(clearFirst = false) {
  const mainDiv = document.getElementById('favorites');
  if (clearFirst) {
    clearChildren(mainDiv);
  }
  return new Promise(resolve => {
    chrome.storage.local.get({favorites: {}}, items => {
      const obj = items.favorites;
      Object.keys(obj).sort(
        // descending order
        (a, b) => obj[b].score - obj[a].score
      ).filter(s => obj[s].score > 1)
      .slice(0, 3)
      .forEach(el => {
        const div = document.createElement('div');
        div.appendChild(newButton(el, 'favorite', () => copyOne(el)));
        div.appendChild(newPre(el));
        div.appendChild(document.createElement('br'));
        mainDiv.appendChild(div);
      });
      resolve();
    })
  });
}


/**
 * Delete all children of a div
 * @param {HTMLElement} div div to clear children of
 */
function clearChildren(div) {
  while (div.lastChild) {
    div.removeChild(div.lastChild);
  }
}


/**
 * Create a new, customizable HTML button element
 * @param {string} content Content to display within button
 * @param {string} cls CSS classname to apply to button
 * @param {function} onclick onClick event listener to add to button
 */
function newButton(content, cls, onclick) {
  const btn = document.createElement('button');
  if (content !== undefined) {
    btn.appendChild(document.createTextNode(content));
    btn.title = content;
  }
  if (cls !== undefined) {
    btn.className = cls;
  }
  if (onclick !== undefined) {
    btn.addEventListener('click', onclick);
  }
  return btn;
}


/**
 * Create a new "preview" element for HTML entities
 * @param {string} el String containing escaped HTML entity to display
 */
function newPre(el) {
  const pre = document.createElement('button');
  pre.className = 'btn-preview';
  pre.innerHTML = el;
  return pre;
}


/**
 * Count number of unicode symbols in a string.
 * Differs from string.length in that it counts
 * some unicode symbols, e.g. emojis, as one character
 * instead of two
 * @param {string} string String to count symbols in
 */
function numSymbols(string) {
  return [...string].length;
}
