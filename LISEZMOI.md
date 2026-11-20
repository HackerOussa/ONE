# Installation
1. `mysql -u root -p < schema.sql` puis créez l'admin (instructions en bas de schema.sql)
2. `cp .env.example .env` et remplissez-le (SMTP, WhatsApp via https://www.callmebot.com/blog/free-api-whatsapp-messages/)
3. `npm install && npm start` puis ouvrez http://localhost:3000
Votre nom de marque : `SITE_NAME` dans .env et `CONFIG.brand` en haut de public/app.js.
