
# QuickNotes Data Model Design

## 1. Introduction

QuickNotes is an online note-taking application designed for up to 1 million users.

The system needs to store user accounts, notes, tags, and the relationships between notes and tags.

PostgreSQL is the proposed relational database because it supports structured data, foreign keys, transactions, indexing, and reliable queries.

## 2. Database Entities

### Table 1: users

| Column | Data Type | Constraint | Description |
|---|---|---|---|
| id | BIGINT | PRIMARY KEY | Unique user ID |
| name | VARCHAR(100) | NOT NULL | User's full name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email |
| password_hash | TEXT | NOT NULL | Securely hashed password |
| created_at | TIMESTAMP | NOT NULL | Account creation date |

### Table 2: notes

| Column | Data Type | Constraint | Description |
|---|---|---|---|
| id | BIGINT | PRIMARY KEY | Unique note ID |
| user_id | BIGINT | FOREIGN KEY | Owner of the note |
| title | VARCHAR(100) | NOT NULL | Note title |
| body | TEXT | NULL allowed | Note content |
| created_at | TIMESTAMP | NOT NULL | Creation date |
| updated_at | TIMESTAMP | NOT NULL | Last update |

### Table 3: tags

| Column | Data Type | Constraint | Description |
|---|---|---|---|
| id | BIGINT | PRIMARY KEY | Unique tag ID |
| user_id | BIGINT | FOREIGN KEY | Owner of the tag |
| name | VARCHAR(50) | NOT NULL | Tag name |

### Table 4: note_tags

| Column | Data Type | Constraint | Description |
|---|---|---|---|
| note_id | BIGINT | PRIMARY KEY, FOREIGN KEY | References notes.id |
| tag_id | BIGINT | PRIMARY KEY, FOREIGN KEY | References tags.id |

The note_tags table uses a composite primary key consisting of note_id and tag_id.

## 3. Database Relationships

### One-to-Many Relationships

One user can create many notes.

users (1) -------- (many) notes

One user can create many tags.

users (1) -------- (many) tags

### Many-to-Many Relationship

One note can have multiple tags, and one tag can belong to multiple notes.

notes (many) -------- (many) tags

The note_tags junction table implements this relationship.

## 4. SQL CREATE TABLE Statements

The following statements use PostgreSQL syntax.

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT check_note_title
        CHECK (LENGTH(TRIM(title)) BETWEEN 1 AND 100)
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,

    CONSTRAINT fk_tags_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_tag
        UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,

    PRIMARY KEY (note_id, tag_id),

    FOREIGN KEY (note_id)
        REFERENCES notes(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
);
```

The application must verify that the note and tag belong to the same user before creating a note_tags record.

## 5. Example SQL Queries

### Query 1: Get all notes belonging to a user

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC;
```

### Query 2: Create a new note

```sql
INSERT INTO notes (user_id, title, body)
VALUES (1, 'Learn SQL', 'Practice database queries');
```

### Query 3: JOIN notes with their owners

```sql
SELECT
    notes.id,
    notes.title,
    users.name AS owner
FROM notes
INNER JOIN users
    ON notes.user_id = users.id
WHERE users.id = 1;
```

### Query 4: Get notes and their tags

```sql
SELECT
    notes.title,
    tags.name AS tag_name
FROM notes
INNER JOIN note_tags
    ON notes.id = note_tags.note_id
INNER JOIN tags
    ON note_tags.tag_id = tags.id
WHERE notes.user_id = 1;
```

### Query 5: Update a note

```sql
UPDATE notes
SET title = 'Updated SQL Notes',
    updated_at = NOW()
WHERE id = 1 AND user_id = 1;
```

## 6. Database Indexes

```sql
CREATE INDEX idx_notes_user_created
ON notes(user_id, created_at DESC);

CREATE INDEX idx_note_tags_tag_id
ON note_tags(tag_id);
```

The first index helps the database quickly find a user's notes sorted by creation date. This is useful for the GET /notes endpoint.

The second index improves queries that find notes associated with a particular tag.

Indexes speed up reads but require extra storage and slightly increase write costs.

## 7. SQL vs NoSQL Decision

QuickNotes will use PostgreSQL, a SQL relational database.

SQL is suitable because users, notes, and tags have clearly defined relationships. Foreign keys protect data integrity, while transactions help ensure updates are reliable.

A NoSQL database such as MongoDB could provide flexible document structures and horizontal scaling. However, QuickNotes benefits more from relational consistency and JOIN operations.

For 1 million users, PostgreSQL with proper indexes, connection pooling, caching, and read replicas is a reasonable starting architecture.

## 8. Data Security and Integrity

- Passwords are stored as secure hashes, never plain text.
- Each note belongs to one user.
- API queries filter notes by the authenticated user's ID.
- Foreign keys prevent references to nonexistent records.
- Cascading deletes remove dependent records when appropriate.
- Parameterized SQL queries prevent SQL injection.
- Regular backups and recovery testing protect user data.

## 9. Conclusion

This relational database design provides a structured foundation for QuickNotes.

The four tables support user accounts, note management, tagging, secure ownership, and efficient data retrieval.
