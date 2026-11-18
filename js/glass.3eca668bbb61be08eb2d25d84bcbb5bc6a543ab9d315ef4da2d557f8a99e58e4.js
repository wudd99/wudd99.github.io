(function(){
 // Text links use a small press offset, without preparing a glass surface.
 const buttonLinkSelector='a.pub-tag.link,a.poster-tag,a.tag-option,.post-tags a,.social-links a,.nav a,.mobile-menu a,a.blog-cover-link,a.profile-home,a.ref-brand,a.skip-link';
 function textLinkFor(target){
  if(!(target instanceof Element))return null;
  const link=target.closest('a[href]');
  if(!link||link.matches(buttonLinkSelector)||link.matches('[disabled],[aria-disabled="true"]')||link.closest('[inert]'))return null;
  return link;
 }
 // Only a genuine action owns feedback. Decorative containers never inherit it.
 const surfaceSelector='button.tag-option,a.tag-option[href],button.text-button,button.search-submit,button.close-menu,button.appearance-button,.clickable-card[tabindex],.clickable-card[onclick],a.pub-tag.link[href],a.poster-tag[href],button.pub-filter-chip,button.timeline-marker,.profile-card .social-links a[href],.nav ul li a[href],.mobile-menu ul li a[href],.blog-card a.blog-cover-link[href],.ref-topbar button,a.ref-brand[href],label.switch,.close-menu[role="button"]';
 function surfaceFor(target){
  if(!(target instanceof Element)||textLinkFor(target))return null;
  const surface=target.closest(surfaceSelector);if(!surface)return null;
  if(surface.matches('[data-liquidgl-material],.timeline-marker:has([data-liquidgl-material])'))return null;
  if(surface.matches('[disabled],[aria-disabled="true"]')||surface.closest('[inert]')||surface.querySelector('input:disabled'))return null;
  const control=target.closest('a,button,input,label,select,textarea,[role="button"]');
  if(control&&control!==surface&&surface.matches('.clickable-card'))return null;
  return surface;
 }
 // The original tactile handler uses this same resolver, avoiding parent effects.
 window.WYH_GLASS_SURFACE_FOR=surfaceFor;
 document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('a[href]').forEach(link=>{if(textLinkFor(link))link.classList.add('text-link')});
  let scrolled;
  function updateGlass(){const next=window.scrollY>12;if(next!==scrolled){scrolled=next;document.documentElement.classList.toggle('glass-scrolled',next)}}
  updateGlass();window.addEventListener('scroll',updateGlass,{passive:true});
  const pending=new Map(),rebounds=new Map();let active=null,hovered=null,frame=0;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverCapability=window.matchMedia('(hover: hover) and (pointer: fine)');
  let frameState=null,frameX=0,frameY=0;
  function cancelFrame(){if(frame){cancelAnimationFrame(frame);frame=0}frameState=null}
  function paintPosition(){frame=0;const state=frameState;frameState=null;if(state&&(active===state||(!active&&hovered===state)))positionLiquid(state,frameX,frameY)}
  function schedulePosition(state,x,y){frameState=state;frameX=x;frameY=y;if(!frame)frame=requestAnimationFrame(paintPosition)}
  function clearLiquid(surface){surface.classList.remove('liquid-pressed','liquid-releasing')}
  function clearHover(){if(hovered)hovered.surface.classList.remove('liquid-hover');hovered=null}
  function reset(){
   cancelFrame();
   if(active){active.surface.classList.remove('glass-pressed','text-pressed');clearLiquid(active.surface)}active=null;
   pending.forEach((timer,surface)=>{clearTimeout(timer);surface.classList.remove('glass-pressed','text-pressed');clearLiquid(surface)});pending.clear();
   rebounds.forEach((timer,surface)=>{clearTimeout(timer);clearLiquid(surface)});rebounds.clear();
  }
  function cancelAll(){reset();clearHover()}
  function prepare(surface){
   if(!surface.classList.contains('liquid-ready')){
    const computed=getComputedStyle(surface),position=computed.position,radius=computed.borderTopLeftRadius;
    if(position==='static')surface.classList.add('liquid-positioned');
    if(radius==='0px')surface.classList.add('liquid-rounded');
    surface.classList.add('liquid-ready',surface.matches('.clickable-card')?'liquid-card':'liquid-control');
   }
   if(!surface.querySelector(':scope > .liquid-glass-skin')){
    const skin=document.createElement('span');skin.className='liquid-glass-skin';skin.setAttribute('aria-hidden','true');surface.appendChild(skin);
   }
  }
  function positionLiquid(state,x,y){
   const r=state.rect;if(!r.width||!r.height)return;
   const px=Math.max(0,Math.min(1,(x-r.left)/r.width)),py=Math.max(0,Math.min(1,(y-r.top)/r.height));
   const nx=px*2-1,ny=py*2-1,style=state.surface.style;
   style.setProperty('--liquid-x',(px*100).toFixed(2)+'%');style.setProperty('--liquid-y',(py*100).toFixed(2)+'%');
   style.setProperty('--liquid-rx',(-ny*1.2).toFixed(3)+'deg');style.setProperty('--liquid-ry',(nx*1.2).toFixed(3)+'deg');
   style.setProperty('--liquid-angle',(135+nx*42-ny*28).toFixed(2)+'deg');
   style.setProperty('--liquid-shadow-x',(nx*5).toFixed(2)+'px');style.setProperty('--liquid-shadow-y',(9+ny*3).toFixed(2)+'px');
   style.setProperty('--liquid-cast-x',(-nx*14).toFixed(2)+'px');style.setProperty('--liquid-cast-y',(18+ny*6).toFixed(2)+'px');
  }
  function setHover(surface,x,y){
   if(hovered?.surface!==surface){clearHover();if(!surface)return;prepare(surface);hovered={surface,rect:surface.getBoundingClientRect()};surface.classList.add('liquid-hover')}
   if(!hovered)return;
   schedulePosition(hovered,x,y);
  }
  function canHover(event){return hoverCapability.matches&&event.pointerType!=='touch'&&!event.buttons}
  function begin(target,details){
   reset();const text=textLinkFor(target),surface=text||surfaceFor(target);if(!surface){clearHover();return}
   if(text){
    clearHover();active={surface,text:true,started:performance.now(),...details};
    surface.classList.add('text-link','text-pressed');return;
   }
   if(details.kind==='pointer'&&details.pointerType!=='touch'&&hoverCapability.matches){setHover(surface,details.x,details.y)}else clearHover();
   prepare(surface);const rect=surface.getBoundingClientRect();
   active={surface,rect,started:performance.now(),...details};
   positionLiquid(active,details.kind==='pointer'?details.x:rect.left+rect.width/2,details.kind==='pointer'?details.y:rect.top+rect.height/2);
   surface.classList.add('liquid-pressed','glass-pressed');
  }
  function rebound(surface){
   if(!surface.classList.contains('liquid-pressed'))return;surface.classList.remove('liquid-pressed');
   if(reducedMotion.matches||!surface.isConnected)return;
   surface.classList.add('liquid-releasing');rebounds.set(surface,setTimeout(()=>{surface.classList.remove('liquid-releasing');rebounds.delete(surface)},440));
  }
  function release(immediate=false){
   if(immediate){cancelAll();return}if(!active)return;
   const press=active;active=null;cancelFrame();
   const delay=Math.max(70,160-(performance.now()-press.started)),surface=press.surface;
   pending.set(surface,setTimeout(()=>{surface.classList.remove('glass-pressed','text-pressed');if(!press.text)rebound(surface);pending.delete(surface)},delay));
  }
  document.addEventListener('pointerover',event=>{if(!active&&canHover(event))setHover(surfaceFor(event.target),event.clientX,event.clientY)},{passive:true});
  document.addEventListener('pointerout',event=>{
   if(hovered&&surfaceFor(event.relatedTarget)!==hovered.surface)clearHover();
   if(active?.kind==='pointer'&&active.pointerType==='touch'&&event.pointerId===active.id&&!active.surface.contains(event.relatedTarget))release(true);
  },{passive:true});
  document.addEventListener('pointerdown',event=>{
   if(event.button!==0||event.isPrimary===false)return;
   begin(event.target,{kind:'pointer',id:event.pointerId,pointerType:event.pointerType,x:event.clientX,y:event.clientY});
  },{passive:true});
  document.addEventListener('pointermove',event=>{
   if(!active){if(canHover(event))setHover(surfaceFor(event.target),event.clientX,event.clientY);return}
   if(active.kind!=='pointer'||event.pointerId!==active.id)return;
   const touch=active.pointerType==='touch';
   if(touch){
    const hit=document.elementFromPoint(event.clientX,event.clientY);
    if(Math.hypot(event.clientX-active.x,event.clientY-active.y)>10||!hit||!active.surface.contains(hit)){release(true);return}
   }else if(event.buttons===0&&!active.nativeDragging){release();return}
   // Mouse movement keeps the same press owner, even beyond the original card.
   if(!active.text)schedulePosition(active,event.clientX,event.clientY);
  },{passive:true});
  document.addEventListener('pointerup',event=>{if(active?.kind==='pointer'&&event.pointerId===active.id)release()},{passive:true});
  document.addEventListener('pointercancel',()=>{if(!active?.nativeDragging)cancelAll()},{passive:true});
  document.addEventListener('dragstart',()=>{
   if(active?.kind==='pointer'&&active.pointerType!=='touch')active.nativeDragging=true;
   else cancelAll();
  },{passive:true});
  document.addEventListener('drag',event=>{
   if(!active?.nativeDragging||(!event.clientX&&!event.clientY))return;
   if(!active.text)schedulePosition(active,event.clientX,event.clientY);
  },{passive:true});
  ['dragend','drop'].forEach(type=>document.addEventListener(type,()=>release(),{passive:true}));
  document.addEventListener('scroll',()=>{
   clearHover();
   if(active?.kind==='pointer'&&active.pointerType!=='touch'){cancelFrame();if(!active.text)active.rect=active.surface.getBoundingClientRect();return}
   reset();
  },{capture:true,passive:true});window.addEventListener('blur',cancelAll);
  window.addEventListener('resize',cancelAll,{passive:true});
  window.addEventListener('pagehide',cancelAll);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAll()});
  hoverCapability.addEventListener?.('change',cancelAll);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){cancelAll();return}
   if(event.repeat||(event.key!=='Enter'&&event.key!==' '))return;
   if(event.key===' '&&event.target instanceof Element&&event.target.matches('a[href]:not([role="button"])'))return;
   if(!(event.target instanceof Element)||!event.target.matches('a[href],button,input[type="checkbox"],input[type="radio"],[role="button"],.clickable-card[tabindex]'))return;
   begin(event.target,{kind:'keyboard',key:event.key});
  },true);
  document.addEventListener('keyup',event=>{if(active?.kind==='keyboard'&&event.key===active.key)release()},true);
 });
})();
