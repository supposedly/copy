const PARSER = new DOMParser();
const ENTITY_PATTERN = /&(?:(?:#[0-9]+|#x[0-9a-f]+|[a-z0-9]+);|[a-z][a-z0-9]{1,5})/gi;
window.onload = function() {
  document.getElementById('submit').addEventListener('click', () => copy(document.getElementById('input').value));
  document.getElementById('input').addEventListener('input', e => preview(e.target.value));
  populateRecents();
  populateFavorites();
};


function parse(s, attr = 'textContent') {
  return PARSER.parseFromString(s, 'text/html').body[attr];
}


function preview(string) {
  document.getElementById('preview').innerHTML = string === '' ? '&#8203;' : parse(string, 'innerHTML');
}


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
          return s;
        }
        // else we know that at least the beginning of s is a valid entity
        // So we strip the last (parsedSymbolCount - 1) chars off of s, meaning if
        // s == '&ampabc' and parsed == '&abc', we strip that 'abc' to leave the entity
        return ''.slice(0, -(parsedSymbolCount - 1));
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


function copyOne(entity) {
  navigator.clipboard.writeText(
    parse(entity)
  ).then(() => updateStatsWith(entity, false));
}


function updateStatsWith(entity, multiple = false) {
  return Promise.all([updateRecents(entity, multiple), updateFavorites(entity, multiple)]);
}


function updateRecents(entity, multiple) {
  return new Promise(resolve => {
    chrome.storage.local.get({recents: []}, items => {
      const arr = items.recents;
      arr.unshift(entity);
      if (arr.length > 3) {
        arr.pop();
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


function updateFavorites(entity, multiple) {
  return new Promise(resolve => {
    chrome.storage.local.get({favorites: {}}, items => {
      const obj = items.favorites;
      Object.entries(obj).forEach(([key, o]) => {
        if (++o.age % 5 === 0) {
          o.score--;
        }
        if (o.score < 0) {
          delete obj[key];
        }
      });
      if (!obj.hasOwnProperty(entity)) {
        obj[entity] = {score: 0, age: 0};
      }
      obj[entity].score++;
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


function populateRecents(clearFirst = false) {
  const div = document.getElementById('recents');
  if (clearFirst) {
    clearChildren(div);
  }
  return new Promise(resolve => {
    chrome.storage.local.get({recents: []}, items => {
      items.recents.forEach(el => {
        div.appendChild(newButton(el, 'recent', () => copyOne(el)));
        div.appendChild(newPre(el));
        div.appendChild(document.createElement('br'));
      });
      resolve();
    })
  });
}


function populateFavorites(clearFirst = false) {
  const div = document.getElementById('favorites');
  if (clearFirst) {
    clearChildren(div);
  }
  return new Promise(resolve => {
    chrome.storage.local.get({favorites: {}}, items => {
      const obj = items.favorites;
      Object.keys(obj).sort(
        (a, b) => obj[a].score - obj[b].score
      ).filter(a => obj[a].score > 1)
      .slice(0, 3)
      .forEach(el => {
        div.appendChild(newButton(el, 'favorite', () => copyOne(el)));
        div.appendChild(newPre(el));
        div.appendChild(document.createElement('br'));
      });
      resolve();
    })
  });
}


function clearChildren(div) {
  while (div.lastChild) {
    div.removeChild(div.lastChild);
  }
}


function newButton(content, cls, onclick) {
  const btn = document.createElement('button');
  if (content !== undefined) {
    btn.appendChild(document.createTextNode(content));
  }
  if (cls !== undefined) {
    btn.className = cls;
  }
  if (onclick !== undefined) {
    btn.addEventListener('click', onclick);
  }
  return btn;
}


function newPre(el) {
  const pre = document.createElement('pre');
  pre.className = 'btn-preview';
  pre.innerHTML = el;
  return pre;
}


function numSymbols(string) {
  // string.length would count some unicode symbols,
  // e.g. emojis, as 2. Spreading into an array avoids this.
  return [...string].length;
}
