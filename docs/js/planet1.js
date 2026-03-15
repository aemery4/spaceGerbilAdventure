function launchP1(){
  stopGame();
  const TILE=40,COLS=32,ROWS=22;
  const pl={x:3*TILE+20,y:3*TILE+20,size:14,speed:save.items.includes('boots')?6:4,keys:{}};
  const cam={x:0,y:0};
  const map=[
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,3,3,3,0,0,0,0,0,0,0,1],
    [1,0,0,0,2,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,3,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,1],
    [1,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];
  const rocket={x:16*TILE,y:10*TILE,w:56,h:50};
  let res=[
    {x:3,y:2,t:'rock',l:'🪨',c:'#888',hp:3,m:3},{x:8,y:3,t:'plant',l:'🌿',c:'#2a2',hp:2,m:2},
    {x:13,y:5,t:'crystal',l:'💎',c:'#88f',hp:2,m:2},{x:15,y:2,t:'rock',l:'🪨',c:'#888',hp:3,m:3},
    {x:6,y:9,t:'plant',l:'🌿',c:'#2a2',hp:2,m:2},{x:10,y:7,t:'crystal',l:'💎',c:'#88f',hp:2,m:2},
    {x:4,y:11,t:'rock',l:'🪨',c:'#888',hp:3,m:3},{x:16,y:10,t:'plant',l:'🌿',c:'#2a2',hp:2,m:2},
    {x:24,y:5,t:'rock',l:'🪨',c:'#888',hp:3,m:3},{x:28,y:8,t:'plant',l:'🌿',c:'#2a2',hp:2,m:2},
    {x:11,y:2,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},{x:14,y:8,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},
    {x:7,y:11,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},{x:17,y:6,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},
    {x:2,y:5,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},{x:9,y:12,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},
    {x:25,y:3,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},{x:29,y:11,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},
    {x:20,y:14,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},{x:1,y:18,t:'fuel',l:'⚡',c:'#ff0',hp:1,m:1},
  ];
  let aliens=[
    {x:14*TILE+20,y:3*TILE+20,hp:3,m:3,col:'#0f0',sz:14,spd:.5,dx:.5,dy:0},
    {x:7*TILE+20,y:10*TILE+20,hp:3,m:3,col:'#f80',sz:14,spd:.6,dx:-.4,dy:.4},
    {x:16*TILE+20,y:8*TILE+20,hp:2,m:2,col:'#f0f',sz:12,spd:.7,dx:.3,dy:-.5},
    {x:25*TILE+20,y:5*TILE+20,hp:3,m:3,col:'#0ff',sz:13,spd:.55,dx:-.4,dy:.3},
    {x:22*TILE+20,y:15*TILE+20,hp:4,m:4,col:'#f44',sz:15,spd:.6,dx:.5,dy:.2},
    {x:28*TILE+20,y:12*TILE+20,hp:2,m:2,col:'#ff0',sz:12,spd:.8,dx:-.3,dy:.4},
    {x:8*TILE+20,y:18*TILE+20,hp:3,m:3,col:'#8f8',sz:13,spd:.65,dx:.4,dy:-.3},
  ];
  let pts=[];
  function ap(x,y,c,n=8){for(let i=0;i<n;i++)pts.push({x,y,vx:(Math.random()-.5)*4,vy:(Math.random()-.5)*4,life:30,c});}
  function solid(px,py){const tx=Math.floor(px/TILE),ty=Math.floor(py/TILE);if(tx<0||ty<0||tx>=COLS||ty>=ROWS)return true;return map[ty][tx]===1||map[ty][tx]===3;}
  function drawTile(tx,ty){
    const t=map[ty][tx],sx=tx*TILE-cam.x,sy=ty*TILE-cam.y;
    // 0 = base floor (dirt/grass compound)
    if(t===0){
      ctx.fillStyle='#1a2e10'; ctx.fillRect(sx,sy,TILE,TILE);
      // subtle patchy ground variation
      if((tx*7+ty*13)%5===0){ctx.fillStyle='rgba(40,70,15,0.4)';ctx.fillRect(sx+4,sy+4,TILE-8,TILE-8);}
      if((tx*3+ty*11)%8===0){ctx.fillStyle='rgba(80,50,10,0.2)';ctx.fillRect(sx+6,sy+10,TILE-12,8);}
      ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
    }
    // 1 = concrete wall (Area 51 bunker)
    if(t===1){
      ctx.fillStyle='#3a3a3a'; ctx.fillRect(sx,sy,TILE,TILE);
      // concrete block pattern
      const row=ty%2===0;
      ctx.fillStyle='#464646';
      for(let i=0;i<2;i++){
        const bx=row?(i*22):(i*22+11);
        ctx.fillRect(sx+bx+1,sy+2,20,TILE/2-3);
        ctx.fillRect(sx+bx+1,sy+TILE/2+1,20,TILE/2-3);
      }
      // crack detail
      if((tx*9+ty*5)%11<2){ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(sx+8,sy+6);ctx.lineTo(sx+14,sy+18);ctx.stroke();ctx.lineWidth=1;}
      ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
    }
    // 2 = radioactive water pool
    if(t===2){
      ctx.fillStyle='#0a1830'; ctx.fillRect(sx,sy,TILE,TILE);
      // glowing liquid
      const gw=ctx.createRadialGradient(sx+TILE/2,sy+TILE/2,2,sx+TILE/2,sy+TILE/2,TILE/2);
      gw.addColorStop(0,'rgba(0,200,80,0.35)'); gw.addColorStop(1,'rgba(0,60,30,0.1)');
      ctx.fillStyle=gw; ctx.fillRect(sx,sy,TILE,TILE);
      // animated ripple shimmer using tx+ty as phase offset
      const rp=Math.sin(Date.now()*0.002+(tx+ty)*0.8)*0.12+0.18;
      ctx.strokeStyle=`rgba(0,255,100,${rp})`; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.arc(sx+TILE/2,sy+TILE/2,TILE/2-5,0,Math.PI*2); ctx.stroke();
      ctx.lineWidth=1;
      // biohazard ☢ tint glow
      ctx.shadowColor='rgba(0,255,80,0.4)'; ctx.shadowBlur=8;
      ctx.fillStyle='rgba(0,0,0,0)'; ctx.fillRect(sx,sy,1,1); // trigger shadow
      ctx.shadowBlur=0;
    }
    // 3 = desert sand
    if(t===3){
      ctx.fillStyle='#c8a040'; ctx.fillRect(sx,sy,TILE,TILE);
      // sand grain ripple pattern
      ctx.fillStyle='rgba(200,160,40,0.5)';
      for(let i=0;i<3;i++){
        const wy=sy+6+i*10;
        ctx.beginPath(); ctx.moveTo(sx+2,wy); ctx.quadraticCurveTo(sx+TILE/2,wy-3,sx+TILE-2,wy); ctx.stroke();
      }
      // sandy highlight
      if((tx*6+ty*4)%7===0){ctx.fillStyle='rgba(255,220,100,0.3)';ctx.beginPath();ctx.ellipse(sx+TILE/2-3,sy+TILE/2-3,6,4,0.4,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(160,110,10,0.3)'; ctx.lineWidth=0.5; ctx.strokeRect(sx,sy,TILE,TILE); ctx.lineWidth=1;
    }
  }
  function doAction(mx,my){
    if(gamePaused)return;
    // Check for resources first (higher priority than spaceship)
    for(let i=res.length-1;i>=0;i--){
      const r=res[i],rx2=r.x*TILE+TILE/2,ry2=r.y*TILE+TILE/2;
      const reach=save.items.includes('scanner')?TILE*3.5:TILE*2;
      if(Math.hypot(mx-rx2,my-ry2)<TILE*.9&&Math.hypot(pl.x-rx2,pl.y-ry2)<reach){
        r.hp--;ap(rx2,ry2,r.c);
        if(r.hp<=0){save.resources[r.t]=(save.resources[r.t]||0)+1;res.splice(i,1);updateHUD();}
        return;
      }
    }
    // Check for aliens (higher priority than spaceship)
    for(let i=aliens.length-1;i>=0;i--){
      const a=aliens[i];
      if(Math.hypot(mx-a.x,my-a.y)<a.sz+10&&Math.hypot(pl.x-a.x,pl.y-a.y)<TILE*3){
        a.hp--;ap(a.x,a.y,'#f44');
        if(a.hp<=0){ap(a.x,a.y,'#ff0',12);aliens.splice(i,1);}
        return;
      }
    }
    // Check spaceship last
    if(mx>rocket.x&&mx<rocket.x+rocket.w&&my>rocket.y&&my<rocket.y+rocket.h){
      if(save.resources.fuel>=10){
        if(!save.planetsCleared.includes(1))save.planetsCleared.push(1);
        save.resources.fuel=0;persist();
        stopGame();showTransition('🚀 Blasting Off!\n🌍 → Zorbax','Jungle planet ahead...',()=>startPlanet(2));
      } else showMsg('Need More Fuel!','Collect 10 ⚡ fuel. Have: '+save.resources.fuel+'/10.');
      return;
    }
    // Nothing nearby fallback
    showMsg('Nothing Here','Walk closer to resources, aliens, or the saucer to interact.');
  }
  function onK(e){
    pl.keys[e.key]=true;
    if((e.key==='f'||e.key==='F')) doAction(pl.x, pl.y);
    e.preventDefault();
  }
  function offK(e){pl.keys[e.key]=false;}
  function onC(e){
    const r2=canvas.getBoundingClientRect();
    doAction(e.clientX-r2.left+cam.x, e.clientY-r2.top+cam.y);
  }
  window.addEventListener('keydown',onK);window.addEventListener('keyup',offK);canvas.addEventListener('click',onC);
  function loop(){
    if(!gamePaused){
      let dx=0,dy=0;
      if(pl.keys['ArrowLeft']||pl.keys['a']||pl.keys['A'])dx-=pl.speed;
      if(pl.keys['ArrowRight']||pl.keys['d']||pl.keys['D'])dx+=pl.speed;
      if(pl.keys['ArrowUp']||pl.keys['w']||pl.keys['W'])dy-=pl.speed;
      if(pl.keys['ArrowDown']||pl.keys['s']||pl.keys['S'])dy+=pl.speed;
      const r=pl.size,nx=pl.x+dx,ny=pl.y+dy;
      if(!solid(nx-r,pl.y-r)&&!solid(nx+r,pl.y-r)&&!solid(nx-r,pl.y+r)&&!solid(nx+r,pl.y+r))pl.x=nx;
      if(!solid(pl.x-r,ny-r)&&!solid(pl.x+r,ny-r)&&!solid(pl.x-r,ny+r)&&!solid(pl.x+r,ny+r))pl.y=ny;
      aliens.forEach(a=>{
        const pd=Math.hypot(pl.x-a.x,pl.y-a.y);
        if(pd<TILE*5){const ang=Math.atan2(pl.y-a.y,pl.x-a.x);a.x+=Math.cos(ang)*a.spd*.6;a.y+=Math.sin(ang)*a.spd*.6;
          if(pd<a.sz+pl.size){const dmg=save.items.includes('shield')?.025:.05;save.hp=Math.max(0,save.hp-dmg);updateHUD();if(save.hp<=0){window.removeEventListener('keydown',onK);window.removeEventListener('keyup',offK);canvas.removeEventListener('click',onC);loseLife(()=>{cancelAnimationFrame(animFrameId);launchP1();});}}}
        else{a.x+=a.dx;a.y+=a.dy;if(a.x<TILE||a.x>(COLS-1)*TILE)a.dx*=-1;if(a.y<TILE||a.y>(ROWS-1)*TILE)a.dy*=-1;}
      });
      pts=pts.filter(p=>p.life>0);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;});
      if(save.items.includes('magnet')){for(let i=res.length-1;i>=0;i--){if(res[i].t!=='fuel')continue;if(Math.hypot(pl.x-res[i].x*TILE-TILE/2,pl.y-res[i].y*TILE-TILE/2)<TILE*3){save.resources.fuel++;res.splice(i,1);updateHUD();}}}
      cam.x=Math.max(0,Math.min(pl.x-400,COLS*TILE-800));cam.y=Math.max(0,Math.min(pl.y-260,ROWS*TILE-520));
    }
    ctx.fillStyle='#080818';ctx.fillRect(0,0,800,520);
    for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++)drawTile(tx,ty);
    const rx=rocket.x-cam.x,ry=rocket.y-cam.y;
    if(save.resources.fuel>=10){ctx.shadowColor='#ff0';ctx.shadowBlur=18;}
    ctx.fillStyle='#aaa';ctx.beginPath();ctx.ellipse(rx+28,ry+28,20,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(100,200,255,.6)';ctx.beginPath();ctx.ellipse(rx+28,ry+24,10,6,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='10px Courier New';ctx.textAlign='center';ctx.fillText('🛸 SAUCER',rx+28,ry+48);
    res.forEach(r=>{const sx=r.x*TILE+TILE/2-cam.x,sy=r.y*TILE+TILE/2-cam.y;ctx.font='18px serif';ctx.textAlign='center';ctx.fillText(r.l,sx,sy+5);if(r.hp<r.m){ctx.fillStyle='#333';ctx.fillRect(sx-9,sy+8,18,3);ctx.fillStyle='#4f4';ctx.fillRect(sx-9,sy+8,18*(r.hp/r.m),3);}});
    aliens.forEach(a=>{const ax=a.x-cam.x,ay=a.y-cam.y;ctx.fillStyle=a.col;ctx.beginPath();ctx.arc(ax,ay,a.sz,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.beginPath();ctx.arc(ax-3,ay-2,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ax+3,ay-2,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#300';ctx.fillRect(ax-10,ay-a.sz-7,20,3);ctx.fillStyle='#f44';ctx.fillRect(ax-10,ay-a.sz-7,20*(a.hp/a.m),3);});
    pts.forEach(p=>{ctx.globalAlpha=p.life/30;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x-cam.x,p.y-cam.y,2.5,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    const px=pl.x-cam.x,py=pl.y-cam.y;
    drawPlayerSkin(ctx, px, py, pl.size);
    ctx.fillStyle='#300';ctx.fillRect(px-18,py-pl.size-9,36,4);ctx.fillStyle=save.hp>50?'#4f4':save.hp>25?'#fa0':'#f44';ctx.fillRect(px-18,py-pl.size-9,36*(save.hp/save.maxHp),4);
    if(gamePaused){ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(0,0,800,520);}
    animFrameId=requestAnimationFrame(loop);
  }
  animFrameId=requestAnimationFrame(loop);
  showMsg('🛸 Space Gerbil','Area 51! Collect 10 ⚡ fuel and click the saucer.\n\nWASD: move | Click: gather/attack | C: craft');
}



// ════════════════════════════════════════
// js/planet2.js
// ════════════════════════════════════════
// ── PLANET2 ───────────────────────────────────────────