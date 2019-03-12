const PARSER = new DOMParser();
window.onload = function() {
  document.getElementById('submit').addEventListener('click', () => copy(document.getElementById('input').value));
  populateRecents();
};


function parse(s) {
  return PARSER.parseFromString(s, 'text/html').body.textContent;
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
    items.recents.forEach(recent => {
      const btn = document.createElement('button');
      btn.appendChild(document.createTextNode(recent));
      btn.className = 'recent';
      btn.addEventListener('click', () => copy(recent));
      div.appendChild(btn);
      div.appendChild(document.createElement('br'));
    })
  });
}
