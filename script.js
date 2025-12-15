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
    // ZUERST registrieren
    await createUserWithEmailAndPassword(auth, email, password);
    console.log("User registriert");
    } catch (err) {
    if (err.code === "auth/email-already-in-use") {
        // DANN einloggen
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

onAuthStateChanged(auth, user => {
    if (user) {
    authBoxOut.classList.add("hidden");
    authBoxIn.classList.remove("hidden");
    authUser.textContent = `Eingeloggt als ${user.email}`;

    startApp(user.uid);   // ← DAS ist neu aktiv
    } else {
    authBoxIn.classList.add("hidden");
    authBoxOut.classList.remove("hidden");
    authUser.textContent = "";

    clearApp();           // ← wichtig beim Logout
    }
});



let unsubscribe = null;

function startApp(uid) {
    // alten Listener stoppen (wichtig bei Logout/Login-Wechsel)
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

    // Aufteilen nach Typ
    lebensziele = data.filter(x => x.type === "ziel");
    wuensche   = data.filter(x => x.type === "wunsch");
    todos      = data.filter(x => x.type === "todo");

    render();
    renderWuensche();
    renderTodos();
    });
}

function clearApp() {
    lebensziele = [];
    wuensche = [];
    todos = [];

    render();
    renderWuensche();
    renderTodos();
}



/************************************************************
 * PASSWORTSCHUTZ – LEBENSZIELE
 ************************************************************/

const LEBENSZIEL_PASSWORT = "5202";
const LEBENSZIEL_SESSION_KEY = "lebensziele_unlock";

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


/************************************************************
 * PASSWORTSCHUTZ – WUNSCHLISTE
 ************************************************************/

const WUNSCH_PASSWORT = "2025";
const WUNSCH_SESSION_KEY = "wunschliste_unlock";

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

const buttons = document.querySelectorAll("#menu button");
const sections = document.querySelectorAll(".list");

buttons.forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.list;

        if (target === "ziele") {
            if (!pruefeLebenszielePasswort()) return;
        }

        if (target === "wunsch") {
            if (!pruefeWunschPasswort()) return;
        }

        sections.forEach(sec => {
            sec.classList.toggle("hidden", sec.id !== target);
        });
    });
});


/************************************************************
 * LEBENSZIELE
 ************************************************************/

const STORAGE_KEY = "lebensziele";
let lebensziele = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let nurOffen = false;

// DOM
const textInput = document.getElementById("ziel-text");
const katSelect = document.getElementById("ziel-kategorie");
const addBtn = document.getElementById("ziel-add-btn");
const bloecke = document.querySelectorAll(".ziel-block");
const toggleOffenBtn = document.getElementById("toggle-offen");



function saveLebensziele() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lebensziele));
}

function sortZiele(a, b) {
    if (a.done !== b.done) return a.done - b.done;
    return new Date(a.created) - new Date(b.created);
}

textInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        addZiel();
    }
});


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
                datum.textContent =
                    "erstellt am " +
                    new Date(ziel.created).toLocaleDateString("de-DE");

                info.append(text, datum);

                const actions = document.createElement("div");
                actions.className = "ziel-actions";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = ziel.done;
                checkbox.onchange = () => toggleDone(ziel.id);

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



async function toggleDone(id, current) {
    await updateDoc(doc(db, "items", id), {
        done: !current
    });
}


async function deleteZiel(id) {
    await deleteDoc(doc(db, "items", id));
}


addBtn.addEventListener("click", addZiel);

toggleOffenBtn.addEventListener("click", () => {
    nurOffen = !nurOffen;
    toggleOffenBtn.classList.toggle("active", nurOffen);
    renderLebensziele();
});


/************************************************************
 * WUNSCHLISTE
 ************************************************************/

const WUNSCH_KEY = "wunschliste";
let wuensche = JSON.parse(localStorage.getItem(WUNSCH_KEY)) || [];
let wunschNurOffen = true;

// DOM
const wunschListe = document.getElementById("wunsch-liste");
const wunschText = document.getElementById("wunsch-text");
const wunschName = document.getElementById("wunsch-name");
const wunschAddBtn = document.getElementById("wunsch-add");
const toggleAltBtn = document.getElementById("toggle-wunsch-alt");

function saveWuensche() {
    localStorage.setItem(WUNSCH_KEY, JSON.stringify(wuensche));
}

wunschText.addEventListener("keydown", handleEnter);
wunschName.addEventListener("keydown", handleEnter);

function handleEnter(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        addWunsch();
    }
}


