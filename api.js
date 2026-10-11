
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusText = document.getElementById("status");
const notesList = document.getElementById("notes-list");

// Reusable function for making API requests
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    return response.json();
}

// Display a status message
function showStatus(message, type = "") {
    statusText.textContent = message;
    statusText.className = type;
}

// Display a note safely
function displayNote(note) {
    const li = document.createElement("li");
    const title = document.createElement("h3");
    const body = document.createElement("p");

    title.textContent = note.title;
    body.textContent = note.body;

    li.append(title, body);
    notesList.appendChild(li);
}

// Load 10 notes from the API
async function loadNotes() {
    loadBtn.disabled = true;
    showStatus("Loading notes...");
    notesList.replaceChildren();

    try {
        const notes = await request(`${API_URL}?_limit=10`);

        if (notes.length === 0) {
            const empty = document.createElement("li");
            empty.textContent = "No notes available.";
            notesList.appendChild(empty);
            showStatus("No notes found.");
        } else {
            notes.forEach(displayNote);
            showStatus(`Loaded ${notes.length} notes from the server.`, "success");
        }
    } catch (error) {
        showStatus("Unable to load notes. Please try again.", "error");
        console.error(error);
    } finally {
        loadBtn.disabled = false;
    }
}

loadBtn.addEventListener("click", loadNotes);
