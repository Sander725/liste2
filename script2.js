/************************************************************
 * IMPORTS
 ************************************************************/

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/************************************************************
 * AUTH
 ************************************************************/

const authBoxOut = document.getElementById("auth-logged-out");
const authBoxIn  = document.getElementById("auth-logged-in");
const authUser   = document.getElementById("auth-user");

const emailInput    = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const loginBtn      = document.getElementById("auth-login");
const logoutBtn     = document.getElementById("auth-logout");

loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return;
  if (password.length < 6) return alert("Passwort min. 6 Zeichen");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      alert(e.message);
    }
  }
};

logoutBtn.onclick = () => signOut(auth);

/************************************************************
 * GLOBAL STATE (Firestore)
 ************************************************************/

let lebensziele = [];
let wuensche = [];
let todos = [];

let unsubscribe = null;

/************************************************************
 * AUTH STATE
 ************************************************************/

onAuthStateChanged(auth, user => {
  if (user) {
    authBoxOut.classList.add("hidden");
    authBoxIn.classList.remove("hidden");
    authUser.textContent = `Eingeloggt als ${user.email}`;
    startApp(user.uid);
  } else {
    authBoxIn.classList.add("hidden");
    authBoxOut.classList.remove("hidden");
    authUser.textContent = "";
    clearApp();
  }
});

/************************************************************
 * FIRESTORE LISTENER
 ************************************************************/

function startApp(uid) {
  if (unsubscribe) unsubscribe();

  const q = query(
    collection(db, "items"),
    where("owner", "==", uid)
  );

  unsubscribe = onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    lebensziele = data.filter(x => x.type === "ziel");
    wuensche    = data.filter(x => x.type === "wunsch");
    todos       = data.filter(x => x.type === "todo");

    renderLebensziele();
    renderWuensche();
    renderTodos();
  });
}

function clearApp() {
  lebensziele = [];
  wuensche = [];
  todos = [];
  renderLebensziele();
  renderWuensche();
  renderTodos();
}

/************************************************************
 * NAVIGATION + PASSWÖRTER
 ************************************************************/

const LEBENSZIEL_PASSWORT = "5202";
const WUNSCH_PASSWORT = "2025";

function checkPasswort(key, pw) {
  if (sessionStorage.getItem(key) === "true") return true;
  const e = prompt("Passwort:");
  if (e === pw) {
    sessionStorage.setItem(key, "true");
    return true;
  }
  alert("Falsch");
  return false;
}

document.querySelectorAll("#menu button").forEach(btn => {
  btn.onclick = () => {
    const t = btn.dataset.list;
    if (t === "ziele" && !checkPasswort("z", LEBENSZIEL_PASSWORT)) return;
    if (t === "wunsch" && !checkPasswort("w", WUNSCH_PASSWORT)) return;
    document.querySelectorAll(".list").forEach(l =>
      l.classList.toggle("hidden", l.id !== t)
    );
  };
});

/************************************************************
 * LEBENSZIELE
 ************************************************************/

const zielText = document.getElementById("ziel-text");
const zielKat  = document.getElementById("ziel-kategorie");
const zielBtn  = document.getElementById("ziel-add-btn");
const zielBlocks = document.querySelectorAll(".ziel-block");
const toggleOffenBtn = document.getElementById("toggle-offen");

let nurOffen = false;

zielBtn.onclick = addZiel;
toggleOffenBtn.onclick = () => {
  nurOffen = !nurOffen;
  toggleOffenBtn.classList.toggle("active", nurOffen);
  renderLebensziele();
};

async function addZiel() {
  if (!zielText.value.trim()) return;
  await addDoc(collection(db,"items"),{
    owner: auth.currentUser.uid,
    type: "ziel",
    text: zielText.value.trim(),
    kategorie: zielKat.value,
    done: false,
    created: serverTimestamp()
  });
  zielText.value = "";
}