function renderWuensche() {
    wunschListe.innerHTML = "";

    wuensche
        .filter(w => !wunschNurOffen || !w.done)
        .sort((a, b) => {
            if (b.wichtigkeit !== a.wichtigkeit)
                return b.wichtigkeit - a.wichtigkeit;   // wichtig zuerst
            return new Date(a.created) - new Date(b.created);
        })

        .forEach(w => {
            const item = document.createElement("div");
            item.className = "ziel-item";
            item.classList.add(w.done ? "erledigt" : "offen");

            /* ---------- LINKS: Wunsch + Datum ---------- */
            const info = document.createElement("div");
            info.className = "ziel-info";

            const text = document.createElement("span");
            text.className = "ziel-text";
            text.textContent = w.wunsch;

            const datum = document.createElement("span");
            datum.className = "ziel-datum";
            datum.textContent =
                new Date(w.created).toLocaleDateString("de-DE");

            info.append(text, datum);

            /* ---------- RECHTS: Name + Checkbox + Löschen ---------- */
            const actions = document.createElement("div");
            actions.className = "ziel-actions";

            const name = document.createElement("span");
            name.className = "ziel-name";
            name.textContent = w.name;

            const check = document.createElement("input");
            check.type = "checkbox";
            check.checked = w.done;
            check.onchange = () => toggleWunsch(w.id);

            const del = document.createElement("button");
            del.className = "delete-btn";
            del.textContent = "Löschen";
            del.onclick = () => deleteWunsch(w.id);

            actions.append(name, check, del);

            /* ---------- Zusammenbauen ---------- */
            item.append(info, actions);
            wunschListe.append(item);

        });
}

function addWunsch() {
    const wunsch = wunschText.value.trim();
    const name = wunschName.value.trim();
    if (!wunsch || !name) return;

    wuensche.push({
        id: Date.now(),
        wunsch,
        name,
        done: false,
        created: new Date().toISOString()
    });

    wunschText.value = "";
    wunschName.value = "";
    saveWuensche();
    renderWuensche();
    wunschText.focus();

}

function toggleWunsch(id) {
    const w = wuensche.find(x => x.id === id);
    w.done = !w.done;
    saveWuensche();
    renderWuensche();
}

function deleteWunsch(id) {
    wuensche = wuensche.filter(w => w.id !== id);
    saveWuensche();
    renderWuensche();
}

wunschAddBtn.addEventListener("click", addWunsch);

toggleAltBtn.addEventListener("click", () => {
    wunschNurOffen = !wunschNurOffen;
    toggleAltBtn.classList.toggle("active", !wunschNurOffen);
    renderWuensche();
});






/************************************************************
 * TODO-LISTE (erweitert)
 ************************************************************/

const TODO_KEY = "todos";
let todos = JSON.parse(localStorage.getItem(TODO_KEY)) || [];
let deletedTodosBackup = null;
let undoTimer = null;

// DOM
const todoListe = document.getElementById("todo-liste");
const todoText = document.getElementById("todo-text");
const todoPrio = document.getElementById("todo-prio");
const todoAddBtn = document.getElementById("todo-add");
const deleteDoneBtn = document.getElementById("delete-done-todos");

// ---------- Speichern ----------
function saveTodos() {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}

// ---------- Render ----------
function renderTodos() {
    todoListe.innerHTML = "";

    todos
        .slice()
        .sort((a, b) => {
            if (b.wichtigkeit !== a.wichtigkeit)
                return b.wichtigkeit - a.wichtigkeit;   // Wichtigkeit
            return new Date(a.created) - new Date(b.created); // Erstellzeit
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

            // Klickbare Wichtigkeit
            const prio = document.createElement("span");
            prio.className = "ziel-prio";
            prio.textContent = `P${t.wichtigkeit}`;
            prio.title = "Klicken zum Ändern";
            prio.onclick = () => cyclePriority(t.id);

            const check = document.createElement("input");
            check.type = "checkbox";
            check.checked = t.done;
            check.onchange = () => toggleTodo(t.id);

            const del = document.createElement("button");
            del.className = "delete-btn";
            del.textContent = "Löschen";
            del.onclick = () => deleteTodo(t.id);

            actions.append(prio, check, del);
            item.append(info, actions);
            todoListe.append(item);
        });
}

// ---------- Aktionen ----------
function addTodo() {
    const text = todoText.value.trim();
    if (!text) {
        todoText.focus();
        return;
    }

    todos.push({
        id: Date.now(),
        text,
        wichtigkeit: Number(todoPrio.value),
        done: false,
        created: new Date().toISOString()
    });

    todoText.value = "";
    saveTodos();
    renderTodos();
    todoText.focus();
}

function toggleTodo(id) {
    const t = todos.find(x => x.id === id);
    t.done = !t.done;
    saveTodos();
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
}

/* ---------- Wichtigkeit per Klick ändern ---------- */
function cyclePriority(id) {
    const t = todos.find(x => x.id === id);
    t.wichtigkeit = t.wichtigkeit === 5 ? 1 : t.wichtigkeit + 1;
    saveTodos();
    renderTodos();
}

/* ---------- Alle erledigten löschen + Undo ---------- */
function deleteAllDoneTodos() {
    deletedTodosBackup = todos.filter(t => t.done);
    todos = todos.filter(t => !t.done);
    saveTodos();
    renderTodos();

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
        deletedTodosBackup = null;
    }, 5000);
}

function undoDelete() {
    if (!deletedTodosBackup) return;

    todos = todos.concat(deletedTodosBackup);
    deletedTodosBackup = null;
    saveTodos();
    renderTodos();

    const undo = document.getElementById("todo-undo");
    if (undo) undo.remove();
}

// ---------- Events ----------
todoAddBtn.onclick = addTodo;
deleteDoneBtn.onclick = deleteAllDoneTodos;

todoText.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        addTodo();
    }
});







/************************************************************
 * INITIAL RENDER
 ************************************************************/

renderLebensziele();
renderWuensche();

renderTodos();
