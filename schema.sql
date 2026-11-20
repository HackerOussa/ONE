CREATE DATABASE IF NOT EXISTS formation CHARACTER SET utf8mb4;
USE formation;
CREATE TABLE users(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120),email VARCHAR(160) UNIQUE,phone VARCHAR(30),
 pass VARCHAR(80),role ENUM('admin','mentor','student') DEFAULT 'student',plan TINYINT NULL,expires_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE requests(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(120),email VARCHAR(160),phone VARCHAR(30),plan TINYINT,
 status ENUM('pending','approved','rejected','activated') DEFAULT 'pending',token CHAR(40) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE lessons(id INT AUTO_INCREMENT PRIMARY KEY,course_idx INT,title VARCHAR(200),video_url VARCHAR(400),file_url VARCHAR(400),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
-- Créer l'admin : node -e "console.log(require('bcryptjs').hashSync('VOTRE_MOT_DE_PASSE',10))" puis :
-- INSERT INTO users(name,email,pass,role) VALUES('Admin','votre@email.com','<hash>','admin');
