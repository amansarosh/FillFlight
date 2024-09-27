console.log("Ahiso extension popup script is running");
const STORAGE_KEY = 'ahsio_aircraft_info';

function populateTable(aircraftInfo) {
    const tableBody = document.getElementById('aircraftTableBody');
    tableBody.innerHTML = '';
    
    aircraftInfo.forEach((info, index) => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = info.registration;
        row.insertCell(1).textContent = info.msn;
        row.insertCell(2).textContent = info.selcal;
        
        const actionsCell = row.insertCell(3);
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.onclick = () => editRow(row, info, index);
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteRow(index);
        
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
    });
}

function editRow(row, info, index) {
    row.classList.add('edit-mode');
    
    for (let i = 0; i < 3; i++) {
        const cell = row.cells[i];
        const input = document.createElement('input');
        input.value = cell.textContent;
        cell.textContent = '';
        cell.appendChild(input);
    }
    
    const actionsCell = row.cells[3];
    actionsCell.innerHTML = '';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.onclick = () => saveEdit(row, index);
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => cancelEdit(row, info);
    
    actionsCell.appendChild(saveButton);
    actionsCell.appendChild(cancelButton);
}

function saveEdit(row, index) {
    const newInfo = {
        registration: row.cells[0].firstChild.value.toUpperCase(),
        msn: row.cells[1].firstChild.value,
        selcal: row.cells[2].firstChild.value.toUpperCase()
    };
    
    chrome.storage.local.get(STORAGE_KEY, (result) => {
        const storedInfo = result[STORAGE_KEY] || [];
        storedInfo[index] = newInfo;
        chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
            console.log("Aircraft info updated:", newInfo);
            populateTable(storedInfo);
        });
    });
}

function cancelEdit(row, info) {
    row.cells[0].textContent = info.registration;
    row.cells[1].textContent = info.msn;
    row.cells[2].textContent = info.selcal;
    
    const actionsCell = row.cells[3];
    actionsCell.innerHTML = '';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.onclick = () => editRow(row, info);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deleteRow(info.registration);
    
    actionsCell.appendChild(editButton);
    actionsCell.appendChild(deleteButton);
    
    row.classList.remove('edit-mode');
}

function deleteRow(index) {
    if (confirm('Are you sure you want to delete this entry?')) {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            const storedInfo = result[STORAGE_KEY] || [];
            storedInfo.splice(index, 1);
            chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
                console.log("Aircraft info deleted");
                populateTable(storedInfo);
            });
        });
    }
}

function addNewEntry() {
    const newInfo = {
        registration: '',
        msn: '',
        selcal: ''
    };
    
    chrome.storage.local.get(STORAGE_KEY, (result) => {
        const storedInfo = result[STORAGE_KEY] || [];
        storedInfo.push(newInfo);
        chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
            console.log("New empty entry added");
            populateTable(storedInfo);
            editRow(document.getElementById('aircraftTableBody').lastElementChild, newInfo, storedInfo.length - 1);
        });
    });
}

function loadStoredInfo() {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
        console.log("Stored info:", result[STORAGE_KEY]);
        const storedInfo = result[STORAGE_KEY] || [];
        populateTable(storedInfo);
    });
}

// Load stored info when popup opens
loadStoredInfo();

// Add event listener to the "Add New Entry" button
document.getElementById('addButton').addEventListener('click', addNewEntry);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "dataUpdated") {
        loadStoredInfo();
    }
});