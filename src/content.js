const STORAGE_KEY = 'ahsio_aircraft_info';

console.log("Ahiso SimBrief Extension content script loaded");

function updateSimBriefPage(info) {
  console.log("Updating SimBrief page with:", info);
  const msnInput = document.querySelector('#fin');
  const selcalInput = document.querySelector('#selcal');
  
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
}

async function handleRegistrationInput(event) {
  console.log("Registration input event triggered");
  const registrationInput = event.target;
  const registration = registrationInput.value.toUpperCase();
  
  if (registration && registration.length >= 3) {
    console.log("Checking registration:", registration);
    const storedInfo = await chrome.storage.local.get(STORAGE_KEY);
    console.log("Stored info:", storedInfo[STORAGE_KEY]);
    let aircraftInfo = storedInfo[STORAGE_KEY]?.find(info => info.registration === registration);
    
    if (aircraftInfo) {
      console.log("Found stored info:", aircraftInfo);
      updateSimBriefPage(aircraftInfo);
    } else {
      console.log("No stored info found for registration:", registration);
    }
  }
}

function saveAircraftInfo() {
  console.log("saveAircraftInfo function called");
  const registration = document.querySelector('#reg')?.value.toUpperCase();
  const msn = document.querySelector('#fin')?.value;
  const selcal = document.querySelector('#selcal')?.value.toUpperCase();

  console.log("Current form values:", { registration, msn, selcal });

  if (registration) { // Save even if MSN or SELCAL is empty
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      console.log("Current stored data:", result[STORAGE_KEY]);
      const storedInfo = result[STORAGE_KEY] || [];
      const index = storedInfo.findIndex(info => info.registration === registration);
      const newInfo = { registration, msn, selcal };
      
      if (index !== -1) {
        console.log("Updating existing entry at index:", index);
        storedInfo[index] = newInfo;
      } else {
        console.log("Adding new entry");
        storedInfo.push(newInfo);
      }
      
      chrome.storage.local.set({ [STORAGE_KEY]: storedInfo }, () => {
        console.log("Aircraft info saved:", newInfo);
        console.log("Updated stored data:", storedInfo);
        // Notify the popup that data has changed
        chrome.runtime.sendMessage({action: "dataUpdated"});
      });
    });
  } else {
    console.log("Registration is missing, not saving");
  }
}

function init() {
  console.log("Initializing Ahiso SimBrief Extension");
  const registrationInput = document.querySelector('#reg');
  if (registrationInput) {
    console.log("Registration input found, adding event listeners");
    registrationInput.addEventListener('blur', handleRegistrationInput);
    registrationInput.addEventListener('change', handleRegistrationInput);
  } else {
    console.log("Registration input not found");
  }
  
  const msnInput = document.querySelector('#fin');
  const selcalInput = document.querySelector('#selcal');
  
  if (msnInput) {
    msnInput.addEventListener('focus', () => handleRegistrationInput({target: registrationInput}));
  }
  
  if (selcalInput) {
    selcalInput.addEventListener('focus', () => handleRegistrationInput({target: registrationInput}));
  }

  // Add event listener to the form submission
  const form = document.querySelector('form');
  if (form) {
    console.log("Form found, adding submit event listener");
    form.addEventListener('submit', (event) => {
      console.log("Form submit event triggered");
      saveAircraftInfo();
    });
  } else {
    console.log("Form not found");
  }
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
      console.log("DOM changed, reinitializing");
      init();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("Ahiso SimBrief Extension setup complete");