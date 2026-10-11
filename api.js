
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

const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");

// Create a new note using POST
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title || title.length > 100) {
        showStatus("Title is required and must be 100 characters or fewer.", "error");
        return;
    }

    submitBtn.disabled = true;
    showStatus("Creating note...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                body: body,
                userId: 1
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const newNote = await response.json();

        // Add the new note to the top of the list
        const li = document.createElement("li");
        const heading = document.createElement("h3");
        const paragraph = document.createElement("p");

        heading.textContent = newNote.title;
        paragraph.textContent = newNote.body;

        li.append(heading, paragraph);
        notesList.prepend(li);

        showStatus(
            `Note created (status ${response.status}, id ${newNote.id}).`,
            "success"
        );

        noteForm.reset();

    } catch (error) {
        showStatus("Unable to create note. Please try again.", "error");
        console.error(error);
    } finally {
        submitBtn.disabled = false;
    }
}

noteForm.addEventListener("submit", createNote);
