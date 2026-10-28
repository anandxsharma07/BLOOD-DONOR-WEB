/* Shared logic for all three pages. Data is stored in this browser (localStorage). */
const KEY = { donors: 'bd_donors', requests: 'bd_requests', reviews: 'bd_reviews' };
const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
// Which donor groups can give to each patient group
const DONOR_FOR = {
  'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
  'AB+': GROUPS, 'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'], 'O-': ['O-']
};
const RANGES = [[0, 5, 'Within 5 km'], [5, 15, '5 to 15 km'], [15, 30, '15 to 30 km'], [30, Infinity, 'Over 30 km']];
const HEALTH = ['Healthy', 'Minor cold or fever', 'On medication', 'Recently ill', 'Recently vaccinated'];

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : null);
const ago = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const say = (el, text, err) => { el.className = 'msg' + (err ? ' err' : ''); el.textContent = text; };

function seed() {
  if (localStorage.getItem(KEY.donors) !== null) return;
  save(KEY.donors, [
    { id: 1, name: 'Rohan Mehta', age: 29, gender: 'Male', group: 'O-', phone: '9810000001', address: 'Sector 12, Dwarka', city: 'Delhi', distance: 3, health: 'Healthy', note: '', lastDonation: ago(150), demo: true },
    { id: 2, name: 'Anita Sharma', age: 34, gender: 'Female', group: 'A+', phone: '9810000002', address: 'Janakpuri C Block', city: 'Delhi', distance: 9, health: 'Healthy', note: 'Regular donor', lastDonation: ago(40), demo: true },
    { id: 3, name: 'Imran Khan', age: 41, gender: 'Male', group: 'B+', phone: '9810000003', address: 'Vikaspuri, Near Metro', city: 'Delhi', distance: 12, health: 'Minor cold or fever', note: 'Cold, 2 days', lastDonation: '', demo: true },
    { id: 4, name: 'Priya Nair', age: 26, gender: 'Female', group: 'O+', phone: '9810000004', address: 'Sector 21, Gurugram', city: 'Gurugram', distance: 22, health: 'Healthy', note: '', lastDonation: ago(200), demo: true },
    { id: 5, name: 'Vikram Singh', age: 38, gender: 'Male', group: 'AB+', phone: '9810000005', address: 'Sector 62, Noida', city: 'Noida', distance: 38, health: 'On medication', note: 'BP tablets', lastDonation: ago(300), demo: true }
  ]);
  save(KEY.reviews, [
    { donorId: 1, doctor: 'Kapoor', verdict: 'Fit', note: 'Hemoglobin 14.2 g/dL, cleared to donate.', date: ago(10) },
    { donorId: 3, doctor: 'Rao', verdict: 'Wait', note: 'Wait one week after fever clears.', date: ago(2) }
  ]);
}

const latestReview = (id) => load(KEY.reviews).filter((r) => r.donorId === id).sort((a, b) => b.date.localeCompare(a.date))[0];
const verdictClass = (v) => (v === 'Fit' ? 'green' : v === 'Wait' ? 'amber' : 'red');
const tel = (p) => String(p).replace(/[^\d+]/g, '');

function donorCard(d) {
  const rv = latestReview(d.id);
  const since = daysSince(d.lastDonation);
  const wait = since !== null && since < 90 ? 90 - since : 0;
  return `<article class="card">
    <div class="bg" aria-label="Blood group ${esc(d.group)}">${esc(d.group)}</div>
    <div class="info">
      <h4>${esc(d.name)} <small>${esc(d.age)} yrs, ${esc(d.gender)}</small>${d.demo ? ' <span class="tag">Sample</span>' : ''}</h4>
      <p class="meta">${esc(d.distance)} km away, ${esc(d.city)}</p>
      <p><b>Health update:</b> ${esc(d.health)}${d.note ? ' (' + esc(d.note) + ')' : ''}</p>
      <p><b>Doctor review:</b> ${rv ? `<span class="tag ${verdictClass(rv.verdict)}">${esc(rv.verdict)}</span> ${esc(rv.note)} <i>Dr. ${esc(rv.doctor)}</i>` : '<span class="tag">Not reviewed yet</span>'}</p>
      <p><b>Last donated:</b> ${d.lastDonation ? esc(d.lastDonation) : 'Never'} ${wait ? `<span class="tag amber">Can donate again in ${wait} days</span>` : ''}</p>
      <p><b>Address:</b> ${esc(d.address)}</p>
      <a class="call" href="tel:${tel(d.phone)}">Call ${esc(d.phone)}</a>
    </div></article>`;
}

