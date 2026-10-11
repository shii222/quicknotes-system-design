
# QuickNotes System Design

## Project Overview

QuickNotes is a web-based note-taking application that allows users to load, create, and delete notes using REST API requests.

This project demonstrates how a browser-based application can communicate with an API and presents a proposed backend architecture capable of supporting 1 million registered users.

The frontend uses JSONPlaceholder as a practice API, while the design documents describe the proposed production system.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Fetch API
- JSONPlaceholder REST API
- Git and GitHub
- PostgreSQL (proposed backend database)
- Redis (proposed caching system)

## Features

- Load 10 notes using GET requests.
- Create notes using POST requests.
- Delete notes using DELETE requests.
- Validate note titles.
- Display loading, success, error, and empty states.
- Disable buttons while requests are running.
- Display user content safely using textContent.
- Responsive design for desktop and mobile screens.

## How to Run the API Client

1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Open index.html using Live Server or a web browser.
4. Make sure you have an internet connection.
5. Click "Load notes" to retrieve 10 notes.
6. Enter a title and optional body, then click "Create Note".
7. Click "Delete" to remove a displayed note.

Note: JSONPlaceholder simulates POST and DELETE requests. Changes are not permanently stored on its server.

## Project Structure

    quicknotes-system-design/
    ├── index.html
    ├── api.js
    ├── style.css
    ├── README.md
    └── docs/
        ├── api-design.md
        ├── data-model.md
        └── architecture.md

## System Design Documents

### 1. API Design

[View API Design](docs/api-design.md)

Describes REST endpoints, HTTP methods, status codes, authentication, and JSON request and response examples.

### 2. Data Model

[View Data Model](docs/data-model.md)

Explains database tables, primary keys, foreign keys, relationships, SQL queries, indexes, and the choice of PostgreSQL.

### 3. System Architecture

[View Architecture](docs/architecture.md)

Explains functional and non-functional requirements, load estimates, system components, request flows, scaling trade-offs, and fault tolerance.

## What I Learned

1. **API Communication:** I learned how JavaScript uses fetch(), async/await, and HTTP methods to communicate with a server.

2. **Error Handling:** I learned how try/catch/finally handles failed requests and how to display useful status messages.

3. **Database Design:** I learned how SQL tables, primary keys, foreign keys, and JOIN operations organize related information.

4. **System Architecture:** I learned how load balancers, caching, database replicas, queues, and workers help online applications scale.

5. **Version Control:** I learned how to use Git commits to track development progress and GitHub to share a project.

## Future Improvements

- Implement a real backend API.
- Add user registration and login.
- Store notes permanently in PostgreSQL.
- Support editing and searching notes.
- Add tags for organizing notes.
- Deploy the application online.

## Conclusion

QuickNotes System Design demonstrates both practical API communication and backend system planning.

The project provides a foundation for building a secure, scalable note-taking application.
