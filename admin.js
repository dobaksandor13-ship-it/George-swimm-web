import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const allowedAdmins = ["dobakcsalad1210@gmail.com","alexdobak09@gmail.com"]; // Admin e-mail list, change these!

const idInput = document.getElementById('news-id');
const titleInput = document.getElementById('news-title');
const dateInput = document.getElementById('news-date');
const descInput = document.getElementById('news-desc');
const videoInput = document.getElementById('news-video'); // NEW
const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const listAdmin = document.getElementById('news-list-admin');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
let list = [];
let currentUser = null;

loginBtn.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Sign-in failed: " + err.message);
  }
};
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user && allowedAdmins.includes(user.email)) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
    userEmailSpan.textContent = "Signed in as: " + user.email + " (admin)";
    enableForm();
  } else {
    loginBtn.style.display = "";
    logoutBtn.style.display = "none";
    userEmailSpan.textContent = user ? ("Signed in as: " + user.email + " (no admin access)") : "";
    disableForm();
  }
});

function enableForm() {
  saveBtn.disabled = false;
  clearBtn.disabled = false;
  exportBtn.disabled = false;
  titleInput.disabled = false;
  dateInput.disabled = false;
  descInput.disabled = false;
  videoInput.disabled = false; // NEW
}
function disableForm() {
  saveBtn.disabled = true;
  clearBtn.disabled = true;
  exportBtn.disabled = true;
  titleInput.disabled = true;
  dateInput.disabled = true;
  descInput.disabled = true;
  videoInput.disabled = true; // NEW
}

async function loadListAndRender() {
  const q = query(collection(db, 'news'), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  list = [];
  querySnapshot.forEach(docSnap => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderAdminList(list);
}
loadListAndRender();

saveBtn.addEventListener('click', async () => {
  // debug
  console.log('Attempting save. currentUser:', currentUser?.email, currentUser?.uid);

  if (!currentUser || !allowedAdmins.includes(currentUser.email)) return alert('Only admins can post news!');
  const id = idInput.value || null;
  const title = titleInput.value.trim();
  const date = dateInput.value ? dateInput.value : new Date().toISOString().slice(0,10);
  const desc = descInput.value.trim();
  const videoUrl = videoInput.value.trim() || null; // NEW
  if (!title || !desc) { alert('Please fill out the title and description.'); return; }
  try {
    if (!id) {
      const payload = {
        title,
        date,
        description: desc,
        videoUrl,
        authorId: currentUser.uid,
        createdAt: serverTimestamp()
      };
      console.log('create payload', payload);
      await addDoc(collection(db, 'news'), payload);
    } else {
      const updatePayload = {
        title,
        date,
        description: desc,
        videoUrl
      };
      console.log('update payload', updatePayload);
      await updateDoc(doc(db, 'news', id), updatePayload);
    }
    clearForm();
    alert('Save successful — news is now visible on the main page.');
    loadListAndRender();
  } catch (e) {
    console.error('Error during save:', e);
    alert('Error saving: ' + (e.message || e));
  }
});

clearBtn.addEventListener('click', clearForm);
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(list, null, 2);
  const w = window.open('', '_blank');
  w.document.write('<pre>' + escapeHtml(data) + '</pre>');
});

function renderAdminList(items){
  listAdmin.innerHTML = '';
  if (!items || items.length === 0) { listAdmin.textContent = 'No news.'; return; }
  items.forEach(it => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `
      <div class="left">
        <div style="font-weight:600">${escapeHtml(it.title)}</div>
        <div class="muted">${formatDate(it.date)}</div>
      </div>
      <div class="right" style="display:flex;gap:.5rem">
        <button data-id="${escapeHtml(it.id)}" class="edit-btn primary small" ${!currentUser || !allowedAdmins.includes(currentUser.email) ? "disabled" : ""}>Edit</button>
        <button data-id="${escapeHtml(it.id)}" class="del-btn primary small danger" ${!currentUser || !allowedAdmins.includes(currentUser.email) ? "disabled" : ""}>Delete</button>
      </div>
    `;
    // If there's a video URL, append a small link element on the left side
    if (it.videoUrl) {
      try {
        const a = document.createElement('a');
        a.href = it.videoUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Video';
        a.style.display = 'inline-block';
        a.style.marginTop = '0.4rem';
        a.style.color = 'var(--accent-1)';
        row.querySelector('.left').appendChild(a);
      } catch (e) {
        // ignore invalid url
      }
    }
    listAdmin.appendChild(row);
  });

  // Edit button
  listAdmin.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', (e)=>{
    if (!currentUser || !allowedAdmins.includes(currentUser.email)) return;
    const id = e.currentTarget.getAttribute('data-id');
    const it = list.find(x => x.id === id);
    if (!it) return;
    idInput.value = it.id;
    titleInput.value = it.title;
    dateInput.value = it.date ? it.date : '';
    descInput.value = it.description;
    videoInput.value = it.videoUrl || ''; // NEW
    window.scrollTo({top:0, behavior:'smooth'});
  }));

  // Delete button
  listAdmin.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', async (e)=>{
    if (!currentUser || !allowedAdmins.includes(currentUser.email)) return;
    const id = e.currentTarget.getAttribute('data-id');
    if (!confirm('Really delete the news?')) return;
    try {
      await deleteDoc(doc(db, 'news', id));
      alert('Deleted.');
      loadListAndRender();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error deleting!');
    }
  }));
}

function clearForm(){ idInput.value = ''; titleInput.value = ''; dateInput.value = ''; descInput.value = ''; videoInput.value = ''; } // NEW
function formatDate(d) {
  if (!d) return 'Date not set';
  const dt = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}
function escapeHtml(str){ return String(str || '').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;"); }
