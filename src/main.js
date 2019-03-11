const PARSER = new DOMParser();
window.onload = function() {
  document.getElementById('submit').addEventListener('click', copy);
  populateRecents();
};


function parse(s) {
  return PARSER.parseFromString(s, 'text/html').body.textContent;
}


function copy(id = 'input') {
  const s = document.getElementById(id).value;
  navigator.clipboard.writeText(
    parse(s)
  ).then(
    () => {
      chrome.storage.local.get({recent: []}, items => {
        const arr = items.recent;
        arr.push(s);
        if (arr.length > 3) {
          arr.shift();
        }
        chrome.storage.local.set({recent: arr}, () => {});
        populateRecents(true);
      })
    },
    () => {}
  );
}


function populateRecents(clearFirst = false) {
  const div = document.getElementById('recents');
  if (clearFirst) {
    while (div.lastChild) {
      div.removeChild(div.lastChild);
    }
  }
  chrome.storage.local.get({recents: []}, items => {
    items.recents.forEach((recent, i) => {
      const btn = document.createElement('button');
      btn.appendChild(document.createTextNode(recent));
      btn.id = 'recent-' + i;
      btn.addEventListener('click', () => copy(btn.id));
      div.appendChild(btn);
    })
  });
}
