const STORAGE_KEY = 'fillflight_aircraft_info';

console.log("FillFlight SimBrief Extension content script loaded");

let lastRegistration = '';
let debounceTimeout = null;
let autoSaveTimeout = null;

function updateSimBriefPage(info) {
  const regInput = document.querySelector('[data-key="reg,airframe_options.reg"]');
  const msnInput = document.querySelector('[data-key="fin,airframe_options.fin"]');
  const selcalInput = document.querySelector('[data-key="selcal,airframe_options.selcal"]');

  if (msnInput && info.msn) {
    msnInput.value = info.msn;
    msnInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (selcalInput && info.selcal) {
    selcalInput.value = info.selcal;
    selcalInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  console.log("SimBrief page updated with:", info);
}

function clearMSNandSELCAL() {
  const msnInput = document.querySelector('[data-key="fin,airframe_options.fin"]');
  const selcalInput = document.querySelector('[data-key="selcal,airframe_options.selcal"]');
  if (msnInput) msnInput.value = '';
  if (selcalInput) selcalInput.value = '';
}

function processRegistrationInput(registration) {
  registration = registration.toUpperCase();

  if (registration.length < lastRegistration.length) {
    clearMSNandSELCAL();
    lastRegistration = registration;
    return;
  }

  if (registration && registration.length >= 3 && registration !== lastRegistration) {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const storedInfo = result[STORAGE_KEY] || [];
      const aircraftInfo = storedInfo.find(info => info.registration === registration);

      if (aircraftInfo) {
        updateSimBriefPage(aircraftInfo);
      } else {
        clearMSNandSELCAL();
      }

      lastRegistration = registration;
    });
  } else if (!registration) {
    clearMSNandSELCAL();
    lastRegistration = '';
  }
}

function handleRegistrationInput(event) {
  const registration = event.target.value;
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => processRegistrationInput(registration), 300);
  
  // Trigger autosave check
  scheduleAutoSave();
}

function handleMSNorSELCALInput(event) {
  scheduleAutoSave();
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    autoSaveAircraftInfo();
  }, 1000); // Auto-save 1 second after user stops typing
}

function autoSaveAircraftInfo() {
  const registration = document.querySelector('[data-key="reg,airframe_options.reg"]')?.value.trim().toUpperCase();
  const msn = document.querySelector('[data-key="fin,airframe_options.fin"]')?.value.trim();
  const selcal = document.querySelector('[data-key="selcal,airframe_options.selcal"]')?.value.trim().toUpperCase();

  if (!registration) {
    console.log("Registration is missing, not auto-saving");
    return;
  }

  // Only auto-save if at least one of MSN or SELCAL is provided
  if (!msn && !selcal) {
    console.log("Both MSN and SELCAL are empty, not auto-saving");
    return;
  }

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedInfo = result[STORAGE_KEY] || [];
    const existingIndex = storedInfo.findIndex(info => info.registration === registration);

    const newEntry = { registration, msn, selcal };

    if (existingIndex !== -1) {
      const existingEntry = storedInfo[existingIndex];
      
      // Check for conflicting data
      const hasConflict = (
        (msn && existingEntry.msn && msn !== existingEntry.msn) ||
        (selcal && existingEntry.selcal && selcal !== existingEntry.selcal) ||
        (!msn && existingEntry.msn) ||
        (!selcal && existingEntry.selcal)
      );

      if (hasConflict) {
        // Show confirmation dialog
        const message = `An entry for ${registration} already exists:\n\n` +
          `Stored: MSN="${existingEntry.msn}", SELCAL="${existingEntry.selcal}"\n` +
          `Current: MSN="${msn}", SELCAL="${selcal}"\n\n` +
          `Do you want to override with the current values?`;
        
        if (confirm(message)) {
          storedInfo[existingIndex] = newEntry;
          chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
            console.log("Aircraft info updated (override):", newEntry);
          });
        } else {
          console.log("User chose not to override existing entry");
        }
      } else {
        // No conflict, merge data (fill in blanks)
        storedInfo[existingIndex] = {
          registration,
          msn: msn || existingEntry.msn,
          selcal: selcal || existingEntry.selcal
        };
        chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
          console.log("Aircraft info updated (merged):", storedInfo[existingIndex]);
        });
      }
    } else {
      // New entry
      storedInfo.push(newEntry);
      chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
        console.log("Aircraft info auto-saved (new entry):", newEntry);
      });
    }
  });
}

function saveAircraftInfo() {
  const registration = document.querySelector('[data-key="reg,airframe_options.reg"]')?.value.trim().toUpperCase();
  const msn = document.querySelector('[data-key="fin,airframe_options.fin"]')?.value.trim();
  const selcal = document.querySelector('[data-key="selcal,airframe_options.selcal"]')?.value.trim().toUpperCase();

  if (!registration) {
    console.log("Registration is missing, not saving");
    return;
  }

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedInfo = result[STORAGE_KEY] || [];
    const index = storedInfo.findIndex(info => info.registration === registration);

    const newEntry = { registration, msn, selcal };

    if (index !== -1) {
      storedInfo[index] = newEntry;
    } else {
      storedInfo.push(newEntry);
    }

    chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
      console.log("Aircraft info saved:", newEntry);
    });
  });
}

function init() {
  const registrationInput = document.querySelector('[data-key="reg,airframe_options.reg"]');
  if (registrationInput) {
    registrationInput.addEventListener('input', handleRegistrationInput);
    registrationInput.addEventListener('change', handleRegistrationInput);
  }

  const msnInput = document.querySelector('[data-key="fin,airframe_options.fin"]');
  if (msnInput) {
    msnInput.addEventListener('input', handleMSNorSELCALInput);
    msnInput.addEventListener('change', handleMSNorSELCALInput);
  }

  const selcalInput = document.querySelector('[data-key="selcal,airframe_options.selcal"]');
  if (selcalInput) {
    selcalInput.addEventListener('input', handleMSNorSELCALInput);
    selcalInput.addEventListener('change', handleMSNorSELCALInput);
  }

  const generateButton = document.querySelector('input[type="submit"][value="Generate OFP"]');
  if (generateButton) {
    generateButton.addEventListener('click', saveAircraftInfo);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-run init on dynamic page updates
const observer = new MutationObserver((mutations) => {
  for (let mutation of mutations) {
    if (mutation.type === 'childList') {
      init();
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

console.log("FillFlight SimBrief Extension setup complete");