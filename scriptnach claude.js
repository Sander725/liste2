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
 * AUTHENTIFIZIERUNG
 ************************************************************/

const authBoxOut = document.getElementById("auth-logged-out");
const authBoxIn = document.getElementById("auth-logged-in");
const authUser = document.getElementById("auth-user");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const loginBtn = document.getElementById("auth-login");
const logoutBtn = document.getElementById("auth-logout");

loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("E-Mail und Passwort eingeben");
    return;
  }

  if (password.length < 6) {
    alert("Passwort muss mindestens 6 Zeichen haben");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    console.log("User registriert");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User eingeloggt");
    } else {
      alert(err.code + ": " + err.message);
    }
  }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
};

let unsubscribe = null;

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
 * FIREBASE ECHTZEIT-SYNCHRONISATION
 ************************************************************/

let lebensziele = [];
let wuensche = [];
let todos = [];
let einkauf = [];

function startApp(uid) {
  if (unsubscribe) unsubscribe();

  const q = query(
    collection(db, "items"),
    where("owner", "==", uid)
  );

  unsubscribe = onSnapshot(q, snapshot => {
    const data = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    lebensziele = data.filter(x => x.type === "ziel");
    wuensche = data.filter(x => x.type === "wunsch");
    todos = data.filter(x => x.type === "todo");
    einkauf = data.filter(x => x.type === "einkauf");

    renderLebensziele();
    renderWuensche();
    renderTodos();
    renderEinkauf();
  });
}

function clearApp() {
  lebensziele = [];
  wuensche = [];
  todos = [];
  einkauf = [];
  renderLebensziele();
  renderWuensche();
  renderTodos();
  renderEinkauf();
}


/************************************************************
 * PASSWORTSCHUTZ
 ************************************************************/

const LEBENSZIEL_PASSWORT = "5202";
const WUNSCH_PASSWORT = "2025";
const LEBENSZIEL_SESSION_KEY = "lebensziele_unlock";
const WUNSCH_SESSION_KEY = "wunschliste_unlock";

function lebenszieleFreigeschaltet() {
  return sessionStorage.getItem(LEBENSZIEL_SESSION_KEY) === "true";
}

function pruefeLebenszielePasswort() {
  if (lebenszieleFreigeschaltet()) return true;
  const eingabe = prompt("Passwort für Lebensziele:");
  if (eingabe === LEBENSZIEL_PASSWORT) {
    sessionStorage.setItem(LEBENSZIEL_SESSION_KEY, "true");
    return true;
  }
  alert("Falsches Passwort");
  return false;
}

function wunschFreigeschaltet() {
  return sessionStorage.getItem(WUNSCH_SESSION_KEY) === "true";
}

function pruefeWunschPasswort() {
  if (wunschFreigeschaltet()) return true;
  const eingabe = prompt("Passwort für Wunschliste:");
  if (eingabe === WUNSCH_PASSWORT) {
    sessionStorage.setItem(WUNSCH_SESSION_KEY, "true");
    return true;
  }
  alert("Falsches Passwort");
  return false;
}


/************************************************************
 * NAVIGATION
 ************************************************************/

function showList(id) {
  document.querySelectorAll(".list").forEach(sec => {
    sec.classList.toggle("hidden", sec.id !== id);
  });
}

document.querySelectorAll("#menu button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.list;

    if (target === "ziele" && !pruefeLebenszielePasswort()) return;
    if (target === "wunsch" && !pruefeWunschPasswort()) return;

    showList(target);

    if (target === "todo") renderTodos();
    if (target === "ziele") renderLebensziele();
    if (target === "wunsch") renderWuensche();
    if (target === "einkauf") renderEinkauf();
  });
});


/************************************************************
 * LEBENSZIELE
 ************************************************************/

const textInput = document.getElementById("ziel-text");
const katSelect = document.getElementById("ziel-kategorie");
const addBtn = document.getElementById("ziel-add-btn");
const bloecke = document.querySelectorAll(".ziel-block");
const toggleOffenBtn = document.getElementById("toggle-offen");

let nurOffen = false;

function sortZiele(a, b) {
  if (a.done !== b.done) return a.done - b.done;
  return new Date(a.created) - new Date(b.created);
}

