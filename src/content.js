const STORAGE_KEY = 'ahsio_aircraft_info';

console.log("Ahiso SimBrief Extension content script loaded");

let lastRegistration = '';

function updateSimBriefPage(info) {
  console.log("Updating SimBrief page with:", info);
  const regInput = document.querySelector('[data-key="reg,airframe_options.reg"]');
  const msnInput = document.querySelector('[data-key="fin,airframe_options.fin"]');
  const selcalInput = document.querySelector('[data-key="selcal,airframe_options.selcal"]');
  
  console.log("Inputs found:", { regInput, msnInput, selcalInput });

  if (msnInput && info.msn) {
    console.log("Setting MSN:", info.msn);
    msnInput.value = info.msn;
    msnInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  if (selcalInput && info.selcal) {
    console.log("Setting SELCAL:", info.selcal);
    selcalInput.value = info.selcal;
    selcalInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  console.log("SimBrief page update complete");
}

function handleRegistrationInput(event) {
  console.log("Registration input event triggered");
  const registrationInput = event.target;
  const registration = registrationInput.value.toUpperCase();
  
  console.log("Current registration value:", registration);

  if (registration.length < lastRegistration.length) {
    console.log("Registration is being cleared or modified");
    clearMSNandSELCAL();
    lastRegistration = registration;
    return;
  }

  if (registration && registration.length >= 3 && registration !== lastRegistration) {
    console.log("New registration detected, checking:", registration);
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const storedInfo = result[STORAGE_KEY] || [];
      console.log("Stored info:", storedInfo);
      let aircraftInfo = storedInfo.find(info => info.registration === registration);
      
      if (aircraftInfo) {
        console.log("Found stored info:", aircraftInfo);
        updateSimBriefPage(aircraftInfo);
        lastRegistration = registration;
      } else {
        console.log("No stored info found for registration:", registration);
        clearMSNandSELCAL();
        lastRegistration = registration;
      }
    });
  } else if (!registration) {
    console.log("Registration cleared, clearing other fields");
    clearMSNandSELCAL();
    lastRegistration = '';
  }
}

function clearMSNandSELCAL() {
  const msnInput = document.querySelector('[data-key="fin,airframe_options.fin"]');
  const selcalInput = document.querySelector('[data-key="selcal,airframe_options.selcal"]');
  if (msnInput) msnInput.value = '';
  if (selcalInput) selcalInput.value = '';
}

function saveAircraftInfo() {
  console.log("saveAircraftInfo function called");
  const registration = document.querySelector('[data-key="reg,airframe_options.reg"]')?.value.trim().toUpperCase();
  const msn = document.querySelector('[data-key="fin,airframe_options.fin"]')?.value.trim();
  const selcal = document.querySelector('[data-key="selcal,airframe_options.selcal"]')?.value.trim().toUpperCase();

  console.log("Current aircraft values:", { registration, msn, selcal });

  if (registration) {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const storedInfo = result[STORAGE_KEY] || [];
      const index = storedInfo.findIndex(info => info.registration === registration);
      
      if (index !== -1) {
        storedInfo[index] = { registration, msn, selcal };
      } else {
        storedInfo.push({ registration, msn, selcal });
      }
      
      chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
        console.log("Aircraft info saved:", { registration, msn, selcal });
      });
    });
  } else {
    console.log("Registration is missing, not saving");
  }
}

function init() {
  console.log("Initializing Ahiso SimBrief Extension");
  const registrationInput = document.querySelector('[data-key="reg,airframe_options.reg"]');
  if (registrationInput) {
    console.log("Registration input found, adding event listeners");
    registrationInput.addEventListener('input', handleRegistrationInput);
    registrationInput.addEventListener('change', handleRegistrationInput);
  } else {
    console.log("Registration input not found");
  }
  
  // Add event listener to the generate button
  const generateButton = document.querySelector('input[type="submit"][value="Generate OFP"]');
  if (generateButton) {
    generateButton.addEventListener('click', saveAircraftInfo);
  }

  console.log("Initialization complete");
}

// Run init() when the page is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Observe DOM changes to reinitialize if necessary
const observer = new MutationObserver((mutations) => {
  for (let mutation of mutations) {
    if (mutation.type === 'childList') {
      init();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("Ahiso SimBrief Extension setup complete");