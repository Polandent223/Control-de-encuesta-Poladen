const DB='poladent_feedback_enterprise_v4_firebase_real';
// FIREBASE CLOUD - POLADENT
const firebaseConfig = {
  apiKey: "AIzaSyA75nG58EjY324JB6uXraSl56MjJJ2pA4E",
  authDomain: "control-de-encuesta-poladent.firebaseapp.com",
  databaseURL: "https://control-de-encuesta-poladent-default-rtdb.firebaseio.com",
  projectId: "control-de-encuesta-poladent",
  storageBucket: "control-de-encuesta-poladent.firebasestorage.app",
  messagingSenderId: "626095482746",
  appId: "1:626095482746:web:a70c2c85ab92b826da58c3"
};
let firebaseReady=false, cloudReady=false, dbRef=null, savingCloud=false;
function firebaseInit(){
  try{
    if(typeof firebase==='undefined') return console.warn('Firebase SDK no cargado, usando modo local.');
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    dbRef=firebase.database().ref('poladentFeedbackEnterpriseV4');
    firebaseReady=true;
    dbRef.on('value',snap=>{
      const cloud=snap.val();
      if(cloud){
        if(savingCloud) return;
        data=normalizeData(cloud);
        localStorage.setItem(DB,JSON.stringify(data));
        cloudReady=true;
        if($('#content')) renderAdmin();
        if($('#clientContent')) renderStep();
      }else{
        cloudReady=true;
        save();
      }
    },err=>{console.warn('Firebase error:',err); cloudReady=false;});
  }catch(e){console.warn('Firebase init error',e)}
}
function saveCloud(){
  localStorage.setItem(DB,JSON.stringify(data));
  if(firebaseReady && dbRef){
    savingCloud=true;
    dbRef.set(data).then(()=>{savingCloud=false;}).catch(e=>{savingCloud=false; console.warn('No se pudo guardar en Firebase',e); alert('Aviso: no se pudo guardar en Firebase. Revisa reglas/conexión.');});
  }
}

