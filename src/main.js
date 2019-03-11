const PARSER = new DOMParser();
window.onload = function() {
  document.getElementById('submit').addEventListener('click', copy);
  populateRecents();
};


function parse(s) {
  return PARSER.parseFromString(s, 'text/html').body.textContent;
}


function copy() {
  const s = document.getElementById('input').value;
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
      })
    },
    () => {}
  );
}

function populateRecents() {
  chrome.storage.local.get({recents: []}, items => {
    for (const recent of items.recents) {
      // ...
    }
  });
}
