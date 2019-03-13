const PARSER = new DOMParser();
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
  ).then(
    () => {
      chrome.storage.local.get({recents: []}, items => {
        const arr = items.recents;
        arr.unshift(string);
        if (arr.length > 3) {
          arr.pop();
        }
        chrome.storage.local.set({recents: arr}, () => populateRecents(true));
      });
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
        if (!obj.hasOwnProperty(string)) {
          obj[string] = {score: 0, age: 0};
        }
        obj[string].score++;
        chrome.storage.local.set({favorites: obj}, () => populateFavorites(true));
      });
    },
    () => {}
  );
}


function populateRecents(clearFirst = false) {
  const div = document.getElementById('recents');
  if (clearFirst) {
    clearChildren(div);
  }
  chrome.storage.local.get({recents: []}, items => {
    items.recents.forEach(el => {
      div.appendChild(newButton(el, 'recent', () => copy(el)));
      div.appendChild(document.createElement('br'));
    })
  });
}


function populateFavorites(clearFirst = false) {
  const div = document.getElementById('favorites');
  if (clearFirst) {
    clearChildren(div);
  }
  chrome.storage.local.get({favorites: {}}, items => {
    const obj = items.favorites;
    Object.keys(obj).sort(
      (a, b) => obj[a].score - obj[b].score
    ).filter(a => obj[a].score > 1)
    .slice(0, 3)
    .forEach(el => {
      div.appendChild(newButton(el, 'favorite', () => copy(el)));
      div.appendChild(document.createElement('br'));
    });
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
