require('dotenv').config();
const express=require('express'),mysql=require('mysql2/promise'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),
nodemailer=require('nodemailer'),crypto=require('crypto'),cookie=require('cookie-parser'),rate=require('express-rate-limit');
const E=process.env,app=express();
const db=mysql.createPool({host:E.DB_HOST,user:E.DB_USER,password:E.DB_PASS,database:E.DB_NAME});
const mail=nodemailer.createTransport({host:E.SMTP_HOST,port:+E.SMTP_PORT||587,auth:{user:E.SMTP_USER,pass:E.SMTP_PASS}});
app.use(express.json(),cookie(),express.static('public'));
app.use('/api',rate({windowMs:6e4,max:60}));
const send=async(to,subject,text)=>{try{await mail.sendMail({from:E.SMTP_USER,to,subject,text})}catch(e){console.error('mail:',e.message)}};
const wa=async t=>{try{await fetch(`https://api.callmebot.com/whatsapp.php?phone=${E.ADMIN_WHATSAPP}&apikey=${E.CALLMEBOT_KEY}&text=${encodeURIComponent(t)}`)}catch(e){console.error('whatsapp:',e.message)}};
const w=f=>(q,s)=>f(q,s).catch(e=>{console.error(e);s.status(500).json({error:'Erreur serveur'})});
const login=(res,u)=>res.cookie('t',jwt.sign({id:u.id,role:u.role},E.JWT_SECRET,{expiresIn:'7d'}),{httpOnly:true,sameSite:'lax',secure:E.SITE_URL?.startsWith('https')});
const auth=roles=>w(async(q,s,n)=>{let p;try{p=jwt.verify(q.cookies.t,E.JWT_SECRET)}catch{return s.sendStatus(401)}
 const [[u]]=await db.query('SELECT id,name,email,role,plan,expires_at FROM users WHERE id=?',[p.id]);
 if(!u||(roles&&!roles.includes(u.role)))return s.sendStatus(403);
 if(u.role==='student'&&(!u.expires_at||new Date(u.expires_at)<new Date()))return s.status(403).json({error:'Accompagnement expiré'});
 q.u=u;n()});

// 1. Demande d'adhésion (6 ou 12 mois) -> notification email + WhatsApp à l'admin
app.post('/api/request',w(async(q,s)=>{
 const {name,email,phone,plan}=q.body;
 if(!name||!/^\S+@\S+\.\S+$/.test(email||'')||!phone||![6,12].includes(+plan))return s.status(400).json({error:'Champs invalides'});
 const [[dup]]=await db.query("SELECT id FROM requests WHERE email=? AND status IN('pending','approved')",[email]);
 if(dup)return s.status(409).json({error:'Une demande existe déjà pour cet email'});
 await db.query('INSERT INTO requests(name,email,phone,plan) VALUES(?,?,?,?)',[name,email,phone,+plan]);
 const t=`Nouvelle demande ${E.SITE_NAME}\n${name}\n${email}\n${phone}\nAccompagnement : ${plan} mois\nÀ valider : ${E.SITE_URL}/admin.html`;
 send(E.ADMIN_EMAIL,'Nouvelle demande d\'adhésion',t);wa(t);
 s.json({ok:true})}));

// 2. Admin : lister / approuver / refuser
app.get('/api/admin/requests',auth(['admin']),w(async(q,s)=>{
 const [r]=await db.query('SELECT id,name,email,phone,plan,status,created_at FROM requests ORDER BY id DESC');
 const [[c]]=await db.query("SELECT (SELECT COUNT(*) FROM users WHERE role='student') students,(SELECT COUNT(*) FROM requests WHERE status='pending') pending");
 s.json({requests:r,stats:c})}));
app.post('/api/admin/requests/:id/:action',auth(['admin']),w(async(q,s)=>{
 const [[r]]=await db.query('SELECT * FROM requests WHERE id=?',[q.params.id]);
 if(!r)return s.sendStatus(404);
 if(q.params.action==='approve'){const tk=crypto.randomBytes(20).toString('hex');
  await db.query("UPDATE requests SET status='approved',token=? WHERE id=?",[tk,r.id]);
  send(r.email,`Demande acceptée - ${E.SITE_NAME}`,`Bonjour ${r.name}, votre demande est acceptée. Créez votre compte : ${E.SITE_URL}/?activate=${tk}`);}
 else await db.query("UPDATE requests SET status='rejected' WHERE id=?",[r.id]);
 s.json({ok:true})}));
app.post('/api/admin/staff',auth(['admin']),w(async(q,s)=>{ // inviter admin ou mentor
 const {name,email,role}=q.body;if(!['admin','mentor'].includes(role))return s.sendStatus(400);
 const pw=crypto.randomBytes(5).toString('hex');
 await db.query('INSERT INTO users(name,email,pass,role) VALUES(?,?,?,?)',[name,email,bcrypt.hashSync(pw,10),role]);
 send(email,`Invitation ${role} - ${E.SITE_NAME}`,`Connexion : ${E.SITE_URL}/connexion.html\nEmail : ${email}\nMot de passe provisoire : ${pw}`);s.json({ok:true})}));
app.post('/api/admin/lessons',auth(['admin','mentor']),w(async(q,s)=>{
 const {course_idx,title,video_url,file_url}=q.body;
 await db.query('INSERT INTO lessons(course_idx,title,video_url,file_url) VALUES(?,?,?,?)',[course_idx,title,video_url||null,file_url||null]);s.json({ok:true})}));

// 3. Activation du compte après approbation
app.post('/api/activate',w(async(q,s)=>{
 const {token,password}=q.body;if(!token||(password||'').length<8)return s.status(400).json({error:'Mot de passe : 8 caractères minimum'});
 const [[r]]=await db.query("SELECT * FROM requests WHERE token=? AND status='approved'",[token]);
 if(!r)return s.status(400).json({error:'Lien invalide ou déjà utilisé'});
 const [x]=await db.query("INSERT INTO users(name,email,phone,pass,plan,expires_at) VALUES(?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? MONTH))",[r.name,r.email,r.phone,bcrypt.hashSync(password,10),r.plan,r.plan]);
 await db.query("UPDATE requests SET status='activated',token=NULL WHERE id=?",[r.id]);
 login(s,{id:x.insertId,role:'student'});s.json({ok:true})}));
app.post('/api/login',w(async(q,s)=>{
 const [[u]]=await db.query('SELECT * FROM users WHERE email=?',[q.body.email]);
 if(!u||!bcrypt.compareSync(q.body.password||'',u.pass))return s.status(401).json({error:'Email ou mot de passe incorrect'});
 login(s,u);s.json({role:u.role})}));
app.post('/api/logout',(q,s)=>s.clearCookie('t').json({ok:true}));
app.get('/api/me',auth(),(q,s)=>s.json(q.u));
app.get('/api/lessons',auth(),w(async(q,s)=>{const [r]=await db.query('SELECT * FROM lessons ORDER BY course_idx,id');s.json(r)}));
app.listen(E.PORT||3000,()=>console.log('http://localhost:'+(E.PORT||3000)));