function renderLebensziele() {
  zielBlocks.forEach(block => {
    const kat = block.dataset.kategorie;
    const c = block.querySelector(".ziel-container");
    c.innerHTML = "";

    lebensziele
      .filter(z => z.kategorie === kat)
      .filter(z => !nurOffen || !z.done)
      .sort((a,b)=>a.done-b.done)
      .forEach(z => {
        const d = document.createElement("div");
        d.className = `ziel-item ${z.done?"erledigt":"offen"}`;
        d.innerHTML = `<span>${z.text}</span>`;

        const cb = document.createElement("input");
        cb.type="checkbox";
        cb.checked=z.done;
        cb.onchange=()=>updateDoc(doc(db,"items",z.id),{done:!z.done});

        const del=document.createElement("button");
        del.textContent="Löschen";
        del.onclick=()=>deleteDoc(doc(db,"items",z.id));

        d.append(cb,del);
        c.append(d);
      });
  });
}

/************************************************************
 * WUNSCHLISTE
 ************************************************************/

const wText = document.getElementById("wunsch-text");
const wName = document.getElementById("wunsch-name");
const wBtn  = document.getElementById("wunsch-add");
const wList = document.getElementById("wunsch-liste");
const toggleAltBtn = document.getElementById("toggle-wunsch-alt");

let wunschNurOffen = false;

toggleAltBtn.onclick = () => {
  wunschNurOffen = !wunschNurOffen;
  toggleAltBtn.classList.toggle("active", wunschNurOffen);
  renderWuensche();
};

wBtn.onclick = addWunsch;

async function addWunsch() {
  if (!wText.value || !wName.value) return;
  await addDoc(collection(db,"items"),{
    owner: auth.currentUser.uid,
    type: "wunsch",
    wunsch: wText.value,
    name: wName.value,
    done: false,
    created: serverTimestamp()
  });
  wText.value=""; wName.value="";
}

function renderWuensche() {
  wList.innerHTML="";
  wuensche
    .filter(w=>!wunschNurOffen||!w.done)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .forEach(w=>{
      const d=document.createElement("div");
      d.className=`ziel-item ${w.done?"erledigt":"offen"}`;
      d.innerHTML=`<span>${w.wunsch}</span><span>${w.name}</span>`;

      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.checked=w.done;
      cb.onchange=()=>updateDoc(doc(db,"items",w.id),{done:!w.done});

      const del=document.createElement("button");
      del.textContent="Löschen";
      del.onclick=()=>deleteDoc(doc(db,"items",w.id));

      d.append(cb,del);
      wList.append(d);
    });
}

/************************************************************
 * TODO LISTE (voll)
 ************************************************************/

const todoText = document.getElementById("todo-text");
const todoPrio = document.getElementById("todo-prio");
const todoBtn  = document.getElementById("todo-add");
const todoList = document.getElementById("todo-liste");
const deleteDoneBtn = document.getElementById("delete-done-todos");

todoBtn.onclick = addTodo;
deleteDoneBtn.onclick = deleteAllDone;

async function addTodo() {
  if (!todoText.value) return;
  await addDoc(collection(db,"items"),{
    owner: auth.currentUser.uid,
    type:"todo",
    text: todoText.value,
    wichtigkeit:+todoPrio.value,
    done:false,
    created:serverTimestamp()
  });
  todoText.value="";
}

function renderTodos() {
  todoList.innerHTML="";
  todos
    .sort((a,b)=>b.wichtigkeit-a.wichtigkeit)
    .forEach(t=>{
      const d=document.createElement("div");
      d.className=`ziel-item todo prio-${t.wichtigkeit} ${t.done?"erledigt":""}`;
      d.innerHTML=t.text;

      const pr=document.createElement("span");
      pr.textContent=`P${t.wichtigkeit}`;
      pr.onclick=()=>updateDoc(doc(db,"items",t.id),{
        wichtigkeit:t.wichtigkeit===5?1:t.wichtigkeit+1
      });

      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.checked=t.done;
      cb.onchange=()=>updateDoc(doc(db,"items",t.id),{done:!t.done});

      const del=document.createElement("button");
      del.textContent="Löschen";
      del.onclick=()=>deleteDoc(doc(db,"items",t.id));

      d.append(pr,cb,del);
      todoList.append(d);
    });
}

async function deleteAllDone() {
  for (const t of todos.filter(x=>x.done)) {
    await deleteDoc(doc(db,"items",t.id));
  }
}