function renderLebensziele() {
  bloecke.forEach(block => {
    const container = block.querySelector(".ziel-container");
    container.innerHTML = "";

    const kat = block.dataset.kategorie;

    lebensziele
      .filter(z => z.kategorie === kat)
      .filter(z => !nurOffen || !z.done)
      .sort(sortZiele)
      .forEach(ziel => {
        const item = document.createElement("div");
        item.className = "ziel-item";
        item.classList.add(ziel.done ? "erledigt" : "offen");

        const info = document.createElement("div");
        info.className = "ziel-info";

        const text = document.createElement("span");
        text.className = "ziel-text";
        text.textContent = ziel.text;

        const datum = document.createElement("span");
        datum.className = "ziel-datum";
        if (ziel.created && typeof ziel.created.toDate === "function") {
          datum.textContent = "erstellt am " + ziel.created.toDate().toLocaleDateString("de-DE");
        } else {
          datum.textContent = "erstellt gerade …";
        }

        info.append(text, datum);

        const actions = document.createElement("div");
        actions.className = "ziel-actions";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = ziel.done;
        checkbox.onchange = () => toggleZielDone(ziel.id, ziel.done);

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.textContent = "Löschen";
        delBtn.onclick = () => deleteZiel(ziel.id);

        actions.append(checkbox, delBtn);
        item.append(info, actions);
        container.append(item);
      });
  });
}

async function addZiel() {
  const text = textInput.value.trim();
  if (!text) {
    textInput.focus();
    return;
  }

  await addDoc(collection(db, "items"), {
    owner: auth.currentUser.uid,
    type: "ziel",
    text,
    kategorie: katSelect.value,
    done: false,
    created: serverTimestamp()
  });

  textInput.value = "";
  textInput.focus();
}

async function toggleZielDone(id, current) {
  await updateDoc(doc(db, "items", id), {
    done: !current
  });
}

async function deleteZiel(id) {
  await deleteDoc(doc(db, "items", id));
}

textInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    addZiel();
  }
});

addBtn.addEventListener("click", addZiel);

toggleOffenBtn.addEventListener("click", () => {
  nurOffen = !nurOffen;
  toggleOffenBtn.classList.toggle("active", nurOffen);
  renderLebensziele();
});


/************************************************************
 * WUNSCHLISTE
 ************************************************************/

const wunschListe = document.getElementById("wunsch-liste");
const wunschText = document.getElementById("wunsch-text");
const wunschName = document.getElementById("wunsch-name");
const wunschAddBtn = document.getElementById("wunsch-add");
const toggleAltBtn = document.getElementById("toggle-wunsch-alt");

let wunschNurOffen = true;

function renderWuensche() {
  wunschListe.innerHTML = "";

  wuensche
    .filter(w => !wunschNurOffen || !w.done)
    .sort((a, b) => {
      // 1. Sortierung nach Name/Anlass
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      
      // 2. Offene zuerst, dann erledigte
      if (a.done !== b.done) return a.done - b.done;
      
      // 3. Nach Datum (älter zuerst)
      return new Date(a.created) - new Date(b.created);
    })
    .forEach(w => {
      const item = document.createElement("div");
      item.className = "ziel-item";
      item.classList.add(w.done ? "erledigt" : "offen");

      const info = document.createElement("div");
      info.className = "ziel-info";

      const text = document.createElement("span");
      text.className = "ziel-text";
      text.textContent = w.text;

      const datum = document.createElement("span");
      datum.className = "ziel-datum";
      if (w.created && typeof w.created.toDate === "function") {
        datum.textContent = w.created.toDate().toLocaleDateString("de-DE");
      } else {
        datum.textContent = "erstellt gerade …";
      }

      info.append(text, datum);

      const actions = document.createElement("div");
      actions.className = "ziel-actions";

      const name = document.createElement("span");
      name.className = "ziel-name";
      name.textContent = w.name;

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = w.done;
      check.onchange = () => toggleWunsch(w.id, w.done);

      const del = document.createElement("button");
      del.className = "delete-btn";
      del.textContent = "Löschen";
      del.onclick = () => deleteWunsch(w.id);

      actions.append(name, check, del);
      item.append(info, actions);
      wunschListe.append(item);
    });
}

