/* Protocol Zero - static educational simulation. No network scanning or real system access. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const KEYS = { accounts: 'pz_accounts_v1', session: 'pz_session_v1', guest: 'pz_guest_v1' };
  const faDigits = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const nowIso = () => new Date().toISOString();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const readJson = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast('ذخیره‌سازی مرورگر در دسترس نیست.', 'error'); return false; } };
  const missions = [
    {id:'PZ:001', title:'ردپای خاموش', category:'رمزگشایی', level:'آسان', difficulty:'easy', xp:100, estimate:'۳ دقیقه', desc:'یک پیام قدیمی با کدگذاری هگزادسیمال پیدا شده. آن را به متن تبدیل کن تا نخستین سرنخ آشکار شود.', evidence:'SOURCE: recovered_packet_01\nENCODING: HEX\nDATA: 53 48 41 44 4F 57\n\n// پیام را بازیابی کن', answer:'SHADOW', hint:'هر دو رقم هگزادسیمال معادل یک بایت است. حروف ASCII را پیدا کن.'},
    {id:'PZ:002', title:'اثر انگشت', category:'تحلیل رمز', level:'آسان', difficulty:'easy', xp:120, estimate:'۴ دقیقه', desc:'در یادداشت اپراتور، یک الگوی ساده باقی مانده. کلمهٔ نهایی از کنار هم گذاشتن حروف به‌دست می‌آید.', evidence:'NOTE: caesar_shift = 3\nCIPHER: SDOSDOL\n\n// هر حرف را سه خانه به عقب ببر', answer:'PALPALI', hint:'در رمز سزار، هر حرف سه موقعیت در الفبای انگلیسی جابه‌جا شده است.'},
    {id:'PZ:003', title:'کلید گمشده', category:'منطق و الگو', level:'متوسط', difficulty:'medium', xp:160, estimate:'۵ دقیقه', desc:'سیستم فقط با پاسخ درست به دنباله اجازهٔ ادامه می‌دهد. الگوی عددی را کشف کن.', evidence:'SEQUENCE: 2, 6, 12, 20, 30, ?\nRULE: hidden pattern\n\n// عدد بعدی چیست؟', answer:'42', hint:'به‌جای جمع یک عدد ثابت، حاصل‌ضرب دو عدد متوالی را بررسی کن.'},
    {id:'PZ:004', title:'کانال صفر', category:'تحلیل سرنخ', level:'متوسط', difficulty:'medium', xp:180, estimate:'۶ دقیقه', desc:'یک پیام با الفبای دودویی ثبت شده. هشت بیت را به حرف تبدیل کن و مسیر را ادامه بده.', evidence:'BINARY: 01011010\nCHARSET: ASCII\n\n// بایت را به حرف تبدیل کن', answer:'Z', hint:'عدد دودویی 01011010 برابر با 90 در مبنای ده است. حرف ASCII شمارهٔ 90 را پیدا کن.'},
    {id:'PZ:005', title:'دروازهٔ نهایی', category:'ترکیب سرنخ‌ها', level:'سخت', difficulty:'hard', xp:250, estimate:'۸ دقیقه', desc:'آخرین قفل فقط با کلمه‌ای باز می‌شود که در تمام این محیط تکرار شده. نام رمز پروژه را وارد کن.', evidence:'PROJECT: PROTOCOL ZERO\nACCESS PHRASE: ???\nHINTS FOUND: 4\n\n// نام رمز را وارد کن', answer:'PROTOCOL ZERO', hint:'دو کلمه؛ نام همین محیط، بدون تغییر.'}
  ];
  const badgeDefs = [
    {id:'first_login', icon:'⌘', title:'ورود به شبکه', desc:'اولین بار وارد پروتکل صفر شو.', test:s=>s.loginCount>0},
    {id:'first_solve', icon:'⌖', title:'اولین گام', desc:'اولین مأموریت را تکمیل کن.', test:s=>s.completed.length>=1},
    {id:'xp_300', icon:'✳', title:'جمع‌کنندهٔ داده', desc:'حداقل ۳۰۰ امتیاز تجربه کسب کن.', test:s=>s.xp>=300},
    {id:'three_solve', icon:'◇', title:'تحلیل‌گر', desc:'سه مأموریت را حل کن.', test:s=>s.completed.length>=3},
    {id:'all_solve', icon:'▣', title:'معمار پروتکل', desc:'تمام مأموریت‌ها را تکمیل کن.', test:s=>s.completed.length>=missions.length},
    {id:'terminal', icon:'>_', title:'صدای ترمینال', desc:'اولین فرمان را در ترمینال اجرا کن.', test:s=>s.commands>=1}
  ];
  const blankStats = () => ({xp:0, completed:[], history:[], commands:0, loginCount:0, joined:nowIso(), displayName:'', bio:'', sound:false, motion:true, sessionXp:0, hintsUsed:[], unlocked:[]});
  let currentUser = null;
  let currentAccountKey = null;
  let accountMode = 'login';
  let activeMission = null;
  let activeFilter = 'all';
  let audioContext = null;
  let terminalLines = 0;
  let submissionLocked = false;
  const rankForXp = xp => xp >= 600 ? {name:'GHOST', fa:'شبح شبکه', level:4} : xp >= 350 ? {name:'SPECIALIST', fa:'متخصص', level:3} : xp >= 150 ? {name:'ANALYST', fa:'تحلیل‌گر', level:2} : {name:'ROOKIE', fa:'تازه‌کار', level:1};
  const findAccount = identity => {
    const accounts = readJson(KEYS.accounts, {});
    const normalized = identity.trim().toLowerCase();
    return Object.entries(accounts).find(([key, acc]) => key === normalized || (acc.email && acc.email.toLowerCase() === normalized));
  };
  const persistAccount = () => {
    if (currentAccountKey && currentUser && currentUser.type === 'account') {
      const accounts = readJson(KEYS.accounts, {});
      if (accounts[currentAccountKey]) { accounts[currentAccountKey].stats = currentUser.stats; accounts[currentAccountKey].displayName = currentUser.displayName; writeJson(KEYS.accounts, accounts); }
    } else if (currentUser && currentUser.type === 'guest') writeJson(KEYS.guest, currentUser);
  };
  const toast = (message, type = 'success', detail = '') => {
    const el = document.createElement('div'); el.className = `toast ${type === 'error' ? 'error' : ''}`;
    const line = document.createElement('div'); line.textContent = message; el.appendChild(line);
    if (detail) { const sub = document.createElement('small'); sub.textContent = detail; el.appendChild(sub); }
    $('#toastRegion').appendChild(el); setTimeout(() => el.remove(), 3400);
  };
  const setAuthError = (message, success = false) => { const el = $('#authError'); el.textContent = message; el.classList.toggle('success', success); };
  const cryptoAvailable = () => !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const fromB64 = string => Uint8Array.from(atob(string), c => c.charCodeAt(0));
  async function hashPassword(password, saltText) {
    if (cryptoAvailable()) {
      const salt = saltText ? fromB64(saltText) : crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt, iterations:120000, hash:'SHA-256'}, key, 256);
      return {salt:toB64(salt), hash:toB64(bits), scheme:'PBKDF2-SHA256'};
    }
    // Compatibility fallback only for local demo use. Static browser storage is not real account security.
    let hash = 2166136261;
    for (const char of `${saltText || 'pz-local'}:${password}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return {salt:saltText || 'pz-local', hash:(hash >>> 0).toString(16), scheme:'demo-fallback'};
  }
  const constantEqual = (a,b) => { if (a.length !== b.length) return false; let d=0; for(let i=0;i<a.length;i++) d|=a.charCodeAt(i)^b.charCodeAt(i); return d===0; };
  const newStats = () => blankStats();
  function switchAuthMode(mode) {
    accountMode = mode;
    const isRegister = mode === 'register';
    $('#loginTab').classList.toggle('active', !isRegister); $('#registerTab').classList.toggle('active', isRegister);
    $('#loginTab').setAttribute('aria-selected', String(!isRegister)); $('#registerTab').setAttribute('aria-selected', String(isRegister));
    $('#authKicker').textContent = isRegister ? 'CREATE OPERATOR ID' : 'IDENTITY VERIFICATION';
    $('#authTitle').textContent = isRegister ? 'ساخت هویت جدید' : 'بازگشت به لایهٔ صفر';
    $('#authSubtitle').textContent = isRegister ? 'یک شناسه بساز و اولین مأموریتت را آغاز کن.' : 'اطلاعات ورودت را وارد کن تا عملیات ادامه پیدا کند.';
    $('#identityLabel').textContent = isRegister ? 'نام کاربری' : 'نام کاربری یا ایمیل';
    $('#authIdentity').placeholder = isRegister ? 'حداقل ۳ حرف انگلیسی یا عدد' : 'مثلاً agent_zero';
    $('#authPassword').autocomplete = isRegister ? 'new-password' : 'current-password';
    $('#authPassword').placeholder = isRegister ? 'حداقل ۸ کاراکتر' : 'رمز عبور';
    $('#emailField').classList.toggle('visible', isRegister); $('#loginOptions').classList.toggle('hidden', isRegister);
    $('#authSubmitText').textContent = isRegister ? 'ساخت حساب محلی' : 'ورود امن'; $('#demoLogin').classList.toggle('hidden', isRegister); setAuthError('');
  }
  function saveSession(remember) {
    try { (remember ? localStorage : sessionStorage).setItem(KEYS.session, JSON.stringify({type:currentUser.type, key:currentAccountKey, guest:currentUser.type==='guest' ? currentUser : null})); if (remember) sessionStorage.removeItem(KEYS.session); else localStorage.removeItem(KEYS.session); } catch { /* Session still works in memory. */ }
  }
  function loadSession() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEYS.session) || sessionStorage.getItem(KEYS.session) || 'null'); } catch { saved = null; }
    if (!saved) return false;
    if (saved.type === 'guest' && saved.guest) { currentUser=saved.guest; currentAccountKey=null; return true; }
    if (saved.type === 'account' && saved.key) { const accounts=readJson(KEYS.accounts,{}); const acc=accounts[saved.key]; if (acc) { currentAccountKey=saved.key; currentUser={type:'account', username:acc.username, email:acc.email||'', displayName:acc.displayName||acc.username, stats:{...blankStats(),...(acc.stats||{})}}; return true; } }
    return false;
  }
  async function handleAuth(event) {
    event.preventDefault(); if (submissionLocked) return; submissionLocked=true; $('#authSubmit').disabled=true;
    const identity=$('#authIdentity').value.trim(), password=$('#authPassword').value;
    try {
      if (accountMode === 'register') {
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(identity)) throw new Error('نام کاربری باید ۳ تا ۲۴ کاراکتر انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.');
        if (password.length < 8) throw new Error('رمز عبور باید حداقل ۸ کاراکتر داشته باشد.');
        if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) throw new Error('برای قدرت بیشتر رمز، دست‌کم یک حرف انگلیسی و یک عدد وارد کن.');
        const accounts=readJson(KEYS.accounts,{}), key=identity.toLowerCase();
        if (accounts[key]) throw new Error('این نام کاربری قبلاً ثبت شده. نام دیگری انتخاب کن.');
        const email=$('#authEmail').value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('فرمت ایمیل درست نیست. یا ایمیل را خالی بگذار.');
        if (email && Object.values(accounts).some(a=>a.email && a.email.toLowerCase()===email.toLowerCase())) throw new Error('این ایمیل قبلاً در یک حساب محلی استفاده شده.');
        const hashed=await hashPassword(password);
        const stats=newStats(); stats.loginCount=1;
        accounts[key]={username:identity,email, salt:hashed.salt, passwordHash:hashed.hash, hashScheme:hashed.scheme, displayName:identity, stats, createdAt:nowIso()};
        if (!writeJson(KEYS.accounts,accounts)) throw new Error('مرورگر اجازهٔ ذخیره‌سازی نمی‌دهد. تنظیمات حریم خصوصی مرورگر را بررسی کن.');
        currentAccountKey=key; currentUser={type:'account',username:identity,email,displayName:identity,stats}; saveSession($('#rememberMe').checked);
        bootApp(); toast('هویت جدید ساخته شد','success','به شبکهٔ پروتکل صفر خوش آمدی.');
      } else {
        const found=findAccount(identity); if (!found) throw new Error('حسابی با این شناسه پیدا نشد. نام کاربری را بررسی یا حساب جدید بساز.');
        const [key,acc]=found; const hashed=await hashPassword(password,acc.salt);
        if (!constantEqual(hashed.hash, acc.passwordHash)) throw new Error('رمز عبور صحیح نیست. دوباره امتحان کن.');
        currentAccountKey=key; currentUser={type:'account',username:acc.username,email:acc.email||'',displayName:acc.displayName||acc.username,stats:{...blankStats(),...(acc.stats||{})}};
        currentUser.stats.loginCount=(currentUser.stats.loginCount||0)+1; addActivity('ورود به شبکه','هویت اپراتور تأیید شد.','⌘'); persistAccount(); saveSession($('#rememberMe').checked); bootApp(); toast('ورود موفق بود','success',`خوش برگشتی ${currentUser.displayName}`);
      }
    } catch(error) { setAuthError(error.message || 'عملیات انجام نشد. دوباره تلاش کن.'); }
    finally { submissionLocked=false; $('#authSubmit').disabled=false; }
  }
  function demoLogin() {
    const saved=readJson(KEYS.guest,null);
    currentUser=saved && saved.type==='guest' ? saved : {type:'guest',username:'Agent Zero',displayName:'Agent Zero',email:'',stats:newStats()};
    currentUser.stats={...blankStats(),...(currentUser.stats||{})}; currentUser.stats.loginCount=(currentUser.stats.loginCount||0)+1; currentAccountKey=null;
    addActivity('ورود آزمایشی','یک جلسهٔ آزمایشی آغاز شد.','⌘'); persistAccount(); saveSession(true); bootApp(); toast('حالت آزمایشی فعال شد','success','پیشرفت به‌صورت محلی ذخیره می‌شود.');
  }
  function addActivity(title, description, icon='⌁') {
    if (!currentUser) return; const arr=currentUser.stats.history || []; arr.unshift({title,description,icon,at:nowIso()}); currentUser.stats.history=arr.slice(0,8);
  }
  function updateBadges() {
    let justUnlocked=[];
    for (const badge of badgeDefs) if (badge.test(currentUser.stats) && !currentUser.stats.unlocked.includes(badge.id)) { currentUser.stats.unlocked.push(badge.id); justUnlocked.push(badge.title); }
    if(justUnlocked.length) persistAccount();
    justUnlocked.forEach(t=>toast(`نشان جدید: ${t}`,'success','یک دستاورد تازه باز شد!'));
  }
  function bootApp() {
    $('#authScreen').classList.add('hidden'); $('#appShell').classList.remove('hidden'); document.body.classList.toggle('reduce-motion',!currentUser.stats.motion);
    updateBadges(); updateAll(); showView('overview'); $('#soundToggle').classList.toggle('sound-enabled',!!currentUser.stats.sound); $('#soundSetting').checked=!!currentUser.stats.sound; $('#motionSetting').checked=currentUser.stats.motion!==false;
  }
  function updateAll() {
    const s=currentUser.stats, display=currentUser.displayName||currentUser.username, rank=rankForXp(s.xp);
    $('#welcomeName').textContent=display; $('#sidebarName').textContent=display; $('#sidebarRole').textContent=rank.fa; $('#sidebarAvatar').textContent=(display.trim()[0]||'A').toUpperCase(); $('#topAvatar').textContent=(display.trim()[0]||'A').toUpperCase(); $('#profileAvatarLarge').textContent=(display.trim()[0]||'A').toUpperCase();
    $('#statXp').innerHTML=`${faDigits(s.xp)} <small>XP</small>`; $('#statMissions').innerHTML=`${faDigits(s.completed.length)} <small>/ ${faDigits(missions.length)}</small>`;
    $('#missionPercent').textContent=faDigits(Math.round(s.completed.length/missions.length*100))+'٪'; $('#missionProgressBar').style.width=(s.completed.length/missions.length*100)+'%'; $('#heroProgress').textContent=faDigits(Math.round(s.completed.length/missions.length*100))+'٪'; $('#statRank').textContent=rank.name; $('#statLevel').textContent=faDigits(rank.level); $('#nextRankText').textContent=rank.name==='GHOST'?'بالاترین سطح':`تا سطح بعد: ${faDigits(Math.max(0,[150,350,600][rank.level-1]-s.xp))} XP`;
    $('#statSessionXp').textContent=faDigits(s.sessionXp||0); $('#missionsHeaderCount').textContent=`${faDigits(s.completed.length)} / ${faDigits(missions.length)}`;
    $('#localDate').textContent=new Intl.DateTimeFormat('fa-IR',{month:'short',day:'numeric',weekday:'short'}).format(new Date());
    $('#profileDisplayName').textContent=display; $('#profileHandle').textContent='@'+(currentUser.username||'agent').toLowerCase().replace(/[^a-z0-9_.-]/g,'_'); $('#profileRank').textContent=rank.name; $('#profileJoined').textContent=new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(s.joined||Date.now())); $('#profileXp').textContent=faDigits(s.xp)+' XP';
    renderActivity(); renderMissions(); renderBadges();
  }
  function renderActivity() {
    const list=$('#activityList'); list.replaceChildren(); const items=currentUser.stats.history||[];
    if(!items.length){const empty=document.createElement('div');empty.className='activity-empty';empty.textContent='هنوز فعالیتی ثبت نشده. اولین مأموریتت را شروع کن.';list.appendChild(empty);return;}
    for(const item of items.slice(0,4)){const row=document.createElement('div');row.className='activity-item';const ico=document.createElement('div');ico.className='activity-icon';ico.textContent=item.icon||'⌁';const copy=document.createElement('div');const title=document.createElement('b');title.textContent=item.title;const desc=document.createElement('p');desc.textContent=item.description;copy.append(title,desc);const time=document.createElement('time');time.textContent=relativeTime(item.at);row.append(ico,copy,time);list.appendChild(row);}
  }
  function relativeTime(value){const mins=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));if(mins<1)return 'همین حالا';if(mins<60)return faDigits(mins)+' دقیقه قبل';if(mins<1440)return faDigits(Math.floor(mins/60))+' ساعت قبل';return faDigits(Math.floor(mins/1440))+' روز قبل';}
  function renderMissions() {
    const grid=$('#missionsGrid'); grid.replaceChildren(); const s=currentUser.stats;
    const filtered=missions.filter(m=>activeFilter==='all'||(activeFilter==='completed'?s.completed.includes(m.id):!s.completed.includes(m.id)));
    if(!filtered.length){const el=document.createElement('div');el.className='activity-empty';el.style.gridColumn='1/-1';el.textContent='مأموریتی در این بخش نیست.';grid.appendChild(el);return;}
    for(const m of filtered){const done=s.completed.includes(m.id);const card=document.createElement('article');card.className='mission-card'+(done?' completed':'');card.innerHTML=`<div class="mission-card-top"><span class="mission-id">${m.id}</span><span class="mission-difficulty difficulty-${m.difficulty}">${m.level}</span></div><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.desc)}</p><div class="mission-card-meta"><span>◷ ${m.estimate}</span><span>⌖ ${escapeHtml(m.category)}</span><span class="xp">+${faDigits(m.xp)} XP</span></div><div class="mission-card-footer"><span class="mission-status"><i></i>${done?'تکمیل‌شده':'منتظر اپراتور'}</span><button class="mission-start" data-mission="${m.id}">${done?'مرور پرونده':'بازکردن پرونده'} ↙</button></div>`;grid.appendChild(card);}
  }
  function renderBadges() {
    const s=currentUser.stats, grid=$('#badgesGrid');grid.replaceChildren();const unlocked=s.unlocked||[];$('#badgeCount').textContent=`${faDigits(unlocked.length)} / ${faDigits(badgeDefs.length)}`;$('#badgePercent').textContent=faDigits(Math.round(unlocked.length/badgeDefs.length*100))+'٪';$('#achievementSummaryTitle').textContent=unlocked.length===badgeDefs.length?'مجموعه کامل شد!':unlocked.length===0?'هنوز اول راهی':'مسیرت را ادامه بده';$('#achievementSummaryText').textContent=`${faDigits(unlocked.length)} نشان از ${faDigits(badgeDefs.length)} نشان باز شده. هر مأموریت یک قدم جلوتر است.`;
    for(const b of badgeDefs){const open=unlocked.includes(b.id);const card=document.createElement('article');card.className='badge-card'+(open?' unlocked':'');card.innerHTML=`<div class="badge-emblem">${b.icon}</div><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.desc)}</p><span class="badge-state">${open?'✓ باز شده':'قفل است'}</span>`;grid.appendChild(card);}
  }
  const viewNames={overview:'نمای کلی',terminal:'ترمینال',missions:'مأموریت‌ها',achievements:'دستاوردها',profile:'پروفایل',settings:'تنظیمات'};
  function showView(view) {
    if(!viewNames[view])return; $$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`)); $$('.nav-link[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view)); $('#breadcrumbCurrent').textContent=viewNames[view]; closeSidebar();
    if(view==='terminal') setTimeout(()=>$('#terminalInput').focus(),100); if(view==='missions')renderMissions(); if(view==='achievements')renderBadges(); if(view==='profile'){ $('#profileNameInput').value=currentUser.displayName||currentUser.username; $('#profileBioInput').value=currentUser.stats.bio||''; $('#profileMessage').textContent=''; }
  }
  function openMission(id) {
    const mission=missions.find(m=>m.id===id);if(!mission)return;activeMission=mission;const done=currentUser.stats.completed.includes(id);
    $('#modalMissionId').textContent=mission.id;$('#modalCategory').textContent=mission.category.toUpperCase();$('#modalTitle').textContent=mission.title;$('#modalDescription').textContent=mission.desc;$('#modalEvidence').textContent=mission.evidence;$('#missionAnswer').value='';$('#missionMessage').textContent='';$('#missionMessage').classList.remove('success');$('#modalHint').classList.add('hidden');$('#showHintButton').disabled=false;$('#showHintButton').innerHTML='⌁ درخواست سرنخ <span>رایگان</span>';
    if(done){$('#missionMessage').textContent='این پرونده قبلاً تکمیل شده است. می‌توانی دوباره پاسخت را بررسی کنی.';$('#missionMessage').classList.add('success');}
    $('#missionModal').classList.remove('hidden');setTimeout(()=>$('#missionAnswer').focus(),100);
  }
  function closeMission(){ $('#missionModal').classList.add('hidden');activeMission=null; }
  function submitMission(event) {
    event.preventDefault();if(!activeMission)return;const answer=$('#missionAnswer').value.trim().toUpperCase().replace(/\s+/g,' ');const msg=$('#missionMessage');
    if(answer===activeMission.answer.toUpperCase()){
      const isNew=!currentUser.stats.completed.includes(activeMission.id);
      if(isNew){currentUser.stats.completed.push(activeMission.id);currentUser.stats.xp+=activeMission.xp;currentUser.stats.sessionXp=(currentUser.stats.sessionXp||0)+activeMission.xp;addActivity('تکمیل مأموریت: '+activeMission.title,`پرونده با موفقیت بسته شد. +${activeMission.xp} XP`,'⌖');updateBadges();persistAccount();updateAll();}
      msg.textContent=isNew?`پاسخ درست است! ${faDigits(activeMission.xp)} امتیاز تجربه گرفتی.`:'پاسخ درست است! این مأموریت قبلاً در سوابقت ثبت شده.';msg.classList.add('success');$('#showHintButton').disabled=true;playTone('success');if(isNew)toast('مأموریت تکمیل شد','success',`+${activeMission.xp} XP`);renderMissions();
      // Close after a short reading interval without relying on a background worker.
      window.setTimeout(()=>{if(activeMission && activeMission.id===activeMission.id) { if(!$('#missionModal').classList.contains('hidden')) $('#closeMissionModal').focus(); }},1200);
    }else{msg.textContent='پاسخ پذیرفته نشد. سرنخ‌ها را دوباره بررسی کن.';msg.classList.remove('success');playTone('error');}
  }
  function showHint(){if(!activeMission)return;$('#modalHintText').textContent=activeMission.hint;$('#modalHint').classList.remove('hidden');const used=currentUser.stats.hintsUsed||[];if(!used.includes(activeMission.id)){used.push(activeMission.id);currentUser.stats.hintsUsed=used;persistAccount();}$('#showHintButton').disabled=true;$('#showHintButton').textContent='سرنخ نمایش داده شد';}
  function terminalAdd(text, cls='') { const out=$('#terminalOutput');const row=document.createElement('div');if(cls)row.className=cls;row.textContent=text;out.appendChild(row);terminalLines++;$('#terminalLineCount').textContent=faDigits(terminalLines);out.scrollTop=out.scrollHeight; }
  function terminalCommand(raw) {
    const input=raw.trim();if(!input)return;terminalAdd(`agent@zero ~ $ ${input}`,'term-command');const [command,...args]=input.split(/\s+/);const cmd=command.toLowerCase();const s=currentUser.stats;s.commands=(s.commands||0)+1;addActivity('اجرای فرمان: '+cmd,'فرمان در ترمینال شبیه‌سازی‌شده اجرا شد.','>_');persistAccount();updateBadges();
    switch(cmd){
      case 'help':case '?': terminalAdd('فرمان‌های قابل استفاده:','term-info');[['help','نمایش راهنما'],['clear','پاک‌کردن خروجی'],['status','وضعیت شبیه‌ساز'],['whoami','هویت اپراتور'],['missions','فهرست مأموریت‌ها'],['scan','اجرای اسکن نمایشی'],['open PZ:001','بازکردن یک پرونده'],['date','زمان محلی مرورگر']].forEach(([a,b])=>terminalAdd(`  ${a.padEnd(16,' ')} ${b}`,'term-success'));terminalAdd('این محیط فقط خروجی نمایشی تولید می‌کند.','term-muted');break;
      case 'clear':$('#terminalOutput').replaceChildren();terminalLines=0;$('#terminalLineCount').textContent='۰';terminalAdd('خروجی پاک شد. آماده‌ای، اپراتور.','term-info');break;
      case 'status':terminalAdd('NETWORK ........ SIMULATED / ONLINE','term-success');terminalAdd('AUTH ........... LOCAL PROFILE','term-info');terminalAdd('MISSIONS ....... '+s.completed.length+'/'+missions.length+' COMPLETED','term-info');terminalAdd('XP ............. '+s.xp,'term-success');terminalAdd('EXTERNAL SCAN .. DISABLED','term-error');break;
      case 'whoami':terminalAdd(`اپراتور: ${currentUser.displayName||currentUser.username}`,'term-success');terminalAdd(`نوع حساب: ${currentUser.type==='guest'?'آزمایشی':'محلی'}`,'term-info');terminalAdd(`رتبه: ${rankForXp(s.xp).name}`,'term-info');break;
      case 'missions':terminalAdd('آرشیو مأموریت‌ها:','term-info');missions.forEach(m=>terminalAdd(`${s.completed.includes(m.id)?'[✓]':'[ ]'} ${m.id}  ${m.title}  +${m.xp}XP`,s.completed.includes(m.id)?'term-success':''));terminalAdd('برای مشاهدهٔ مأموریت‌ها: open PZ:001','term-muted');break;
      case 'scan':terminalAdd('SIMULATION STARTED...','term-info');terminalAdd('[OK] بررسی داده‌های ساختگی','term-success');terminalAdd('[OK] 3 الگوی نمایشی پیدا شد','term-success');terminalAdd('[INFO] هیچ شبکه یا دستگاهی اسکن نشده است.','term-accent');terminalAdd('SIMULATION COMPLETE','term-success');playTone('success');break;
      case 'open':{const m=missions.find(m=>m.id.toLowerCase()===String(args[0]||'').toLowerCase());if(m){showView('missions');openMission(m.id);terminalAdd(`پرونده ${m.id} برای بررسی باز شد.`,'term-success');}else terminalAdd('شناسه پیدا نشد. نمونه: open PZ:001','term-error');break;}
      case 'date':terminalAdd(new Date().toString(),'term-info');break;
      case 'matrix':terminalAdd('01010000 01010010 01001111 01010100 01001111 01000011 01001111 01001100','term-accent');break;
      default:terminalAdd(`فرمان «${command}» شناخته نشد. help را وارد کن.`,'term-error');
    }
    updateAll();
  }
  function clearTerminal(){ $('#terminalOutput').replaceChildren();terminalLines=0;$('#terminalLineCount').textContent='۰';terminalAdd('Protocol Zero Shell v1.0.0','term-muted');terminalAdd('خروجی پاک شد. برای مشاهدهٔ فرمان‌ها help را وارد کن.','term-muted'); }
  function playTone(type='click') {
    if(!currentUser || !currentUser.stats.sound) return;
    try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);osc.type='sine';osc.frequency.value=type==='error'?185:type==='success'?740:420;gain.gain.setValueAtTime(.04,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.09);osc.start();osc.stop(audioContext.currentTime+.1);}catch{/* Audio is optional. */}
  }
  function toggleSound(enabled){currentUser.stats.sound=enabled;persistAccount();$('#soundToggle').classList.toggle('sound-enabled',enabled);if(enabled)playTone('success');toast(enabled?'صدای رابط فعال شد':'صدای رابط خاموش شد');}
  function closeSidebar(){ $('#sidebar').classList.remove('mobile-open');$('#sidebarOverlay').classList.remove('visible'); }
  function openSidebar(){ $('#sidebar').classList.add('mobile-open');$('#sidebarOverlay').classList.add('visible'); }
  function logout(){persistAccount();currentUser=null;currentAccountKey=null;try{localStorage.removeItem(KEYS.session);sessionStorage.removeItem(KEYS.session);}catch{}closeMission();$('#appShell').classList.add('hidden');$('#authScreen').classList.remove('hidden');$('#authPassword').value='';$('#authIdentity').value='';switchAuthMode('login');toast('از حساب خارج شدی','success');}
  function resetProgress(){if(!window.confirm('همه امتیازها، مأموریت‌ها و نشان‌های این پروفایل پاک شوند؟ این کار قابل بازگشت نیست.'))return;const old=currentUser.stats;currentUser.stats={...blankStats(),joined:old.joined,loginCount:old.loginCount,displayName:old.displayName,bio:old.bio,sound:old.sound,motion:old.motion};addActivity('بازنشانی پیشرفت','پیشرفت این پروفایل از نو آغاز شد.','⌁');persistAccount();updateAll();toast('پیشرفت بازنشانی شد');}
  function localReset(){const has=Object.keys(readJson(KEYS.accounts,{})).length>0;if(!has){toast('حساب محلی برای پاک‌کردن وجود ندارد.','error');return;}if(!window.confirm('این کار تمام حساب‌های ثبت‌شده در همین مرورگر را حذف می‌کند. ادامه می‌دهی؟'))return;localStorage.removeItem(KEYS.accounts);localStorage.removeItem(KEYS.session);sessionStorage.removeItem(KEYS.session);toast('حساب‌های محلی پاک شدند');}
  function initIntro(){const lines=[['[BOOT] Protocol Zero shell initializing...','dim'],['[ OK ] Loading local simulation modules','good'],['[ OK ] Encrypting fictional case archive','good'],['[INFO] Awaiting operator authentication_','dim']];const host=$('#introTerminal');lines.forEach(([text,cls],i)=>{const div=document.createElement('div');div.className='intro-line '+cls;div.textContent=text;div.style.animationDelay=(i*.2)+'s';host.appendChild(div);});}
  function init(){
    initIntro();$('#authForm').addEventListener('submit',handleAuth);$$('[data-auth-mode]').forEach(btn=>btn.addEventListener('click',()=>switchAuthMode(btn.dataset.authMode)));
    $('#togglePassword').addEventListener('click',()=>{const input=$('#authPassword');input.type=input.type==='password'?'text':'password';$('#togglePassword').setAttribute('aria-label',input.type==='password'?'نمایش رمز عبور':'پنهان‌کردن رمز عبور');});
    $('#demoLogin').addEventListener('click',demoLogin);$('#localReset').addEventListener('click',localReset);
    $$('.nav-link[data-view]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));$$('[data-navigate]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.navigate)));
    $('#sidebarProfile').addEventListener('click',()=>showView('profile'));$('#topAvatar').addEventListener('click',()=>showView('profile'));$('#openSidebar').addEventListener('click',openSidebar);$('#closeSidebar').addEventListener('click',closeSidebar);$('#sidebarOverlay').addEventListener('click',closeSidebar);
    $('#heroMission').addEventListener('click',()=>openMission('PZ:001'));$('#missionsGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-mission]');if(btn)openMission(btn.dataset.mission);});$$('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;$$('[data-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderMissions();}));
    $('#closeMissionModal').addEventListener('click',closeMission);$('#missionModal').addEventListener('click',e=>{if(e.target===$('#missionModal'))closeMission();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMission();closeSidebar();}});$('#missionAnswerForm').addEventListener('submit',submitMission);$('#showHintButton').addEventListener('click',showHint);
    $('#terminalForm').addEventListener('submit',e=>{e.preventDefault();const input=$('#terminalInput');terminalCommand(input.value);input.value='';});$('#terminalHelp').addEventListener('click',()=>terminalCommand('help'));$('#clearTerminal').addEventListener('click',clearTerminal);$$('[data-command]').forEach(btn=>btn.addEventListener('click',()=>{showView('terminal');$('#terminalInput').value=btn.dataset.command;terminalCommand(btn.dataset.command);$('#terminalInput').value='';}));
    $('#soundToggle').addEventListener('click',()=>toggleSound(!currentUser.stats.sound));$('#soundSetting').addEventListener('change',e=>toggleSound(e.target.checked));$('#motionSetting').addEventListener('change',e=>{currentUser.stats.motion=e.target.checked;document.body.classList.toggle('reduce-motion',!e.target.checked);persistAccount();toast(e.target.checked?'انیمیشن‌ها فعال شدند':'انیمیشن‌ها کاهش یافتند');});
    $('#profileForm').addEventListener('submit',e=>{e.preventDefault();const name=$('#profileNameInput').value.trim();if(name.length<2){$('#profileMessage').textContent='نام نمایشی باید حداقل دو کاراکتر باشد.';return;}currentUser.displayName=name;currentUser.stats.displayName=name;currentUser.stats.bio=$('#profileBioInput').value.trim();persistAccount();updateAll();$('#profileMessage').textContent='تغییرات ذخیره شد.';$('#profileMessage').classList.add('success');toast('پروفایل به‌روزرسانی شد');});
    $('#resetProgress').addEventListener('click',resetProgress);$('#logoutButton').addEventListener('click',logout);
    if(loadSession())bootApp();else switchAuthMode('login');
  }
  init();
})();
