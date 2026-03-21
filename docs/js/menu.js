const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');

// ════════════════════════════════════════
// js/menu.js
// ════════════════════════════════════════
// ── MENU ──────────────────────────────────────────────
let menuStars=[];
for(let i=0;i<120;i++) menuStars.push({x:Math.random()*800,y:Math.random()*520,r:Math.random()*1.5+0.3,t:Math.random()*Math.PI*2});

// Show hello message on first load
let hasShownHello = false;

function drawMenu(){
  ctx.fillStyle='#000010'; ctx.fillRect(0,0,800,520);
  // stars
  menuStars.forEach(s=>{
    s.t+=0.02;
    const a=0.4+Math.sin(s.t)*0.3;
    ctx.globalAlpha=a; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
  // title
  ctx.shadowColor='#88f'; ctx.shadowBlur=30;
  ctx.fillStyle='#fff'; ctx.font='bold 44px Courier New'; ctx.textAlign='center';
  ctx.fillText('🐹 SPACE GERBIL',400,90);
  ctx.shadowBlur=0;
  ctx.fillStyle='#aaf'; ctx.font='16px Courier New';
  ctx.fillText('A  D  V  E  N  T  U  R  E',400,118);

  // Planet cards
  const cards=[
    {x:100,label:'🌍',name:'Earth — Area 51',n:1},
    {x:270,label:'🌴',name:'Jungle Zorbax',n:2},
    {x:440,label:'❄️',name:'Tundra Frigia',n:3},
    {x:610,label:'🌊',name:'Aquatic Neptuna',n:4},
  ];
  cards.forEach(c=>{
    const cleared=save.planetsCleared.includes(c.n);
    const locked=save.freePlay?false:(c.n===2&&!save.planetsCleared.includes(1))||(c.n===3&&!save.planetsCleared.includes(2))||(c.n===4&&!save.planetsCleared.includes(3));
    ctx.strokeStyle=cleared?'#4f4':locked?'#333':'#55f';
    ctx.fillStyle=cleared?'rgba(10,40,10,0.8)':locked?'rgba(5,5,15,0.6)':'rgba(20,20,60,0.8)';
    ctx.lineWidth=2;
    roundRect(ctx,c.x-70,150,140,140,10); ctx.fill(); ctx.stroke();
    ctx.lineWidth=1;
    ctx.font='42px serif'; ctx.textAlign='center';
    ctx.globalAlpha=locked?0.4:1;
    ctx.fillText(c.label,c.x,225);
    ctx.globalAlpha=1;
    ctx.fillStyle=cleared?'#4f4':locked?'#555':'#aef';
    ctx.font='11px Courier New'; ctx.textAlign='center';
    ctx.fillText(c.name,c.x,268);
    ctx.fillStyle=cleared?'#4f4':locked?'#555':'#aaf';
    ctx.font='10px Courier New';
    ctx.fillText(cleared?'✓ Cleared':locked?'🔒 Locked':save.freePlay?'Free Play':'Play',c.x,285);
  });

  // Buttons
  drawBtn(250,330,140,32,'🚀 New Game','#226','#55f');
  drawBtn(410,330,140,32,'🎮 Free Play','#141','#4f4');
  drawBtn(400,380,160,30,'🎭 Skins','rgba(40,0,80,0.8)','rgba(180,80,255,0.6)');

  ctx.fillStyle='#445'; ctx.font='10px Courier New'; ctx.textAlign='center';
  ctx.fillText(save.freePlay ? 'Free Play: Click any planet to play' : 'Click a planet or button to start',400,400);
  if(save.planetsCleared.length>0&&!save.freePlay){
    ctx.fillStyle='#335'; ctx.fillText('Cleared: '+save.planetsCleared.map(n=>['','Earth','Zorbax'][n]||'P'+n).join(', '),400,418);}
  if(save.freePlay){
    ctx.fillStyle='#4f4'; ctx.fillText('🎮 Free Play Mode Active',400,418);}
  if(save.spaceCoins>0){
    ctx.fillStyle='#FFD700'; ctx.font='bold 12px Courier New'; ctx.fillText('🪙 '+save.spaceCoins+' Space Coins',400,435);}

  // Show hello message on first menu display
  if (!hasShownHello) {
    hasShownHello = true;
    setTimeout(() => {
      showMsg('Hello!', 'Welcome to Space Gerbil Adventure!\n\nGet ready for an epic journey across the galaxy!');
    }, 500);
  }

  animFrameId=requestAnimationFrame(drawMenu);
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
function drawBtn(cx,cy,w,h,label,bg,border){
  ctx.fillStyle=bg; ctx.strokeStyle=border; ctx.lineWidth=1.5;
  roundRect(ctx,cx-w/2,cy-h/2,w,h,6); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='12px Courier New'; ctx.textAlign='center';
  ctx.fillText(label,cx,cy+4);
}

canvas.addEventListener('click',menuClick);
function menuClick(e){
  if(!menuMode) return;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  // Planet cards
  const cards=[{x:100,n:1},{x:270,n:2},{x:440,n:3},{x:610,n:4}];
  for(const c of cards){
    if(mx>c.x-70&&mx<c.x+70&&my>150&&my<290){
      if(!save.freePlay){
        if(c.n===4&&!save.planetsCleared.includes(3)) return;
        if(c.n===3&&!save.planetsCleared.includes(2)) return;
        if(c.n===2&&!save.planetsCleared.includes(1)) return;
      }
      startPlanet(c.n); return;
    }
  }
  // Buttons
  if(mx>180&&mx<320&&my>314&&my<346){ startNewGame(); return; }
  if(mx>340&&mx<480&&my>314&&my<346){ startFreePlay(); setTimeout(()=>showMsg('🎮 Free Play Mode', 'All planets unlocked!\nClick any planet to play.'),100); return; }
  if(mx>320&&mx<480&&my>365&&my<395){ cancelAnimationFrame(animFrameId);openSkinMenu(); return; }
}

let menuMode=true;
function showMenu(){
  menuMode=true;
  document.getElementById('hud').style.display='none';
  document.getElementById('invBar').style.display='none';
  document.getElementById('ctrl').style.display='none';
  cancelAnimationFrame(animFrameId);
  animFrameId=requestAnimationFrame(drawMenu);
}
function goMenu(){stopGame();showMenu();}
function stopGame(){cancelAnimationFrame(animFrameId);animFrameId=null;gamePaused=false;}
function startNewGame(){save=JSON.parse(JSON.stringify(DEF));persist();startPlanet(1);}
function startFreePlay(){save.freePlay=true;save.planetsCleared=[1,2,3,4];persist();}
function startPlanet(n){
  console.log('[SGA] startPlanet called with n='+n);
  menuMode=false;
  cancelAnimationFrame(animFrameId); animFrameId=null;
  canvas.removeEventListener('click',menuClick);
  document.getElementById('hud').style.display='flex';
  document.getElementById('invBar').style.display='block';
  document.getElementById('ctrl').style.display='block';
  document.getElementById('bh').style.display=n===2?'':'none';
  document.getElementById('fuelMax').textContent=n===4?'25':n===3?'20':n===2?'15':'10';
  const pLabels={1:'Earth — Area 51',2:'Jungle — Zorbax',3:'Tundra Frigia',4:'Aquatic Neptuna'};
  document.getElementById('planet').textContent=pLabels[n]||'Unknown';
  save.currentPlanet=n; save.resources.fuel=0;
  updateHUD();
  console.log('[SGA] About to launch planet '+n);
  if(n===1) launchP1();
  else if(n===2) launchP2();
  else if(n===3) launchP3();
  else if(n===4) launchP4();
  console.log('[SGA] launchP'+n+'() returned');
}
function showTransition(text,sub,cb){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,800,520);
  ctx.fillStyle='#aaf'; ctx.font='24px Courier New'; ctx.textAlign='center';
  ctx.fillText(text.split('\n')[0],400,220);
  if(text.split('\n')[1]){ctx.fillStyle='#88f';ctx.font='18px Courier New';ctx.fillText(text.split('\n')[1],400,255);}
  ctx.fillStyle='#668'; ctx.font='13px Courier New'; ctx.fillText(sub,400,290);
  ctx.font='56px serif'; ctx.fillText('🚀',400,170);
  if(cb) setTimeout(cb,2800);
}