/* ---------- Page 1: patient request + range-wise donor list ---------- */
function initPatient() {
  let sel = null;
  const tiles = $('tiles');
  tiles.innerHTML = GROUPS.map((g) => `<button type="button" aria-pressed="false" data-g="${g}">${g}</button>`).join('');
  tiles.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sel = b.dataset.g;
    tiles.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderDonors();
  });

  function renderDonors() {
    const out = $('results');
    if (!sel) { out.innerHTML = '<p class="empty">Choose a blood group above to see donors.</p>'; return; }
    const ok = DONOR_FOR[sel];
    const list = load(KEY.donors).filter((d) => ok.includes(d.group) && !(latestReview(d.id)?.verdict === 'Not fit'))
      .sort((a, b) => a.distance - b.distance);
    $('resTitle').textContent = `Donors who can give to ${sel} (${ok.join(', ')})`;
    out.innerHTML = RANGES.map(([lo, hi, label]) => {
      const rows = list.filter((d) => d.distance >= lo && d.distance < hi);
      return `<div class="range"><h3>${label} <span>${rows.length} donor${rows.length === 1 ? '' : 's'}</span></h3>
        ${rows.length ? rows.map(donorCard).join('') : '<p class="empty">No donors in this range yet.</p>'}</div>`;
    }).join('');
  }

  function renderRequests() {
    const reqs = load(KEY.requests);
    $('requests').innerHTML = reqs.length ? GROUPS.filter((g) => reqs.some((r) => r.group === g)).map((g) =>
      `<div class="range"><h3>${g} <span>${reqs.filter((r) => r.group === g).length} request(s)</span></h3>` +
      reqs.filter((r) => r.group === g).map((r) => `<article class="card"><div class="bg">${esc(r.group)}</div><div class="info">
        <h4>${esc(r.name)} <span class="tag ${r.urgency === 'Emergency' ? 'red' : ''}">${esc(r.urgency)}</span></h4>
        <p>${esc(r.units)} unit(s) at ${esc(r.hospital)}, ${esc(r.city)}</p>
        <a class="call" href="tel:${tel(r.phone)}">Call ${esc(r.phone)}</a></div></article>`).join('') + '</div>').join('')
      : '<p class="empty">No blood requests yet.</p>';
  }

  $('reqForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = $('reqMsg');
    if (!sel) return say(m, 'Pick the blood group you need.', true);
    const f = e.target;
    const reqs = load(KEY.requests);
    reqs.unshift({ name: f.pname.value.trim(), group: sel, units: f.units.value, hospital: f.hospital.value.trim(), city: f.city.value.trim(), urgency: f.urgency.value, phone: f.pphone.value.trim() });
    save(KEY.requests, reqs);
    say(m, `Request saved. The donor list below shows who can give to ${sel}.`);
    f.reset(); renderRequests(); renderDonors();
    $('resTitle').scrollIntoView({ behavior: 'smooth' });
  });
  renderDonors(); renderRequests();
}

/* ---------- Page 2: donor registration + health update ---------- */
function initDonor() {
  $('group').innerHTML = '<option value="">Select</option>' + GROUPS.map((g) => `<option>${g}</option>`).join('');
  $('health').innerHTML = HEALTH.map((h) => `<option>${h}</option>`).join('');
  $('uhealth').innerHTML = $('health').innerHTML;
  const count = () => ($('count').textContent = load(KEY.donors).length);

  $('donorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, m = $('donorMsg');
    const age = +f.age.value;
    if (age < 18 || age > 65) return say(m, 'Donors must be between 18 and 65 years old.', true);
    const donors = load(KEY.donors);
    if (donors.some((d) => tel(d.phone) === tel(f.phone.value))) return say(m, 'This phone number is already registered. Use the health update form below.', true);
    donors.push({ id: Date.now(), name: f.dname.value.trim(), age, gender: f.gender.value, group: f.group.value, phone: f.phone.value.trim(), address: f.address.value.trim(), city: f.city.value.trim(), distance: +f.distance.value, health: f.health.value, note: f.note.value.trim(), lastDonation: f.last.value });
    save(KEY.donors, donors);
    say(m, 'You are registered. Patients can now see your details and call you.');
    f.reset(); count();
  });

  $('updForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, m = $('updMsg');
    const donors = load(KEY.donors);
    const d = donors.find((x) => tel(x.phone) === tel(f.uphone.value));
    if (!d) return say(m, 'No donor found with this phone number.', true);
    d.health = f.uhealth.value; d.note = f.unote.value.trim();
    if (f.ulast.value) d.lastDonation = f.ulast.value;
    save(KEY.donors, donors);
    say(m, 'Health update saved.'); f.reset();
  });
  count();
}

/* ---------- Page 3: doctor suggestions ---------- */
function initDoctor() {
  const sel = $('donorSel');
  sel.innerHTML = '<option value="">Select donor</option>' + load(KEY.donors).map((d) => `<option value="${d.id}">${esc(d.name)} (${esc(d.group)}, ${esc(d.phone)})</option>`).join('');
  const names = () => Object.fromEntries(load(KEY.donors).map((d) => [d.id, d]));

  function render() {
    const n = names();
    const rv = load(KEY.reviews).sort((a, b) => b.date.localeCompare(a.date));
    $('reviews').innerHTML = rv.length ? rv.map((r) => { const d = n[r.donorId]; return `<article class="card"><div class="bg">${d ? esc(d.group) : '?'}</div><div class="info">
      <h4>${d ? esc(d.name) : 'Unknown donor'} <span class="tag ${verdictClass(r.verdict)}">${esc(r.verdict)}</span></h4>
      <p>${esc(r.note)}</p><p class="meta">Dr. ${esc(r.doctor)}, ${esc(r.date)}</p></div></article>`; }).join('') : '<p class="empty">No doctor reviews yet.</p>';
  }

  $('docForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, m = $('docMsg');
    if (!f.donorSel.value) return say(m, 'Select a donor to review.', true);
    const rv = load(KEY.reviews);
    rv.push({ donorId: +f.donorSel.value, doctor: f.doctor.value.trim(), verdict: f.verdict.value, note: f.note.value.trim(), date: today() });
    save(KEY.reviews, rv);
    say(m, 'Review saved. It now appears on the donor card for patients.');
    f.reset(); render();
  });
  render();
}

seed();
const page = document.body.dataset.page;
if (page === 'patient') initPatient();
if (page === 'donor') initDonor();
if (page === 'doctor') initDoctor();
