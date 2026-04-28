CREATE TABLE IF NOT EXISTS file
(
    id             UUID PRIMARY KEY,
    file_name      VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP   DEFAULT NOW(),
    updated_at     TIMESTAMP   DEFAULT NOW()
);
