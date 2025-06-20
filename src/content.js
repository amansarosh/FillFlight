const STORAGE_KEY = 'fillflight_aircraft_info';

console.log("FillFlight SimBrief Extension content script loaded");

let lastRegistration = '';
let debounceTimeout = null;

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
