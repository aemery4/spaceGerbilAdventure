const fs=require('fs'),vm=require('vm');
const FILES=['js/globals.js','js/save.js','js/hud.js','js/craft.js','js/menu.js','js/planet1.js','js/planet2.js','js/p3-data.js','js/p3-draw.js','js/p3-logic.js','js/planet3.js','js/skins.js'];
let ok=true; const fail=m=>{console.log('  ✗ '+m);ok=false;};

console.log('\n📁 Files...'); for(const f of FILES) fs.existsSync(f)?console.log('  ✓ '+f):fail('MISSING: '+f);
console.log('\n🔤 Syntax...'); for(const f of FILES){if(!fs.existsSync(f))continue;try{new vm.Script(fs.readFileSync(f,'utf8'));console.log('  ✓ '+f);}catch(e){fail(f+': '+e.message);}}
console.log('\n🔗 Combined...'); let combined=''; for(const f of FILES) if(fs.existsSync(f))combined+=fs.readFileSync(f,'utf8')+'\n'; try{new vm.Script(combined);console.log('  ✓ Clean');}catch(e){fail('Cross-file: '+e.message);}
console.log('\n🆔 HTML IDs...'); const html=fs.readFileSync('index.html','utf8'); const used=[...combined.matchAll(/getElementById\(['"](\w[\w-]*)['"]\)/g)].map(m=>m[1]); const def=new Set([...html.matchAll(/id=["']([\w-]+)["']/g)].map(m=>m[1])); const miss=[...new Set(used)].filter(id=>!def.has(id)); miss.length?fail('Missing: '+miss.join(', ')):console.log('  ✓ All IDs exist');

console.log('\n🚀 Runtime...');
const mockCtx=new Proxy({},{get:(_,k)=>k==='width'?800:k==='height'?520:k==='canvas'?{width:800,height:520}:()=>mockCtx});
const mockEl={style:{display:''},textContent:'',innerHTML:'',appendChild:()=>{},addEventListener:()=>{},getContext:()=>mockCtx,width:800,height:520};
const sandbox=vm.createContext({window:{addEventListener:()=>{}},document:{getElementById:()=>mockEl,addEventListener:()=>{}},localStorage:{getItem:()=>null,setItem:()=>{}},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setTimeout:()=>{},clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},Math,JSON,Date:{now:()=>1000},performance:{now:()=>1000},AudioContext:function(){return{createOscillator:()=>({connect:()=>{},start:()=>{},stop:()=>{},frequency:{setValueAtTime:()=>{}},type:''}),createGain:()=>({connect:()=>{},gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}}}),destination:{},currentTime:0};},console:{log:()=>{},warn:()=>{},error:()=>{}}});
let loaded=true; for(const f of FILES){try{vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);}catch(e){fail('Load: '+f+': '+e.message);loaded=false;break;}}
if(loaded){console.log('  ✓ All loaded');try{vm.runInContext('launchP1()',sandbox);console.log('  ✓ launchP1() OK');}catch(e){fail('launchP1: '+e.message);}try{vm.runInContext('launchP2()',sandbox);console.log('  ✓ launchP2() OK');}catch(e){fail('launchP2: '+e.message);}}

console.log('\n'+'─'.repeat(40));
if(ok)console.log('✅ All checks passed!\n');
else{console.log('❌ Fix errors before playing!\n');process.exit(1);}
