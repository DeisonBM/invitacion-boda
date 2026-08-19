const overlay=document.querySelector('#sobre-overlay');const content=document.querySelector('#content-layer');
function openInvitation(){if(!overlay||overlay.classList.contains('abierto'))return;overlay.classList.add('abierto');setTimeout(()=>content?.classList.add('revelado'),500);setTimeout(()=>overlay.remove(),1700);playMusic()}
overlay?.addEventListener('click',openInvitation);overlay?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openInvitation()}});
const weddingDate=new Date('2026-09-19T18:00:00-06:00').getTime();const countdown=document.querySelector('#countdown');function updateCountdown(){if(!countdown)return;const distance=weddingDate-Date.now();if(distance<=0){countdown.innerHTML='<p>Hoy comienza nuestra historia para siempre.</p>';return}const values={days:Math.floor(distance/86400000),hours:Math.floor(distance/3600000)%24,minutes:Math.floor(distance/60000)%60,seconds:Math.floor(distance/1000)%60};Object.entries(values).forEach(([unit,value])=>{const el=countdown.querySelector(`[data-unit="${unit}"]`);if(el)el.textContent=unit==='days'?String(value):String(value).padStart(2,'0')})}updateCountdown();setInterval(updateCountdown,1000);
const music=document.querySelector('#wedding-music');const musicToggle=document.querySelector('#music-toggle');const musicLabel=document.querySelector('#music-label');function setMusicState(playing){musicToggle?.classList.toggle('is-playing',playing);musicToggle?.setAttribute('aria-label',playing?'Pausar música':'Reproducir música');if(musicLabel)musicLabel.textContent=playing?'Pausa':'Música'}function playMusic(){music?.play().then(()=>setMusicState(true)).catch(()=>setMusicState(false))}musicToggle?.addEventListener('click',()=>music?.paused?(playMusic()):(music.pause(),setMusicState(false)));document.addEventListener('click',()=>{if(music?.paused)playMusic()},{once:true});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{const target=document.querySelector(link.getAttribute('href'));if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth'})}}));

/* ---------------- RSVP dinámico por invitado ---------------- */
const params=new URLSearchParams(window.location.search);
const guestId=params.get('id');
const rsvpGuestName=document.querySelector('#rsvp-guest-name');
const rsvpCupos=document.querySelector('#rsvp-cupos');
const rsvpEstado=document.querySelector('#rsvp-estado');
const btnAbrirRsvp=document.querySelector('#btn-abrir-rsvp');
const rsvpModal=document.querySelector('#rsvp-modal');
const modalClose=document.querySelector('#modal-close');
const rsvpForm=document.querySelector('#rsvp-form');
const rsvpAsistencia=document.querySelector('#rsvp-asistencia');
const cuposWrap=document.querySelector('#cupos-wrap');
const cuposMax=document.querySelector('#cupos-max');
const cuposInput=document.querySelector('#rsvp-cupos-input');
const formStatus=document.querySelector('#form-status');

let guestData=null;

async function cargarInvitado(){
  if(!guestId){
    if(rsvpGuestName)rsvpGuestName.textContent='Esta invitación no tiene un enlace personalizado válido.';
    return;
  }
  try{
    const res=await fetch(`${CONFIG.SCRIPT_URL}?action=info&id=${encodeURIComponent(guestId)}`);
    const data=await res.json();
    if(!data.ok){
      if(rsvpGuestName)rsvpGuestName.textContent='No encontramos tu invitación. Contacta a los novios.';
      return;
    }
    guestData=data;
    if(rsvpGuestName)rsvpGuestName.textContent=`Hola, ${data.nombre}`;
    if(rsvpCupos)rsvpCupos.textContent=`Tienes ${data.cuposAsignados} cupo(s) asignado(s).`;
    if(data.yaConfirmo && rsvpEstado){
      rsvpEstado.hidden=false;
      rsvpEstado.textContent=data.asistencia==='Si'
        ? `Ya confirmaste: asistirás con ${data.cuposConfirmados} cupo(s).`
        : 'Ya confirmaste que no podrás asistir.';
    }
    if(cuposMax)cuposMax.textContent=data.cuposAsignados;
    if(cuposInput)cuposInput.max=data.cuposAsignados;
    btnAbrirRsvp?.removeAttribute('hidden');
  }catch(err){
    if(rsvpGuestName)rsvpGuestName.textContent='Ocurrió un error al cargar tu invitación.';
  }
}
cargarInvitado();

btnAbrirRsvp?.addEventListener('click',()=>{rsvpModal?.removeAttribute('hidden')});
modalClose?.addEventListener('click',()=>{rsvpModal?.setAttribute('hidden','')});
rsvpModal?.addEventListener('click',e=>{if(e.target===rsvpModal)rsvpModal.setAttribute('hidden','')});

rsvpAsistencia?.addEventListener('change',()=>{
  if(cuposWrap)cuposWrap.style.display=rsvpAsistencia.value==='No'?'none':'block';
});

rsvpForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!guestId||!guestData){
    if(formStatus)formStatus.textContent='No se pudo identificar tu invitación.';
    return;
  }
  const data=new FormData(rsvpForm);
  const payload={
    action:'confirmar',
    id:guestId,
    asistencia:data.get('asistencia'),
    cuposUsados:data.get('cuposUsados'),
    mensaje:data.get('mensaje')||''
  };
  if(formStatus)formStatus.textContent='Enviando…';
  try{
    const res=await fetch(CONFIG.SCRIPT_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload)
    });
    const result=await res.json();
    if(result.ok){
      if(formStatus)formStatus.textContent='¡Gracias! Tu confirmación fue recibida.';
      setTimeout(()=>{rsvpModal?.setAttribute('hidden','');cargarInvitado()},1400);
    }else{
      if(formStatus)formStatus.textContent=result.error||'Ocurrió un error, intenta de nuevo.';
    }
  }catch(err){
    if(formStatus)formStatus.textContent='Ocurrió un error de conexión, intenta de nuevo.';
  }
});
