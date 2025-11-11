// main.js - public page: realtime news from Firestore (read)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listEl = document.getElementById('news-list');
const detailsSection = document.getElementById('news-details');
const detailsContent = document.getElementById('news-details-content');
const searchInput = document.getElementById('search');
const closeBtn = document.getElementById('close-panel');
const backdrop = document.getElementById('panel-backdrop');

let lastFocusedElement = null;
let newsCache = [];

// Realtime listener: updates automatically
const q = query(collection(db, 'news'), orderBy('date', 'desc'));
onSnapshot(q, snapshot => {
  const items = [];
  snapshot.forEach(doc => {
    items.push({ id: doc.id, ...doc.data() });
  });
  newsCache = items;
  renderList(items);
}, err => {
  console.error('Firestore onSnapshot error:', err);
});

function renderList(items) {
  listEl.innerHTML = '';
  if (!items || items.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '1.2rem';
    empty.style.color = 'rgba(255,255,255,0.7)';
    empty.textContent = 'No news.';
    listEl.appendChild(empty);
    return;
  }

  const qval = (searchInput?.value || '').trim().toLowerCase();

  items
    .filter(n => {
      if (!qval) return true;
      return (n.title||'').toLowerCase().includes(qval) || (n.description||'').toLowerCase().includes(qval);
    })
    .forEach(n => {
      const card = document.createElement('article');
      card.className = 'news-card';
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.innerHTML = `
        <div class="accent" aria-hidden="true"></div>
        <div class="card-content">
          <div class="news-title">${escapeHtml(n.title)}</div>
          <div class="news-excerpt">${escapeHtml((n.description||'').slice(0,140))}${(n.description||'').length>140?'…':''}</div>
          <div class="news-meta">
            <div class="badge">${formatDate(n.date)}</div>
          </div>
        </div>
      `;
      card.addEventListener('click', ()=> showNewsDetails(n));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') showNewsDetails(n) });
      listEl.appendChild(card);
    });
}

function showNewsDetails(n) {
  lastFocusedElement = document.activeElement;
  detailsContent.innerHTML = `
    <h2 id="panel-title">${escapeHtml(n.title)}</h2>
    <div class="meta">${formatDate(n.date)}</div>
    <p>${escapeHtml(n.description)}</p>
  `;
  detailsSection.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  if (closeBtn) closeBtn.focus();
}

function closeNewsDetails() {
  detailsSection.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  if (lastFocusedElement) lastFocusedElement.focus();
  lastFocusedElement = null;
}

searchInput?.addEventListener('input', () => renderList(newsCache));
closeBtn?.addEventListener('click', closeNewsDetails);
backdrop?.addEventListener('click', closeNewsDetails);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNewsDetails(); });

function formatDate(d){
  if (!d) return 'Date not set';
  const dt = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : (d && d.toDate ? d.toDate() : new Date(d));
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str){
  return String(str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}