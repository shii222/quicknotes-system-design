
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusText = document.getElementById("status");
const notesList = document.getElementById("notes-list");

const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");

// Reusable function for all API requests
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    // Some DELETE requests return no content.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const text = await response.text();

    return {
        data: text ? JSON.parse(text) : null,
        status: response.status
    };
}

// Display loading, success, and error messages
function showStatus(message, type = "") {
    statusText.textContent = message;
    statusText.className = type;
}

// Display an empty state
function showEmptyState() {
    if (notesList.children.length === 0) {
        const empty = document.createElement("li");

        // Mark the placeholder so it can be removed later.
        empty.dataset.empty = "true";

        empty.textContent = "No notes available.";
        notesList.appendChild(empty);
    }
}

// Display a note with a Delete button
function displayNote(note, atTop = false) {
    const li = document.createElement("li");
    const title = document.createElement("h3");
    const body = document.createElement("p");
    const deleteBtn = document.createElement("button");

    title.textContent = note.title;
    body.textContent = note.body;

    deleteBtn.textContent = "Delete";
    deleteBtn.type = "button";

    deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        showStatus("Deleting note...");

        try {
            await request(`${API_URL}/${note.id}`, {
                method: "DELETE"
            });

            li.remove();
            showStatus("Note deleted successfully.", "success");
            showEmptyState();

        } catch (error) {
            showStatus(
                "Unable to delete note. Please try again.",
                "error"
            );
            console.error(error);

        } finally {
            deleteBtn.disabled = false;
        }
    });

    li.append(title, body, deleteBtn);

    if (atTop) {
        notesList.prepend(li);
    } else {
        notesList.appendChild(li);
    }
}

// GET: Load 10 notes
async function loadNotes() {
    loadBtn.disabled = true;
    showStatus("Loading notes...");
    notesList.replaceChildren();

    try {
        const result = await request(`${API_URL}?_limit=10`);
        const notes = result.data;

        if (notes.length === 0) {
            showEmptyState();
            showStatus("No notes found.");
        } else {
            notes.forEach(note => displayNote(note));

            showStatus(
                `Loaded ${notes.length} notes from the server.`,
                "success"
            );
        }

    } catch (error) {
        showEmptyState();
        showStatus(
            "Unable to load notes. Please try again.",
            "error"
        );
        console.error(error);

    } finally {
        loadBtn.disabled = false;
    }
}

// POST: Create a new note
async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title || title.length > 100) {
        showStatus(
            "Title is required and must be 100 characters or fewer.",
            "error"
        );
        return;
    }

    submitBtn.disabled = true;
    showStatus("Creating note...");

    try {
        const result = await request(API_URL, {
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

        const newNote = result.data;

        // Remove the empty-state placeholder if present.
        const emptyMessage = notesList.querySelector(
            "li[data-empty]"
        );

        if (emptyMessage) {
            emptyMessage.remove();
        }

        // JSONPlaceholder simulates POST and DELETE.
        // New notes exist in this browser session only.
        // They are not permanently saved on the server.
        displayNote(newNote, true);

        showStatus(
            `Note created (status ${result.status}, id ${newNote.id}).`,
            "success"
        );

        noteForm.reset();

    } catch (error) {
        showStatus(
            "Unable to create note. Please try again.",
            "error"
        );
        console.error(error);

    } finally {
        submitBtn.disabled = false;
    }
}

// Event listeners
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
