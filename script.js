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

function addZiel() {
    const text = textInput.value.trim();
    if (!text) {
        textInput.focus();
        return;
    }

    lebensziele.push({
        id: Date.now(),
        text,
        kategorie: katSelect.value,
        done: false,
        created: new Date().toISOString()
    });

    textInput.value = "";
    saveLebensziele();
    renderLebensziele();
    textInput.focus();
}


function toggleDone(id) {
    const ziel = lebensziele.find(z => z.id === id);
    ziel.done = !ziel.done;
    saveLebensziele();
    renderLebensziele();
}

function deleteZiel(id) {
    lebensziele = lebensziele.filter(z => z.id !== id);
    saveLebensziele();
    renderLebensziele();
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
            const n = a.name.localeCompare(b.name);
            if (n !== 0) return n;
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
 * INITIAL RENDER
 ************************************************************/

renderLebensziele();
renderWuensche();