async function uploadPhotoFile(input,folder){
  // Versión Firebase sin Storage: comprime la foto y la guarda como Base64 en Realtime Database.
  const f=input?.files?.[0];
  if(!f) return null;
  return await imageFileToBase64(f,520,0.78);
}
function imageFileToBase64(file,maxSize=360,quality=0.72){
  return new Promise((resolve,reject)=>{
    if(!file) return resolve(null);
    if(!file.type || !file.type.startsWith('image/')) return reject(new Error('El archivo seleccionado no es una imagen.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('No se pudo leer la foto.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('La foto no se pudo cargar. Prueba con otra imagen.'));
      img.onload=()=>{
        try{
          // Recorte cuadrado centrado para que todas las fotos queden iguales.
          const side=Math.min(img.width,img.height);
          const sx=Math.max(0,Math.round((img.width-side)/2));
          const sy=Math.max(0,Math.round((img.height-side)/2));
          const canvas=document.createElement('canvas');
          canvas.width=maxSize; canvas.height=maxSize;
          const ctx=canvas.getContext('2d');
          ctx.fillStyle='#ffffff';
          ctx.fillRect(0,0,maxSize,maxSize);
          ctx.imageSmoothingEnabled=true;
          ctx.imageSmoothingQuality='high';
          ctx.drawImage(img,sx,sy,side,side,0,0,maxSize,maxSize);
          let out=canvas.toDataURL('image/jpeg',quality);
          // Si aún queda pesada, bajamos un poco más para Firebase Realtime Database.
          if(out.length>240000){ out=canvas.toDataURL('image/jpeg',0.58); }
          if(out.length>320000){ reject(new Error('La foto quedó muy pesada. Usa una imagen más liviana.')); return; }
          resolve(out);
        }catch(err){ reject(err); }
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

let pendingEmpPhoto=null;
async function prepareEmployeePhoto(input){
  const f=input?.files?.[0];
  if(!f){ pendingEmpPhoto=null; return null; }
  const preview=$('#empPreview');
  const status=$('#empPhotoStatus');
  try{
    if(status) status.textContent='Procesando foto...';
    const photo=await imageFileToBase64(f,360,0.72);
    pendingEmpPhoto=photo;
    if(preview) preview.src=photo;
    if(status) status.textContent='Foto lista para guardar ✓';
    return photo;
  }catch(e){
    pendingEmpPhoto=null;
    if(status) status.textContent=e.message||'Error con la foto';
    alert(e.message||'No se pudo procesar la foto.');
    input.value='';
    return null;
  }
}


const logo='logo-poladent.png';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>new Date(d).toLocaleString('es-VE',{dateStyle:'short',timeStyle:'short'});
const emptyPhoto='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="%23dbeafe"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="42" fill="%23005ecb">👤</text></svg>';
let data=normalizeData(load());
function normalizeData(d){
  const seed=defaultSeed(false);
  d=d && typeof d==='object'?d:{};
  d.pin=d.pin||seed.pin||'2233';
  d.branches=Array.isArray(d.branches)&&d.branches.length?d.branches:seed.branches;
  d.employees=Array.isArray(d.employees)?d.employees:seed.employees;
  d.questions=Array.isArray(d.questions)?d.questions:seed.questions;
  d.surveys=Array.isArray(d.surveys)?d.surveys:[];
  d.settings=d.settings&&typeof d.settings==='object'?d.settings:{};
  d.settings.reportQuestion={text:(d.settings.reportQuestion&&d.settings.reportQuestion.text)||'¿Alguna otra persona te atendió de forma inadecuada o te hizo sentir incómodo/a?',active:d.settings.reportQuestion?d.settings.reportQuestion.active!==false:true};
  d.branches=d.branches.map(b=>({id:b.id||uid(),name:b.name||'Sede',active:b.active!==false}));
  const defaultBranch=d.branches[0]?.id||'';
  d.employees=d.employees.map(e=>({id:e.id||uid(),name:e.name||'Empleado',role:e.role||'',branchId:e.branchId||defaultBranch,active:e.active!==false,photo:e.photo||emptyPhoto}));
  d.questions=d.questions.map((q,i)=>({id:q.id||uid(),text:q.text||'Pregunta',type:q.type||'text',options:Array.isArray(q.options)?q.options:[],required:q.required!==false,active:q.active!==false,order:Number(q.order)||i+1}));
  d.surveys=d.surveys.map(s=>({...s,id:s.id||uid(),date:s.date||new Date().toISOString(),branchId:s.branchId||d.employees.find(e=>e.id===s.employeeId)?.branchId||defaultBranch,answers:s.answers||{},badOther:s.badOther||'no',badEmployeeId:s.badEmployeeId||'',badComment:s.badComment||'',followStatus:s.followStatus||'Pendiente',followNote:s.followNote||''}));
  return d;
}
function defaultSeed(saveIt=true){ const valId=uid(), marId=uid(); const seed={pin:'2233',branches:[{id:valId,name:'Valencia',active:true},{id:marId,name:'Maracay',active:true}],employees:[{id:uid(),name:'Yexi',role:'Ventas al mayor',branchId:valId,active:true,photo:emptyPhoto},{id:uid(),name:'Tibisay',role:'Área de ventas',branchId:valId,active:true,photo:emptyPhoto},{id:uid(),name:'Génesis',role:'Área de ventas',branchId:valId,active:true,photo:emptyPhoto}],questions:[{id:uid(),text:'¿Cómo califica la atención recibida?',type:'rating',required:true,active:true,order:1},{id:uid(),text:'¿Fue atendido con amabilidad y respeto?',type:'yesno',required:true,active:true,order:2},{id:uid(),text:'¿Le explicaron bien el producto o servicio?',type:'yesno',required:true,active:true,order:3},{id:uid(),text:'¿Recomendaría Poladent Casa Dental?',type:'yesno',required:true,active:true,order:4},{id:uid(),text:'Comentario adicional',type:'text',required:false,active:true,order:5}],settings:{reportQuestion:{text:'¿Alguna otra persona te atendió de forma inadecuada o te hizo sentir incómodo/a?',active:true}},surveys:[]}; if(saveIt) localStorage.setItem(DB,JSON.stringify(seed)); return seed}
function load(){try{let d=localStorage.getItem(DB); if(d) return JSON.parse(d)}catch(e){} return defaultSeed(true)}
function save(){saveCloud()}
function fileToData(input,cb){const f=input.files[0]; if(!f) return; const r=new FileReader(); r.onload=e=>cb(e.target.result); r.readAsDataURL(f)}
function avgFor(empId){const s=data.surveys.filter(x=>x.employeeId===empId); const nums=s.map(x=>Number(x.rating||0)).filter(Boolean); return nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length):0}
function ratingStars(n){n=Math.round(Number(n)||0);return '★'.repeat(n)+'☆'.repeat(5-n)}

// ADMIN
let current='dashboard', editEmp=null, editQ=null, editBranch=null, editChannel=null;

function getDeviceId(){let id=localStorage.getItem('poladent_device_id'); if(!id){id='dev_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10); localStorage.setItem('poladent_device_id',id)} return id}
async function getClientMeta(){let ip='No disponible'; try{const r=await fetch('https://api64.ipify.org?format=json',{cache:'no-store'}); const j=await r.json(); ip=j.ip||ip}catch(e){} return {ip,deviceId:getDeviceId(),userAgent:navigator.userAgent||'',platform:navigator.platform||'',language:navigator.language||'',screen:`${screen.width}x${screen.height}`}}
function todayKey(d){return (d||new Date().toISOString()).slice(0,10)}
function abuseCount(s){if(!s) return 0; const day=todayKey(s.date); return data.surveys.filter(x=>x.id!==s.id && x.date && todayKey(x.date)===day && ((s.deviceId&&x.deviceId===s.deviceId)||(s.ip&&s.ip!=='No disponible'&&x.ip===s.ip)||(s.clientPhone&&x.clientPhone===s.clientPhone))).length+1}
function abuseList(){return data.surveys.map(s=>({...s,_abuse:abuseCount(s)})).filter(s=>s._abuse>=3)}

function adminInit(){if(!$('#adminApp')) return; $('#loginLogo').src=logo; $('#sideLogo').src=logo; $('#loginBtn').onclick=()=>{if($('#pin').value===data.pin){$('#login').classList.add('hidden');$('#adminApp').classList.remove('hidden');renderAdmin()}else alert('Clave incorrecta')}; $$('.navBtn').forEach(b=>b.onclick=()=>{current=b.dataset.view; $$('.navBtn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderAdmin()}); $('#logoutBtn').onclick=()=>location.reload(); $('#logoAdmin').src=logo; renderAdmin()}
function renderAdmin(){if(!$('#content'))return; data=normalizeData(data); const titles={dashboard:['Dashboard','Sistema de Encuestas y Calidad de Atención'],branches:['Sedes','Crear y administrar sucursales'],employees:['Empleados','Agregar, editar fotos, sede y estado'],questions:['Preguntas','Encuesta editable sin tocar código'],history:['Historial','Filtros por empleados, fechas y clientes'],settings:['Configuración','Seguridad, respaldo e importación']}; $('#pageTitle').textContent=titles[current][0]; $('#pageSub').textContent=titles[current][1]; try{$('#content').innerHTML={dashboard:dash(),branches:branches(),employees:employees(),questions:questions(),history:history(),settings:settings()}[current]||dash(); bindAdmin()}catch(e){console.error(e); $('#content').innerHTML='<div class="card section"><h2>Sistema cargado</h2><p>Se detectó un dato viejo o incompleto. Presiona el botón para reparar la base local y continuar.</p><button class="btn" id="repairBtn">Reparar datos</button></div>'; setTimeout(()=>{const b=$('#repairBtn'); if(b)b.onclick=()=>{data=normalizeData(data); save(); renderAdmin()}},50)}}
function dash(){const total=data.surveys.length, ratings=data.surveys.map(s=>+s.rating||0).filter(Boolean), avg=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(2):'0.00', good=data.surveys.filter(s=>+s.rating>=4).length, bad=data.surveys.filter(s=>+s.rating<=2 || s.badOther==='si').length; const days=[...Array(7)].map((_,i)=>{let d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10)}); const max=Math.max(1,...days.map(d=>data.surveys.filter(s=>(s.date||'').slice(0,10)===d).length)); return `<div class="grid4"><div class="card stat"><div class="ico">👥</div><div><h3>ENCUESTAS TOTALES</h3><strong>${total}</strong><br><small>Historial acumulado</small></div></div><div class="card stat"><div class="ico" style="background:#16a34a">⭐</div><div><h3>PROMEDIO GENERAL</h3><strong>${avg}</strong><br><small>sobre 5</small></div></div><div class="card stat"><div class="ico" style="background:#6d28d9">😊</div><div><h3>CLIENTES SATISFECHOS</h3><strong>${total?Math.round(good*100/total):0}%</strong><br><small>4 o 5 estrellas</small></div></div><div class="card stat"><div class="ico" style="background:#ef4444">⚠️</div><div><h3>REPORTES NEGATIVOS</h3><strong>${bad}</strong><br><small>Revisar atención</small></div></div></div><div class="card section"><div class="sectionHead"><h2>Resumen por sede</h2></div><div class="branchSummary">${data.branches.map(b=>{const ss=data.surveys.filter(x=>x.branchId===b.id);const rr=ss.map(x=>+x.rating||0).filter(Boolean);const av=rr.length?(rr.reduce((a,c)=>a+c,0)/rr.length).toFixed(2):'0.00';return `<div class="branchStat"><b>${b.name}</b><strong>${av} ⭐</strong><small>${ss.length} encuestas</small></div>`}).join('')}</div></div><div class="layout2"><div class="card section"><div class="sectionHead"><h2>Promedio por empleado</h2><button class="btn small secondary" data-go="history">Ver todos</button></div>${data.employees.map(e=>`<div class="employeeLine"><img class="photo" src="${e.photo||emptyPhoto}"><b>${e.name}</b><div class="bar"><span style="width:${avgFor(e.id)*20}%"></span></div><b>${avgFor(e.id).toFixed(2)}</b></div>`).join('')}</div><div class="card section"><div class="sectionHead"><h2>Encuestas por día</h2></div><div class="chart">${days.map(d=>{let c=data.surveys.filter(s=>(s.date||'').slice(0,10)===d).length;return `<div style="height:${20+c/max*190}px"><span>${c}</span></div>`}).join('')}</div></div></div><div class="layout2"><div class="card section"><div class="sectionHead"><h2>Encuestas recientes</h2><button class="btn small secondary" data-go="history">Ver historial</button></div>${recentTable(data.surveys.slice(-7).reverse())}</div><div class="card section"><div class="sectionHead"><h2>Alertas de atención</h2></div>${[...data.surveys.filter(s=>+s.rating<=2||s.badOther==='si').map(s=>`<p><span class="pill red">Atención</span> ${s.clientName||'Cliente'} reportó sobre <b>${empName(s.employeeId)}</b> · ${fmt(s.date)}</p>`),...abuseList().slice(-6).reverse().map(s=>`<p><span class="pill red">Abuso</span> ${s.clientName||'Cliente'} / ${s.clientPhone||'sin teléfono'} registra <b>${abuseCount(s)}</b> encuestas hoy desde el mismo teléfono/IP.</p>`)].slice(-8).join('')||'<p class="sub">Sin alertas negativas ni abuso detectado.</p>'}</div></div>`}
function branchName(id){return data.branches.find(b=>b.id===id)?.name||'Sede no asignada'}
function empName(id){return data.employees.find(e=>e.id===id)?.name||'Empleado'}
function empPhoto(id){return data.employees.find(e=>e.id===id)?.photo||emptyPhoto}
function answerSummary(s){
  const qs=data.questions||[];
  return qs.filter(q=>s.answers&&s.answers[q.id]!==undefined&&s.answers[q.id]!=='' ).sort((a,b)=>a.order-b.order).map(q=>`<div class="answerLine"><b>${q.text}</b><br><span>${s.answers[q.id]}</span></div>`).join('')||'<span class="sub">Sin respuestas detalladas</span>';
}
function reportSummary(s){
  if(s.badOther!=='si') return '<span class="pill green">Sin reporte adicional</span>';
  return `<div class="reportBox"><span class="pill red">Reporte interno</span><br><b>Persona seleccionada:</b> <span class="miniEmp"><img src="${empPhoto(s.badEmployeeId)}"> ${empName(s.badEmployeeId)}</span><br><b>Comentario:</b> ${s.badComment||'-'}<br><b>Seguimiento:</b> <span class="pill ${s.followStatus==='Solucionado'?'green':s.followStatus==='En revisión'?'yellow':'red'}">${s.followStatus||'Pendiente'}</span>${s.followNote?`<br><small>${s.followNote}</small>`:''}</div>`;
}
function recentTable(rows){return `<div class="tableWrap"><table class="table"><tr><th>Fecha</th><th>Sede</th><th>Cliente</th><th>Atendido por</th><th>Nota</th><th>Respuestas / Comentarios</th><th>Reporte y control</th></tr>${rows.map(s=>`<tr><td>${fmt(s.date)}</td><td><span class="pill blue">${branchName(s.branchId)}</span></td><td>${s.clientName||'-'}<br><small>${s.clientPhone||''}<br>${s.city||''}</small></td><td><span class="miniEmp"><img src="${empPhoto(s.employeeId)}"> ${empName(s.employeeId)}</span></td><td><span class="stars">${ratingStars(s.rating)}</span></td><td>${s.comment?`<b>Comentario:</b> ${s.comment}<hr>`:''}${answerSummary(s)}</td><td>${reportSummary(s)}<br><small><b>IP:</b> ${s.ip||'-'}<br><b>Disp:</b> ${(s.deviceId||'-').slice(0,18)}<br>${abuseCount(s)>=3?'<span class="pill red">Posible abuso '+abuseCount(s)+' hoy</span>':'<span class="pill green">Normal</span>'}</small><div class="actions" style="margin-top:8px"><button class="btn small secondary" data-follow="${s.id}">Seguimiento</button></div></td></tr>`).join('')}</table></div>`}
function employees(){
  const preview=editEmp?.photo||emptyPhoto;
  return `<div class="adminGrid"><div class="card section"><h2>${editEmp?'Editar':'Agregar'} empleado</h2>
  <div class="photoBox"><img id="empPreview" src="${preview}" class="empPreview"><div><b>Foto del empleado</b><p>Se guarda comprimida en Firebase Realtime Database, sin Storage.</p></div></div>
  <div class="field"><label>Nombre</label><input id="empName" value="${editEmp?.name||''}" placeholder="Nombre del empleado"></div>
  <div class="field"><label>Cargo</label><input id="empRole" value="${editEmp?.role||''}" placeholder="Área de ventas, caja, delivery..."></div><div class="field"><label>Sede</label><select id="empBranch">${data.branches.filter(b=>b.active||b.id===editEmp?.branchId).map(b=>`<option value="${b.id}" ${editEmp?.branchId===b.id?'selected':''}>${b.name}</option>`).join('')}</select></div>
  <div class="field"><label>Foto</label><input id="empPhoto" type="file" accept="image/*"><small id="empPhotoStatus">Puedes tomar foto o elegir de la galería.</small></div>
  <div class="field"><label>Estado</label><select id="empActive"><option value="true">Activo</option><option value="false" ${editEmp&& !editEmp.active?'selected':''}>Inactivo</option></select></div>
  <button class="btn" id="saveEmp">Guardar empleado</button> ${editEmp?'<button class="btn secondary" id="cancelEmp">Cancelar</button>':''}</div>
  <div class="employeeCards">${data.employees.map(e=>`<div class="card empCard"><div class="empTop"><img src="${e.photo||emptyPhoto}"><div><h3>${e.name}</h3><p>${e.role||''}</p><span class="pill blue">${branchName(e.branchId)}</span> <span class="pill ${e.active?'green':'red'}">${e.active?'Activo':'Inactivo'}</span></div></div><hr style="border:0;border-top:1px solid var(--line)"><p><b>Promedio:</b> ${avgFor(e.id).toFixed(2)} ⭐</p><p><b>Encuestas:</b> ${data.surveys.filter(s=>s.employeeId===e.id).length}</p><div class="actions"><button class="btn small" data-edit-emp="${e.id}">Editar</button><button class="btn small secondary" data-toggle-emp="${e.id}">${e.active?'Inactivar':'Activar'}</button><button class="btn small danger" data-del-emp="${e.id}">Eliminar</button></div></div>`).join('')}</div></div>`}

function branches(){return `<div class="adminGrid"><div class="card section"><h2>${editBranch?'Editar':'Nueva'} sede</h2><div class="field"><label>Nombre de la sede</label><input id="branchNameInput" value="${editBranch?.name||''}" placeholder="Ej: Valencia"></div><div class="field"><label>Estado</label><select id="branchActive"><option value="true">Activa</option><option value="false" ${editBranch&&!editBranch.active?'selected':''}>Inactiva</option></select></div><button class="btn" id="saveBranch">Guardar sede</button> ${editBranch?'<button class="btn secondary" id="cancelBranch">Cancelar</button>':''}</div><div class="employeeCards">${data.branches.map(b=>`<div class="card empCard"><h3>🏢 ${b.name}</h3><span class="pill ${b.active?'green':'red'}">${b.active?'Activa':'Inactiva'}</span><p><b>Empleados:</b> ${data.employees.filter(e=>e.branchId===b.id).length}</p><p><b>Encuestas:</b> ${data.surveys.filter(s=>s.branchId===b.id).length}</p><div class="actions"><button class="btn small" data-edit-branch="${b.id}">Editar</button><button class="btn small secondary" data-toggle-branch="${b.id}">${b.active?'Inactivar':'Activar'}</button><button class="btn small danger" data-del-branch="${b.id}">Eliminar</button></div></div>`).join('')}</div></div>`}

function questions(){return `<div class="adminGrid"><div class="card section"><h2>${editQ?'Editar':'Nueva'} pregunta</h2><div class="field"><label>Pregunta</label><input id="qText" value="${editQ?.text||''}"></div><div class="field"><label>Tipo de respuesta</label><select id="qType"><option value="rating">Estrellas 1 a 5</option><option value="yesno">Sí / No</option><option value="text">Texto</option><option value="select">Opciones</option></select></div><div class="field"><label>Opciones si aplica, separadas por coma</label><input id="qOptions" value="${(editQ?.options||[]).join(', ')}"></div><div class="field"><label>Orden</label><input id="qOrder" type="number" value="${editQ?.order||data.questions.length+1}"></div><div class="field"><label>Obligatoria</label><select id="qReq"><option value="true">Sí</option><option value="false" ${editQ&&!editQ.required?'selected':''}>No</option></select></div><button class="btn" id="saveQ">Guardar pregunta</button> ${editQ?'<button class="btn secondary" id="cancelQ">Cancelar</button>':''}<hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><h2>Pregunta de reporte interno</h2><p class="sub">Esta es la pregunta especial que muestra fotos para elegir si otra persona atendió mal.</p><div class="field"><label>Texto</label><textarea id="reportQText">${data.settings.reportQuestion.text}</textarea></div><div class="field"><label>Estado</label><select id="reportQActive"><option value="true">Activa</option><option value="false" ${data.settings.reportQuestion.active?'':'selected'}>Inactiva</option></select></div><button class="btn secondary" id="saveReportQ">Guardar reporte interno</button></div><div class="card section"><h2>Preguntas activas y configurables</h2><p class="sub">Puedes moverlas con subir/bajar, editarlas, desactivarlas o eliminarlas.</p>${data.questions.sort((a,b)=>a.order-b.order).map((q,i,arr)=>`<div class="questionItem"><b>${q.order}. ${q.text}</b><p>Tipo: ${q.type} · ${q.required?'Obligatoria':'Opcional'} · ${q.active?'Activa':'Inactiva'}</p><div class="actions"><button class="btn small secondary" data-up-q="${q.id}" ${i===0?'disabled':''}>⬆️ Subir</button><button class="btn small secondary" data-down-q="${q.id}" ${i===arr.length-1?'disabled':''}>⬇️ Bajar</button><button class="btn small" data-edit-q="${q.id}">Editar</button><button class="btn small secondary" data-toggle-q="${q.id}">${q.active?'Desactivar':'Activar'}</button><button class="btn small danger" data-del-q="${q.id}">Eliminar</button></div></div>`).join('')}</div></div>`}
function history(){return `<div class="card section"><div class="sectionHead"><h2>Historial de encuestas</h2><div class="actions"><button class="btn small" id="exportCsv">Exportar Excel/CSV</button><button class="btn small secondary" id="clearFilters">Limpiar</button></div></div><div class="filters"><div class="field"><label>Sede</label><select id="fBranch"><option value="">Todas</option>${data.branches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></div><div class="field"><label>Empleado</label><select id="fEmp"><option value="">Todos</option>${data.employees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select></div><div class="field"><label>Desde</label><input type="date" id="fFrom"></div><div class="field"><label>Hasta</label><input type="date" id="fTo"></div><div class="field"><label>Tipo</label><select id="fType"><option value="">Todas</option><option value="good">Buenas 4-5</option><option value="regular">Regular 3</option><option value="bad">Malas 1-2/Quejas</option><option value="abuse">Posible abuso</option></select></div><button class="btn" id="applyFilter">Filtrar</button></div><div id="histOut" style="margin-top:14px"></div></div>`}
function settings(){return `<div class="adminGrid"><div class="card section"><h2>Configuración</h2><div class="field"><label>Cambiar clave administrador</label><input id="newPin" placeholder="Nueva clave"></div><button class="btn" id="savePin">Guardar clave</button><hr style="border:0;border-top:1px solid var(--line);margin:20px 0"><button class="btn secondary" id="backup">Descargar respaldo JSON</button><div class="field" style="margin-top:12px"><label>Restaurar respaldo JSON</label><input type="file" id="restore" accept="application/json"></div><button class="btn danger" id="wipe">Borrar encuestas de prueba</button><button class="btn secondary" id="resetBase" style="margin-top:10px">Reiniciar base inicial</button></div><div class="card section"><h2>Logo Poladent</h2><img src="${logo}" style="max-width:240px;width:100%"><p>El logo ya está integrado en el panel administrador y encuesta del cliente.</p><p><b>Modo nube:</b> conectado a Firebase Realtime Database sin usar Storage. Las fotos de empleados se guardan comprimidas en Base64.</p></div></div>`}
let histRows=[];
function renderHist(){let rows=[...data.surveys]; const branch=$('#fBranch')?.value, emp=$('#fEmp')?.value, from=$('#fFrom')?.value, to=$('#fTo')?.value, type=$('#fType')?.value; if(branch) rows=rows.filter(s=>s.branchId===branch); if(emp) rows=rows.filter(s=>s.employeeId===emp); if(from) rows=rows.filter(s=>(s.date||'').slice(0,10)>=from); if(to) rows=rows.filter(s=>(s.date||'').slice(0,10)<=to); if(type==='good') rows=rows.filter(s=>+s.rating>=4); if(type==='regular') rows=rows.filter(s=>+s.rating===3); if(type==='bad') rows=rows.filter(s=>+s.rating<=2||s.badOther==='si'); if(type==='abuse') rows=rows.filter(s=>abuseCount(s)>=3); histRows=rows.reverse(); $('#histOut').innerHTML=recentTable(histRows); bindFollowButtons()}
function bindFollowButtons(){$$('[data-follow]').forEach(b=>b.onclick=()=>{const s=data.surveys.find(x=>x.id===b.dataset.follow); if(!s)return; const status=prompt('Estado del reporte: Pendiente / En revisión / Solucionado',s.followStatus||'Pendiente'); if(status===null)return; const note=prompt('Acción tomada o nota interna',s.followNote||''); s.followStatus=status||'Pendiente'; s.followNote=note||''; save(); renderHist()})}
function bindAdmin(){ $$('[data-go]').forEach(b=>b.onclick=()=>{current=b.dataset.go; renderAdmin()}); if(current==='channels'){
    $('#saveChannel').onclick=()=>{const name=($('#channelName').value||'').trim(); if(!name)return alert('Escribe el nombre del canal'); const icon=($('#channelIcon').value||'💬').trim(); const obj={id:editChannel?.id||uid(),name,icon,active:$('#channelActive').value==='true'}; if(editChannel) Object.assign(editChannel,obj); else data.channels.push(obj); editChannel=null; save(); renderAdmin()};
    $('#cancelChannel')&&($('#cancelChannel').onclick=()=>{editChannel=null;renderAdmin()});
    $$('[data-edit-channel]').forEach(b=>b.onclick=()=>{editChannel=data.channels.find(x=>x.id===b.dataset.editChannel);renderAdmin()});
    $$('[data-toggle-channel]').forEach(b=>b.onclick=()=>{const x=data.channels.find(y=>y.id===b.dataset.toggleChannel);x.active=!x.active;save();renderAdmin()});
    $$('[data-del-channel]').forEach(b=>b.onclick=()=>{const id=b.dataset.delChannel;if(data.employees.some(e=>(e.channelIds||[]).includes(id))||data.surveys.some(s=>s.channelId===id))return alert('No puedes eliminar un canal en uso. Inactívalo.');if(confirm('¿Eliminar canal?')){data.channels=data.channels.filter(x=>x.id!==id);save();renderAdmin()}})
  } if(current==='branches'){ $('#saveBranch').onclick=()=>{const name=$('#branchNameInput').value.trim();if(!name)return alert('Escribe el nombre de la sede');const obj={id:editBranch?.id||uid(),name,active:$('#branchActive').value==='true'};if(editBranch){Object.assign(editBranch,obj)}else data.branches.push(obj);editBranch=null;save();renderAdmin()}; $('#cancelBranch')&&($('#cancelBranch').onclick=()=>{editBranch=null;renderAdmin()}); $$('[data-edit-branch]').forEach(b=>b.onclick=()=>{editBranch=data.branches.find(x=>x.id===b.dataset.editBranch);renderAdmin()}); $$('[data-toggle-branch]').forEach(b=>b.onclick=()=>{const x=data.branches.find(y=>y.id===b.dataset.toggleBranch);x.active=!x.active;save();renderAdmin()}); $$('[data-del-branch]').forEach(b=>b.onclick=()=>{const id=b.dataset.delBranch;if(data.employees.some(e=>e.branchId===id)||data.surveys.some(s=>s.branchId===id))return alert('No puedes eliminar una sede con empleados o encuestas. Inactívala.');if(confirm('¿Eliminar sede?')){data.branches=data.branches.filter(x=>x.id!==id);save();renderAdmin()}})} if(current==='employees'){
    pendingEmpPhoto=null;
    const photoInput=$('#empPhoto');
    if(photoInput) photoInput.onchange=()=>prepareEmployeePhoto(photoInput);
    $('#saveEmp').onclick=async()=>{
      const btn=$('#saveEmp');
      try{
        btn.disabled=true; btn.textContent='Guardando...';
        if(photoInput && photoInput.files && photoInput.files[0] && !pendingEmpPhoto){
          await prepareEmployeePhoto(photoInput);
        }
        const photo=pendingEmpPhoto || (editEmp?editEmp.photo:emptyPhoto);
        const obj={
          name:($('#empName').value||'Empleado').trim(),
          role:($('#empRole').value||'').trim(),
          branchId:$('#empBranch').value||data.branches[0]?.id||'',
          channelIds:$$('[name="empChannel"]:checked').map(x=>x.value),
          active:$('#empActive').value==='true',
          photo:photo||emptyPhoto,
          updatedAt:new Date().toISOString()
        };
        if(editEmp){ Object.assign(editEmp,obj); }
        else{ data.employees.push({id:uid(),createdAt:new Date().toISOString(),...obj}); }
        editEmp=null; pendingEmpPhoto=null;
        save();
        alert('Empleado guardado correctamente.');
        renderAdmin();
      }catch(e){
        alert('No se pudo guardar el empleado: '+(e.message||e));
      }finally{
        if(btn){btn.disabled=false; btn.textContent='Guardar empleado';}
      }
    };
    $('#cancelEmp')&&($('#cancelEmp').onclick=()=>{editEmp=null;pendingEmpPhoto=null;renderAdmin()});
    $$('[data-edit-emp]').forEach(b=>b.onclick=()=>{editEmp=data.employees.find(e=>e.id===b.dataset.editEmp);pendingEmpPhoto=null;renderAdmin()});
    $$('[data-toggle-emp]').forEach(b=>b.onclick=()=>{let e=data.employees.find(e=>e.id===b.dataset.toggleEmp);e.active=!e.active;e.updatedAt=new Date().toISOString();save();renderAdmin()});
    $$('[data-del-emp]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar empleado?')){data.employees=data.employees.filter(e=>e.id!==b.dataset.delEmp);save();renderAdmin()}})
  } if(current==='links'){ bindLinksAdmin(); } if(current==='questions'){ if(editQ) $('#qType').value=editQ.type; $('#saveQ').onclick=()=>{let obj={text:$('#qText').value,type:$('#qType').value,options:$('#qOptions').value.split(',').map(x=>x.trim()).filter(Boolean),order:+$('#qOrder').value||1,required:$('#qReq').value==='true',active:true}; if(editQ) Object.assign(editQ,obj); else data.questions.push({id:uid(),...obj}); data.questions.sort((a,b)=>a.order-b.order).forEach((q,i)=>q.order=i+1); editQ=null;save();renderAdmin()}; $('#saveReportQ').onclick=()=>{data.settings.reportQuestion={text:$('#reportQText').value||data.settings.reportQuestion.text,active:$('#reportQActive').value==='true'};save();alert('Pregunta de reporte interno actualizada');renderAdmin()}; $('#cancelQ')&&($('#cancelQ').onclick=()=>{editQ=null;renderAdmin()}); $$('[data-edit-q]').forEach(b=>b.onclick=()=>{editQ=data.questions.find(q=>q.id===b.dataset.editQ);renderAdmin()}); $$('[data-toggle-q]').forEach(b=>b.onclick=()=>{let q=data.questions.find(q=>q.id===b.dataset.toggleQ);q.active=!q.active;save();renderAdmin()}); $$('[data-up-q]').forEach(b=>b.onclick=()=>moveQuestion(b.dataset.upQ,-1)); $$('[data-down-q]').forEach(b=>b.onclick=()=>moveQuestion(b.dataset.downQ,1)); $$('[data-del-q]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar pregunta?')){data.questions=data.questions.filter(q=>q.id!==b.dataset.delQ);data.questions.sort((a,b)=>a.order-b.order).forEach((q,i)=>q.order=i+1);save();renderAdmin()}})} if(current==='history'){renderHist(); $('#applyFilter').onclick=renderHist; $('#clearFilters').onclick=()=>renderAdmin(); $('#exportCsv').onclick=()=>downloadCSV(histRows.length?histRows:data.surveys)} if(current==='settings'){ $('#savePin').onclick=()=>{if($('#newPin').value){data.pin=$('#newPin').value;save();alert('Clave actualizada')}}; $('#backup').onclick=()=>downloadJSON(); $('#restore').onchange=()=>fileToData($('#restore'),txt=>{try{data=JSON.parse(atob(txt.split(',')[1]));save();alert('Restaurado');location.reload()}catch(e){alert('Archivo no válido')}}); $('#wipe').onclick=()=>{if(confirm('¿Borrar todas las encuestas?')){data.surveys=[];save();renderAdmin()}}; $('#resetBase').onclick=()=>{if(confirm('Esto restaura empleados y preguntas iniciales. ¿Continuar?')){data=defaultSeed(true); save(); renderAdmin()}}}}
function moveQuestion(id,dir){const arr=data.questions.sort((a,b)=>a.order-b.order); const i=arr.findIndex(q=>q.id===id); const j=i+dir; if(i<0||j<0||j>=arr.length)return; [arr[i].order,arr[j].order]=[arr[j].order,arr[i].order]; data.questions=arr.sort((a,b)=>a.order-b.order).map((q,k)=>({...q,order:k+1})); save(); renderAdmin()}
function downloadCSV(rows){let csv='Fecha,Sede,Cliente,Telefono,Ciudad,Empleado,Nota,Comentario,Hubo reporte,Persona reportada,Comentario reporte,Seguimiento,Nota seguimiento,Respuestas completas,IP,ID dispositivo,Navegador,Veces detectadas hoy\n'+rows.map(s=>`"${fmt(s.date)}","${branchName(s.branchId)}","${s.clientName||''}","${s.clientPhone||''}","${s.city||''}","${empName(s.employeeId)}","${s.rating||''}","${(s.comment||'').replaceAll('\"','')}","${s.badOther||'no'}","${empName(s.badEmployeeId)}","${(s.badComment||'').replaceAll('\"','')}","${s.followStatus||'Pendiente'}","${(s.followNote||'').replaceAll('\"','')}","${Object.entries(s.answers||{}).map(([k,v])=>{const q=data.questions.find(x=>x.id===k);return (q?q.text:k)+': '+v}).join(' | ').replaceAll('\"','')}","${s.ip||''}","${s.deviceId||''}","${(s.userAgent||'').replaceAll('\"','')}","${abuseCount(s)}"`).join('\n'); let a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='poladent_historial_encuestas.csv'; a.click()}
function downloadJSON(){let a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download='respaldo_poladent_feedback.json'; a.click()}

// CLIENT
let step=0, form={answers:{}};
function clientInit(){if(!$('#clientApp')) return; $('#clientLogo').src=logo; renderStep()}
function renderStep(){const box=$('#clientContent'), qs=data.questions.filter(q=>q.active).sort((a,b)=>a.order-b.order); const activeBranches=data.branches.filter(b=>b.active); const activeEmp=data.employees.filter(e=>e.active && (!form.branchId||e.branchId===form.branchId)); if(step===0) box.innerHTML=`<h2 class="stepTitle">Tu opinión nos ayuda a mejorar</h2><p class="sub">Completa esta encuesta rápida de Poladent Casa Dental.</p><div class="field"><label>¿En cuál sede fuiste atendido?</label><div class="branchChoices">${activeBranches.map(b=>`<button type="button" class="branchChoice ${form.branchId===b.id?'selected':''}" data-branch="${b.id}">🏢 ${b.name}</button>`).join('')}</div></div><label class="anonBox"><input type="checkbox" id="anonymous" ${form.anonymous?'checked':''}> Prefiero realizar esta encuesta de forma anónima</label><div id="clientDataBox" class="${form.anonymous?'hidden':''}"><div class="field"><label>Nombre y apellido <span class="optional">(Opcional)</span></label><input id="cName" value="${form.clientName||''}" placeholder="Nombre y apellido"></div><div class="field"><label>Número de teléfono <span class="optional">(Opcional)</span></label><input id="cPhone" value="${form.clientPhone||''}" placeholder="Ej: 0414-0000000"></div></div><div class="field"><label>Ciudad <span class="optional">(Opcional)</span></label><input id="cCity" value="${form.city||''}" placeholder="Ciudad"></div><p class="privacyNote">Tu opinión puede ser anónima. Tus datos solo se usarán para dar seguimiento si es necesario y nunca serán compartidos.</p><button class="btn" id="next">Continuar</button>`; if(step===1) box.innerHTML=`<h2 class="stepTitle">¿Quién te atendió en ${branchName(form.branchId)}?</h2><p class="sub">Selecciona la persona principal que te atendió.</p><div class="empSelect">${activeEmp.map(e=>`<div class="empChoice ${form.employeeId===e.id?'selected':''}" data-emp="${e.id}"><img src="${e.photo||emptyPhoto}"><b>${e.name}</b><small>${e.role||''}</small></div>`).join('')}</div><div class="stepActions"><button class="btn secondary" id="back">Atrás</button><button class="btn" id="next">Continuar</button></div>`; if(step===2) box.innerHTML=`<h2 class="stepTitle">Evalúa la atención</h2><p class="sub">Responde con sinceridad. Tu opinión es confidencial.</p>${qs.map(q=>qHtml(q)).join('')}${data.settings.reportQuestion.active?`<div class="field"><label>${data.settings.reportQuestion.text}</label><select id="badOther"><option value="no" ${form.badOther!=='si'?'selected':''}>No</option><option value="si" ${form.badOther==='si'?'selected':''}>Sí</option></select></div>`:''}<div id="badBox" class="${(data.settings.reportQuestion.active&&form.badOther==='si')?'':'hidden'}"><label class="miniLabel">¿Quién fue? Toca la foto de la persona</label><div class="empSelect reportSelect">${activeEmp.map(e=>`<div class="empChoice reportChoice ${form.badEmployeeId===e.id?'selected':''}" data-bademp="${e.id}"><img src="${e.photo||emptyPhoto}"><b>${e.name}</b><small>${e.role||''}</small></div>`).join('')}</div><div class="field"><label>Explique lo ocurrido</label><textarea id="badComment">${form.badComment||''}</textarea></div></div><div class="stepActions"><button class="btn secondary" id="back">Atrás</button><button class="btn success" id="send">Enviar evaluación</button></div>`; if(step===3) box.innerHTML=`<div class="thanks"><h1>¡Gracias por tu opinión!</h1><p>Tu comentario nos ayuda a mejorar cada día.</p><button class="btn" onclick="location.reload()">Nueva encuesta</button></div>`; bindClient()}
function qHtml(q){if(q.type==='rating') return `<div class="field"><label>${q.text}</label><div class="ratingBtns" data-q="${q.id}">${[1,2,3,4,5].map(n=>`<button class="rate ${Number(form.answers[q.id]||0)>=n?'active':''}" data-rate="${n}">★</button>`).join('')}</div></div>`; if(q.type==='yesno') return `<div class="field"><label>${q.text}</label><select data-qinput="${q.id}"><option value="">Seleccionar</option><option ${form.answers[q.id]==='Sí'?'selected':''}>Sí</option><option ${form.answers[q.id]==='No'?'selected':''}>No</option></select></div>`; if(q.type==='select') return `<div class="field"><label>${q.text}</label><select data-qinput="${q.id}"><option value="">Seleccionar</option>${(q.options||[]).map(o=>`<option ${form.answers[q.id]===o?'selected':''}>${o}</option>`).join('')}</select></div>`; return `<div class="field"><label>${q.text}</label><textarea data-qinput="${q.id}">${form.answers[q.id]||''}</textarea></div>`}
function bindClient(){ $$('.branchChoice').forEach(b=>b.onclick=()=>{form.branchId=b.dataset.branch;form.employeeId='';form.badEmployeeId='';renderStep()}); const anon=$('#anonymous'); if(anon){anon.onchange=()=>{form.anonymous=anon.checked; if(form.anonymous){form.clientName='';form.clientPhone='';} renderStep()}} $('#next')&&($('#next').onclick=()=>{if(step===0){if(!form.branchId)return alert('Selecciona la sede donde fuiste atendido');form.anonymous=!!$('#anonymous')?.checked;form.clientName=form.anonymous?'':($('#cName')?.value||'');form.clientPhone=form.anonymous?'':($('#cPhone')?.value||'');form.city=$('#cCity')?.value||'';step=1}else if(step===1){if(!form.employeeId)return alert('Selecciona quién te atendió');step=2}renderStep()}); $('#back')&&($('#back').onclick=()=>{step--;renderStep()}); $$('.empChoice').forEach(x=>x.onclick=()=>{form.employeeId=x.dataset.emp;renderStep()}); $$('.rate').forEach(b=>b.onclick=e=>{e.preventDefault();form.answers[b.parentElement.dataset.q]=b.dataset.rate; form.rating=b.dataset.rate; renderStep()}); $$('[data-qinput]').forEach(i=>i.onchange=()=>form.answers[i.dataset.qinput]=i.value); $('#badOther')&&($('#badOther').onchange=()=>{form.badOther=$('#badOther').value; if(form.badOther!=='si'){form.badEmployeeId='';form.badComment='';} renderStep()}); $$('.reportChoice').forEach(x=>x.onclick=()=>{form.badEmployeeId=x.dataset.bademp; form.badOther='si'; form.badComment=$('#badComment')?.value||form.badComment||''; renderStep()}); $('#badComment')&&($('#badComment').oninput=()=>form.badComment=$('#badComment').value); $('#send')&&($('#send').onclick=async()=>{ $('#send').disabled=true; $('#send').textContent='Enviando...'; $$('[data-qinput]').forEach(i=>form.answers[i.dataset.qinput]=i.value); form.badOther=$('#badOther')?.value||form.badOther||'no'; form.badComment=$('#badComment')?.value||form.badComment||''; const ratingQ=data.questions.find(q=>q.type==='rating'&&q.active); const commentQ=data.questions.find(q=>q.type==='text'&&q.active); const meta=await getClientMeta(); const survey={id:uid(),date:new Date().toISOString(),anonymous:!!form.anonymous,clientName:form.anonymous?'':form.clientName,clientPhone:form.anonymous?'':form.clientPhone,city:form.city,branchId:form.branchId,employeeId:form.employeeId,rating:form.rating||form.answers[ratingQ?.id]||'',comment:form.answers[commentQ?.id]||'',answers:form.answers,badOther:form.badOther,badEmployeeId:form.badEmployeeId||'',badComment:form.badComment||'',...meta}; survey.abuseToday=abuseCount(survey); data.surveys.push(survey); save(); step=3; renderStep()})}


// ================= POLADENT FEEDBACK ENTERPRISE V7.1 =================
function defaultSeed(saveIt=true){
  const valId=uid(), marId=uid();
  const tienda=uid(), whatsapp=uid(), instagram=uid(), llamada=uid();
  const all=[tienda,whatsapp,instagram,llamada];
  const seed={pin:'2233',
    branches:[{id:valId,name:'Valencia',active:true},{id:marId,name:'Maracay',active:true}],
    channels:[{id:tienda,name:'Tienda',icon:'🏪',active:true},{id:whatsapp,name:'WhatsApp',icon:'💬',active:true},{id:instagram,name:'Instagram',icon:'📷',active:true},{id:llamada,name:'Llamada',icon:'📞',active:true}],
    employees:[{id:uid(),name:'Yexi',role:'Ventas al mayor',branchId:valId,channelIds:all,active:true,photo:emptyPhoto},{id:uid(),name:'Tibisay',role:'Área de ventas',branchId:valId,channelIds:[tienda],active:true,photo:emptyPhoto},{id:uid(),name:'Génesis',role:'Área de ventas',branchId:valId,channelIds:all,active:true,photo:emptyPhoto}],
    questions:[{id:uid(),text:'¿Cómo calificas la atención recibida?',type:'rating',required:true,active:true,order:1},{id:uid(),text:'¿Te atendieron con amabilidad y respeto?',type:'yesno',required:true,active:true,order:2},{id:uid(),text:'¿La explicación de los productos fue clara?',type:'rating',required:true,active:true,order:3},{id:uid(),text:'¿Recomendarías Poladent Casa Dental?',type:'yesno',required:true,active:true,order:4},{id:uid(),text:'Comentario o sugerencia',type:'text',required:false,active:true,order:5}],
    settings:{reportQuestion:{text:'¿Algún miembro del equipo tuvo una actitud que te incomodó?',active:true}},surveys:[]};
  if(saveIt)localStorage.setItem(DB,JSON.stringify(seed)); return seed;
}
function normalizeData(d){
  const seed=defaultSeed(false); d=d&&typeof d==='object'?d:{};
  d.pin=d.pin||'2233'; d.branches=Array.isArray(d.branches)&&d.branches.length?d.branches:seed.branches;
  d.channels=Array.isArray(d.channels)&&d.channels.length?d.channels:seed.channels;
  d.employees=Array.isArray(d.employees)?d.employees:seed.employees; d.questions=Array.isArray(d.questions)?d.questions:seed.questions; d.surveys=Array.isArray(d.surveys)?d.surveys:[]; d.links=Array.isArray(d.links)?d.links:[]; d.linkEvents=Array.isArray(d.linkEvents)?d.linkEvents:[];
  d.settings=d.settings&&typeof d.settings==='object'?d.settings:{}; d.settings.reportQuestion={text:(d.settings.reportQuestion&&d.settings.reportQuestion.text)||seed.settings.reportQuestion.text,active:d.settings.reportQuestion?d.settings.reportQuestion.active!==false:true};
  d.branches=d.branches.map(b=>({id:b.id||uid(),name:b.name||'Sede',active:b.active!==false}));
  d.channels=d.channels.map((c,i)=>({id:c.id||uid(),name:c.name||'Canal',icon:c.icon||['🏪','💬','📷','📞'][i]||'💬',active:c.active!==false}));
  const defBranch=d.branches[0]?.id||'', allChannels=d.channels.map(c=>c.id);
  d.employees=d.employees.map(e=>({id:e.id||uid(),name:e.name||'Empleado',role:e.role||'',branchId:e.branchId||defBranch,channelIds:Array.isArray(e.channelIds)&&e.channelIds.length?e.channelIds:allChannels,active:e.active!==false,photo:e.photo||emptyPhoto}));
  d.questions=d.questions.map((q,i)=>({id:q.id||uid(),text:q.text||'Pregunta',type:q.type||'text',options:Array.isArray(q.options)?q.options:[],required:q.required!==false,active:q.active!==false,order:Number(q.order)||i+1}));
  d.surveys=d.surveys.map(s=>{const ids=Array.isArray(s.employeeIds)&&s.employeeIds.length?s.employeeIds:(s.employeeId?[s.employeeId]:[]); return {...s,id:s.id||uid(),date:s.date||new Date().toISOString(),branchId:s.branchId||defBranch,channelId:s.channelId||d.channels[0]?.id||'',employeeIds:ids,employeeId:s.employeeId||ids[0]||'',evaluationMode:s.evaluationMode||'team',employeeRatings:s.employeeRatings||{},answers:s.answers||{},badOther:s.badOther||'no',badEmployeeId:s.badEmployeeId||'',badComment:s.badComment||'',followStatus:s.followStatus||'Pendiente',followNote:s.followNote||''}});
  d.links=d.links.map(l=>({id:l.id||uid(),name:l.name||'Enlace',branchId:l.branchId||'',channelId:l.channelId||'',employeeId:l.employeeId||'',active:l.active!==false,createdAt:l.createdAt||new Date().toISOString(),opens:Number(l.opens)||0,completed:Number(l.completed)||0,lastOpen:l.lastOpen||''}));
  d.linkEvents=d.linkEvents.map(ev=>({...ev,id:ev.id||uid(),date:ev.date||new Date().toISOString()}));
  return d;
}
function channelName(id){return data.channels.find(c=>c.id===id)?.name||'Canal no indicado'}
function channelIcon(id){return data.channels.find(c=>c.id===id)?.icon||'💬'}
function surveyEmployeeIds(s){return Array.isArray(s.employeeIds)&&s.employeeIds.length?s.employeeIds:(s.employeeId?[s.employeeId]:[])}
function avgFor(empId){const nums=[];data.surveys.forEach(s=>{if(!surveyEmployeeIds(s).includes(empId))return; const r=Number((s.employeeRatings||{})[empId]||s.rating||0);if(r)nums.push(r)});return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0}
function abuseCount(s){if(!s)return 0;const day=todayKey(s.date), ids=surveyEmployeeIds(s);return data.surveys.filter(x=>x.id!==s.id&&todayKey(x.date)===day&&s.deviceId&&x.deviceId===s.deviceId&&x.branchId===s.branchId&&x.channelId===s.channelId&&surveyEmployeeIds(x).some(id=>ids.includes(id))).length+1}
function selectedEmployeesHtml(s){return surveyEmployeeIds(s).map(id=>`<span class="miniEmp"><img src="${empPhoto(id)}"> ${empName(id)}</span>`).join('<br>')||'-'}
function dash(){const total=data.surveys.length,ratings=data.surveys.map(s=>+s.rating||0).filter(Boolean),avg=ratings.length?(ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(2):'0.00',good=data.surveys.filter(s=>+s.rating>=4).length,bad=data.surveys.filter(s=>+s.rating<=2||s.badOther==='si').length;return `<div class="grid4"><div class="card stat"><div class="ico">👥</div><div><h3>ENCUESTAS TOTALES</h3><strong>${total}</strong><br><small>Historial acumulado</small></div></div><div class="card stat"><div class="ico">⭐</div><div><h3>PROMEDIO GENERAL</h3><strong>${avg}</strong><br><small>sobre 5</small></div></div><div class="card stat"><div class="ico">😊</div><div><h3>CLIENTES SATISFECHOS</h3><strong>${total?Math.round(good*100/total):0}%</strong><br><small>4 o 5 estrellas</small></div></div><div class="card stat"><div class="ico">⚠️</div><div><h3>REPORTES</h3><strong>${bad}</strong><br><small>Revisar atención</small></div></div></div><div class="layout2"><div class="card section"><div class="sectionHead"><h2>Resumen por sede</h2></div><div class="branchSummary">${data.branches.map(b=>{const ss=data.surveys.filter(x=>x.branchId===b.id),rr=ss.map(x=>+x.rating||0).filter(Boolean),av=rr.length?(rr.reduce((a,c)=>a+c,0)/rr.length).toFixed(2):'0.00';return `<div class="branchStat"><b>${b.name}</b><strong>${av} ⭐</strong><small>${ss.length} encuestas</small></div>`}).join('')}</div></div><div class="card section"><div class="sectionHead"><h2>Resumen por canal</h2></div><div class="branchSummary">${data.channels.map(c=>{const ss=data.surveys.filter(x=>x.channelId===c.id);return `<div class="branchStat"><b>${c.icon} ${c.name}</b><strong>${ss.length}</strong><small>encuestas</small></div>`}).join('')}</div></div></div><div class="layout2"><div class="card section"><div class="sectionHead"><h2>Promedio por empleado</h2></div>${data.employees.map(e=>`<div class="employeeLine"><img class="photo" src="${e.photo||emptyPhoto}"><b>${e.name}</b><div class="bar"><span style="width:${avgFor(e.id)*20}%"></span></div><b>${avgFor(e.id).toFixed(2)}</b></div>`).join('')}</div><div class="card section"><div class="sectionHead"><h2>Encuestas recientes</h2><button class="btn small secondary" data-go="history">Ver historial</button></div>${recentTable(data.surveys.slice(-5).reverse())}</div></div>`}
function channels(){return `<div class="adminGrid"><div class="card section"><h2>${editChannel?'Editar':'Nuevo'} canal</h2><div class="field"><label>Nombre</label><input id="channelName" value="${editChannel?.name||''}" placeholder="Ej: WhatsApp"></div><div class="field"><label>Ícono</label><input id="channelIcon" value="${editChannel?.icon||'💬'}" maxlength="4"></div><div class="field"><label>Estado</label><select id="channelActive"><option value="true">Activo</option><option value="false" ${editChannel&&!editChannel.active?'selected':''}>Inactivo</option></select></div><button class="btn" id="saveChannel">Guardar canal</button> ${editChannel?'<button class="btn secondary" id="cancelChannel">Cancelar</button>':''}</div><div class="employeeCards">${data.channels.map(c=>`<div class="card empCard"><h3>${c.icon} ${c.name}</h3><span class="pill ${c.active?'green':'red'}">${c.active?'Activo':'Inactivo'}</span><p><b>Empleados:</b> ${data.employees.filter(e=>(e.channelIds||[]).includes(c.id)).length}</p><p><b>Encuestas:</b> ${data.surveys.filter(s=>s.channelId===c.id).length}</p><div class="actions"><button class="btn small" data-edit-channel="${c.id}">Editar</button><button class="btn small secondary" data-toggle-channel="${c.id}">${c.active?'Inactivar':'Activar'}</button><button class="btn small danger" data-del-channel="${c.id}">Eliminar</button></div></div>`).join('')}</div></div>`}
function employees(){const preview=editEmp?.photo||emptyPhoto;return `<div class="adminGrid"><div class="card section"><h2>${editEmp?'Editar':'Agregar'} empleado</h2><div class="photoBox"><img id="empPreview" src="${preview}" class="empPreview"><div><b>Foto del empleado</b><p>Comprimida en Firebase Realtime Database.</p></div></div><div class="field"><label>Nombre</label><input id="empName" value="${editEmp?.name||''}"></div><div class="field"><label>Cargo</label><input id="empRole" value="${editEmp?.role||''}" placeholder="Asesor de ventas"></div><div class="field"><label>Sede</label><select id="empBranch">${data.branches.filter(b=>b.active||b.id===editEmp?.branchId).map(b=>`<option value="${b.id}" ${editEmp?.branchId===b.id?'selected':''}>${b.name}</option>`).join('')}</select></div><div class="field"><label>Canales donde atiende</label><div class="checkGrid">${data.channels.filter(c=>c.active||(editEmp?.channelIds||[]).includes(c.id)).map(c=>`<label class="checkCard"><input type="checkbox" name="empChannel" value="${c.id}" ${(editEmp?.channelIds||data.channels.map(x=>x.id)).includes(c.id)?'checked':''}> ${c.icon} ${c.name}</label>`).join('')}</div></div><div class="field"><label>Foto</label><input id="empPhoto" type="file" accept="image/*"><small id="empPhotoStatus">Puedes tomar una foto o elegirla de la galería.</small></div><div class="field"><label>Estado</label><select id="empActive"><option value="true">Activo</option><option value="false" ${editEmp&&!editEmp.active?'selected':''}>Inactivo</option></select></div><button class="btn" id="saveEmp">Guardar empleado</button> ${editEmp?'<button class="btn secondary" id="cancelEmp">Cancelar</button>':''}</div><div class="employeeCards">${data.employees.map(e=>`<div class="card empCard"><div class="empTop"><img src="${e.photo||emptyPhoto}"><div><h3>${e.name}</h3><p>${e.role||''}</p><span class="pill blue">${branchName(e.branchId)}</span></div></div><p class="channelTags">${(e.channelIds||[]).map(id=>`<span>${channelIcon(id)} ${channelName(id)}</span>`).join(' ')}</p><p><b>Promedio:</b> ${avgFor(e.id).toFixed(2)} ⭐ · <b>Encuestas:</b> ${data.surveys.filter(s=>surveyEmployeeIds(s).includes(e.id)).length}</p><div class="actions"><button class="btn small" data-edit-emp="${e.id}">Editar</button><button class="btn small secondary" data-toggle-emp="${e.id}">${e.active?'Inactivar':'Activar'}</button><button class="btn small danger" data-del-emp="${e.id}">Eliminar</button></div></div>`).join('')}</div></div>`}
function recentTable(rows){return `<div class="tableWrap"><table class="table"><tr><th>Fecha</th><th>Sede / Canal</th><th>Cliente</th><th>Personal evaluado</th><th>Nota</th><th>Respuestas</th><th>Control</th></tr>${rows.map(s=>`<tr><td>${fmt(s.date)}</td><td><span class="pill blue">${branchName(s.branchId)}</span><br><small>${channelIcon(s.channelId)} ${channelName(s.channelId)}</small></td><td>${s.clientName||'Anónimo'}<br><small>${s.clientPhone||''}</small></td><td>${selectedEmployeesHtml(s)}<br><small>${s.evaluationMode==='individual'?'Evaluación individual':'Evaluación del equipo'}</small></td><td><span class="stars">${ratingStars(s.rating)}</span></td><td>${answerSummary(s)}${s.badOther==='si'?'<hr>'+reportSummary(s):''}</td><td>${abuseCount(s)>=3?`<span class="pill red">Posible repetición ${abuseCount(s)}</span>`:'<span class="pill green">Normal</span>'}<div class="actions" style="margin-top:8px"><button class="btn small secondary" data-follow="${s.id}">Seguimiento</button></div></td></tr>`).join('')}</table></div>`}
function history(){return `<div class="card section"><div class="sectionHead"><h2>Historial de encuestas</h2><div class="actions"><button class="btn small" id="exportCsv">Exportar CSV</button><button class="btn small secondary" id="clearFilters">Limpiar</button></div></div><div class="filters"><div class="field"><label>Sede</label><select id="fBranch"><option value="">Todas</option>${data.branches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></div><div class="field"><label>Canal</label><select id="fChannel"><option value="">Todos</option>${data.channels.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="field"><label>Empleado</label><select id="fEmp"><option value="">Todos</option>${data.employees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select></div><div class="field"><label>Desde</label><input type="date" id="fFrom"></div><div class="field"><label>Hasta</label><input type="date" id="fTo"></div><button class="btn" id="applyFilter">Filtrar</button></div><div id="histOut" style="margin-top:14px"></div></div>`}
function renderHist(){let rows=[...data.surveys];const branch=$('#fBranch')?.value,channel=$('#fChannel')?.value,emp=$('#fEmp')?.value,from=$('#fFrom')?.value,to=$('#fTo')?.value;if(branch)rows=rows.filter(s=>s.branchId===branch);if(channel)rows=rows.filter(s=>s.channelId===channel);if(emp)rows=rows.filter(s=>surveyEmployeeIds(s).includes(emp));if(from)rows=rows.filter(s=>todayKey(s.date)>=from);if(to)rows=rows.filter(s=>todayKey(s.date)<=to);histRows=rows.reverse();$('#histOut').innerHTML=recentTable(histRows);bindFollowButtons()}
function downloadCSV(rows){const esc=v=>String(v??'').replaceAll('"','""');let csv='Fecha,Sede,Canal,Cliente,Telefono,Empleados,Modo,Nota,Comentario,Reporte,Persona reportada,Dispositivo\n'+rows.map(s=>`"${esc(fmt(s.date))}","${esc(branchName(s.branchId))}","${esc(channelName(s.channelId))}","${esc(s.clientName)}","${esc(s.clientPhone)}","${esc(surveyEmployeeIds(s).map(empName).join(' | '))}","${esc(s.evaluationMode)}","${esc(s.rating)}","${esc(s.comment)}","${esc(s.badOther)}","${esc(empName(s.badEmployeeId))}","${esc(s.deviceId)}"`).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='poladent_historial_v7_1.csv';a.click()}
function renderAdmin(){if(!$('#content'))return;data=normalizeData(data);const titles={dashboard:['Dashboard','Calidad de atención al cliente'],branches:['Sedes','Valencia, Maracay y futuras sedes'],channels:['Canales','Tienda, WhatsApp, Instagram y llamadas'],links:['Enlaces y QR','Genera enlaces personalizados para clientes externos'],employees:['Empleados','Fotos, sede y canales de atención'],questions:['Preguntas','Encuesta rápida y editable'],history:['Historial','Filtros por sede, canal, empleado y fecha'],settings:['Configuración','Seguridad y respaldos']};$('#pageTitle').textContent=titles[current]?.[0]||'Dashboard';$('#pageSub').textContent=titles[current]?.[1]||'';$('#content').innerHTML={dashboard:dash(),branches:branches(),channels:channels(),links:linksView(),employees:employees(),questions:questions(),history:history(),settings:settings()}[current]||dash();bindAdmin();if(current==='links')setTimeout(renderAllQRCodes,50)}

function channelLogoHtml(channel){
 const name=String(channel?.name||'').toLowerCase();
 if(name.includes('whatsapp')) return `<span class="channelBrand whatsappBrand" aria-hidden="true"><svg viewBox="0 0 32 32" role="img"><path fill="currentColor" d="M19.11 17.21c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.59.13-.17.26-.67.85-.82 1.02-.15.17-.3.19-.56.06-.26-.13-1.09-.4-2.08-1.28-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.59-1.41-.8-1.93-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17s.93 2.52 1.06 2.69c.13.17 1.83 2.8 4.44 3.92.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.08 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3z"/><path fill="currentColor" d="M16.04 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.25.59 4.45 1.7 6.38L3.14 28.8l6.57-1.72A12.72 12.72 0 0 0 16.04 28.8c7.06 0 12.8-5.74 12.8-12.8s-5.74-12.8-12.8-12.8zm0 23.44c-2.03 0-4.01-.56-5.73-1.62l-.41-.25-3.9 1.02 1.04-3.8-.27-.42A10.57 10.57 0 0 1 5.4 16c0-5.87 4.77-10.64 10.64-10.64S26.68 10.13 26.68 16s-4.77 10.64-10.64 10.64z"/></svg></span>`;
 if(name.includes('instagram')) return `<span class="channelBrand instagramBrand" aria-hidden="true"><svg viewBox="0 0 32 32" role="img"><rect x="5" y="5" width="22" height="22" rx="6" ry="6" fill="none" stroke="currentColor" stroke-width="2.8"/><circle cx="16" cy="16" r="5.2" fill="none" stroke="currentColor" stroke-width="2.8"/><circle cx="23.3" cy="8.8" r="1.7" fill="currentColor"/></svg></span>`;
 if(name.includes('tienda')) return `<span class="channelBrand storeBrand" aria-hidden="true"><svg viewBox="0 0 32 32" role="img"><path d="M6 12h20l-2-6H8l-2 6zM8 13v13h16V13M12 26v-8h8v8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 12c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>`;
 if(name.includes('llamada')||name.includes('teléfono')||name.includes('telefono')) return `<span class="channelBrand phoneBrand" aria-hidden="true"><svg viewBox="0 0 32 32" role="img"><path d="M10 5l4 5-3 3c2 4 4 6 8 8l3-3 5 4c-1 4-3 6-7 5C11 25 7 21 5 12 4 8 6 6 10 5z" fill="currentColor"/></svg></span>`;
 return `<span class="channelBrand genericBrand" aria-hidden="true">${channel?.icon||'💬'}</span>`;
}
step=0; form={answers:{},employeeIds:[]};
function clientInit(){if(!$('#clientApp'))return;$('#clientLogo').src=logo;const q=new URLSearchParams(location.search);form.branchId=q.get('sede')||'';form.channelId=q.get('canal')||'';form.linkId=q.get('link')||'';const emp=q.get('empleado');if(emp)form.employeeIds=[emp];if(form.linkId)registerLinkOpen(form.linkId);if(form.branchId&&form.channelId&&form.employeeIds.length===1)step=3;else if(form.branchId&&form.channelId)step=2;else if(form.branchId)step=1;renderStep()}
function renderStep(){const box=$('#clientContent');if(!box)return;const qs=data.questions.filter(q=>q.active).sort((a,b)=>a.order-b.order),branches=data.branches.filter(b=>b.active),channels=data.channels.filter(c=>c.active),emps=data.employees.filter(e=>e.active&&(!form.branchId||e.branchId===form.branchId)&&(!form.channelId||(e.channelIds||[]).includes(form.channelId)));
 if(step===0)box.innerHTML=`<div class="welcomeHero"><span class="heroBadge">Encuesta rápida · 30 segundos</span><h2>¡Ayúdanos a crecer!</h2><p>Queremos saber cómo fue la atención de nuestro equipo de ventas.</p></div><div class="field"><label>¿Cómo deseas enviar tu opinión?</label><div class="modeChoices privacyChoices"><button type="button" class="modeChoice ${form.anonymous!==false?'selected':''}" data-privacy="anonymous"><span>🔒</span><b>De forma anónima</b><small>No pediremos tu nombre</small></button><button type="button" class="modeChoice ${form.anonymous===false?'selected':''}" data-privacy="identified"><span>👤</span><b>Con mis datos</b><small>Para poder contactarte si hace falta</small></button></div></div><div class="field"><label>Ciudad donde vives</label><input id="cCity" value="${form.city||''}" placeholder="Escribe tu ciudad"></div>${form.anonymous===false?`<div id="clientDataBox"><div class="field"><label>Nombre y apellido</label><input id="cName" value="${form.clientName||''}" placeholder="Nombre y apellido"></div><div class="field"><label>Número de teléfono <span class="optional">(Opcional)</span></label><input id="cPhone" value="${form.clientPhone||''}" placeholder="Ej: 0414-0000000"></div></div>`:''}<p class="privacyNote">La ciudad se utiliza únicamente con fines estadísticos. Tu información es confidencial.</p><div class="field"><label>¿En cuál sede recibiste atención?</label><div class="branchChoices">${branches.map(b=>`<button type="button" class="branchChoice ${form.branchId===b.id?'selected':''}" data-branch="${b.id}">📍 ${b.name}</button>`).join('')}</div></div><button class="btn" id="next">Continuar</button>`;
 if(step===1)box.innerHTML=`<h2 class="stepTitle">¿Por cuál medio te atendimos?</h2><div class="channelChoices">${channels.map(c=>`<button class="channelChoice ${form.channelId===c.id?'selected':''}" data-channel="${c.id}">${channelLogoHtml(c)}<b>${c.name}</b></button>`).join('')}</div><div class="stepActions"><button class="btn secondary" id="back">Atrás</button><button class="btn" id="next">Continuar</button></div>`;
 if(step===2)box.innerHTML=`<h2 class="stepTitle">¿Quién te atendió?</h2><p class="sub">Puedes seleccionar una o varias personas.</p><div class="empSelect">${emps.map(e=>`<div class="empChoice multi ${(form.employeeIds||[]).includes(e.id)?'selected':''}" data-emp="${e.id}"><img src="${e.photo||emptyPhoto}"><b>${e.name}</b><small>${e.role||''}</small><span class="selectCheck">✓</span></div>`).join('')||'<p>No hay empleados activos asignados a este canal.</p>'}</div><div class="stepActions"><button class="btn secondary" id="back">Atrás</button><button class="btn" id="next">Continuar</button></div>`;
 if(step===3&&form.employeeIds.length>1)box.innerHTML=`<h2 class="stepTitle">¿Cómo deseas evaluar?</h2><div class="modeChoices"><button class="modeChoice ${form.evaluationMode==='team'?'selected':''}" data-mode="team"><span>⚡</span><b>Evaluar al equipo completo</b><small>Más rápido</small></button><button class="modeChoice ${form.evaluationMode==='individual'?'selected':''}" data-mode="individual"><span>👤</span><b>Evaluar a cada persona</b><small>Más preciso</small></button></div><div class="stepActions"><button class="btn secondary" id="back">Atrás</button><button class="btn" id="next">Continuar</button></div>`;
 const surveyStep=form.employeeIds.length>1?4:3;
 if(step===surveyStep){const people=form.employeeIds.map(empName).join(', ');box.innerHTML=`<h2 class="stepTitle">Cuéntanos tu experiencia</h2><p class="sub">Evaluando a: <b>${people}</b></p>${qs.map(q=>qHtml(q)).join('')}${form.evaluationMode==='individual'&&form.employeeIds.length>1?`<div class="field"><label>Calificación individual rápida</label>${form.employeeIds.map(id=>`<div class="individualRate"><span class="miniEmp"><img src="${empPhoto(id)}">${empName(id)}</span><div class="miniStars" data-individual="${id}">${[1,2,3,4,5].map(n=>`<button class="miniRate ${Number((form.employeeRatings||{})[id]||0)>=n?'active':''}" data-rate="${n}">★</button>`).join('')}</div></div>`).join('')}</div>`:''}${data.settings.reportQuestion.active?`<div class="field"><label>${data.settings.reportQuestion.text}</label><select id="badOther"><option value="no">No</option><option value="si" ${form.badOther==='si'?'selected':''}>Sí</option></select></div>`:''}<div id="badBox" class="${form.badOther==='si'?'':'hidden'}"><label class="miniLabel">Selecciona quién fue</label><div class="empSelect reportSelect">${emps.map(e=>`<div class="empChoice reportChoice ${form.badEmployeeId===e.id?'selected':''}" data-bademp="${e.id}"><img src="${e.photo||emptyPhoto}"><b>${e.name}</b></div>`).join('')}</div><div class="field"><label>Comentario opcional</label><textarea id="badComment">${form.badComment||''}</textarea></div></div><div class="stepActions"><button class="btn secondary" id="back">Atrás</button><button class="btn success" id="send">Enviar opinión</button></div>`}
 if(step===99)box.innerHTML=`<div class="thanks"><h1>¡Gracias por ayudarnos a crecer!</h1><p>Tu opinión fue guardada correctamente.</p><button class="btn" onclick="location.href=location.pathname">Nueva encuesta</button></div>`;bindClient()}
function bindClient(){
 $$('.branchChoice').forEach(b=>b.onclick=()=>{form.city=$('#cCity')?.value||form.city||'';form.clientName=$('#cName')?.value||form.clientName||'';form.clientPhone=$('#cPhone')?.value||form.clientPhone||'';form.branchId=b.dataset.branch;form.channelId='';form.employeeIds=[];renderStep()});
 $$('[data-privacy]').forEach(b=>b.onclick=()=>{form.city=$('#cCity')?.value||form.city||'';form.clientName=$('#cName')?.value||form.clientName||'';form.clientPhone=$('#cPhone')?.value||form.clientPhone||'';form.anonymous=b.dataset.privacy==='anonymous';if(form.anonymous){form.clientName='';form.clientPhone=''}renderStep()});
 $('#cCity')&&($('#cCity').oninput=()=>form.city=$('#cCity').value);
 $('#cName')&&($('#cName').oninput=()=>form.clientName=$('#cName').value);
 $('#cPhone')&&($('#cPhone').oninput=()=>form.clientPhone=$('#cPhone').value);
 $$('.channelChoice').forEach(b=>b.onclick=()=>{form.channelId=b.dataset.channel;form.employeeIds=[];renderStep()});
 $$('.empChoice.multi').forEach(x=>x.onclick=()=>{const id=x.dataset.emp;form.employeeIds=form.employeeIds||[];form.employeeIds=form.employeeIds.includes(id)?form.employeeIds.filter(v=>v!==id):[...form.employeeIds,id];renderStep()});
 $$('[data-mode]').forEach(x=>x.onclick=()=>{form.evaluationMode=x.dataset.mode;renderStep()});
 $('#next')&&($('#next').onclick=()=>{if(step===0){form.city=$('#cCity')?.value||form.city||'';if(form.anonymous===false){form.clientName=$('#cName')?.value||form.clientName||'';form.clientPhone=$('#cPhone')?.value||form.clientPhone||''}else{form.clientName='';form.clientPhone=''}if(!form.branchId)return alert('Selecciona una sede');step=1}else if(step===1){if(!form.channelId)return alert('Selecciona un canal');step=2}else if(step===2){if(!form.employeeIds?.length)return alert('Selecciona al menos una persona');form.evaluationMode=form.employeeIds.length>1?(form.evaluationMode||'team'):'team';step=form.employeeIds.length>1?3:3}else if(step===3&&form.employeeIds.length>1){if(!form.evaluationMode)return alert('Selecciona cómo deseas evaluar');step=4}renderStep()});
 $('#back')&&($('#back').onclick=()=>{step--;renderStep()});
 $$('.rate').forEach(b=>b.onclick=e=>{e.preventDefault();form.answers[b.parentElement.dataset.q]=b.dataset.rate;const firstRating=data.questions.filter(q=>q.active&&q.type==='rating').sort((a,b)=>a.order-b.order)[0];if(b.parentElement.dataset.q===firstRating?.id)form.rating=b.dataset.rate;renderStep()});
 $$('[data-qinput]').forEach(i=>i.onchange=()=>form.answers[i.dataset.qinput]=i.value);
 $$('.miniRate').forEach(b=>b.onclick=e=>{e.preventDefault();const id=b.parentElement.dataset.individual;form.employeeRatings=form.employeeRatings||{};form.employeeRatings[id]=b.dataset.rate;renderStep()});
 $('#badOther')&&($('#badOther').onchange=()=>{form.badOther=$('#badOther').value;if(form.badOther!=='si'){form.badEmployeeId='';form.badComment=''}renderStep()});
 $$('.reportChoice').forEach(x=>x.onclick=()=>{form.badEmployeeId=x.dataset.bademp;form.badOther='si';renderStep()});
 $('#send')&&($('#send').onclick=async()=>{const qs=data.questions.filter(q=>q.active);$$('[data-qinput]').forEach(i=>form.answers[i.dataset.qinput]=i.value);const missing=qs.filter(q=>q.required&&!form.answers[q.id]);if(missing.length)return alert('Responde las preguntas obligatorias');if(form.evaluationMode==='individual'&&form.employeeIds.some(id=>!(form.employeeRatings||{})[id]))return alert('Califica a cada persona seleccionada');const btn=$('#send');btn.disabled=true;btn.textContent='Enviando...';form.badComment=$('#badComment')?.value||'';form.anonymous=form.anonymous!==false;form.clientName=form.anonymous?'':(form.clientName||'');form.clientPhone=form.anonymous?'':(form.clientPhone||'');const meta=await getClientMeta();const ratingQ=qs.find(q=>q.type==='rating'),commentQ=qs.find(q=>q.type==='text');const rating=form.evaluationMode==='individual'?Math.round(form.employeeIds.reduce((a,id)=>a+Number(form.employeeRatings[id]||0),0)/form.employeeIds.length):(form.rating||form.answers[ratingQ?.id]||'');const survey={id:uid(),date:new Date().toISOString(),linkId:form.linkId||'',anonymous:form.anonymous,clientName:form.clientName,clientPhone:form.clientPhone,city:form.city||'',branchId:form.branchId,channelId:form.channelId,employeeIds:[...form.employeeIds],employeeId:form.employeeIds[0],evaluationMode:form.evaluationMode||'team',employeeRatings:form.employeeRatings||{},rating,comment:form.answers[commentQ?.id]||'',answers:{...form.answers},badOther:form.badOther||'no',badEmployeeId:form.badEmployeeId||'',badComment:form.badComment||'',...meta};survey.abuseToday=abuseCount(survey);data.surveys.push(survey);if(form.linkId)markLinkCompleted(form.linkId,survey.id);save();step=99;renderStep()})
}



// ================= POLADENT FEEDBACK ENTERPRISE V7.2 =================
function appBaseUrl(){
  const path=location.pathname.replace(/admin\.html$/,'').replace(/\/$/,'');
  return location.origin+path+'/';
}
function makeSmartUrl(link){
  const u=new URL(appBaseUrl());
  if(link.branchId)u.searchParams.set('sede',link.branchId);
  if(link.channelId)u.searchParams.set('canal',link.channelId);
  if(link.employeeId)u.searchParams.set('empleado',link.employeeId);
  u.searchParams.set('link',link.id);
  return u.toString();
}
function linkName(l){
  const parts=[];
  if(l.employeeId)parts.push(empName(l.employeeId));
  if(l.branchId)parts.push(branchName(l.branchId));
  if(l.channelId)parts.push(channelName(l.channelId));
  return l.name||parts.join(' · ')||'Enlace general';
}
function linksView(){
  const links=[...data.links].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  return `<div class="adminGrid"><div class="card section"><h2>Generar enlace inteligente</h2>
  <p class="sub">El cliente abrirá la encuesta con la sede, canal y empleado ya seleccionados.</p>
  <div class="field"><label>Nombre del enlace</label><input id="linkLabel" placeholder="Ej: Yexi WhatsApp Valencia"></div>
  <div class="field"><label>Sede</label><select id="linkBranch"><option value="">Todas / elegir en encuesta</option>${data.branches.filter(b=>b.active).map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></div>
  <div class="field"><label>Canal</label><select id="linkChannel"><option value="">Todos / elegir en encuesta</option>${data.channels.filter(c=>c.active).map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
  <div class="field"><label>Empleado</label><select id="linkEmployee"><option value="">Ninguno / elegir en encuesta</option>${data.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.name} · ${branchName(e.branchId)}</option>`).join('')}</select></div>
  <button class="btn" id="createLink">Generar enlace y QR</button>
  <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
  <h3>Accesos rápidos por sede</h3>
  <div class="actions">${data.branches.filter(b=>b.active).map(b=>`<button class="btn small secondary" data-quick-branch="${b.id}">QR ${b.name}</button>`).join('')}</div>
  </div><div class="card section"><h2>Cómo usarlo</h2><p>1. Genera un enlace para el empleado y canal.</p><p>2. Pulsa <b>Copiar</b> y envíalo por WhatsApp o Instagram.</p><p>3. El QR se puede descargar o imprimir.</p><p>4. Las aperturas y encuestas completadas quedan registradas.</p><div class="privacyNote">La seguridad sigue usando el identificador anónimo del dispositivo. La IP se conserva solo como referencia.</div></div></div>
  <div class="linkCards">${links.map(l=>{const url=makeSmartUrl(l);return `<div class="card linkCard"><div class="linkHead"><div><h3>${linkName(l)}</h3><p>${l.active?'🟢 Activo':'🔴 Inactivo'} · creado ${fmt(l.createdAt)}</p></div><div class="linkStats"><b>${l.opens||0}</b><small>aperturas</small><b>${l.completed||0}</b><small>completadas</small></div></div><div class="qrWrap"><div class="qrBox" id="qr-${l.id}" data-qr="${encodeURIComponent(url)}"></div><div class="linkInfo"><code>${url}</code><p><b>Sede:</b> ${l.branchId?branchName(l.branchId):'A elegir'}<br><b>Canal:</b> ${l.channelId?channelName(l.channelId):'A elegir'}<br><b>Empleado:</b> ${l.employeeId?empName(l.employeeId):'A elegir'}</p><small>Última apertura: ${l.lastOpen?fmt(l.lastOpen):'Sin aperturas'}</small></div></div><div class="actions"><button class="btn small" data-copy-link="${l.id}">Copiar enlace</button><button class="btn small secondary" data-download-qr="${l.id}">Descargar QR</button><button class="btn small secondary" data-print-qr="${l.id}">Imprimir</button><button class="btn small secondary" data-toggle-link="${l.id}">${l.active?'Inactivar':'Activar'}</button><button class="btn small danger" data-delete-link="${l.id}">Eliminar</button></div></div>`}).join('')||'<div class="card section"><p class="sub">Todavía no hay enlaces generados.</p></div>'}</div>${linkEventsView()}`;
}
function linkEventsView(){const ev=[...data.linkEvents].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,30);if(!ev.length)return '';return `<div class="card section" style="margin-top:18px"><div class="sectionHead"><h2>Historial de enlaces</h2><span class="pill blue">Últimos ${ev.length}</span></div><div class="tableWrap"><table class="table"><tr><th>Fecha</th><th>Enlace</th><th>Evento</th><th>Dispositivo</th></tr>${ev.map(x=>{const l=data.links.find(y=>y.id===x.linkId);return `<tr><td>${fmt(x.date)}</td><td>${l?linkName(l):'Enlace eliminado'}</td><td><span class="pill ${x.type==='completed'?'green':'blue'}">${x.type==='completed'?'Encuesta completada':'Apertura'}</span></td><td><small>${x.deviceId||'-'}</small></td></tr>`}).join('')}</table></div></div>`}
function bindLinksAdmin(){
  $('#linkBranch')&&($('#linkBranch').onchange=()=>filterLinkEmployees());
  $('#linkChannel')&&($('#linkChannel').onchange=()=>filterLinkEmployees());
  $('#createLink')&&($('#createLink').onclick=()=>createSmartLink());
  $$('[data-quick-branch]').forEach(b=>b.onclick=()=>createSmartLink({branchId:b.dataset.quickBranch,name:'QR '+branchName(b.dataset.quickBranch)}));
  $$('[data-copy-link]').forEach(b=>b.onclick=async()=>{const l=data.links.find(x=>x.id===b.dataset.copyLink);if(!l)return;await copyText(makeSmartUrl(l));b.textContent='Copiado ✓';setTimeout(()=>b.textContent='Copiar enlace',1500)});
  $$('[data-toggle-link]').forEach(b=>b.onclick=()=>{const l=data.links.find(x=>x.id===b.dataset.toggleLink);if(l){l.active=!l.active;save();renderAdmin()}});
  $$('[data-delete-link]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este enlace y su QR?')){data.links=data.links.filter(x=>x.id!==b.dataset.deleteLink);save();renderAdmin()}});
  $$('[data-download-qr]').forEach(b=>b.onclick=()=>downloadQR(b.dataset.downloadQr));
  $$('[data-print-qr]').forEach(b=>b.onclick=()=>printQR(b.dataset.printQr));
}
function filterLinkEmployees(){
  const sel=$('#linkEmployee');if(!sel)return;
  const branch=$('#linkBranch')?.value||'', channel=$('#linkChannel')?.value||'';
  const current=sel.value;
  sel.innerHTML='<option value="">Ninguno / elegir en encuesta</option>'+data.employees.filter(e=>e.active&&(!branch||e.branchId===branch)&&(!channel||(e.channelIds||[]).includes(channel))).map(e=>`<option value="${e.id}">${e.name} · ${branchName(e.branchId)}</option>`).join('');
  if([...sel.options].some(o=>o.value===current))sel.value=current;
}
function createSmartLink(preset={}){
  const branchId=preset.branchId??($('#linkBranch')?.value||'');
  const channelId=preset.channelId??($('#linkChannel')?.value||'');
  const employeeId=preset.employeeId??($('#linkEmployee')?.value||'');
  const employee=employeeId?data.employees.find(e=>e.id===employeeId):null;
  if(employee&&branchId&&employee.branchId!==branchId)return alert('Ese empleado no pertenece a la sede seleccionada.');
  if(employee&&channelId&&!(employee.channelIds||[]).includes(channelId))return alert('Ese empleado no atiende por el canal seleccionado.');
  const name=(preset.name||$('#linkLabel')?.value||'').trim()||[employeeId&&empName(employeeId),branchId&&branchName(branchId),channelId&&channelName(channelId)].filter(Boolean).join(' · ')||'Enlace general';
  data.links.push({id:uid(),name,branchId,channelId,employeeId,active:true,createdAt:new Date().toISOString(),opens:0,completed:0,lastOpen:''});
  save();renderAdmin();
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text)}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
}
function renderAllQRCodes(){
  if(typeof QRCode==='undefined')return;
  $$('.qrBox').forEach(el=>{if(el.dataset.done)return;el.dataset.done='1';const text=decodeURIComponent(el.dataset.qr||'');new QRCode(el,{text,width:180,height:180,colorDark:'#082b5c',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H})});
}
function qrCanvas(id){const box=$('#qr-'+id);return box?.querySelector('canvas')||null}
function downloadQR(id){renderAllQRCodes();setTimeout(()=>{const c=qrCanvas(id);if(!c)return alert('No se pudo generar el QR. Revisa tu conexión.');const a=document.createElement('a');a.download='QR_Poladent_'+id+'.png';a.href=c.toDataURL('image/png');a.click()},100)}
function printQR(id){renderAllQRCodes();setTimeout(()=>{const l=data.links.find(x=>x.id===id),c=qrCanvas(id);if(!l||!c)return alert('No se pudo preparar el QR.');const w=window.open('','_blank','width=600,height=800');w.document.write(`<html><head><title>QR Poladent</title><style>body{font-family:Arial;text-align:center;padding:40px;color:#082b5c}img.logo{width:220px}img.qr{width:320px;margin:25px}h1{margin-bottom:5px}p{font-size:18px}</style></head><body><img class="logo" src="${logo}"><h1>¡Ayúdanos a crecer!</h1><p>Escanea y cuéntanos cómo fue la atención de nuestro equipo de ventas.</p><img class="qr" src="${c.toDataURL('image/png')}"><h2>${linkName(l)}</h2><p>Tu opinión es confidencial y nos ayuda a mejorar cada día.</p></body></html>`);w.document.close();setTimeout(()=>w.print(),400)},100)}
function registerLinkOpen(id){
  const l=data.links.find(x=>x.id===id);if(!l||!l.active)return;
  const key='poladent_link_open_'+id+'_'+today();
  if(sessionStorage.getItem(key))return;
  sessionStorage.setItem(key,'1');l.opens=(Number(l.opens)||0)+1;l.lastOpen=new Date().toISOString();
  data.linkEvents.push({id:uid(),linkId:id,type:'open',date:new Date().toISOString(),deviceId:getDeviceId(),userAgent:navigator.userAgent});save();
}
function markLinkCompleted(id,surveyId){
  const l=data.links.find(x=>x.id===id);if(!l)return;l.completed=(Number(l.completed)||0)+1;
  data.linkEvents.push({id:uid(),linkId:id,type:'completed',surveyId,date:new Date().toISOString(),deviceId:getDeviceId()});
}

window.addEventListener('DOMContentLoaded',()=>{firebaseInit();adminInit();clientInit()});

// ================= POLADENT FEEDBACK ENTERPRISE V7.3 =================
let managerPeriod='month';
function surveyEmployeeRating(s,id){
  if(s.evaluationMode==='individual'&&s.employeeRatings&&s.employeeRatings[id])return Number(s.employeeRatings[id])||0;
  return surveyEmployeeIds(s).includes(id)?Number(s.rating)||0:0;
}
function periodRows(period=managerPeriod){
  const now=new Date();
  return data.surveys.filter(s=>{
    const d=new Date(s.date||0);if(Number.isNaN(d.getTime()))return false;
    if(period==='today')return todayKey(s.date)===today();
    if(period==='7')return d>=new Date(now.getTime()-7*86400000);
    if(period==='30')return d>=new Date(now.getTime()-30*86400000);
    if(period==='month')return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
    return true;
  });
}
function averageRows(rows){const n=rows.map(s=>Number(s.rating)||0).filter(Boolean);return n.length?n.reduce((a,b)=>a+b,0)/n.length:0}
function employeeRanking(rows){
  return data.employees.filter(e=>e.active).map(e=>{
    const values=rows.map(s=>surveyEmployeeRating(s,e.id)).filter(Boolean);
    const reports=rows.filter(s=>s.badEmployeeId===e.id).length;
    return {...e,count:values.length,avg:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,reports};
  }).filter(e=>e.count).sort((a,b)=>b.avg-a.avg||b.count-a.count||a.reports-b.reports);
}
function groupRanking(rows,list,key){
  return list.map(item=>{const ss=rows.filter(s=>s[key]===item.id),av=averageRows(ss);return {...item,count:ss.length,avg:av}}).sort((a,b)=>b.avg-a.avg||b.count-a.count);
}
function monthSeries(){
  const out=[];const now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),y=d.getFullYear(),m=d.getMonth();const rows=data.surveys.filter(s=>{const x=new Date(s.date||0);return x.getFullYear()===y&&x.getMonth()===m});out.push({label:d.toLocaleDateString('es-VE',{month:'short'}),count:rows.length,avg:averageRows(rows)});}return out;
}
function commentText(s){return (s.comment||Object.entries(s.answers||{}).map(([id,v])=>data.questions.find(q=>q.id===id)?.type==='text'?v:'').filter(Boolean).join(' ')).trim()}
function managerAdvice(rows){
  if(!rows.length)return 'Aún no hay encuestas en este período. Comparte los enlaces y códigos QR para comenzar a medir la atención.';
  const av=averageRows(rows), bad=rows.filter(s=>Number(s.rating)<=2||s.badOther==='si').length, channels=groupRanking(rows,data.channels,'channelId'), branches=groupRanking(rows,data.branches,'branchId');
  if(bad>=3)return `Se detectaron ${bad} evaluaciones que requieren revisión. Prioriza los casos pendientes y conversa con el personal involucrado.`;
  if(av<3.5)return 'La satisfacción está por debajo del objetivo. Conviene reforzar amabilidad, claridad en la explicación y tiempo de respuesta.';
  if(channels.length>1&&channels.at(-1).count)return `El canal con mayor oportunidad de mejora es ${channels.at(-1).name}, con promedio ${channels.at(-1).avg.toFixed(2)}.`;
  if(branches.length>1&&branches.at(-1).count)return `La sede ${branches.at(-1).name} está por debajo de la otra sede. Revisa comentarios y horarios de atención.`;
  return 'La atención presenta un desempeño positivo. Mantén el seguimiento y reconoce al personal mejor evaluado.';
}
function dash(){
  const rows=periodRows(),total=rows.length,av=averageRows(rows),good=rows.filter(s=>Number(s.rating)>=4).length,pending=rows.filter(s=>(Number(s.rating)<=2||s.badOther==='si')&&(s.followStatus||'Pendiente')!=='Solucionado').length;
  const empRank=employeeRanking(rows),winner=empRank[0],branchRank=groupRanking(rows,data.branches,'branchId'),channelRank=groupRanking(rows,data.channels,'channelId'),months=monthSeries(),mx=Math.max(1,...months.map(x=>x.count));
  const positives=rows.filter(s=>Number(s.rating)>=4&&commentText(s)).slice(-5).reverse(), negatives=rows.filter(s=>(Number(s.rating)<=2||s.badOther==='si')&&(commentText(s)||s.badComment)).slice(-5).reverse();
  return `<div class="managerFilters"><div><h2>Panel gerencial</h2><p class="sub">Indicadores de calidad de atención en tiempo real</p></div><div class="periodBtns"><button data-period="today" class="${managerPeriod==='today'?'active':''}">Hoy</button><button data-period="7" class="${managerPeriod==='7'?'active':''}">7 días</button><button data-period="30" class="${managerPeriod==='30'?'active':''}">30 días</button><button data-period="month" class="${managerPeriod==='month'?'active':''}">Este mes</button><button data-period="all" class="${managerPeriod==='all'?'active':''}">Todo</button></div></div>
  <div class="grid4"><div class="card stat"><div class="ico">📋</div><div><h3>ENCUESTAS</h3><strong>${total}</strong><br><small>Período seleccionado</small></div></div><div class="card stat"><div class="ico greenIco">⭐</div><div><h3>SATISFACCIÓN</h3><strong>${av.toFixed(2)}</strong><br><small>${total?Math.round(good*100/total):0}% satisfechos</small></div></div><div class="card stat"><div class="ico purpleIco">🏆</div><div><h3>MEJOR EVALUADO</h3><strong class="winnerName">${winner?winner.name:'Sin datos'}</strong><br><small>${winner?winner.avg.toFixed(2)+' · '+winner.count+' encuestas':'Esperando encuestas'}</small></div></div><div class="card stat"><div class="ico redIco">🚨</div><div><h3>CASOS PENDIENTES</h3><strong>${pending}</strong><br><small>Requieren seguimiento</small></div></div></div>
  <div class="layout2"><div class="card section executiveWinner"><div class="sectionHead"><h2>🏅 Empleado del mes</h2>${winner?'<button class="btn small" id="printCertificate">Imprimir reconocimiento</button>':''}</div>${winner?`<div class="winnerCard"><img src="${winner.photo||emptyPhoto}"><div><h2>${winner.name}</h2><p>${winner.role||'Equipo de ventas'} · ${branchName(winner.branchId)}</p><div class="bigStars">${ratingStars(winner.avg)}</div><b>${winner.avg.toFixed(2)} de 5 · ${winner.count} evaluaciones</b><p>${winner.reports?'Reportes recibidos: '+winner.reports:'Sin reportes negativos en el período'}</p></div></div>`:'<p class="sub">Se mostrará cuando existan encuestas en el período.</p>'}</div>
  <div class="card section"><div class="sectionHead"><h2>Resumen inteligente</h2><span class="pill blue">Gerencia</span></div><div class="adviceBox">💡 ${managerAdvice(rows)}</div><div class="miniLeaders"><p><b>Mejor sede:</b> ${branchRank[0]&&branchRank[0].count?branchRank[0].name+' · '+branchRank[0].avg.toFixed(2):'Sin datos'}</p><p><b>Mejor canal:</b> ${channelRank[0]&&channelRank[0].count?(channelRank[0].icon||'')+' '+channelRank[0].name+' · '+channelRank[0].avg.toFixed(2):'Sin datos'}</p><p><b>Índice de confianza:</b> <span class="pill ${av>=4.5?'green':av>=3.5?'blue':'red'}">${av>=4.5?'Muy alto':av>=3.5?'Bueno':'Necesita mejorar'}</span></p></div></div></div>
  <div class="layout2"><div class="card section"><div class="sectionHead"><h2>Comparación por sede</h2></div>${branchRank.map(x=>`<div class="rankLine"><b>${x.name}</b><div class="bar"><span style="width:${x.avg*20}%"></span></div><strong>${x.avg.toFixed(2)}</strong><small>${x.count}</small></div>`).join('')}</div><div class="card section"><div class="sectionHead"><h2>Comparación por canal</h2></div>${channelRank.map(x=>`<div class="rankLine"><b>${x.icon||'💬'} ${x.name}</b><div class="bar"><span style="width:${x.avg*20}%"></span></div><strong>${x.avg.toFixed(2)}</strong><small>${x.count}</small></div>`).join('')}</div></div>
  <div class="layout2"><div class="card section"><div class="sectionHead"><h2>Evolución de 6 meses</h2></div><div class="managerChart">${months.map(x=>`<div class="monthCol"><span>${x.count}</span><div style="height:${18+x.count/mx*170}px"></div><b>${x.label}</b><small>${x.avg?x.avg.toFixed(1)+'★':'-'}</small></div>`).join('')}</div></div><div class="card section"><div class="sectionHead"><h2>Ranking del equipo</h2><button class="btn small secondary" data-go="history">Ver historial</button></div>${empRank.slice(0,8).map((e,i)=>`<div class="employeeLine"><span class="position">${i+1}</span><img class="photo" src="${e.photo||emptyPhoto}"><b>${e.name}</b><div class="bar"><span style="width:${e.avg*20}%"></span></div><b>${e.avg.toFixed(2)}</b><small>${e.count}</small></div>`).join('')||'<p class="sub">Sin evaluaciones.</p>'}</div></div>
  <div class="layout2"><div class="card section"><div class="sectionHead"><h2>❤️ Comentarios destacados</h2></div>${positives.map(s=>`<blockquote>“${commentText(s)}”<footer>${s.clientName||'Cliente anónimo'} · ${selectedEmployeesNames(s)}</footer></blockquote>`).join('')||'<p class="sub">Todavía no hay comentarios positivos escritos.</p>'}</div><div class="card section"><div class="sectionHead"><h2>⚠️ Oportunidades de mejora</h2></div>${negatives.map(s=>`<div class="negativeComment"><b>${selectedEmployeesNames(s)}</b><p>${s.badComment||commentText(s)||'Calificación baja sin comentario.'}</p><small>${fmt(s.date)} · ${branchName(s.branchId)} · ${channelName(s.channelId)}</small></div>`).join('')||'<p class="sub">Sin observaciones negativas en este período.</p>'}</div></div>
  <div class="card section"><div class="sectionHead"><h2>Encuestas recientes</h2><button class="btn small secondary" data-go="history">Ver historial completo</button></div>${recentTable(rows.slice(-6).reverse())}</div>`;
}
function selectedEmployeesNames(s){return surveyEmployeeIds(s).map(empName).join(', ')||empName(s.employeeId)}
function bindManagerDashboard(){
  $$('[data-period]').forEach(b=>b.onclick=()=>{managerPeriod=b.dataset.period;renderAdmin()});
  const cert=$('#printCertificate');if(cert)cert.onclick=()=>printEmployeeCertificate(employeeRanking(periodRows())[0]);
}
function printEmployeeCertificate(e){
  if(!e)return;const w=window.open('','_blank','width=1000,height=750');w.document.write(`<html><head><title>Reconocimiento Poladent</title><style>@page{size:landscape;margin:0}body{margin:0;font-family:Arial;color:#082b5c}.cert{height:100vh;box-sizing:border-box;border:18px solid #0b67c2;padding:42px;text-align:center;background:linear-gradient(135deg,#fff,#e9f5ff)}.logo{width:250px}.photo{width:150px;height:150px;object-fit:cover;border-radius:50%;border:7px solid #0b67c2}h1{font-size:48px;margin:16px}h2{font-size:38px;margin:10px}.line{width:65%;margin:30px auto;border-top:2px solid #082b5c}.stars{font-size:34px;color:#e9a400}</style></head><body><div class="cert"><img class="logo" src="${logo}"><h1>RECONOCIMIENTO</h1><p>Poladent Casa Dental otorga el reconocimiento de</p><h2>Empleado del Mes</h2><img class="photo" src="${e.photo||emptyPhoto}"><h2>${e.name}</h2><p>Por su excelente desempeño, compromiso y calidad en la atención al cliente.</p><div class="stars">${ratingStars(e.avg)}</div><p>${e.avg.toFixed(2)} de 5 · ${e.count} evaluaciones</p><div class="line"></div><p>Poladent Casa Dental · ${new Date().toLocaleDateString('es-VE',{month:'long',year:'numeric'})}</p></div></body></html>`);w.document.close();setTimeout(()=>w.print(),500);
}
// Extiende los eventos administrativos existentes sin reemplazarlos.
const bindAdminV72=bindAdmin;
bindAdmin=function(){bindAdminV72();if(current==='dashboard')bindManagerDashboard()};

// ================= POLADENT FEEDBACK ENTERPRISE V7.4 =================
// Seguridad administrativa, control de integridad, seguimiento, respaldo y auditoría.
const normalizeDataV73 = normalizeData;
normalizeData = function(d){
  d = normalizeDataV73(d);
  d.auditLog = Array.isArray(d.auditLog) ? d.auditLog : [];
  d.settings = d.settings || {};
  d.settings.security = d.settings.security || {autoLockMinutes:15, pinHash:'', pinMigrated:false};
  d.settings.security.autoLockMinutes = Math.max(3, Number(d.settings.security.autoLockMinutes)||15);
  d.surveys = d.surveys.map(s=>({
    ...s,
    integrityStatus:s.integrityStatus||'automatico',
    integrityNote:s.integrityNote||'',
    reviewedAt:s.reviewedAt||'',
    reviewedBy:s.reviewedBy||'',
    followStatus:s.followStatus||'Pendiente',
    followNote:s.followNote||'',
    followUpdatedAt:s.followUpdatedAt||''
  }));
  return d;
};
data = normalizeData(data);

async function sha256(text){
  const bytes=new TextEncoder().encode(String(text));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function verifyAdminPin(pin){
  const sec=data.settings?.security||{};
  if(sec.pinHash) return (await sha256(pin))===sec.pinHash;
  return String(pin)===String(data.pin||'2233');
}
async function migratePinHash(){
  const sec=data.settings.security;
  if(!sec.pinHash && data.pin){
    sec.pinHash=await sha256(data.pin);
    sec.pinMigrated=true;
    data.pin='';
    save();
  }
}
function logAudit(action,detail=''){
  data.auditLog=data.auditLog||[];
  data.auditLog.push({id:uid(),date:new Date().toISOString(),action,detail,user:'Administrador',deviceId:getDeviceId()});
  if(data.auditLog.length>500)data.auditLog=data.auditLog.slice(-500);
}
function derivedIntegrity(s){
  if(s.integrityStatus && s.integrityStatus!=='automatico') return s.integrityStatus;
  const n=abuseCount(s);
  if(n>=3)return 'sospechosa';
  if(n===2)return 'repetida';
  return 'valida';
}
function integrityPill(status){
  const cls=status==='valida'?'green':status==='repetida'?'yellow':'red';
  const label=status==='valida'?'Válida':status==='repetida'?'Repetida':'Sospechosa';
  return `<span class="pill ${cls}">${label}</span>`;
}
function integrityRows(){return [...data.surveys].sort((a,b)=>new Date(b.date)-new Date(a.date))}
function integrityView(){
  const rows=integrityRows(), suspicious=rows.filter(s=>derivedIntegrity(s)==='sospechosa').length, repeated=rows.filter(s=>derivedIntegrity(s)==='repetida').length, valid=rows.filter(s=>derivedIntegrity(s)==='valida').length;
  return `<div class="grid4"><div class="card stat"><div class="ico greenIco">✅</div><div><h3>VÁLIDAS</h3><strong>${valid}</strong><br><small>Sin señales de repetición</small></div></div><div class="card stat"><div class="ico" style="background:#d97706">↻</div><div><h3>REPETIDAS</h3><strong>${repeated}</strong><br><small>Segunda evaluación similar</small></div></div><div class="card stat"><div class="ico redIco">🚨</div><div><h3>SOSPECHOSAS</h3><strong>${suspicious}</strong><br><small>Tres o más coincidencias</small></div></div><div class="card stat"><div class="ico purpleIco">📱</div><div><h3>DISPOSITIVOS</h3><strong>${new Set(rows.map(s=>s.deviceId).filter(Boolean)).size}</strong><br><small>Identificadores únicos</small></div></div></div>
  <div class="card section"><div class="sectionHead"><div><h2>Control de integridad</h2><p class="sub">La IP se muestra solo como referencia. La detección prioriza dispositivo, sede, canal y personal evaluado.</p></div><div class="actions"><button class="btn small" id="exportIntegrity">Exportar CSV</button><button class="btn small secondary" id="printIntegrity">Imprimir reporte</button></div></div>
  <div class="filters"><div class="field"><label>Estado</label><select id="intStatus"><option value="">Todos</option><option value="valida">Válida</option><option value="repetida">Repetida</option><option value="sospechosa">Sospechosa</option></select></div><div class="field"><label>Sede</label><select id="intBranch"><option value="">Todas</option>${data.branches.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></div><div class="field"><label>Canal</label><select id="intChannel"><option value="">Todos</option>${data.channels.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><button class="btn" id="filterIntegrity">Filtrar</button></div><div id="integrityOut"></div></div>`;
}
function renderIntegrityTable(rows){
  const out=$('#integrityOut'); if(!out)return;
  out.innerHTML=`<div class="tableWrap"><table class="table"><tr><th>Fecha</th><th>Sede / Canal</th><th>Cliente</th><th>Evaluado</th><th>Coincidencias</th><th>Estado</th><th>Revisión</th></tr>${rows.map(s=>`<tr><td>${fmt(s.date)}</td><td>${branchName(s.branchId)}<br><small>${channelIcon(s.channelId)} ${channelName(s.channelId)}</small></td><td>${s.clientName||'Anónimo'}<br><small>${s.clientPhone||'Sin teléfono'}<br>${s.deviceId||'Sin ID'}<br>IP: ${s.ip||'-'}</small></td><td>${selectedEmployeesHtml(s)}</td><td><b>${abuseCount(s)}</b><br><small>mismo día / contexto</small></td><td>${integrityPill(derivedIntegrity(s))}</td><td><select data-int-status="${s.id}"><option value="automatico" ${s.integrityStatus==='automatico'?'selected':''}>Automático</option><option value="valida" ${s.integrityStatus==='valida'?'selected':''}>Válida</option><option value="repetida" ${s.integrityStatus==='repetida'?'selected':''}>Repetida</option><option value="sospechosa" ${s.integrityStatus==='sospechosa'?'selected':''}>Sospechosa</option></select><textarea data-int-note="${s.id}" placeholder="Observación">${s.integrityNote||''}</textarea><button class="btn small" data-save-int="${s.id}">Guardar</button></td></tr>`).join('')}</table></div>`;
}
function filteredIntegrity(){
  const st=$('#intStatus')?.value||'', br=$('#intBranch')?.value||'', ch=$('#intChannel')?.value||'';
  return integrityRows().filter(s=>(!st||derivedIntegrity(s)===st)&&(!br||s.branchId===br)&&(!ch||s.channelId===ch));
}
function casesView(){
  const rows=data.surveys.filter(s=>Number(s.rating)<=2||s.badOther==='si'||(s.followStatus&&s.followStatus!=='Solucionado')).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pending=rows.filter(s=>(s.followStatus||'Pendiente')==='Pendiente').length, review=rows.filter(s=>s.followStatus==='En revisión').length, solved=rows.filter(s=>s.followStatus==='Solucionado').length;
  return `<div class="grid4"><div class="card stat"><div class="ico redIco">🔴</div><div><h3>PENDIENTES</h3><strong>${pending}</strong></div></div><div class="card stat"><div class="ico" style="background:#d97706">🟡</div><div><h3>EN REVISIÓN</h3><strong>${review}</strong></div></div><div class="card stat"><div class="ico greenIco">🟢</div><div><h3>SOLUCIONADOS</h3><strong>${solved}</strong></div></div><div class="card stat"><div class="ico purpleIco">📋</div><div><h3>TOTAL CASOS</h3><strong>${rows.length}</strong></div></div></div>
  <div class="card section"><div class="sectionHead"><div><h2>Seguimiento de casos</h2><p class="sub">Registra la acción tomada y conserva el historial de cada observación.</p></div><button class="btn small secondary" id="printCases">Imprimir</button></div><div class="tableWrap"><table class="table"><tr><th>Fecha</th><th>Sede / Canal</th><th>Cliente</th><th>Personal</th><th>Situación</th><th>Seguimiento</th></tr>${rows.map(s=>`<tr><td>${fmt(s.date)}</td><td>${branchName(s.branchId)}<br><small>${channelName(s.channelId)}</small></td><td>${s.clientName||'Anónimo'}<br><small>${s.clientPhone||''}</small></td><td>${selectedEmployeesHtml(s)}${s.badEmployeeId?`<hr><b>Persona reportada:</b><br><span class="miniEmp"><img src="${empPhoto(s.badEmployeeId)}">${empName(s.badEmployeeId)}</span>`:''}</td><td><span class="stars">${ratingStars(s.rating)}</span><p>${s.badComment||commentText(s)||'Sin comentario escrito.'}</p></td><td><select data-case-status="${s.id}"><option ${s.followStatus==='Pendiente'?'selected':''}>Pendiente</option><option ${s.followStatus==='En revisión'?'selected':''}>En revisión</option><option ${s.followStatus==='Solucionado'?'selected':''}>Solucionado</option></select><textarea data-case-note="${s.id}" placeholder="Acción tomada">${s.followNote||''}</textarea><button class="btn small" data-save-case="${s.id}">Guardar seguimiento</button></td></tr>`).join('')}</table></div></div>`;
}
function settings(){
  const audits=(data.auditLog||[]).slice(-30).reverse();
  return `<div class="layout2"><div class="card section"><h2>Seguridad administrativa</h2><p class="sub">La clave se guarda como huella SHA-256, no como texto visible.</p><div class="field"><label>Nueva clave</label><input id="newPin" type="password" minlength="4" placeholder="Mínimo 4 caracteres"></div><div class="field"><label>Confirmar clave</label><input id="confirmPin" type="password"></div><div class="field"><label>Bloqueo automático</label><select id="autoLock"><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15" ${data.settings.security.autoLockMinutes===15?'selected':''}>15 minutos</option><option value="30" ${data.settings.security.autoLockMinutes===30?'selected':''}>30 minutos</option><option value="60" ${data.settings.security.autoLockMinutes===60?'selected':''}>60 minutos</option></select></div><button class="btn" id="saveSecurity">Guardar seguridad</button><hr><h3>Pregunta de reporte interno</h3><div class="field"><label>Texto</label><textarea id="reportText">${data.settings.reportQuestion.text}</textarea></div><label class="anonBox"><input type="checkbox" id="reportActive" ${data.settings.reportQuestion.active?'checked':''}> Mostrar esta pregunta</label><button class="btn secondary" id="saveReportQuestion">Guardar pregunta</button></div>
  <div class="card section"><h2>Respaldos y entrega</h2><p class="sub">Descarga una copia antes de limpiar pruebas o hacer cambios importantes.</p><div class="actions"><button class="btn" id="backup">Descargar respaldo JSON</button><label class="btn secondary fileBtn">Restaurar respaldo<input type="file" id="restore" accept="application/json" hidden></label><button class="btn secondary" id="printExecutive">Imprimir informe gerencial</button></div><hr><h3>Limpieza controlada</h3><p>Elimina únicamente encuestas de prueba. Empleados, fotos, sedes, canales, preguntas y enlaces se conservan.</p><button class="btn danger" id="wipeSurveys">Borrar encuestas</button><hr><h3>Reglas de Firebase</h3><p class="sub">Esta versión usa GitHub Pages sin Firebase Authentication. Para producción avanzada, activa Authentication antes de cerrar completamente la lectura administrativa.</p><button class="btn secondary" id="copyRules">Copiar reglas compatibles</button></div></div>
  <div class="card section"><div class="sectionHead"><h2>Auditoría reciente</h2><button class="btn small secondary" id="exportAudit">Exportar auditoría</button></div><div class="tableWrap"><table class="table"><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Dispositivo</th></tr>${audits.map(a=>`<tr><td>${fmt(a.date)}</td><td>${a.action}</td><td>${a.detail||'-'}</td><td><small>${a.deviceId||'-'}</small></td></tr>`).join('')||'<tr><td colspan="4">Sin eventos registrados todavía.</td></tr>'}</table></div></div>`;
}
function downloadAudit(){
  const rows=data.auditLog||[];let csv='Fecha,Accion,Detalle,Usuario,Dispositivo\n'+rows.map(a=>`"${fmt(a.date)}","${String(a.action).replaceAll('"','')} ","${String(a.detail||'').replaceAll('"','')}","${a.user||'Administrador'}","${a.deviceId||''}"`).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='auditoria_poladent_v7_4.csv';a.click();
}
function printPage(title,body){
  const w=window.open('','_blank','width=1100,height=800');w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;color:#0b2b55;padding:25px}h1{color:#075faa}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccd7e4;padding:7px;vertical-align:top}th{background:#e8f3ff}.logo{width:220px}.pill{padding:3px 7px;border-radius:10px;background:#e8f3ff}</style></head><body><img class="logo" src="${logo}"><h1>${title}</h1><p>Generado: ${new Date().toLocaleString('es-VE')}</p>${body}</body></html>`);w.document.close();setTimeout(()=>w.print(),500);
}
function printIntegrity(rows){printPage('Reporte de integridad',`<table><tr><th>Fecha</th><th>Sede / Canal</th><th>Cliente</th><th>Evaluado</th><th>Estado</th><th>Observación</th></tr>${rows.map(s=>`<tr><td>${fmt(s.date)}</td><td>${branchName(s.branchId)} / ${channelName(s.channelId)}</td><td>${s.clientName||'Anónimo'}<br>${s.deviceId||''}</td><td>${selectedEmployeesNames(s)}</td><td>${derivedIntegrity(s)}</td><td>${s.integrityNote||''}</td></tr>`).join('')}</table>`)}
function printCases(){const rows=data.surveys.filter(s=>Number(s.rating)<=2||s.badOther==='si'||(s.followStatus&&s.followStatus!=='Solucionado'));printPage('Seguimiento de casos',`<table><tr><th>Fecha</th><th>Sede / Canal</th><th>Personal</th><th>Situación</th><th>Estado</th><th>Acción tomada</th></tr>${rows.map(s=>`<tr><td>${fmt(s.date)}</td><td>${branchName(s.branchId)} / ${channelName(s.channelId)}</td><td>${selectedEmployeesNames(s)}${s.badEmployeeId?'<br>Reportado: '+empName(s.badEmployeeId):''}</td><td>${s.badComment||commentText(s)||'Calificación baja'}</td><td>${s.followStatus||'Pendiente'}</td><td>${s.followNote||''}</td></tr>`).join('')}</table>`)}
function compatibleFirebaseRules(){return JSON.stringify({rules:{poladentFeedbackEnterpriseV4:{'.read':true,'.write':true}}},null,2)}
let adminLastActivity=Date.now(), lockTimer=null;
function startAutoLock(){
  adminLastActivity=Date.now();['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>adminLastActivity=Date.now(),{passive:true}));
  clearInterval(lockTimer);lockTimer=setInterval(()=>{const min=data.settings?.security?.autoLockMinutes||15;if(!$('#adminApp')?.classList.contains('hidden')&&Date.now()-adminLastActivity>min*60000){logAudit('Sesión bloqueada','Inactividad de '+min+' minutos');save();location.reload()}},30000);
}
function bindIntegrity(){
  const refresh=()=>renderIntegrityTable(filteredIntegrity()); renderIntegrityTable(integrityRows());
  $('#filterIntegrity')&&($('#filterIntegrity').onclick=refresh);
  $('#exportIntegrity')&&($('#exportIntegrity').onclick=()=>downloadCSV(filteredIntegrity()));
  $('#printIntegrity')&&($('#printIntegrity').onclick=()=>printIntegrity(filteredIntegrity()));
  $$('[data-save-int]').forEach(b=>b.onclick=()=>{const s=data.surveys.find(x=>x.id===b.dataset.saveInt);if(!s)return;s.integrityStatus=$(`[data-int-status="${s.id}"]`).value;s.integrityNote=$(`[data-int-note="${s.id}"]`).value.trim();s.reviewedAt=new Date().toISOString();s.reviewedBy='Administrador';logAudit('Integridad revisada',`${selectedEmployeesNames(s)} · ${s.integrityStatus}`);save();renderAdmin()});
}
function bindCases(){
  $$('[data-save-case]').forEach(b=>b.onclick=()=>{const s=data.surveys.find(x=>x.id===b.dataset.saveCase);if(!s)return;s.followStatus=$(`[data-case-status="${s.id}"]`).value;s.followNote=$(`[data-case-note="${s.id}"]`).value.trim();s.followUpdatedAt=new Date().toISOString();logAudit('Caso actualizado',`${selectedEmployeesNames(s)} · ${s.followStatus}`);save();renderAdmin()});
  $('#printCases')&&($('#printCases').onclick=printCases);
}
function bindSecuritySettings(){
  $('#saveSecurity')&&($('#saveSecurity').onclick=async()=>{const p=$('#newPin').value,c=$('#confirmPin').value;if(p&&p.length<4)return alert('La clave debe tener al menos 4 caracteres.');if(p!==c)return alert('Las claves no coinciden.');if(p){data.settings.security.pinHash=await sha256(p);data.pin='';data.settings.security.pinMigrated=true;}data.settings.security.autoLockMinutes=Number($('#autoLock').value)||15;logAudit('Seguridad actualizada',p?'Clave y bloqueo automático':'Bloqueo automático');save();alert('Seguridad guardada.')});
  $('#saveReportQuestion')&&($('#saveReportQuestion').onclick=()=>{data.settings.reportQuestion.text=$('#reportText').value.trim()||data.settings.reportQuestion.text;data.settings.reportQuestion.active=$('#reportActive').checked;logAudit('Pregunta de reporte editada',data.settings.reportQuestion.text);save();alert('Pregunta actualizada.')});
  $('#backup')&&($('#backup').onclick=()=>{logAudit('Respaldo descargado','JSON completo');save();downloadJSON()});
  $('#restore')&&($('#restore').onchange=()=>{const f=$('#restore').files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const restored=normalizeData(JSON.parse(r.result));if(!confirm('¿Restaurar este respaldo? Se reemplazarán los datos actuales.'))return;data=restored;logAudit('Respaldo restaurado',f.name);save();alert('Respaldo restaurado.');location.reload()}catch(e){alert('El archivo no es un respaldo válido.')}};r.readAsText(f)});
  $('#wipeSurveys')&&($('#wipeSurveys').onclick=()=>{if(confirm('¿Borrar todas las encuestas? Esta acción no elimina empleados, fotos, sedes, canales ni preguntas.')){const n=data.surveys.length;data.surveys=[];logAudit('Encuestas eliminadas',`${n} registros`);save();renderAdmin()}});
  $('#printExecutive')&&($('#printExecutive').onclick=()=>{const rows=periodRows();printPage('Informe gerencial Poladent',`<h2>Resumen</h2><p>Encuestas: ${rows.length}<br>Promedio: ${averageRows(rows).toFixed(2)} / 5<br>Casos pendientes: ${rows.filter(s=>(Number(s.rating)<=2||s.badOther==='si')&&(s.followStatus||'Pendiente')!=='Solucionado').length}</p><h2>Ranking</h2><table><tr><th>Empleado</th><th>Sede</th><th>Promedio</th><th>Encuestas</th></tr>${employeeRanking(rows).map(e=>`<tr><td>${e.name}</td><td>${branchName(e.branchId)}</td><td>${e.avg.toFixed(2)}</td><td>${e.count}</td></tr>`).join('')}</table>`)});
  $('#copyRules')&&($('#copyRules').onclick=async()=>{await navigator.clipboard.writeText(compatibleFirebaseRules());alert('Reglas copiadas. Recuerda: para seguridad avanzada debes activar Firebase Authentication.')});
  $('#exportAudit')&&($('#exportAudit').onclick=downloadAudit);
}

const adminInitV73=adminInit;
adminInit=function(){
  if(!$('#adminApp'))return;
  $('#loginLogo').src=logo;$('#sideLogo').src=logo;$('#logoAdmin').src=logo;
  $('#loginBtn').onclick=async()=>{const btn=$('#loginBtn');btn.disabled=true;btn.textContent='Verificando...';const ok=await verifyAdminPin($('#pin').value);btn.disabled=false;btn.textContent='Entrar al administrador';if(ok){await migratePinHash();sessionStorage.setItem('poladent_admin_session','1');logAudit('Inicio de sesión','Acceso al panel V7.4');save();$('#login').classList.add('hidden');$('#adminApp').classList.remove('hidden');renderAdmin();startAutoLock()}else alert('Clave incorrecta')};
  $$('.navBtn').forEach(b=>b.onclick=()=>{if(!b.dataset.view)return;current=b.dataset.view;$$('.navBtn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderAdmin()});
  $('#logoutBtn').onclick=()=>{logAudit('Cierre de sesión','Manual');save();sessionStorage.removeItem('poladent_admin_session');location.reload()};
};

renderAdmin=function(){
  if(!$('#content'))return;data=normalizeData(data);
  const titles={dashboard:['Dashboard','Calidad de atención al cliente'],branches:['Sedes','Valencia, Maracay y futuras sedes'],channels:['Canales','Tienda, WhatsApp, Instagram y llamadas'],links:['Enlaces y QR','Enlaces personalizados para clientes externos'],employees:['Empleados','Fotos, sede y canales de atención'],questions:['Preguntas','Encuesta rápida y editable'],history:['Historial','Filtros por sede, canal, empleado y fecha'],integrity:['Integridad','Control de repetición y validación de encuestas'],cases:['Casos','Seguimiento de observaciones y calificaciones bajas'],settings:['Configuración','Seguridad, respaldo y auditoría']};
  $('#pageTitle').textContent=titles[current]?.[0]||'Dashboard';$('#pageSub').textContent=titles[current]?.[1]||'';
  const views={dashboard:dash(),branches:branches(),channels:channels(),links:linksView(),employees:employees(),questions:questions(),history:history(),integrity:integrityView(),cases:casesView(),settings:settings()};
  $('#content').innerHTML=views[current]||dash();bindAdmin();if(current==='links')setTimeout(renderAllQRCodes,50);
};
const bindAdminV73Final=bindAdmin;
bindAdmin=function(){
  bindAdminV73Final();
  if(current==='dashboard')bindManagerDashboard();
  if(current==='integrity')bindIntegrity();
  if(current==='cases')bindCases();
  if(current==='settings')bindSecuritySettings();
};
