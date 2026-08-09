-- Таблица разработчиков
CREATE TABLE IF NOT EXISTS developers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    is_verified INTEGER DEFAULT 0,
    registered_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    last_login INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Таблица приложений
CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY,
    developer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    package_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    version TEXT NOT NULL,
    version_code INTEGER NOT NULL,
    size TEXT DEFAULT '',
    category TEXT DEFAULT '',
    icon_url TEXT DEFAULT '',
    apk_url TEXT DEFAULT '',
    screenshots TEXT DEFAULT '[]',
    rating REAL DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    rating REAL NOT NULL,
    date INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

-- Таблица обновлений (кэш версий для быстрой проверки)
CREATE TABLE IF NOT EXISTS app_updates (
    app_id TEXT PRIMARY KEY,
    version_code INTEGER NOT NULL,
    version_name TEXT NOT NULL,
    apk_url TEXT NOT NULL,
    changelog TEXT DEFAULT '',
    last_checked INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_apps_developer_id ON apps(developer_id);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_reviews_app_id ON reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_developers_email ON developers(email);

-- Триггер для обновления updated_at в apps
CREATE TRIGGER IF NOT EXISTS update_apps_updated_at
AFTER UPDATE ON apps
BEGIN
    UPDATE apps SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Триггер для обновления updated_at в developers
CREATE TRIGGER IF NOT EXISTS update_developers_updated_at
AFTER UPDATE ON developers
BEGIN
    UPDATE developers SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;