/* app.js - shared client-side logic using localStorage
   Key functions:
     - saveUser(user)
     - getAllUsers()
     - findUserByEmail(email)
     - setCurrentUser(email)
     - getCurrentUser()
     - updateCurrentUserProfile(upd)
     - addActivityToUser(entry)
     - simulateWeather(location)  -> deterministic small weather engine
     - getSoilAdvisory(soil, crops)
     - getIrrigationReminder(irrigation, crops)
     - ensureAuth(), logout()
*/

// ---------- users storage ----------
function getAllUsers() {
  const raw = localStorage.getItem('krishiUsers');
  return raw ? JSON.parse(raw) : [];
}
function saveAllUsers(users) {
  localStorage.setItem('krishiUsers', JSON.stringify(users));
}
function saveUser(user) {
  const users = getAllUsers();
  users.push(user);
  saveAllUsers(users);
}
function findUserByEmail(email) {
  if (!email) return null;
  const users = getAllUsers();
  return users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
}
function replaceUser(updated) {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === updated.email.toLowerCase());
  if (idx !== -1) { users[idx] = updated; saveAllUsers(users); }
}

// ---------- session ----------
function setCurrentUser(email) {
  localStorage.setItem('krishiCurrentUserEmail', email.toLowerCase());
}
function getCurrentUserEmail() {
  return localStorage.getItem('krishiCurrentUserEmail') || null;
}
function getCurrentUser() {
  const email = getCurrentUserEmail();
  if (!email) return null;
  return findUserByEmail(email);
}
function logout() {
  localStorage.removeItem('krishiCurrentUserEmail');
}

// ---------- profile update ----------
function updateCurrentUserProfile(upd) {
  const email = getCurrentUserEmail();
  if (!email) return;
  const user = findUserByEmail(email);
  if (!user) return;
  const merged = Object.assign({}, user, upd);
  // keep activities if present
  merged.activities = user.activities || [];
  replaceUser(merged);
  // ensure session email unchanged
  setCurrentUser(merged.email);
}

// ---------- activities ----------
function addActivityToUser(entry) {
  const user = getCurrentUser();
  if (!user) return;
  user.activities = user.activities || [];
  user.activities.push(entry);
  replaceUser(user);
}

// ---------- auth helper ----------
function ensureAuth() {
  if (!getCurrentUserEmail()) {
    window.location.href = 'login.html';
  }
}

// ---------- simple deterministic weather simulator ----------
function hashStringToInt(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function simulateWeather(location) {
  // use location + date to make deterministic pseudo-random outputs
  const base = (location || 'unknown').toLowerCase();
  const dateStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const seed = hashStringToInt(base + '|' + dateStr);

  // temp between 20-36
  const temp = 20 + (seed % 17);
  // humidity 40-95
  const humidity = 40 + (seed % 56);
  // rainChance 0-100 biased by state mentions 'kerala' increase chance
  let rainChance = seed % 100;
  if (base.includes('kerala') || base.includes('palakkad') || base.includes('kottayam') || base.includes('thrissur')) {
    rainChance = Math.min(100, rainChance + 15);
  }
  // determine condition
  let condition = 'Sunny';
  if (rainChance > 70) condition = 'Heavy rain likely';
  else if (rainChance > 40) condition = 'Light rain possible';
  else if (humidity > 80) condition = 'Cloudy / Humid';

  const advice = (rainChance > 60)
    ? 'High chance of rain — avoid spraying pesticides/fertilizers. Delay irrigation.'
    : (humidity > 75)
      ? 'High humidity — inspect for fungal pests; ensure good drainage.'
      : 'Normal conditions — follow regular schedule.';

  return {
    temp,
    humidity,
    rainChance,
    condition,
    advice
  };
}

// ---------- soil advisory & irrigation ----------
function getSoilAdvisory(soil, crops) {
  soil = (soil || '').toLowerCase();
  crops = (crops || '').toLowerCase();
  if (!soil) return 'Please set your soil type in Profile for tailored advice.';

  let note = '';
  if (soil.includes('loamy')) {
    note = 'Loamy soil: good water retention and nutrients. Rotate crops and add organic compost annually.';
  } else if (soil.includes('sandy')) {
    note = 'Sandy soil: drains quickly. Use mulching and increase organic matter; consider drip irrigation.';
  } else if (soil.includes('clay')) {
    note = 'Clay soil: holds water; ensure good drainage and avoid waterlogging. Add gypsum and organic matter.';
  } else if (soil.includes('silty')) {
    note = 'Silty soil: fertile but can compact; maintain organic matter and avoid heavy machinery when wet.';
  } else {
    note = 'General soil advice: use organic compost and test soil for NPK values.';
  }

  if (crops.includes('rice')) {
    note += ' For rice, maintain appropriate water level; check for blast disease after heavy rains.';
  }
  if (crops.includes('banana')) {
    note += ' For banana, provide regular potassium-rich fertilizer and protect from wind.';
  }

  return note;
}
function getIrrigationReminder(irrigation, crops) {
  irrigation = (irrigation || '').toLowerCase();
  const cropList = (crops || '').toLowerCase();
  let msg = '';
  if (!irrigation) msg = 'Set irrigation method in Profile to get reminders.';
  else if (irrigation.includes('drip')) msg = 'Drip irrigation: efficient. Check emitters weekly for clogging.';
  else if (irrigation.includes('sprinkler')) msg = 'Sprinkler: monitor pressure and avoid using during strong winds.';
  else if (irrigation.includes('rainfed')) msg = 'Rainfed: track weather closely. Consider water-conserving mulches.';
  else msg = 'Traditional flooding: monitor water levels and avoid over-irrigation.';

  // small crop-specific hint
  if (cropList.includes('rice') && irrigation.includes('flood')) {
    msg += ' Rice fields need controlled water depth during transplanting and heading stages.';
  }
  return msg;
}