async function addWunsch() {
  const text = wunschText.value.trim();
  const name = wunschName.value.trim();
  if (!text || !name) {
    wunschText.focus();
    return;
  }

  await addDoc(collection(db, "items"), {
    owner: auth.currentUser.uid,
    type: "wunsch",
    text,
    name,
    wichtigkeit: 3,
    done: false,
    created: serverTimestamp()
  });

  wunschText.value = "";
  wunschName.value = "";
  wunschText.focus();
}

async function toggleWunsch(id, current) {
  await updateDoc(doc(db, "items", id), {
    done: !current
  });
}

async function deleteWunsch(id) {
  await deleteDoc(doc(db, "items", id));
}

function handleEnter(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    addWunsch();
  }
}

wunschText.addEventListener("keydown", handleEnter);
wunschName.addEventListener("keydown", handleEnter);
wunschAddBtn.addEventListener("click", addWunsch);

toggleAltBtn.addEventListener("click", () => {
  wunschNurOffen = !wunschNurOffen;
  toggleAltBtn.classList.toggle("active", !wunschNurOffen);
  renderWuensche();
});


/************************************************************
 * TODO-LISTE
 ************************************************************/

const todoListe = document.getElementById("todo-liste");
const todoText = document.getElementById("todo-text");
const todoPrio = document.getElementById("todo-prio");
const todoAddBtn = document.getElementById("todo-add");
const deleteDoneBtn = document.getElementById("delete-done-todos");

let deletedTodosBackup = [];
let undoTimer = null;

function renderTodos() {
  todoListe.innerHTML = "";

  todos
    .slice()
    .sort((a, b) => {
      if (b.wichtigkeit !== a.wichtigkeit) {
        return b.wichtigkeit - a.wichtigkeit;
      }
      return new Date(a.created) - new Date(b.created);
    })
    .forEach(t => {
      const item = document.createElement("div");
      item.className = `ziel-item todo prio-${t.wichtigkeit}`;
      if (t.done) item.classList.add("erledigt");

      const info = document.createElement("div");
      info.className = "ziel-info";

      const text = document.createElement("span");
      text.className = "ziel-text";
      text.textContent = t.text;

      info.append(text);

      const actions = document.createElement("div");
      actions.className = "ziel-actions";

      const prio = document.createElement("span");
      prio.className = "ziel-prio";
      prio.textContent = `P${t.wichtigkeit}`;
      prio.title = "Klicken zum Ändern";
      prio.onclick = () => cyclePriority(t.id, t.wichtigkeit);

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = t.done;
      check.onchange = () => toggleTodo(t.id, t.done);

      const del = document.createElement("button");
      del.className = "delete-btn";
      del.textContent = "Löschen";
      del.onclick = () => deleteTodo(t.id);

      actions.append(prio, check, del);
      item.append(info, actions);
      todoListe.append(item);
    });
}

async function addTodo() {
  const text = todoText.value.trim();
  if (!text) {
    todoText.focus();
    return;
  }

  await addDoc(collection(db, "items"), {
    owner: auth.currentUser.uid,
    type: "todo",
    text,
    wichtigkeit: parseInt(todoPrio.value) || 3,
    done: false,
    created: serverTimestamp()
  });

  todoText.value = "";
  todoText.focus();
}

async function toggleTodo(id, current) {
  await updateDoc(doc(db, "items", id), {
    done: !current
  });
}

async function deleteTodo(id) {
  await deleteDoc(doc(db, "items", id));
}

async function cyclePriority(id, current) {
  const newPrio = current === 5 ? 1 : current + 1;
  await updateDoc(doc(db, "items", id), {
    wichtigkeit: newPrio
  });
}

async function deleteAllDoneTodos() {
  const doneTodos = todos.filter(t => t.done);
  deletedTodosBackup = doneTodos;

  for (const t of doneTodos) {
    await deleteDoc(doc(db, "items", t.id));
  }

  showUndo();
}

function showUndo() {
  let undo = document.getElementById("todo-undo");
  if (!undo) {
    undo = document.createElement("button");
    undo.id = "todo-undo";
    undo.textContent = "Rückgängig";
    undo.style.marginLeft = "10px";
    deleteDoneBtn.after(undo);
  }

  undo.onclick = undoDelete;
  clearTimeout(undoTimer);

  undoTimer = setTimeout(() => {
    undo.remove();
    deletedTodosBackup = [];
  }, 5000);
}

