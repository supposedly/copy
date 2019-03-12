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
      });
      chrome.storage.local.get({common: {}}, items => {
        const obj = items.common;
        Object.entries(obj).forEach(([key, pair]) => {
          // pair[0] = key's score
          // pair[1] = number of copies since key's first use
          if (++pair[1] % 5 == 0) {
            pair[0]--;
          }
        });
        if (!obj.hasOwnProperty(string)) {
          obj[string] = [1, 0];
        }
        chrome.storage.local.set({common: obj}, () => populateCommonEntries(true));
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


function populateCommonEntries(clearFirst = false) {
  const div = document.getElementById('common');
  if (clearFirst) {
    clearChildren(div);
  }
  chrome.storage.local.get({common: {}}, items => {
    // get most common entries then populate div
  });
}


function clearChildren(div) {
  while div(lastChild) {
    div.removeChild(div.lastChild);
  }
}
