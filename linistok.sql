
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);


CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    bio TEXT,
    role_id INT NOT NULL REFERENCES roles(id) DEFAULT 2,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_balance DECIMAL(12,2) DEFAULT 0.00
);


CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, followed_id)
);


CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL
);


CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    deadline DATE NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE service_stages (
    id SERIAL PRIMARY KEY,
    service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    deadline DATE NOT NULL,
    sort_order INT DEFAULT 0
);


CREATE TABLE works (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT works_status_check CHECK (status IN ('active', 'archived', 'blocked'))
);


CREATE TABLE work_images (
    id SERIAL PRIMARY KEY,
    work_id INT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0
);


CREATE TABLE complaint_reasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);


CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_id INT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    reason_id INT NOT NULL REFERENCES complaint_reasons(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT complaints_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);


CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE partnership_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE user_reviews (
    id SERIAL PRIMARY KEY,
    reviewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, reviewed_user_id)
);


CREATE TABLE service_reviews (
    id SERIAL PRIMARY KEY,
    reviewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, service_id)
);

CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    user1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id) 
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_drafts (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draft_text TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
);

CREATE TABLE blocked_users (
    id SERIAL PRIMARY KEY,
    blocker_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
);


CREATE INDEX idx_chats_user1 ON chats(user1_id);
CREATE INDEX idx_chats_user2 ON chats(user2_id);
CREATE INDEX idx_chats_users ON chats(user1_id, user2_id);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_chat_unread ON messages(chat_id, is_read);

CREATE INDEX idx_message_drafts_user ON message_drafts(user_id);
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);




CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_avg_rating ON users(avg_rating);

CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_category_id ON services(category_id);
CREATE INDEX idx_services_avg_rating ON services(avg_rating);

CREATE INDEX idx_service_stages_service_id ON service_stages(service_id);
CREATE INDEX idx_works_user_id ON works(user_id);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_complaints_sender_id ON complaints(sender_id);
CREATE INDEX idx_complaints_work_id ON complaints(work_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_subscriptions_follower_id ON subscriptions(follower_id);
CREATE INDEX idx_subscriptions_followed_id ON subscriptions(followed_id);
CREATE INDEX idx_user_reviews_reviewed_user ON user_reviews(reviewed_user_id);
CREATE INDEX idx_service_reviews_service ON service_reviews(service_id);



CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET 
        avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM user_reviews WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id)),
        total_reviews = (SELECT COUNT(*) FROM user_reviews WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id))
    WHERE id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_service_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE services 
    SET 
        avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM service_reviews WHERE service_id = COALESCE(NEW.service_id, OLD.service_id)),
        total_reviews = (SELECT COUNT(*) FROM service_reviews WHERE service_id = COALESCE(NEW.service_id, OLD.service_id))
    WHERE id = COALESCE(NEW.service_id, OLD.service_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_stats
AFTER INSERT OR UPDATE OR DELETE ON user_reviews
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER trigger_service_stats
AFTER INSERT OR UPDATE OR DELETE ON service_reviews
FOR EACH ROW
EXECUTE FUNCTION update_service_stats();

CREATE OR REPLACE FUNCTION create_account_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO accounts (user_id, total_balance)
    VALUES (NEW.id, 0.00);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_account
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_account_for_user();


INSERT INTO roles (name) VALUES ('admin'), ('user') ON CONFLICT (name) DO NOTHING;

INSERT INTO complaint_reasons (name) VALUES 
    ('Спам'),
    ('Сексуальный контент'),
    ('Членовредительство'),
    ('Ложная информация'),
	('Агрессивные действия'),
    ('Опасные товары'),
	('Преследование или критика'),
    ('Сцены насилия'),
	('Нарушение конфиденциальности'),
	('Интеллектуальная собственность')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, parent_id) VALUES
    ('Логотип и брендинг', NULL),
    ('Презентации и инфографика', NULL),
    ('Арт и иллюстрации', NULL),
	('Веб и мобильный дизайн', NULL),
    ('Маркетплейсы и соцсети', NULL),
	('Обработка и редактирование', NULL),
    ('Интерьер и экстерьер', NULL),
    ('Полиграфия', NULL),
    ('Наружная реклама', NULL),
    ('ИИ-генерация изображенийг', NULL),
	('Промышленный дизайн', NULL),
    
    ('Логотипы', 1),
    ('Фирменный стиль', 1),
    ('Визитки', 1),
    ('Брендирование и сувенирка', 1),
 
    
    ('Презентации', 2),
    ('Инфографика', 2),
    ('Карты и схемы', 2),

    
    ('Портрет, шарж, карикатура', 3),
    ('Иллюстрации и рисунки', 3),
    ('Дизайн игр', 3),
    ('Тату , принты ', 3),
    ('Стикеры', 3),
    ('NFT арт', 3),
    ('Готовые шаблоны и рисунки', 3),
    
    ('Веб-дизайн', 4),
    ('Мобильный дизайн', 4),
    ('Email-дизайн', 4),
    ('Баннеры и иконки', 4),
    ('Юзабилити-фудит', 4),
    
    ('Дизайн в соцсетях', 5),
    ('Дизайн для маркетплейсов', 5),
    
    ('Отрисовка в векторе', 6),
    ('Фотомонтаж и обработка', 6),

	('Интерьер домов и сооружений', 7),
    ('Ландшафтный дизайн', 7),
	('Дизайн мебели', 7),
	
	('Брошюра и буклет', 8),
    ('Листовки флаер', 8),
	('Плакат и афиша', 8),
	('Календарь и открытка', 8),
    ('Плакат и афиша', 8),
	('Каталог, меню и книга', 8),
	('Грамота и сертификат', 8),
	('Гайд и чек-лист', 8),

	('Билборды и стенды', 9),
	('Витрины и вывески', 9),

	('Нейрофотоссесия', 10),
	('ИИ-аватары и портреты', 10),
	('ИИ-иллюстрации и концепт-арт', 10),
	('ИИ-логотипы и инфографика', 10),

	('Электроника и устройства', 11),
	('Предметы и аксессуары', 11),
	('Упаковка и этикетка', 11);