async function undoDelete() {
  if (!deletedTodosBackup.length) return;

  for (const t of deletedTodosBackup) {
    await addDoc(collection(db, "items"), {
      owner: auth.currentUser.uid,
      type: t.type,
      text: t.text,
      wichtigkeit: t.wichtigkeit,
      done: t.done,
      created: t.created
    });
  }

  deletedTodosBackup = [];

  const undo = document.getElementById("todo-undo");
  if (undo) undo.remove();
}

todoText.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTodo();
  }
});

todoAddBtn.onclick = addTodo;
deleteDoneBtn.onclick = deleteAllDoneTodos;


/************************************************************
 * EINKAUFSLISTE
 ************************************************************/

const einkaufListe = document.getElementById("einkauf-liste");
const einkaufText = document.getElementById("einkauf-text");
const einkaufDringlichkeit = document.getElementById("einkauf-dringlichkeit");
const einkaufAddBtn = document.getElementById("einkauf-add");
const deleteGekauftBtn = document.getElementById("delete-gekauft");

function renderEinkauf() {
  einkaufListe.innerHTML = "";

  einkauf
    .slice()
    .sort((a, b) => {
      // 1. Ungekauft zuerst
      if (a.done !== b.done) return a.done - b.done;
      // 2. Nach Dringlichkeit (hoch zu niedrig)
      if (b.dringlichkeit !== a.dringlichkeit) {
        return b.dringlichkeit - a.dringlichkeit;
      }
      // 3. Nach Erstelldatum
      return new Date(a.created) - new Date(b.created);
    })
    .forEach(item => {
      const div = document.createElement("div");
      div.className = `ziel-item einkauf prio-${item.dringlichkeit}`;
      if (item.done) div.classList.add("erledigt");

      const info = document.createElement("div");
      info.className = "ziel-info";

      const text = document.createElement("span");
      text.className = "ziel-text";
      text.textContent = item.text;
      if (item.done) {
        text.style.textDecoration = "line-through";
      }

      info.append(text);

      const actions = document.createElement("div");
      actions.className = "ziel-actions";

      const dring = document.createElement("span");
      dring.className = "ziel-prio";
      dring.textContent = `D${item.dringlichkeit}`;
      dring.title = "Klicken zum Ändern";
      dring.onclick = () => cycleEinkaufDringlichkeit(item.id, item.dringlichkeit);

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = item.done;
      check.onchange = () => toggleEinkauf(item.id, item.done);

      const del = document.createElement("button");
      del.className = "delete-btn";
      del.textContent = "Löschen";
      del.onclick = () => deleteEinkauf(item.id);

      actions.append(dring, check, del);
      div.append(info, actions);
      einkaufListe.append(div);
    });
}

async function addEinkauf() {
  const text = einkaufText.value.trim();
  if (!text) {
    einkaufText.focus();
    return;
  }

  await addDoc(collection(db, "items"), {
    owner: auth.currentUser.uid,
    type: "einkauf",
    text,
    dringlichkeit: parseInt(einkaufDringlichkeit.value) || 2,
    done: false,
    created: serverTimestamp()
  });

  einkaufText.value = "";
  einkaufText.focus();
}

async function toggleEinkauf(id, current) {
  await updateDoc(doc(db, "items", id), {
    done: !current
  });
}

async function deleteEinkauf(id) {
  await deleteDoc(doc(db, "items", id));
}

async function cycleEinkaufDringlichkeit(id, current) {
  const newDring = current === 3 ? 1 : current + 1;
  await updateDoc(doc(db, "items", id), {
    dringlichkeit: newDring
  });
}

async function deleteAllGekauft() {
  const gekauft = einkauf.filter(e => e.done);
  
  for (const e of gekauft) {
    await deleteDoc(doc(db, "items", e.id));
  }
}

einkaufText.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    addEinkauf();
  }
});

einkaufAddBtn.onclick = addEinkauf;
deleteGekauftBtn.onclick = deleteAllGekauft;


/************************************************************
 * INITIALISIERUNG
 ************************************************************/

showList("todo");
renderTodos();