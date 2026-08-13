-- Добавляем демо-разработчика
INSERT OR IGNORE INTO developers (id, name, email, password_hash, bio, is_verified) 
VALUES (
    'dev_system',
    'DevStore Team',
    'devstore@example.com',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'Создатели DevStore',
    1
);

-- Добавляем демо-приложения
INSERT OR IGNORE INTO apps (id, developer_id, name, package_name, description, version, version_code, size, category, icon_url, apk_url, screenshots, rating, download_count) 
VALUES 
(
    'demo_2',
    'dev_system',
    'Code Editor',
    'com.demo.codeeditor',
    'Лёгкий и быстрый редактор кода с подсветкой синтаксиса',
    '1.5.2',
    1,
    '8 МБ',
    'Продуктивность',
    'https://raw.githubusercontent.com/github/explore/main/topics/kotlin/kotlin.png',
    '',
    '[]',
    4.5,
    890
),
(
    'demo_3',
    'dev_system',
    'Git Manager',
    'com.demo.gitmanager',
    'Удобный клиент Git для Android',
    '3.0.1',
    3,
    '15 МБ',
    'Инструменты',
    'https://raw.githubusercontent.com/github/explore/main/topics/git/git.png',
    '',
    '[]',
    4.2,
    560
),
(
    'demo_4',
    'dev_system',
    'Terminal X',
    'com.demo.terminal',
    'Мощный эмулятор терминала с поддержкой SSH',
    '1.0.0',
    1,
    '5 МБ',
    'Инструменты',
    'https://raw.githubusercontent.com/github/explore/main/topics/terminal/terminal.png',
    '',
    '[]',
    4.8,
    2100
);

-- Добавляем демо-отзывы
INSERT OR IGNORE INTO reviews (id, app_id, author_name, text, rating) 
VALUES 
('review_1', 'demo_1', 'Алексей', 'Отличный инструмент! Очень помогает в работе.', 5),
('review_2', 'demo_1', 'Мария', 'Хорошее приложение, но есть куда расти.', 4),
('review_3', 'demo_2', 'Иван', 'Лучший редактор кода для Android!', 5);