console.log("FillFlight extension popup script is running");
const STORAGE_KEY = 'fillflight_aircraft_info';

const msnRegex = /^\d+$/;
const selcalRegex = /^(?!.*(.).*\1)(?:A[BCDEFGHJKLMPQRST]|B[CDEFGHJKLMPQRST]|C[DEFGHJKLMPQRST]|D[EFGHJKLMPQRST]|E[FGHJKLMPQRST]|F[GHJKLMPQRST]|G[HJKLMPQRST]|H[JKLMPQRST]|J[KLMPQRST]|K[LMPQRST]|L[MPQRST]|M[PQRST]|P[QRST]|Q[RS]|R[S])(?:A[BCDEFGHJKLMPQRST]|B[CDEFGHJKLMPQRST]|C[DEFGHJKLMPQRST]|D[EFGHJKLMPQRST]|E[FGHJKLMPQRST]|F[GHJKLMPQRST]|G[HJKLMPQRST]|H[JKLMPQRST]|J[KLMPQRST]|K[LMPQRST]|L[MPQRST]|M[PQRST]|P[QRST]|Q[RS]|R[S])$/;

function createButton(label, className, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = className;
  btn.onclick = onClick;
  return btn;
}

function populateTable(aircraftInfo) {
  const tableBody = document.getElementById('aircraftTableBody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  aircraftInfo.sort((a, b) => a.registration.localeCompare(b.registration));

  aircraftInfo.forEach((info, index) => {
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = info.registration;
    row.insertCell(1).textContent = info.msn;
    row.insertCell(2).textContent = info.selcal;

    const actionsCell = row.insertCell(3);
    actionsCell.appendChild(createButton('Edit', 'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2', () => editRow(row, info, index)));
    actionsCell.appendChild(createButton('Delete', 'bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded', () => deleteRow(index, info.registration)));
  });
}

function editRow(row, info, index, isNew = false) {
  row.classList.add('edit-mode');
  const placeholders = ['REG', 'MSN', 'SELCAL'];

  for (let i = 0; i < 3; i++) {
    const cell = row.cells[i];
    const input = document.createElement('input');
    input.value = cell.textContent;
    input.placeholder = placeholders[i];
    input.className = 'bg-gray-800 text-white border border-gray-600 p-1 w-full';
    cell.textContent = '';
    cell.appendChild(input);
  }

  const actionsCell = row.cells[3];
  actionsCell.innerHTML = '';
  actionsCell.appendChild(createButton('Save', 'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2', () => saveEdit(row, index, isNew)));
  actionsCell.appendChild(createButton('Cancel', 'bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded', () => cancelEdit(row, info, index, isNew)));
}

function saveEdit(row, index, isNew = false) {
  const newInfo = {
    registration: row.cells[0].firstChild.value.toUpperCase(),
    msn: row.cells[1].firstChild.value,
    selcal: row.cells[2].firstChild.value.toUpperCase()
  };

  if (newInfo.msn.trim() !== "" && !msnRegex.test(newInfo.msn)) {
    alert("MSN must be a numerical value.");
    return;
  }

  if (newInfo.selcal.trim() !== "" && !selcalRegex.test(newInfo.selcal)) {
    alert("SELCAL must be 4 unique letters from A-S (excluding I, N, and O).");
    return;
  }

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedInfo = result[STORAGE_KEY] || [];
    if (isNew) {
      storedInfo.push(newInfo);
    } else {
      storedInfo[index] = newInfo;
    }
    chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
      populateTable(storedInfo);
    });
  });
}

function cancelEdit(row, info, index, isNew = false) {
  if (isNew) {
    row.remove();
    return;
  }

  row.cells[0].textContent = info.registration;
  row.cells[1].textContent = info.msn;
  row.cells[2].textContent = info.selcal;

  const actionsCell = row.cells[3];
  actionsCell.innerHTML = '';
  actionsCell.appendChild(createButton('Edit', 'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2', () => editRow(row, info, index)));
  actionsCell.appendChild(createButton('Delete', 'bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded', () => deleteRow(index, info.registration)));

  row.classList.remove('edit-mode');
}

function deleteRow(index, registration) {
  if (confirm(`Are you sure you want to delete ${registration}?`)) {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const storedInfo = result[STORAGE_KEY] || [];
      storedInfo.splice(index, 1);
      chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
        populateTable(storedInfo);
      });
    });
  }
}

function addNewEntry() {
  const tableBody = document.getElementById('aircraftTableBody');
  const row = tableBody.insertRow();
  for (let i = 0; i < 3; i++) row.insertCell(i);
  row.insertCell(3);
  editRow(row, { registration: '', msn: '', selcal: '' }, -1, true);
}

function loadStoredInfo() {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedInfo = result[STORAGE_KEY] || [];
    populateTable(storedInfo);
  });
}

function initializePopup() {
  loadStoredInfo();
  const addButton = document.getElementById('addButton');
  if (addButton) {
    addButton.addEventListener('click', addNewEntry);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();

  document.getElementById('backupButton')?.addEventListener('click', backupData);
  document.getElementById('restoreButton')?.addEventListener('click', restoreDataFromBackup);
  document.getElementById('openOptions')?.addEventListener('click', () => {
    window.open(chrome.runtime.getURL('options.html'));
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "dataUpdated") {
    loadStoredInfo();
  }
});

function backupData() {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const jsonStr = JSON.stringify(result[STORAGE_KEY] || [], null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fillflight_aircraft_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

function restoreDataFromBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const isValid = Array.isArray(data) && data.every(entry =>
        typeof entry.registration === 'string' &&
        typeof entry.msn === 'string' &&
        typeof entry.selcal === 'string'
      );
      if (!isValid) return alert("Invalid file format.");
      chrome.storage.local.set({ [STORAGE_KEY]: data }, () => populateTable(data));
    } catch {
      alert("Invalid JSON file.");
    }
  };
  input.click();
}
