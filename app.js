const CONFIG={brand:'VOTRE MARQUE'};
const $=s=>document.querySelector(s),api=async(u,b)=>{const r=await fetch('/api'+u,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(d.error||'Accès refusé'),{status:r.status});return d};
document.querySelectorAll('.brand').forEach(e=>e.textContent=CONFIG.brand);
const esc=t=>t.replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const page=document.body.dataset.page;
if(page==='home'){
 fetch('courses.json').then(r=>r.json()).then(c=>{$('#grid').innerHTML=c.map((x,i)=>`<article class="course"><div class="cover" style="background:linear-gradient(135deg,hsl(${(i*47)%360} 55% 38%),hsl(${(i*47+50)%360} 60% 28%))">${esc(x[0][0])}</div>
 <div class="b"><h3>${esc(x[0])}</h3><div class="meta">${x[1]} h · ${x[2]} modules</div></div></article>`).join('')});
 document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{$('#plan').value=b.dataset.plan;$('#dlg').showModal()});
 $('#req').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  try{await api('/request',f);$('#m').className='msg';$('#m').textContent='Demande envoyée. Vous recevrez un email après validation.';e.target.reset()}catch(x){$('#m').className='msg err';$('#m').textContent=x.message}};
 const t=new URLSearchParams(location.search).get('activate');if(t){$('#act').showModal();
  $('#actf').onsubmit=async e=>{e.preventDefault();try{await api('/activate',{token:t,password:e.target.password.value});location='espace.html'}catch(x){$('#am').textContent=x.message}}}}
if(page==='login'){$('#lf').onsubmit=async e=>{e.preventDefault();try{const d=await api('/login',Object.fromEntries(new FormData(e.target)));location=d.role==='student'?'espace.html':'admin.html'}catch(x){$('#m').textContent=x.message}}}
if(page==='espace'){Promise.all([api('/me'),api('/lessons'),fetch('courses.json').then(r=>r.json())]).then(([u,l,c])=>{
 $('#hi').textContent=`Bonjour ${u.name}`;$('#exp').textContent=u.expires_at?`Accès jusqu'au ${new Date(u.expires_at).toLocaleDateString('fr-FR')}`:'';
 $('#list').innerHTML=c.map((x,i)=>{const ls=l.filter(y=>y.course_idx===i);return `<details class="course"><summary class="b"><b>${esc(x[0])}</b><div class="meta">${x[1]} h · ${x[2]} modules · ${ls.length} contenu(s)</div></summary><div class="b">${ls.map(y=>`<p>${esc(y.title)} ${y.video_url?`<a href="${esc(y.video_url)}" target="_blank" rel="noopener">Vidéo</a>`:''} ${y.file_url?`<a href="${esc(y.file_url)}" download>Document</a>`:''}</p>`).join('')||'<p class="meta">Contenu bientôt disponible.</p>'}</div></details>`}).join('')
}).catch(x=>x.status===401?location='connexion.html':$('#hi').textContent=x.message)}
if(page==='admin'){const load=()=>api('/admin/requests').then(d=>{$('#st').textContent=`${d.stats.pending} en attente · ${d.stats.students} étudiants`;
 $('#rows').innerHTML=d.requests.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.email)}<br>${esc(r.phone)}</td><td>${r.plan} mois</td><td><span class="tag">${r.status}</span></td><td>${r.status==='pending'?`<button class="btn" data-a="approve" data-i="${r.id}">Approuver</button> <button class="btn alt" data-a="reject" data-i="${r.id}">Refuser</button>`:''}</td></tr>`).join('')}).catch(()=>location='connexion.html');
 $('#rows').onclick=async e=>{const b=e.target.closest('button');if(b){await api(`/admin/requests/${b.dataset.i}/${b.dataset.a}`,{});load()}};load();
 $('#sf').onsubmit=async e=>{e.preventDefault();try{await api('/admin/staff',Object.fromEntries(new FormData(e.target)));$('#sm').textContent='Invitation envoyée';e.target.reset()}catch(x){$('#sm').textContent=x.message}};
 fetch('courses.json').then(r=>r.json()).then(c=>$('#ci').innerHTML=c.map((x,i)=>`<option value="${i}">${esc(x[0])}</option>`).join(''));
 $('#lf').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.course_idx=+f.course_idx;try{await api('/admin/lessons',f);$('#lm').textContent='Contenu publié';e.target.reset()}catch(x){$('#lm').textContent=x.message}}}
