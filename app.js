/* ══════════════════════════════════════════
   APP.JS — Citampi Stories Panduan v7
══════════════════════════════════════════ */

/* ── STATE ── */
const S = {
  feature:  'karakter',   // karakter | item | job | prioritas
  subTab:   'item-favorit',
  selected:  null,
  search:    '',
  sortChar:  'heroine',
  sortItem:  'az',
  sortJob:   'salary',
  showH:     true,
  showB:     true,
  tiers:     new Set([8,5,3,1]),
  day:       'Senin',
  time:      'Pagi',
  station:   'Semua',
  fishLoc:   '',
  fishLuck:  -1,
  pins:      [],   // char names, ordered, max 10
  prios:     [],   // char names, max 3
};

const MAX_PIN = 10, MAX_PRIO = 3;

/* ── Real-time day/time detection (must be before state init) ── */
const dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function getRealDay() {
  return dayNames[new Date().getDay()];
}
function getRealTime() {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'Pagi';
  if (h >= 12 && h < 15) return 'Siang';
  if (h >= 15 && h < 18) return 'Sore';
  return 'Malam';
}
function getRealClock() {
  const now = new Date();
  return String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
}
function applyRealTime() {
  if (!S.locRealTime) return;
  S.day  = getRealDay();
  S.time = getRealTime();
}

/* ── Auto-refresh every 60s ── */
setInterval(() => {
  if (S.locRealTime && S.feature === 'karakter' && S.subTab === 'lokasi' && S.selected) {
    applyRealTime(); renderInfo();
  }
}, 60000);

/* load persisted state */
try {
  S.pins  = JSON.parse(localStorage.getItem('cs7_pins')  || '[]');
  S.prios = JSON.parse(localStorage.getItem('cs7_prios') || '[]');
  S.pins  = S.pins.filter(n => chars.find(c => c.name === n));
  S.prios = S.prios.filter(n => S.pins.includes(n));
} catch(e) {}

/* ── PERSIST ── */
function persist() {
  try {
    localStorage.setItem('cs7_pins',  JSON.stringify(S.pins));
    localStorage.setItem('cs7_prios', JSON.stringify(S.prios));
  } catch(e) {}
}

/* ── HELPERS ── */
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

function getItemInfo(name) {
  return items.find(i => i.name === name) || { cat:'Lainnya', how:'Lihat dalam game', tip:'' };
}

function charGiftsFor(c, tier) { return (c.gifts[tier] || []); }

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMainNav();
  renderAll();
  renderBagWidget();
});

/* ════════════════════════════════════════
   MAIN NAV
════════════════════════════════════════ */
function initMainNav() {
  document.querySelectorAll('.mnav').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.f;
      S.feature = f;
      S.selected = null;
      S.search = '';
      S.mobView = 'list';
      S.quickFilter = '';
      const si = $('search-input');
      const sm = $('search-input-mob');
      if (si) si.value = '';
      if (sm) sm.value = '';
      // default sub-tabs
      if (f === 'karakter')  S.subTab = 'item-favorit';
      if (f === 'item')      S.subTab = 'cara-dapat';
      if (f === 'job')       S.subTab = 'deskripsi';
      if (f === 'prioritas') S.subTab = 'prio-view';
      if (f === 'planning')  { S.planDay = S.planDay || getRealDay(); }
      document.querySelectorAll('.mnav').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.btab').forEach(b =>
        b.classList.toggle('active', b.dataset.f === f));
      btn.classList.add('active');
      renderAll();
    });
  });

  $('search-input').addEventListener('input', e => {
    S.search = e.target.value.toLowerCase();
    const sm = $('search-input-mob');
    if (sm) sm.value = e.target.value;
    renderList();
  });
}

function renderAll() {
  document.body.classList.toggle('planning-mode', S.feature === 'planning');
  renderSubNav();
  renderFilters();
  renderQuickFilters();
  renderList();
  renderInfo();
  renderHeaderPrio();
  updatePinBadge();
  updateMobileView();
  renderBagWidget();
}

/* ════════════════════════════════════════
   SUB NAV (col 2)
════════════════════════════════════════ */
function renderSubNav() {
  const sn = $('sub-nav');
  sn.innerHTML = '';

  if (S.feature === 'karakter') {
    const tabs = [
      { id:'item-favorit', icon:'🎁', lbl:'Item Favorit' },
      { id:'lokasi',       icon:'📍', lbl:'Lokasi' },
      { id:'info-dasar',   icon:'📋', lbl:'Info Dasar' },
    ];
    tabs.forEach(t => {
      const b = el('button', `snav${S.subTab===t.id?' active':''}`, `<span class="snav-icon">${t.icon}</span><span class="snav-lbl">${t.lbl}</span>`);
      b.addEventListener('click', () => { S.subTab = t.id; renderSubNav(); renderInfo(); });
      sn.appendChild(b);
    });

    if (S.subTab === 'item-favorit') {
      const sep = el('div','snav-sep'); sn.appendChild(sep);
      const lbl = el('div','snav-group-lbl','Filter Poin');
      sn.appendChild(lbl);
      [8,5,3,1].forEach(p => {
        const on = S.tiers.has(p);
        const b = el('button', `tier-chip t${p}${on?' on':''}`,
          `<span class="tier-dot"></span>${p} Poin`);
        b.addEventListener('click', () => {
          S.tiers.has(p) ? S.tiers.delete(p) : S.tiers.add(p);
          renderSubNav(); renderInfo();
        });
        sn.appendChild(b);
      });
    }

    if (S.subTab === 'lokasi') {
      // apply real time on open
      if (S.locRealTime) applyRealTime();

      const sep = el('div','snav-sep'); sn.appendChild(sep);

      // mode toggle row
      const modeRow = el('div','snav-mode-row');
      const rtBtn = el('button',`snav-mode-btn${S.locRealTime?' active':''}`, '🕐 Waktu Real');
      const mnBtn = el('button',`snav-mode-btn${!S.locRealTime?' active':''}`, '✏️ Manual');
      rtBtn.addEventListener('click', () => {
        S.locRealTime = true; applyRealTime(); renderSubNav(); renderInfo();
      });
      mnBtn.addEventListener('click', () => {
        S.locRealTime = false; renderSubNav(); renderInfo();
      });
      modeRow.appendChild(rtBtn); modeRow.appendChild(mnBtn);
      sn.appendChild(modeRow);

      // only show day/time pickers in manual mode
      if (!S.locRealTime) {
        const sep2 = el('div','snav-sep'); sn.appendChild(sep2);
        const dlbl = el('div','snav-group-lbl','Hari');
        sn.appendChild(dlbl);
        days.forEach(d => {
          const b = el('button', `snav-day${S.day===d?' active':''}`, d);
          b.addEventListener('click', () => { S.day = d; renderSubNav(); renderInfo(); });
          sn.appendChild(b);
        });
        const sep3 = el('div','snav-sep'); sn.appendChild(sep3);
        const tlbl = el('div','snav-group-lbl','Waktu');
        sn.appendChild(tlbl);
        times.forEach(t => {
          const b = el('button', `snav-time${S.time===t?' active':''}`, t);
          b.addEventListener('click', () => { S.time = t; renderSubNav(); renderInfo(); });
          sn.appendChild(b);
        });
      } else {
        // real-time: show current detected day/time as info
        const sep2 = el('div','snav-sep'); sn.appendChild(sep2);
        const info = el('div','',`
          <div style="padding:8px 10px;border-radius:9px;background:var(--mint-soft);border:1px solid rgba(0,137,123,.2);font-size:10px;color:var(--mint);font-weight:700;line-height:1.6">
            <div>📅 ${S.day}</div>
            <div>🕐 ${S.time} (${getRealClock()})</div>
          </div>
          <div style="font-size:9px;color:var(--dim);padding:6px 4px;line-height:1.5">Auto-refresh tiap 60 detik</div>
        `);
        sn.appendChild(info);
      }
    }
  }

  if (S.feature === 'item') {
    const tabs = [
      { id:'cara-dapat', icon:'🗺️', lbl:'Cara Mendapatkan' },
      { id:'gift',       icon:'💝', lbl:'Gift (Siapa Suka)' },
      { id:'mancing',    icon:'🎣', lbl:'Mancing' },
      { id:'crafting',   icon:'🔨', lbl:'Crafting' },
    ];
    tabs.forEach(t => {
      const b = el('button', `snav${S.subTab===t.id?' active':''}`, `<span class="snav-icon">${t.icon}</span><span class="snav-lbl">${t.lbl}</span>`);
      b.addEventListener('click', () => { S.subTab = t.id; renderSubNav(); renderInfo(); });
      sn.appendChild(b);
    });

    if (S.subTab === 'mancing') {
      const sep = el('div','snav-sep'); sn.appendChild(sep);
      const lbl = el('div','snav-group-lbl','Lokasi Mancing');
      sn.appendChild(lbl);
      ['Semua','Sungai','Kolam','Selokan','Danau','Pantai','Sungai Bojong Lima'].forEach(loc => {
        const v = loc === 'Semua' ? '' : loc;
        const b = el('button', `snav-day${S.fishLoc===v?' active':''}`, loc);
        b.addEventListener('click', () => { S.fishLoc = v; renderSubNav(); renderInfo(); });
        sn.appendChild(b);
      });
      const sep2 = el('div','snav-sep'); sn.appendChild(sep2);
      const lbl2 = el('div','snav-group-lbl','Luck');
      sn.appendChild(lbl2);
      [[-1,'Semua'],[0,'0 — Umum'],[1,'1 — Biasa'],[2,'2 — Langka'],[3,'3 — Sangat Langka'],[4,'4 — Ultra Langka']].forEach(([v,label]) => {
        const b = el('button', `snav-time${S.fishLuck===v?' active':''}`, label);
        b.addEventListener('click', () => { S.fishLuck = v; renderSubNav(); renderInfo(); });
        sn.appendChild(b);
      });
    }

    if (S.subTab === 'crafting') {
      const sep = el('div','snav-sep'); sn.appendChild(sep);
      const lbl = el('div','snav-group-lbl','Stasiun');
      sn.appendChild(lbl);
      stations.forEach(st => {
        const b = el('button', `snav-day${S.station===st?' active':''}`, st);
        b.addEventListener('click', () => { S.station = st; renderSubNav(); renderInfo(); });
        sn.appendChild(b);
      });
    }
  }

  if (S.feature === 'job') {
    const b = el('button', `snav active`, `<span class="snav-icon">📋</span><span class="snav-lbl">Deskripsi</span>`);
    sn.appendChild(b);
  }

  if (S.feature === 'planning') {
    renderPlanningSubNav();
    return;
  }

  if (S.feature === 'prioritas') {
    const b = el('button', `snav active`, `<span class="snav-icon">📌</span><span class="snav-lbl">Daftar Pin</span>`);
    sn.appendChild(b);
    if (S.pins.length) {
      const sep = el('div','snav-sep'); sn.appendChild(sep);
      const lbl = el('div','snav-group-lbl','Hapus Semua');
      sn.appendChild(lbl);
      const rm = el('button','snav', '🗑️ Reset');
      rm.style.color = '#f43f5e';
      rm.addEventListener('click', () => {
        if (!confirm('Hapus semua pin dan prioritas?')) return;
        S.pins = []; S.prios = [];
        persist(); renderAll();
      });
      sn.appendChild(rm);
    }
  }
}

/* ════════════════════════════════════════
   QUICK FILTERS
════════════════════════════════════════ */
function renderQuickFilters() {
  const row    = $('quick-filter-row');
  const notice = $('qf-notice');
  const noticeLbl = $('qf-notice-lbl');
  if (!row) return;

  const filters = quickFilters[S.feature];
  if (!filters || !filters.length) {
    row.innerHTML = '';
    if (notice) notice.style.display = 'none';
    return;
  }

  row.innerHTML = '';
  filters.forEach(f => {
    const btn = el('button', `qf ${f.color||''}${S.quickFilter===f.id?' active':''}`, f.lbl);
    btn.addEventListener('click', () => {
      S.quickFilter = S.quickFilter === f.id ? '' : f.id;
      renderQuickFilters();
      renderList();
    });
    row.appendChild(btn);
  });

  // active notice bar
  if (notice) {
    if (S.quickFilter) {
      const active = filters.find(f => f.id === S.quickFilter);
      noticeLbl.textContent = `Filter aktif: ${active?.lbl || S.quickFilter}`;
      notice.style.display = 'flex';
    } else {
      notice.style.display = 'none';
    }
  }
}

function clearQuickFilter() {
  S.quickFilter = '';
  renderQuickFilters();
  renderList();
}

function renderFilters() {
  if (S.feature === 'planning') {
    const fc = $('filter-chips');
    const sr = $('sort-select');
    if (fc) fc.innerHTML = '';
    if (sr) sr.innerHTML = '<option value="">— Planning —</option>';
    return;
  }

  const fc = $('filter-chips');
  const sr = $('sort-select');
  fc.innerHTML = '';

  if (S.feature === 'karakter') {
    const h = el('span', `fchip heroine${S.showH?' on':''}`, '💖 Heroine');
    h.addEventListener('click', () => { S.showH = !S.showH; renderFilters(); renderList(); });
    fc.appendChild(h);
    const b = el('span', `fchip biasa${S.showB?' on':''}`, '👤 Biasa');
    b.addEventListener('click', () => { S.showB = !S.showB; renderFilters(); renderList(); });
    fc.appendChild(b);
    sr.innerHTML = `
      <option value="heroine" ${S.sortChar==='heroine'?'selected':''}>Heroine Dulu</option>
      <option value="az"      ${S.sortChar==='az'?'selected':''}>A → Z</option>
      <option value="za"      ${S.sortChar==='za'?'selected':''}>Z → A</option>
    `;
    sr.onchange = () => { S.sortChar = sr.value; renderList(); };
  }

  if (S.feature === 'item') {
    sr.innerHTML = `
      <option value="az"   ${S.sortItem==='az'?'selected':''}>A → Z</option>
      <option value="za"   ${S.sortItem==='za'?'selected':''}>Z → A</option>
      <option value="cat"  ${S.sortItem==='cat'?'selected':''}>Kategori</option>
    `;
    sr.onchange = () => { S.sortItem = sr.value; renderList(); };
  }

  if (S.feature === 'job') {
    sr.innerHTML = `
      <option value="salary" ${S.sortJob==='salary'?'selected':''}>Gaji Tertinggi</option>
      <option value="az"     ${S.sortJob==='az'?'selected':''}>A → Z</option>
      <option value="area"   ${S.sortJob==='area'?'selected':''}>Area</option>
    `;
    sr.onchange = () => { S.sortJob = sr.value; renderList(); };
  }

  if (S.feature === 'prioritas') {
    sr.innerHTML = `<option value="">— Urutan Pin —</option>`;
    sr.onchange = null;
  }
}

/* ════════════════════════════════════════
   LIST GRID (col 3)
════════════════════════════════════════ */
function renderList() {
  const g = $('list-grid');
  g.innerHTML = '';

  if (S.feature === 'planning') {
    // planning tidak butuh list grid
    g.innerHTML = `<div style="padding:16px 8px;text-align:center;color:var(--dim);font-size:10px;font-weight:700">Atur preset di panel kanan →</div>`;
    return;
  }

  const qf = S.quickFilter ? quickFilters[S.feature]?.find(f => f.id === S.quickFilter) : null;

  if (S.feature === 'karakter') {
    let data = chars.filter(c => {
      if (!S.showH && c.heroine) return false;
      if (!S.showB && !c.heroine) return false;
      if (qf && !qf.test(c)) return false;
      return c.name.toLowerCase().includes(S.search) ||
             c.role.toLowerCase().includes(S.search);
    });
    if (S.sortChar === 'heroine') data.sort((a,b) => {
      const ap = S.pins.includes(a.name)?1:0, bp = S.pins.includes(b.name)?1:0;
      if (bp !== ap) return bp - ap;
      return b.heroine - a.heroine || a.name.localeCompare(b.name,'id');
    });
    else if (S.sortChar === 'az') data.sort((a,b) => a.name.localeCompare(b.name,'id'));
    else if (S.sortChar === 'za') data.sort((a,b) => b.name.localeCompare(a.name,'id'));

    if (!data.length) { g.innerHTML = '<div class="no-data">Tidak ditemukan 🔍</div>'; return; }
    data.forEach(c => {
      const pinned = S.pins.includes(c.name);
      const b = el('button',
        `list-btn${c.heroine?' heroine':''}${pinned?' pinned':''}${S.selected===c.name?' selected':''}`,
        `<span class="lb-emoji">${c.emoji}</span><span class="lb-name">${c.name}</span>`);
      b.addEventListener('click', () => {
        S.selected = c.name;
        if (isMobile()) { S.mobView = 'info'; updateMobileView(); closeDrawer(); }
        renderList(); renderInfo();
      });
      g.appendChild(b);
    });
  }

  if (S.feature === 'item') {
    let data = [...items];
    if (qf) data = data.filter(i => qf.test(i));
    if (S.search) data = data.filter(i =>
      i.name.toLowerCase().includes(S.search) ||
      i.cat.toLowerCase().includes(S.search));
    if (S.sortItem === 'az')  data.sort((a,b) => a.name.localeCompare(b.name,'id'));
    if (S.sortItem === 'za')  data.sort((a,b) => b.name.localeCompare(a.name,'id'));
    if (S.sortItem === 'cat') data.sort((a,b) => a.cat.localeCompare(b.cat,'id') || a.name.localeCompare(b.name,'id'));

    if (!data.length) { g.innerHTML = '<div class="no-data">Tidak ditemukan 🔍</div>'; return; }
    data.forEach(i => {
      const b = el('button', `list-btn${S.selected===i.name?' selected':''}`,
        `<span class="lb-emoji">${catIcon(i.cat)}</span><span class="lb-name">${i.name}</span>`);
      b.addEventListener('click', () => {
        S.selected = i.name;
        if (isMobile()) { S.mobView = 'info'; updateMobileView(); closeDrawer(); }
        renderList(); renderInfo();
      });
      g.appendChild(b);
    });
  }

  if (S.feature === 'job') {
    let data = [...jobs];
    if (qf) data = data.filter(j => qf.test(j));
    if (S.search) data = data.filter(j =>
      j.name.toLowerCase().includes(S.search) ||
      j.loc.toLowerCase().includes(S.search));
    if (S.sortJob === 'salary') data.sort((a,b) => b.salary - a.salary);
    if (S.sortJob === 'az')     data.sort((a,b) => a.name.localeCompare(b.name,'id'));
    if (S.sortJob === 'area')   data.sort((a,b) => a.area.localeCompare(b.area) || b.salary - a.salary);

    if (!data.length) { g.innerHTML = '<div class="no-data">Tidak ditemukan 🔍</div>'; return; }
    data.forEach(j => {
      const diff = getJobDiff(j);
      const b = el('button', `list-btn${S.selected===j.name?' selected':''}`,
        `<span class="lb-emoji">💼</span>
         <span class="lb-name">${j.name}</span>
         <span class="lb-diff ${diff.cls}">${diff.lbl}</span>`);
      b.addEventListener('click', () => {
        S.selected = j.name;
        if (isMobile()) { S.mobView = 'info'; updateMobileView(); closeDrawer(); }
        renderList(); renderInfo();
      });
      g.appendChild(b);
    });
  }

  if (S.feature === 'prioritas') {
    if (!S.pins.length) {
      g.innerHTML = '<div class="no-data">Belum ada yang di-pin</div>'; return;
    }
    S.pins.forEach(name => {
      const c = chars.find(ch => ch.name === name);
      if (!c) return;
      const isPrio = S.prios.includes(name);
      const b = el('button', `list-btn${isPrio?' pinned':''}${S.selected===name?' selected':''}`,
        `<span class="lb-emoji">${c.emoji}</span><span class="lb-name">${name}${isPrio?' 🎯':''}</span>`);
      b.addEventListener('click', () => {
        S.selected = name;
        if (isMobile()) { S.mobView = 'info'; updateMobileView(); closeDrawer(); }
        renderList(); renderInfo();
      });
      g.appendChild(b);
    });
  }
}

/* ════════════════════════════════════════
   QUICK START GUIDE
════════════════════════════════════════ */
function buildQuickStart(feature) {
  const wrap = el('div','qs-wrap');

  if (feature === 'karakter') {
    wrap.innerHTML = `
      <!-- HERO -->
      <div class="qs-hero">
        <div class="qs-hero-icon">🏘️</div>
        <div>
          <div class="qs-hero-title">Selamat Datang di Citampi Stories!</div>
          <div class="qs-hero-sub">Pilih karakter di kiri untuk melihat info hadiah & lokasi mereka. Belum tahu harus mulai dari mana? Baca panduan singkat ini dulu.</div>
        </div>
      </div>

      <!-- TIPS MINGGU PERTAMA -->
      <div class="qs-lbl">⚡ Tips Minggu Pertama</div>
      <div class="qs-tips">
        <div class="qs-tip">
          <div class="qs-tip-icon">💼</div>
          <div class="qs-tip-title">Kerja Dulu, Kejar Cinta Belakangan</div>
          <div class="qs-tip-body">Mulai dari Ojek Online atau Penjaga Toko untuk dapat modal awal. Jangan langsung habisin uang untuk hadiah sebelum punya tabungan.</div>
        </div>
        <div class="qs-tip">
          <div class="qs-tip-icon">🗑️</div>
          <div class="qs-tip-title">Mulung Setiap Hari</div>
          <div class="qs-tip-body">Mulung adalah cara gratis dapat item berharga seperti Guci Kuno, Piring Kuno, hingga Batangan Emas yang disukai semua karakter.</div>
        </div>
        <div class="qs-tip">
          <div class="qs-tip-icon">🎁</div>
          <div class="qs-tip-title">Prioritaskan Hadiah +8</div>
          <div class="qs-tip-body">Item +8 poin menaikkan hati jauh lebih cepat. Fokus ke 2-3 item favorit utama karakter yang kamu kejar daripada memberi banyak item biasa.</div>
        </div>
        <div class="qs-tip">
          <div class="qs-tip-icon">📍</div>
          <div class="qs-tip-title">Hafal Jadwal Harian</div>
          <div class="qs-tip-body">Setiap karakter punya lokasi berbeda tiap hari & waktu. Klik tab "Lokasi" pada karakter untuk lihat jadwal lengkapnya sebelum pergi mencari mereka.</div>
        </div>
      </div>

      <!-- ALUR GAME -->
      <div class="qs-lbl">🗺️ Alur Perkembangan Game</div>
      <div class="qs-flow">
        <div class="qs-step">
          <div class="qs-step-num">1</div>
          <div>
            <div class="qs-step-title">Early Game — Bangun Fondasi</div>
            <div class="qs-step-body">Kerja, mulung rutin, bayar kos ke Bu Tuti, tingkatkan skill dasar. Belum perlu fokus ke romansa.</div>
          </div>
        </div>
        <div class="qs-step">
          <div class="qs-step-num">2</div>
          <div>
            <div class="qs-step-title">Mid Game — Dekati Karakter Target</div>
            <div class="qs-step-body">Tabungan sudah cukup, mulai beri hadiah rutin. Gunakan panduan ini untuk cari item favorit +8 mereka. Target minimal 5 hati dulu.</div>
          </div>
        </div>
        <div class="qs-step">
          <div class="qs-step-num">3</div>
          <div>
            <div class="qs-step-title">Late Game — Buka Event Spesial</div>
            <div class="qs-step-body">Setelah 10 hati, unlock kencan & event story. Beberapa karakter seperti Suciasih dan Teh Imas punya syarat khusus sebelum bisa dinikahi.</div>
          </div>
        </div>
      </div>

      <!-- KARAKTER DISARANKAN -->
      <div class="qs-lbl">💖 Karakter Disarankan untuk Pemula</div>
      <div class="qs-actions">
        <button class="qs-action accent" onclick="quickSelect('Isma')">🛒 Isma — Mudah Ditemui</button>
        <button class="qs-action accent" onclick="quickSelect('Nabila')">🛍️ Nabila — Jadwal Stabil</button>
        <button class="qs-action accent" onclick="quickSelect('Sarah Angelia')">🌟 Sarah — Item Mudah Dicari</button>
        <button class="qs-action" onclick="quickSelect('Windy')">🏃 Windy — Lokasi Konsisten</button>
        <button class="qs-action" onclick="quickSelect('Tasya')">📚 Tasya — Item Terjangkau</button>
      </div>

      <div class="qs-callout">
        💡 <b>Tip:</b> Ikan Pelangi (Luck 1, kolam area 3) disukai hampir semua karakter sebagai hadiah +5. Stok banyak sejak awal untuk cadangan hadiah harian yang efisien.
      </div>`;
  }

  if (feature === 'item') {
    wrap.innerHTML = `
      <div class="qs-hero">
        <div class="qs-hero-icon">🎁</div>
        <div>
          <div class="qs-hero-title">Panduan Item & Hadiah</div>
          <div class="qs-hero-sub">Pilih item di kiri untuk lihat cara mendapatkan, siapa yang menyukainya, dan resep craftingnya. Atau jelajahi berdasarkan kategori di bawah ini.</div>
        </div>
      </div>

      <div class="qs-lbl">📦 Jelajahi Berdasarkan Kategori</div>
      <div class="qs-cats">
        <div class="qs-cat" onclick="filterBySearch('emas')">
          <div class="qs-cat-icon">⭐</div>
          <div class="qs-cat-lbl">Item Berharga</div>
        </div>
        <div class="qs-cat" onclick="filterBySearch('ikan')">
          <div class="qs-cat-icon">🐟</div>
          <div class="qs-cat-lbl">Ikan & Mancing</div>
        </div>
        <div class="qs-cat" onclick="filterBySearch('kuno')">
          <div class="qs-cat-icon">🏺</div>
          <div class="qs-cat-lbl">Barang Kuno</div>
        </div>
        <div class="qs-cat" onclick="filterBySearch('masak')">
          <div class="qs-cat-icon">🍳</div>
          <div class="qs-cat-lbl">Makanan</div>
        </div>
        <div class="qs-cat" onclick="filterBySearch('buku')">
          <div class="qs-cat-icon">📚</div>
          <div class="qs-cat-lbl">Buku & Alat Tulis</div>
        </div>
        <div class="qs-cat" onclick="filterBySearch('perhiasan')">
          <div class="qs-cat-icon">💍</div>
          <div class="qs-cat-lbl">Perhiasan</div>
        </div>
      </div>

      <div class="qs-lbl">🏆 Item Paling Worth Dicari</div>
      <div class="qs-flow">
        <div class="qs-step">
          <div class="qs-step-num" style="background:var(--t8)">1</div>
          <div>
            <div class="qs-step-title">Ikan Pelangi — Hadiah Universal +5</div>
            <div class="qs-step-body">Luck 1 di kolam area 3. Disukai hampir semua karakter. Stok banyak untuk hadiah harian yang konsisten dan hemat.</div>
          </div>
        </div>
        <div class="qs-step">
          <div class="qs-step-num" style="background:var(--t8)">2</div>
          <div>
            <div class="qs-step-title">Parsel Hadiah — Disukai SEMUA +8</div>
            <div class="qs-step-body">Beli di Omegamart saat event. Satu item untuk semua karakter dengan poin tertinggi — sangat efisien saat event berlangsung.</div>
          </div>
        </div>
        <div class="qs-step">
          <div class="qs-step-num" style="background:var(--t5)">3</div>
          <div>
            <div class="qs-step-title">Batangan Emas & Siput Emas — Mulung</div>
            <div class="qs-step-body">Langka tapi worth dicari. Disukai SEMUA karakter sebagai +8. Prioritaskan mulung setiap hari untuk meningkatkan peluang.</div>
          </div>
        </div>
      </div>

      <div class="qs-callout">
        💡 <b>Tab Crafting & Mancing</b> di sub-nav kiri berisi panduan lengkap resep meja produksi dan data ikan berdasarkan tingkat Luck (0–4). Klik tab tersebut tanpa perlu memilih item spesifik.
      </div>`;
  }

  if (feature === 'job') {
    wrap.innerHTML = `
      <div class="qs-hero">
        <div class="qs-hero-icon">💼</div>
        <div>
          <div class="qs-hero-title">Panduan Pekerjaan</div>
          <div class="qs-hero-sub">Pilih pekerjaan di kiri untuk lihat detail gaji, jam kerja, skill yang dibutuhkan, dan kostum yang diperlukan.</div>
        </div>
      </div>

      <div class="qs-lbl">📈 Jalur Karier yang Disarankan</div>
      <div class="qs-job-tiers">
        <div class="qs-job-tier">
          <div>
            <span class="qs-jt-badge" style="background:var(--t1-bg);border-color:var(--t1-b);color:var(--t1)">Pemula</span>
          </div>
          <div>
            <div class="qs-jt-title">Ojek Online → Penjaga Toko → Pedagang Cuanki</div>
            <div class="qs-jt-body">Tidak butuh skill khusus. Ideal untuk awal game supaya cepat dapat modal.</div>
          </div>
        </div>
        <div class="qs-job-tier">
          <div>
            <span class="qs-jt-badge" style="background:var(--t5-bg);border-color:var(--t5-b);color:var(--t5)">Menengah</span>
          </div>
          <div>
            <div class="qs-jt-title">Sopir Taksi → Guru Les → Tukang Service</div>
            <div class="qs-jt-body">Butuh skill 2–3 dan pengalaman kerja sebelumnya. Gaji mulai naik signifikan.</div>
          </div>
        </div>
        <div class="qs-job-tier">
          <div>
            <span class="qs-jt-badge" style="background:var(--t8-bg);border-color:var(--t8-b);color:var(--t8)">Senior</span>
          </div>
          <div>
            <div class="qs-jt-title">Guru → Kurir Kilat → Kepala Cabang</div>
            <div class="qs-jt-body">Skill 5 di semua bidang + pengalaman panjang. Gaji 65–72 Rc/jam — target akhir karier.</div>
          </div>
        </div>
      </div>

      <div class="qs-lbl">⚡ Pekerjaan Terbaik per Tahap</div>
      <div class="qs-tips">
        <div class="qs-tip">
          <div class="qs-tip-icon">🚀</div>
          <div class="qs-tip-title">Early Game Terbaik</div>
          <div class="qs-tip-body"><b>Ojek Online</b> — 30 Rc/jam, jam panjang, skill minimal. Langsung bisa apply dari hari pertama.</div>
        </div>
        <div class="qs-tip">
          <div class="qs-tip-icon">⚖️</div>
          <div class="qs-tip-title">Mid Game Terbaik</div>
          <div class="qs-tip-body"><b>Guru Les</b> — 38 Rc/jam, jam masuk akal, kostum sederhana. Sweet spot antara effort dan penghasilan.</div>
        </div>
        <div class="qs-tip">
          <div class="qs-tip-icon">👑</div>
          <div class="qs-tip-title">Late Game Terbaik</div>
          <div class="qs-tip-body"><b>Kepala Cabang</b> — 72 Rc/jam tertinggi. Butuh Sekdes + Penjaga Toko sebagai pengalaman sebelumnya.</div>
        </div>
        <div class="qs-tip">
          <div class="qs-tip-icon">🎮</div>
          <div class="qs-tip-title">Paling Santai</div>
          <div class="qs-tip-body"><b>Youtuber</b> — 65 Rc/jam, jam kerja fleksibel 06:00–00:00, tidak perlu keluar area tertentu.</div>
        </div>
      </div>

      <div class="qs-actions" style="margin-top:12px">
        <button class="qs-action accent" onclick="quickSelectJob('Ojek Online')">🛵 Ojek Online</button>
        <button class="qs-action accent" onclick="quickSelectJob('Guru Les')">📖 Guru Les</button>
        <button class="qs-action accent" onclick="quickSelectJob('Kepala Cabang')">🏦 Kepala Cabang</button>
        <button class="qs-action" onclick="quickSelectJob('Youtuber')">🎬 Youtuber</button>
      </div>

      <div class="qs-callout">
        💡 <b>Tip:</b> Tingkatkan skill Komunikasi, Fisik, dan Cerdas secara merata. Jangan hanya fokus satu skill karena pekerjaan bergaji tinggi biasanya butuh semua skill di level 4–5.
      </div>`;
  }

  return wrap;
}

/* Helper: klik dari Quick Start → langsung pilih karakter/job */
function quickSelect(name) {
  S.selected = name;
  S.subTab   = 'item-favorit';
  renderList();
  renderInfo();
}
function quickSelectJob(name) {
  S.selected = name;
  renderList();
  renderInfo();
}
function filterBySearch(keyword) {
  S.search = keyword;
  const input = document.getElementById('search-input');
  if (input) input.value = keyword;
  renderList();
}

/* ════════════════════════════════════════
   INFO PANEL (col 5-8)
════════════════════════════════════════ */
function renderInfo() {
  renderInfoTabs();
  renderInfoContent();
}

function renderInfoTabs() {
  const it = $('info-subtabs');
  it.innerHTML = '';

  if (S.feature === 'karakter' && S.selected) {
    [
      { id:'item-favorit', lbl:'🎁 Item Favorit' },
      { id:'lokasi',       lbl:'📍 Lokasi' },
      { id:'info-dasar',   lbl:'📋 Info Dasar' },
    ].forEach(t => {
      const b = el('button', `itab${S.subTab===t.id?' active':''}`, t.lbl);
      b.addEventListener('click', () => {
        S.subTab = t.id;
        if (t.id === 'lokasi' && S.locRealTime) applyRealTime();
        renderSubNav(); renderInfo();
      });
      it.appendChild(b);
    });
    // pin button
    const pinned = S.pins.includes(S.selected);
    const pb = el('button', `itab`, pinned ? '📌 Lepas Pin' : '📍 Pin');
    pb.style.marginLeft = 'auto';
    pb.style.color = pinned ? 'var(--pin-gold)' : 'var(--muted)';
    pb.addEventListener('click', () => togglePin(S.selected));
    it.appendChild(pb);
  }

  if (S.feature === 'item' && S.selected) {
    [
      { id:'cara-dapat', lbl:'🗺️ Cara Mendapatkan' },
      { id:'gift',       lbl:'💝 Gift' },
      { id:'mancing',    lbl:'🎣 Mancing' },
      { id:'crafting',   lbl:'🔨 Crafting' },
    ].forEach(t => {
      const b = el('button', `itab${S.subTab===t.id?' active':''}`, t.lbl);
      b.addEventListener('click', () => { S.subTab = t.id; renderSubNav(); renderInfo(); });
      it.appendChild(b);
    });
  }

  if (S.feature === 'job' && S.selected) {
    const b = el('button','itab active','📋 Deskripsi');
    it.appendChild(b);
  }

  if (S.feature === 'planning') {
    const b = el('button','itab active',`📅 Preset ${S.planDay}`);
    it.appendChild(b);
  }

  if (S.feature === 'prioritas') {
    const b = el('button','itab active','📌 Pin & Prioritas');
    it.appendChild(b);
  }
}

function renderInfoContent() {
  const ic = $('info-content');
  ic.innerHTML = '';

  /* ─── PLANNING ─── */
  if (S.feature === 'planning') {
    renderPlanningContent();
    return;
  }

  /* ─── EMPTY STATE → QUICK START GUIDE ─── */
  if (!S.selected && S.feature !== 'prioritas') {
    ic.appendChild(buildQuickStart(S.feature));
    return;
  }

  /* ─── KARAKTER ─── */
  if (S.feature === 'karakter') {
    const c = chars.find(ch => ch.name === S.selected);
    if (!c) return;

    // header
    const pinned = S.pins.includes(c.name);
    const isPrio = S.prios.includes(c.name);
    const header = el('div','char-header');
    header.innerHTML = `
      <div class="char-emoji" style="background:${c.color}22;border:2px solid ${c.color}55">${c.emoji}</div>
      <div class="char-info">
        <div class="char-name">${c.name}
          ${c.heroine ? '<span class="ctag ctag-h">💖 Heroine</span>' : ''}
          ${!c.heroine && !c.canMarry && c.marriageNote ? '<span class="ctag ctag-q">👻 NPC Quest</span>' : ''}
          ${isPrio ? '<span class="ctag ctag-special">🎯 Prioritas</span>' : ''}
        </div>
        <div class="char-role">${c.role}</div>
        ${c.fullName !== c.name ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">${c.fullName}</div>` : ''}
      </div>
      <button class="char-pin-btn${pinned?' pinned':''}" onclick="togglePin('${c.name.replace(/'/g,"\\'")}')">
        ${pinned ? '📌' : '📍'}
      </button>`;
    ic.appendChild(header);

    // marriage note
    if (c.marriageNote) {
      const mn = el('div','info-fact', `⚠️ ${c.marriageNote}`);
      ic.appendChild(mn);
    }

    /* Item Favorit */
    if (S.subTab === 'item-favorit') {
      const hasTiers = tOrd.filter(p => S.tiers.has(p) && charGiftsFor(c,p).length > 0);
      if (!hasTiers.length) {
        ic.appendChild(el('div','info-fact','Tidak ada item pada tier yang dipilih.'));
        return;
      }
      hasTiers.forEach((p, idx) => {
        if (idx) ic.appendChild(el('div','tier-divider'));
        const sec = el('div',`tier-section ${tCls[p]}`);
        sec.innerHTML = `<div class="tier-head"><span class="tier-dot-lg"></span>${tLbl[p]}</div>`;
        const pills = el('div','gift-pills');
        charGiftsFor(c,p).forEach(g => {
          const sp = el('span','gpill',g);
          sp.addEventListener('click', () => jumpToItem(g));
          pills.appendChild(sp);
        });
        sec.appendChild(pills);
        ic.appendChild(sec);
      });
    }

    /* Lokasi */
    if (S.subTab === 'lokasi') {
      // apply real time before rendering
      if (S.locRealTime) applyRealTime();

      const sched = c.schedule;
      if (!sched) {
        ic.appendChild(el('div','loc-fixed','Tidak ada data jadwal.'));
        return;
      }

      // banner waktu sekarang / manual
      const banner = el('div','loc-now-banner');
      if (S.locRealTime) {
        banner.innerHTML = `
          <div class="loc-now-pulse"></div>
          <div class="loc-now-info">
            <div class="loc-now-day">📅 ${S.day} · 🕐 ${S.time}
              <span class="now-badge">SEKARANG</span>
            </div>
            <div class="loc-now-time">Waktu real: ${getRealClock()} WIB · Auto-refresh 60 detik</div>
          </div>
          <button class="loc-now-toggle" onclick="setLocManual()">✏️ Manual</button>`;
      } else {
        banner.innerHTML = `
          <div style="font-size:18px">✏️</div>
          <div class="loc-now-info">
            <div class="loc-now-day">📅 ${S.day} · 🕐 ${S.time}</div>
            <div class="loc-now-time">Mode manual — atur hari & waktu di panel kiri</div>
          </div>
          <button class="loc-now-toggle manual-mode" onclick="setLocRealTime()">🕐 Waktu Real</button>`;
      }
      ic.appendChild(banner);

      // lokasi saat ini (highlighted)
      const loc = sched[S.day]?.[S.time] || '—';
      const box = el('div','loc-box is-now');
      box.innerHTML = `
        <div class="loc-time-lbl">${S.day} · ${S.time}${S.locRealTime?` <span class="now-badge">LIVE</span>`:''}</div>
        <div class="loc-place">${loc === '—' ? '⚫ Tidak ditemukan / tidak diketahui' : '📍 ' + loc}</div>`;
      ic.appendChild(box);

      // semua waktu hari ini
      const allDay = el('div','');
      allDay.innerHTML = `<div class="recv-lbl" style="margin-top:14px">Semua Waktu di Hari ${S.day}</div>`;
      const grid = el('div','loc-grid-2');
      times.forEach(t => {
        const v   = sched[S.day]?.[t] || '—';
        const now = S.locRealTime && t === S.time;
        const b   = el('div',`loc-box${now?' is-now':''}`,
          `<div class="loc-time-lbl">${t}${now?` <span class="now-badge">SEKARANG</span>`:''}</div>
           <div class="loc-place" style="font-size:12px">${v === '—' ? '—' : '📍 ' + v}</div>`);
        if (!S.locRealTime) {
          b.style.cursor = 'pointer';
          if (t === S.time) b.style.borderColor = 'var(--pink)';
          b.addEventListener('click', () => { S.time = t; renderSubNav(); renderInfo(); });
        }
        grid.appendChild(b);
      });
      allDay.appendChild(grid);
      ic.appendChild(allDay);

      // catatan perbedaan waktu game vs real
      ic.appendChild(el('div','loc-game-note',
        `⚠️ <b>Catatan:</b> Waktu di dalam game Citampi berjalan lebih cepat dari waktu nyata. Jika kamu sedang mensimulasikan waktu game yang berbeda, gunakan mode <b>✏️ Manual</b> untuk menyesuaikan hari dan waktu secara bebas.`));
    }

    /* Info Dasar */
    if (S.subTab === 'info-dasar') {
      ic.appendChild(infoRowIcon('📅','Ulang Tahun', c.birthdate));
      ic.appendChild(infoRowIcon('🎭','Hobi', c.hobi));
      ic.appendChild(infoRowIcon('✨','Sifat / Kepribadian', c.personality));
      ic.appendChild(infoRowIcon(
        c.canMarry ? '💍' : '🚫',
        'Bisa Dinikahi',
        c.canMarry ? 'Ya' : 'Tidak'
      ));
      if (c.desc) ic.appendChild(el('div','info-fact', c.desc));
    }
  }

  /* ─── ITEM ─── */
  if (S.feature === 'item') {
    const info = getItemInfo(S.selected);

    /* Mancing — show without needing selected item */
    if (S.subTab === 'mancing') {
      let data = fishData.filter(f =>
        (!S.fishLoc  || f.loc === S.fishLoc) &&
        (S.fishLuck === -1 || f.luck === S.fishLuck)
      );
      ic.appendChild(el('div','disclaimer',
        `⚠️ Game tidak menampilkan persentase pasti. Sistem <b>Luck 0–4</b> menunjukkan tingkat kelangkaan. Semakin tinggi Luck karakter, semakin jarang ikan Luck rendah muncul. Gunakan jaring Pak Soleh untuk ikan Luck rendah.`));
      const legend = el('div','luck-legend');
      ['Sangat Umum','Umum','Cukup Langka','Langka','Sangat Langka'].forEach((lbl,i) => {
        legend.appendChild(el('span','ll',`<span class="luck-badge lk${i}">Luck ${i}</span> ${lbl}`));
      });
      ic.appendChild(legend);
      if (!data.length) { ic.appendChild(el('div','info-fact','Tidak ada ikan untuk filter ini.')); return; }
      data.forEach(f => {
        const card = el('div','fish-card');
        card.innerHTML = `
          <div class="fish-name-lg">🐟 ${f.name} <span class="luck-badge lk${f.luck}">Luck ${f.luck}</span></div>
          <div style="display:flex;gap:14px;font-size:11px;color:var(--muted)">
            <span>📍 ${f.loc}</span><span>⏰ ${f.time}</span>
          </div>
          ${f.tip ? `<div class="fish-tip">💡 ${f.tip}</div>` : ''}`;
        ic.appendChild(card);
      });
      return;
    }

    /* Crafting — show without needing selected item */
    if (S.subTab === 'crafting') {
      let data = recipes.filter(r => S.station === 'Semua' || r.station === S.station);
      if (!data.length) { ic.appendChild(el('div','info-fact','Tidak ada resep untuk stasiun ini.')); return; }
      data.forEach(r => {
        const card = el('div','recipe-card');
        const ings = r.ing.map((ing,i) =>
          (i?'<span class="ing-plus">+</span>':'') + `<span class="ing-tag">${ing}</span>`
        ).join('');
        card.innerHTML = `
          <div class="recipe-result">🛠️ ${r.result}</div>
          <div class="recipe-station">${r.station}</div>
          <div class="recipe-ing">${ings}<span class="ing-arrow">→</span><span class="ing-tag" style="border-color:var(--t8-b);color:#92400e">✅ ${r.result}</span></div>
          ${r.alt ? `<div class="recipe-alt">💡 Alternatif: ${r.alt}</div>` : ''}`;
        ic.appendChild(card);
      });
      return;
    }

    if (!S.selected) {
      ic.innerHTML = `<div id="info-empty"><div class="empty-art">🎁</div><div class="empty-title">Pilih item</div><div class="empty-sub">Klik nama item di kiri.</div></div>`;
      return;
    }

    // item header
    const header = el('div','item-header');
    header.innerHTML = `
      <div class="item-name-lg">🎁 ${S.selected}</div>
      <span class="item-cat">${info.cat}</span>`;
    ic.appendChild(header);

    /* Cara Mendapatkan */
    if (S.subTab === 'cara-dapat') {
      const how = el('div','how-row');
      how.innerHTML = `
        <div class="how-icon">${catIcon(info.cat)}</div>
        <div class="how-body">
          <div class="how-lbl">Cara Mendapatkan</div>
          <div class="how-val">${info.how}</div>
          ${info.tip ? `<div class="how-tip">💡 ${info.tip}</div>` : ''}
        </div>`;
      ic.appendChild(how);

      // recipe if craftable
      const rec = recipes.find(r => r.result === S.selected || r.result.startsWith(S.selected));
      if (rec) {
        const rb = el('div','');
        rb.innerHTML = `<div class="recv-lbl">🔨 Bisa Dibuat di ${rec.station}</div>`;
        const rcard = el('div','recipe-card');
        const ings = rec.ing.map((ing,i) =>
          (i?'<span class="ing-plus">+</span>':'') + `<span class="ing-tag">${ing}</span>`
        ).join('');
        rcard.innerHTML = `<div class="recipe-ing">${ings}<span class="ing-arrow">→</span><span class="ing-tag" style="border-color:var(--t8-b);color:#92400e">✅ ${rec.result}</span></div>
          ${rec.alt ? `<div class="recipe-alt">💡 Alternatif: ${rec.alt}</div>` : ''}`;
        rb.appendChild(rcard);
        ic.appendChild(rb);
      }
    }

    /* Gift */
    if (S.subTab === 'gift') {
      const recvMap = {};
      chars.forEach(c => {
        tOrd.forEach(p => {
          if ((c.gifts[p]||[]).includes(S.selected)) {
            if (!recvMap[p]) recvMap[p] = [];
            recvMap[p].push(c);
          }
        });
      });
      const found = tOrd.filter(p => recvMap[p]?.length);
      if (!found.length) {
        ic.appendChild(el('div','info-fact','Tidak ada karakter yang menyukai item ini sebagai hadiah (dalam data yang tersedia).'));
        return;
      }
      ic.appendChild(el('div','recv-lbl','Disukai oleh:'));
      found.forEach((p,idx) => {
        if (idx) ic.appendChild(el('div','tier-divider'));
        const sec = el('div',`tier-section ${tCls[p]}`);
        sec.innerHTML = `<div class="tier-head"><span class="tier-dot-lg"></span>${tLbl[p]}</div>`;
        const pills = el('div','recv-pills');
        recvMap[p].forEach(c => {
          pills.appendChild(el('span',`rpill ${rCls[p]}`, `${c.emoji} ${c.name}`));
        });
        sec.appendChild(pills);
        ic.appendChild(sec);
      });
    }
  }

  /* ─── JOB ─── */
  if (S.feature === 'job') {
    if (!S.selected) {
      ic.innerHTML = `<div id="info-empty"><div class="empty-art">💼</div><div class="empty-title">Pilih pekerjaan</div><div class="empty-sub">Klik nama job di kiri.</div></div>`;
      return;
    }
    const j = jobs.find(jb => jb.name === S.selected);
    if (!j) return;

    const sc = j.salary >= 60 ? 'sb-high' : j.salary >= 35 ? 'sb-mid' : 'sb-low';
    const header = el('div','job-header');
    header.innerHTML = `
      <div>
        <div class="job-name-lg">💼 ${j.name}</div>
        <div class="job-loc">📍 ${j.loc}</div>
      </div>
      <div class="salary-badge ${sc}">${j.salary} Rc/jam</div>`;
    ic.appendChild(header);

    if (j.desc) ic.appendChild(el('div','info-fact', j.desc));

    // difficulty bar
    const diff   = getJobDiff(j);
    const maxSkl = Math.max(j.skill.k, j.skill.f, j.skill.c);
    const segCls = diff.cls.replace('diff-','on-');
    const diffWrap = el('div','diff-bar-wrap');
    diffWrap.innerHTML = `
      <div class="diff-bar-lbl">Tingkat Kesulitan</div>
      <div class="diff-bar">
        ${Array.from({length:5},(_,i) =>
          `<div class="diff-seg${i < maxSkl ? ' '+segCls : ''}"></div>`
        ).join('')}
        <span class="diff-val" style="color:var(--${diff.cls==='diff-easy'?'t5':diff.cls==='diff-mid'?'gold':'pink'})">${diff.lbl}</span>
      </div>`;
    ic.appendChild(diffWrap);

    // stat cards row: gaji + jam + area
    const statRow = el('div','stat-row');
    statRow.innerHTML = `
      <div class="stat-card salary">
        <div class="stat-icon">💰</div>
        <div><div class="stat-lbl">Gaji</div><div class="stat-val">${j.salary} Rc/jam</div></div>
      </div>
      <div class="stat-card hours">
        <div class="stat-icon">⏰</div>
        <div><div class="stat-lbl">Jam Kerja</div><div class="stat-val">${j.hours}</div></div>
      </div>
      <div class="stat-card area">
        <div class="stat-icon">🗺️</div>
        <div><div class="stat-lbl">Area</div><div class="stat-val">Area ${j.area}</div></div>
      </div>`;
    ic.appendChild(statRow);

    // skill icon pills
    const skillWrap = el('div','');
    skillWrap.innerHTML = `<div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin-bottom:7px">💡 Skill Minimum</div>`;
    const skillRow = el('div','skill-icon-row');
    skillRow.innerHTML = `
      <div class="skill-icon-pill sip-k">
        <span class="sip-icon">💬</span>
        <div class="sip-body">
          <div class="sip-name">Komunikasi</div>
          <div class="sip-val">${j.skill.k}</div>
        </div>
      </div>
      <div class="skill-icon-pill sip-f">
        <span class="sip-icon">💪</span>
        <div class="sip-body">
          <div class="sip-name">Fisik</div>
          <div class="sip-val">${j.skill.f}</div>
        </div>
      </div>
      <div class="skill-icon-pill sip-c">
        <span class="sip-icon">🧠</span>
        <div class="sip-body">
          <div class="sip-name">Kecerdasan</div>
          <div class="sip-val">${j.skill.c}</div>
        </div>
      </div>`;
    skillWrap.appendChild(skillRow);
    ic.appendChild(skillWrap);

    // costume & exp
    const rows = el('div','job-rows');
    rows.style.marginTop = '10px';
    const addRow = (lbl, val) => {
      const r = el('div','jrow');
      r.innerHTML = `<div class="jlbl">${lbl}</div><div class="jval">${val}</div>`;
      rows.appendChild(r);
    };

    if (j.costume && j.costume !== '—') {
      const cr = el('div','jrow');
      cr.innerHTML = `<div class="jlbl">👔 Kostum</div><span class="costume-tag">${j.costume}</span>`;
      rows.appendChild(cr);
    }
    if (j.exp && j.exp !== '—') {
      addRow('📋 Pengalaman', `<span class="exp-txt">${j.exp}</span>`);
    }
    if (rows.children.length) ic.appendChild(rows);
  }

  /* ─── PRIORITAS ─── */
  if (S.feature === 'prioritas') {
    if (!S.pins.length) {
      ic.innerHTML = `
        <div class="prio-tab-empty">
          <div class="empty-art">📍</div>
          <div class="empty-title" style="margin-bottom:6px">Belum ada yang di-pin</div>
          <div class="empty-sub">Buka tab Karakter, lalu klik 📍 pada kartu karakter untuk memulai. Max ${MAX_PIN} pin, max ${MAX_PRIO} prioritas.</div>
        </div>`;
      return;
    }

    // Prio slots
    const prioSection = el('div','prio-tab-section');
    prioSection.innerHTML = `<div class="section-lbl">🎯 Prioritas Utama (${S.prios.length}/${MAX_PRIO})</div>`;
    const grid = el('div','prio-cards-grid');
    for (let i = 0; i < MAX_PRIO; i++) {
      const name = S.prios[i];
      const c = name ? chars.find(ch => ch.name === name) : null;
      const card = el('div', `prio-card-lg ${c ? 'filled' : 'empty'}`);
      if (c) {
        const top3 = (c.gifts[8]||[]).slice(0,3);
        card.innerHTML = `
          <div class="prio-slot-badge">#${i+1}</div>
          <button class="prio-rm" onclick="removePrio('${c.name.replace(/'/g,"\\'")}')">✕</button>
          <div class="prio-card-emoji">${c.emoji}</div>
          <div class="prio-card-name">${c.name}</div>
          <div class="prio-card-role">${c.role}</div>
          <div class="prio-card-gifts">
            ${top3.map(g=>`<span class="prio-gtag">⭐${g}</span>`).join('')}
            ${(c.gifts[8]||[]).length>3?`<span class="prio-gtag">+${(c.gifts[8]||[]).length-3}</span>`:''}
          </div>`;
      } else {
        card.innerHTML = `<div class="prio-slot-badge">#${i+1}</div><div class="prio-empty-icon">＋</div><div class="prio-empty-txt">Naikkan dari<br>daftar pin</div>`;
      }
      grid.appendChild(card);
    }
    prioSection.appendChild(grid);
    ic.appendChild(prioSection);

    // Pin chips
    const pinSection = el('div','prio-tab-section');
    pinSection.innerHTML = `<div class="section-lbl">📌 Semua Pin (${S.pins.length}/${MAX_PIN})</div>`;
    const chips = el('div','pin-chips-big');
    S.pins.forEach(name => {
      const c = chars.find(ch => ch.name === name);
      if (!c) return;
      const isPrio = S.prios.includes(name);
      const chip = el('div', `pin-chip-big${isPrio?' is-prio':''}`);
      chip.innerHTML = `
        <span>${c.emoji}</span>
        <span>${name}</span>
        <button class="pcb-up" onclick="promoteToPrio('${name.replace(/'/g,"\\'")}')">
          ${isPrio ? '★ Prioritas' : '↑ Jadikan Prioritas'}
        </button>
        <button class="pcb-x" onclick="removePin('${name.replace(/'/g,"\\'")}')">✕</button>`;
      chips.appendChild(chip);
    });
    pinSection.appendChild(chips);
    ic.appendChild(pinSection);

    // If selected, show char detail below
    if (S.selected && S.pins.includes(S.selected)) {
      const c = chars.find(ch => ch.name === S.selected);
      if (c) {
        ic.appendChild(el('div','tier-divider'));
        const detail = el('div','');
        detail.innerHTML = `<div class="section-lbl">📋 Detail ${c.name}</div>`;

        const vt = tOrd.filter(p => charGiftsFor(c,p).length > 0);
        vt.forEach((p,idx) => {
          if (idx) detail.appendChild(el('div','tier-divider'));
          const sec = el('div',`tier-section ${tCls[p]}`);
          sec.innerHTML = `<div class="tier-head"><span class="tier-dot-lg"></span>${tLbl[p]}</div>`;
          const pills = el('div','gift-pills');
          charGiftsFor(c,p).forEach(g => {
            pills.appendChild(el('span','gpill',g));
          });
          sec.appendChild(pills);
          detail.appendChild(sec);
        });
        ic.appendChild(detail);
      }
    }
  }
}

function setLocRealTime() {
  S.locRealTime = true;
  applyRealTime();
  renderSubNav();
  renderInfo();
}
function setLocManual() {
  S.locRealTime = false;
  renderSubNav();
  renderInfo();
}

/* ════════════════════════════════════════
   PIN SYSTEM
════════════════════════════════════════ */
function togglePin(name) {
  const idx = S.pins.indexOf(name);
  if (idx > -1) {
    S.pins.splice(idx, 1);
    S.prios = S.prios.filter(n => n !== name);
  } else {
    if (S.pins.length >= MAX_PIN) {
      alert(`Maksimal ${MAX_PIN} karakter bisa di-pin. Lepas salah satu dulu.`); return;
    }
    S.pins.push(name);
  }
  persist(); renderAll();
}

function promoteToPrio(name) {
  if (S.prios.includes(name)) {
    S.prios = S.prios.filter(n => n !== name);
    persist(); renderAll(); return;
  }
  if (S.prios.length < MAX_PRIO) {
    S.prios.push(name);
    persist(); renderAll();
  } else {
    openSwap(name);
  }
}

function removePrio(name) {
  S.prios = S.prios.filter(n => n !== name);
  persist(); renderAll();
}

function removePin(name) {
  S.pins = S.pins.filter(n => n !== name);
  S.prios = S.prios.filter(n => n !== name);
  persist(); renderAll();
}

/* ── SWAP MODAL ── */
let _pendingPromo = '';
function openSwap(name) {
  _pendingPromo = name;
  const incoming = chars.find(c => c.name === name);
  $('swap-sub').textContent = `3 slot prioritas penuh. Pilih yang ingin diganti dengan ${incoming?.emoji || ''} ${name}:`;
  const opts = $('swap-opts');
  opts.innerHTML = S.prios.map(pname => {
    const pc = chars.find(c => c.name === pname);
    return `<div class="swap-opt" onclick="doSwap('${pname.replace(/'/g,"\\'")}')">
      <span class="swap-opt-emoji">${pc?.emoji || '👤'}</span>
      <div><div class="swap-opt-name">${pname}</div><div class="swap-opt-role">${pc?.role||''}</div></div>
    </div>`;
  }).join('');
  $('swap-modal').style.display = 'flex';
}
function doSwap(oldName) {
  S.prios = S.prios.filter(n => n !== oldName);
  S.prios.push(_pendingPromo);
  closeSwap();
  persist(); renderAll();
}
function closeSwap() { $('swap-modal').style.display = 'none'; }
$('swap-modal').addEventListener('click', e => { if (e.target === $('swap-modal')) closeSwap(); });

/* ════════════════════════════════════════
   HEADER PRIORITY WIDGET
════════════════════════════════════════ */
function renderHeaderPrio() {
  const zone = $('h-prio-zone');
  if (!S.pins.length) {
    zone.innerHTML = `<div class="prio-empty-hint">📍 Pin karakter dari tab Karakter untuk mulai</div>`;
    return;
  }
  // 3 prio cards
  let html = `<div class="h-prio-cards">`;
  for (let i = 0; i < MAX_PRIO; i++) {
    const name = S.prios[i];
    const c = name ? chars.find(ch => ch.name === name) : null;
    if (c) {
      html += `<div class="h-prio-card slot-filled">
        <div class="h-slot-num">#${i+1}</div>
        <span class="h-prio-emoji">${c.emoji}</span>
        <div class="h-prio-info"><div class="h-prio-name">${c.name}</div><div class="h-prio-role">${c.role}</div></div>
        <button class="h-prio-rm" onclick="removePrio('${c.name.replace(/'/g,"\\'")}')">✕</button>
      </div>`;
    } else {
      html += `<div class="h-prio-card slot-empty"><div class="h-slot-num">#${i+1}</div><span style="font-size:11px;color:var(--dim)">Kosong</span></div>`;
    }
  }
  html += `</div>`;

  // pin chips
  html += `<div class="h-pin-chips">`;
  S.pins.forEach(name => {
    const c = chars.find(ch => ch.name === name);
    if (!c) return;
    const isPrio = S.prios.includes(name);
    html += `<span class="h-pin-chip${isPrio?' is-prio':''}">
      ${c.emoji} ${name}
      <button class="h-chip-up" onclick="promoteToPrio('${name.replace(/'/g,"\\'")}')">
        ${isPrio ? '★' : '↑'}
      </button>
      <button class="h-chip-x" onclick="removePin('${name.replace(/'/g,"\\'")}')">✕</button>
    </span>`;
  });
  html += `</div>`;
  zone.innerHTML = html;
}

function updatePinBadge() {
  // desktop sidebar badge
  const b = $('pin-badge');
  if (b) {
    b.textContent = S.pins.length;
    b.style.display = S.pins.length ? 'flex' : 'none';
  }
  // mobile bottom tab badge
  const bb = $('btab-pin-badge');
  if (bb) {
    bb.textContent = S.pins.length;
    bb.style.display = S.pins.length ? 'flex' : 'none';
  }
}

S.locRealTime = true;
S.quickFilter  = '';   // active quick filter id

/* ── Quick filter definitions ── */
const quickFilters = {
  karakter: [
    { id:'heroine-only', lbl:'💖 Heroine', color:'',     test: c => c.heroine },
    { id:'can-marry',    lbl:'💍 Bisa Dinikahi', color:'qf-mint', test: c => c.canMarry },
    { id:'npc-quest',    lbl:'👻 NPC Quest', color:'qf-lav', test: c => !c.canMarry && c.marriageNote },
  ],
  item: [
    { id:'ikan',      lbl:'🐟 Ikan & Mancing', color:'qf-mint', test: i => i.cat === 'Ikan' || i.cat === 'Ikan Quest' },
    { id:'kuno',      lbl:'🏺 Barang Kuno',    color:'qf-gold', test: i => i.cat === 'Barang Kuno' },
    { id:'berharga',  lbl:'⭐ Berharga',        color:'qf-gold', test: i => i.cat === 'Berharga' },
    { id:'crafting',  lbl:'🔨 Bisa di-Craft',  color:'qf-lav',  test: i => recipes.some(r => r.result === i.name || r.result.startsWith(i.name)) },
    { id:'makanan',   lbl:'🍳 Makanan',        color:'',        test: i => i.cat === 'Makanan' || i.cat === 'Makanan Khusus' },
    { id:'perhiasan', lbl:'💍 Perhiasan',      color:'',        test: i => i.cat === 'Perhiasan' },
    { id:'quest',     lbl:'⚔️ Item Quest',     color:'qf-lav',  test: i => i.cat === 'Item Quest' || i.cat === 'Crafting Khusus' },
  ],
  job: [
    { id:'gaji-tinggi',  lbl:'💰 Gaji Tertinggi', color:'qf-gold', test: j => j.salary >= 60 },
    { id:'pemula',       lbl:'🌱 Untuk Pemula',   color:'qf-mint', test: j => Math.max(j.skill.k,j.skill.f,j.skill.c) <= 2 },
    { id:'skill-rendah', lbl:'⚡ No Pengalaman',  color:'qf-mint', test: j => !j.exp || j.exp === '—' },
    { id:'skill-tinggi', lbl:'🎓 Skill Tinggi',   color:'',        test: j => Math.max(j.skill.k,j.skill.f,j.skill.c) >= 5 },
  ],
};

/* ── Category icon map ── */
const catIcons = {
  'Ikan':'🐟','Ikan Quest':'🐟',
  'Berharga':'⭐','Barang Kuno':'🏺',
  'Perhiasan':'💍','Buku':'📚',
  'Pakaian':'👗','Aksesoris':'👜',
  'Perabotan':'🏠','Kerajinan':'✂️',
  'Kecantikan':'💄','Elektronik':'📱',
  'Sayuran':'🥬','Buah':'🍎',
  'Material':'⚙️','Minuman':'🥤',
  'Makanan':'🍳','Makanan Khusus':'🎊',
  'Mainan':'🎮','Item Quest':'⚔️',
  'Crafting Khusus':'🔮','Benih':'🌱',
  'Tanaman':'🌿','Bahan Masak':'🌶️',
  'Rempah':'🌿','Kain Tradisional':'🧣',
  'Hewan':'🐾','Lainnya':'📦',
};
function catIcon(cat) { return catIcons[cat] || '📦'; }

/* ── Info row with icon ── */
function infoRowIcon(icon, lbl, val) {
  const d = el('div','info-row-icon');
  d.innerHTML = `<div class="iri-icon">${icon}</div>
    <div class="iri-body">
      <div class="iri-lbl">${lbl}</div>
      <div class="iri-val">${val || 'Tidak diketahui'}</div>
    </div>`;
  return d;
}

function getJobDiff(j) {
  const max = Math.max(j.skill.k, j.skill.f, j.skill.c);
  if (max <= 2) return { cls:'diff-easy', lbl:'Pemula',   segs:1 };
  if (max <= 4) return { cls:'diff-mid',  lbl:'Menengah', segs:3 };
  return              { cls:'diff-hard',  lbl:'Ahli',     segs:5 };
}




/* ════════════════════════════════════════
   MOBILE SYSTEM
════════════════════════════════════════ */
const isMobile = () => window.innerWidth <= 768;

/* ── Mobile view state: 'list' | 'info' ── */
S.mobView = 'list';

function updateMobileView() {
  if (!isMobile()) return;

  const listPanel  = $('list-panel');
  const infoPanel  = $('info-panel');
  const mobBack    = $('mob-back');

  if (S.mobView === 'info' && S.selected) {
    listPanel.classList.add('mob-hidden');
    infoPanel.classList.add('mob-active');
    if (mobBack) mobBack.style.display = 'flex';
  } else {
    listPanel.classList.remove('mob-hidden');
    infoPanel.classList.remove('mob-active');
    if (mobBack) mobBack.style.display = 'none';
    S.mobView = 'list';
  }
}

function mobileBack() {
  S.mobView  = 'list';
  S.selected = null;
  updateMobileView();
  renderList();
  renderInfo();
}

/* ── Bottom tabs feature switch ── */
function switchFeatureMob(f, btn) {
  S.feature     = f;
  S.selected    = null;
  S.search      = '';
  S.mobView     = 'list';
  S.quickFilter = '';

  // sync search inputs
  const si = $('search-input');
  const sm = $('search-input-mob');
  if (si) si.value = '';
  if (sm) sm.value = '';

  // default sub-tabs
  if (f === 'karakter')  S.subTab = 'item-favorit';
  if (f === 'item')      S.subTab = 'cara-dapat';
  if (f === 'job')       S.subTab = 'deskripsi';
  if (f === 'prioritas') S.subTab = 'prio-view';
  if (f === 'planning')  { S.planDay = S.planDay || getRealDay(); }

  // sync desktop nav
  document.querySelectorAll('.mnav').forEach(b =>
    b.classList.toggle('active', b.dataset.f === f));

  // sync bottom tabs
  document.querySelectorAll('.btab').forEach(b =>
    b.classList.toggle('active', b.dataset.f === f));

  updateMobileView();
  renderAll();
}

/* ── Drawer (sub-nav) toggle ── */
function toggleDrawer() {
  const sn  = $('sub-nav');
  const ov  = $('mob-drawer-overlay');
  const open = sn.classList.contains('drawer-open');
  sn.classList.toggle('drawer-open', !open);
  ov.classList.toggle('active', !open);
}

function closeDrawer() {
  $('sub-nav').classList.remove('drawer-open');
  $('mob-drawer-overlay').classList.remove('active');
}

/* ── Mobile search input sync ── */
function onMobSearch(val) {
  S.search = val.toLowerCase();
  const si = $('search-input');
  if (si) si.value = val;
  renderList();
}

/* ── Resize: reset mobile state if going back to desktop ── */
window.addEventListener('resize', () => {
  if (!isMobile()) {
    $('list-panel').classList.remove('mob-hidden');
    $('info-panel').classList.remove('mob-active');
    closeDrawer();
    const mb = $('mob-back');
    if (mb) mb.style.display = 'none';
  } else {
    updateMobileView();
  }
});

/* ════════════════════════════════════════
   PLANNING SYSTEM
════════════════════════════════════════ */

/* ── Planning State ── */
S.planDay       = getRealDay();   // hari yang sedang diedit
S.planSelChar   = null;           // char yang sedang dipilih di editor
S.planCraftItem = null;           // item craft yang dipilih
S.planCraftOpen = {};             // expanded nodes di crafting tree

/* ── Presets: { Senin: { items:{name:bool}, craft:name|null, craftConfirm:{name:bool} } } ── */
let presets = {};
try {
  presets = JSON.parse(localStorage.getItem('cs13_presets') || '{}');
} catch(e) { presets = {}; }

function savePresets() {
  try { localStorage.setItem('cs13_presets', JSON.stringify(presets)); } catch(e) {}
  renderBagWidget();
}

function getPreset(day) {
  if (!presets[day]) presets[day] = { items:{}, craft:null, craftConfirm:{} };
  return presets[day];
}

/* ── Bag widget (nav) ── */
function renderBagWidget() {
  const today   = getRealDay();
  const preset  = getPreset(today);
  const checked = Object.entries(preset.items).filter(([,v]) => v).map(([k]) => k);
  const count   = checked.length;
  const btn     = $('nav-bag-btn');
  const badge   = $('bag-count');
  const lbl     = $('bag-lbl');
  const prev    = $('bag-preview');
  if (!btn) return;
  btn.classList.toggle('has-items', count > 0);
  if (badge) { badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }
  if (lbl)   lbl.textContent = count ? `${count} item` : 'Bawaan';
  if (prev) {
    prev.innerHTML = checked.slice(0,6).map(() =>
      `<div class="bag-dot"></div>`).join('');
  }
}

function switchFeatureFromBag() {
  // go to planning tab, day = today
  S.feature  = 'planning';
  S.planDay  = getRealDay();
  document.querySelectorAll('.mnav').forEach(b =>
    b.classList.toggle('active', b.dataset.f === 'planning'));
  renderAll();
}

/* ── Sub-nav for Planning ── */
function renderPlanningSubNav() {
  const sn = $('sub-nav');
  sn.innerHTML = '';

  const lbl = el('div','snav-group-lbl','Pilih Hari');
  sn.appendChild(lbl);

  days.forEach(d => {
    const preset  = getPreset(d);
    const hasItems = Object.values(preset.items).some(v => v) || preset.craft;
    const isToday  = d === getRealDay();
    const wrap     = el('div','',`
      <button class="snav${S.planDay===d?' active':''}${hasItems?' snav-has-preset':''}"
        style="width:100%;display:flex;align-items:center;gap:7px;text-align:left;position:relative"
        onclick="setPlanDay('${d}')">
        <span class="snav-icon">📅</span>
        <span class="snav-lbl">${d}${isToday?' ⬅':''}</span>
        ${hasItems?`<span style="width:6px;height:6px;border-radius:50%;background:var(--mint);margin-left:auto;flex-shrink:0"></span>`:''}
      </button>`);
    sn.appendChild(wrap);
  });

  const sep = el('div','snav-sep'); sn.appendChild(sep);

  // clear day button
  const clr = el('button','snav','🗑️ Kosongkan Hari Ini');
  clr.style.color = 'var(--rose)';
  clr.style.fontSize = '10px';
  clr.addEventListener('click', () => {
    if (!confirm(`Kosongkan preset ${S.planDay}?`)) return;
    presets[S.planDay] = { items:{}, craft:null, craftConfirm:{} };
    savePresets();
    S.planSelChar = null;
    S.planCraftItem = null;
    renderAll();
  });
  sn.appendChild(clr);
}

function setPlanDay(d) {
  S.planDay     = d;
  S.planSelChar = null;
  renderPlanningSubNav();
  renderPlanningContent();
}

/* ── Main Planning render ── */
function renderPlanningContent() {
  const ic = $('info-content');
  ic.innerHTML = '';

  const day    = S.planDay;
  const preset = getPreset(day);
  const isToday = day === getRealDay();

  const wrap = el('div','plan-wrap');

  // ── HEADER
  const hdr = el('div','');
  hdr.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="font-size:28px">📅</div>
      <div>
        <div style="font-size:17px;font-weight:900;color:var(--txt)">
          Preset ${day}
          ${isToday?`<span style="font-size:10px;background:var(--mint);color:#fff;padding:2px 7px;border-radius:5px;margin-left:6px;font-weight:800">HARI INI</span>`:''}
        </div>
        <div style="font-size:11px;color:var(--muted)">
          Atur item bawaan untuk hari ${day}
        </div>
      </div>
    </div>`;
  wrap.appendChild(hdr);

  // ── SECTION 1: PILIH KARAKTER
  wrap.appendChild(el('div','plan-section-lbl','👥 Pilih Karakter Target'));

  if (!S.pins.length) {
    wrap.appendChild(el('div','plan-empty',`
      <div class="plan-empty-icon">📍</div>
      <div class="plan-empty-title">Belum ada karakter di-pin</div>
      <div class="plan-empty-sub">Pin karakter dari tab Karakter dulu, lalu kembali ke sini untuk mengatur bawaan harian.</div>`));
    ic.appendChild(wrap);
    return;
  }

  const charRow = el('div','plan-char-row');
  S.pins.forEach(name => {
    const c = chars.find(ch => ch.name === name);
    if (!c) return;
    const chip = el('button', `plan-char-chip${S.planSelChar===name?' selected':''}`,
      `<span class="pcc-emoji">${c.emoji}</span><span>${name}</span>`);
    chip.addEventListener('click', () => {
      S.planSelChar = S.planSelChar === name ? null : name;
      renderPlanningContent();
    });
    charRow.appendChild(chip);
  });
  wrap.appendChild(charRow);

  // ── SECTION 2: ITEM REKOMENDASI (jika char dipilih)
  if (S.planSelChar) {
    const c = chars.find(ch => ch.name === S.planSelChar);
    if (c) {
      wrap.appendChild(el('div','plan-section-lbl',
        `🎁 Item Favorit ${c.emoji} ${c.name} — ${day}`));

      // collect all gifts tier 8 & 5
      const allGifts = [
        ...tOrd.filter(p => p >= 5).flatMap(p =>
          (c.gifts[p]||[]).map(name => ({ name, tier:p }))
        )
      ];

      if (!allGifts.length) {
        wrap.appendChild(el('div','info-fact','Tidak ada data hadiah untuk karakter ini.'));
      } else {
        const grid = el('div','plan-item-grid');
        allGifts.forEach(({ name, tier }) => {
          const avail   = isItemAvailOn(name, day);
          const checked = preset.items[name] === true;
          const info    = getItemInfo(name);

          const card = el('div',
            `plan-item-card${checked?' checked':''}${!avail?' unavail':''}`);
          card.innerHTML = `
            <div class="pic-check">${checked?'✓':''}</div>
            <div class="pic-icon">${catIcon(info.cat)}</div>
            <div class="pic-name">${name}</div>
            <div class="pic-tier" style="color:var(--${tier===8?'t8':'t5'})">${tier===8?'⭐ +8':'💚 +5'}</div>
            ${!avail ? `<div class="pic-unavail-tag">⚠️ Cek ketersediaan</div>` : ''}`;

          card.addEventListener('click', (e) => {
            if (!avail) { showUnavailPopup(name, day, e); return; }
            preset.items[name] = !preset.items[name];
            savePresets();
            renderPlanningContent();
          });
          card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showUnavailPopup(name, day, e);
          });
          grid.appendChild(card);
        });
        wrap.appendChild(grid);
      }
    }
  }

  // ── SECTION 3: ITEM YANG SUDAH DIPILIH (summary)
  const checkedItems = Object.entries(preset.items).filter(([,v]) => v).map(([k]) => k);
  if (checkedItems.length) {
    wrap.appendChild(el('div','plan-section-lbl',`✅ Daftar Bawaan (${checkedItems.length} item)`));
    const bagGrid = el('div','plan-item-grid');
    checkedItems.forEach(name => {
      const info    = getItemInfo(name);
      const avail   = isItemAvailOn(name, day);
      const card = el('div',`plan-item-card checked${!avail?' unavail':''}`);
      card.innerHTML = `
        <div class="pic-check">✓</div>
        <div class="pic-icon">${catIcon(info.cat)}</div>
        <div class="pic-name">${name}</div>
        ${!avail?`<div class="pic-unavail-tag">⚠️ Tidak tersedia ${day}</div>`:''}`;
      card.addEventListener('click', () => {
        preset.items[name] = false;
        savePresets();
        renderPlanningContent();
      });
      bagGrid.appendChild(card);
    });
    wrap.appendChild(bagGrid);
  }

  // ── SECTION 4: CRAFTING
  wrap.appendChild(el('div','plan-section-lbl','🔨 Target Crafting (opsional)'));

  const ctWrap = el('div','craft-tree');

  // craft picker
  const picker = el('div','ct-picker');
  const noneBtn = el('button',`ct-pick${!preset.craft?' active':''}`, '— Tidak ada —');
  noneBtn.addEventListener('click', () => {
    preset.craft = null; preset.craftConfirm = {};
    savePresets(); S.planCraftItem = null;
    renderPlanningContent();
  });
  picker.appendChild(noneBtn);

  // show craftable items from recipes
  const craftableNames = [...new Set(recipes.map(r => r.result))];
  craftableNames.forEach(name => {
    const b = el('button',`ct-pick${preset.craft===name?' active':''}`, name);
    b.addEventListener('click', () => {
      preset.craft = name;
      preset.craftConfirm = {};
      savePresets();
      S.planCraftItem = name;
      renderPlanningContent();
    });
    picker.appendChild(b);
  });
  ctWrap.appendChild(picker);

  // render crafting tree if selected
  if (preset.craft) {
    const treeEl = renderCraftTree(preset.craft, preset, 0);
    ctWrap.appendChild(treeEl);
  }

  wrap.appendChild(ctWrap);
  ic.appendChild(wrap);

  // ── SUMMARY BAR
  const total     = checkedItems.length + (preset.craft ? 1 : 0);
  const needBuy   = checkedItems.filter(n => {
    const info = getItemInfo(n);
    return info.how.toLowerCase().includes('beli');
  }).length;
  const needFind  = checkedItems.length - needBuy;

  const sumBar = el('div','plan-summary');
  sumBar.innerHTML = `
    <div class="ps-stat">🎒 ${checkedItems.length} dibawa</div>
    ${needBuy  ? `<div class="ps-stat">🛒 ${needBuy} beli</div>` : ''}
    ${needFind ? `<div class="ps-stat">🔍 ${needFind} cari</div>` : ''}
    ${preset.craft ? `<div class="ps-stat">🔨 craft: ${preset.craft}</div>` : ''}
    <span class="ps-saved">✅ Auto-tersimpan</span>`;
  ic.appendChild(sumBar);
}

/* ── Crafting Tree (recursive) ── */
function renderCraftTree(itemName, preset, depth) {
  const wrapper  = el('div', depth > 0 ? 'ct-children' : 'ct-node');
  const recipe   = recipes.find(r => r.result === itemName);
  const confirmed = preset.craftConfirm?.[itemName] || false;
  const hasChildren = !!recipe;
  const expandKey   = `${depth}_${itemName}`;
  const isExpanded  = S.planCraftOpen[expandKey] !== false; // default expand

  const item = el('div',
    `ct-item${depth===0?' ct-root':''}${confirmed?' ct-confirmed':''}${hasChildren?' ct-has-children':''}${hasChildren&&isExpanded?' ct-expanded':''}`);
  item.innerHTML = `
    <span class="ct-icon">${catIcon(getItemInfo(itemName).cat)}</span>
    <span class="ct-name">${itemName}</span>
    ${recipe ? `<span class="ct-qty" style="font-size:9px;color:var(--lav)">${recipe.station}</span>` : `<span class="ct-qty">${getItemInfo(itemName).how.split('(')[0].trim()}</span>`}
    <div class="ct-check">${confirmed?'✓':''}</div>`;

  item.addEventListener('click', () => {
    if (hasChildren) {
      S.planCraftOpen[expandKey] = !isExpanded;
    }
    if (!recipe) {
      // leaf node: toggle confirm
      if (!preset.craftConfirm) preset.craftConfirm = {};
      preset.craftConfirm[itemName] = !confirmed;
      savePresets();
    }
    renderPlanningContent();
  });

  wrapper.appendChild(item);

  // render children if expanded
  if (recipe && isExpanded) {
    recipe.ing.forEach(ing => {
      // parse quantity like "Rotan x2"
      const match = ing.match(/^(.+?)\s*x(\d+)$/);
      const ingName = match ? match[1] : ing;
      const child   = renderCraftTree(ingName, preset, depth + 1);
      wrapper.appendChild(child);
    });
    if (recipe.alt) {
      const altNote = el('div','',
        `<div style="font-size:9px;color:var(--muted);padding:4px 12px;font-style:italic">💡 Alt: ${recipe.alt}</div>`);
      wrapper.appendChild(altNote);
    }
  }

  return wrapper;
}

/* ── Unavailable item popup ── */
let _popupTimer = null;
function showUnavailPopup(name, day, e) {
  // remove existing
  document.querySelectorAll('.unavail-popup').forEach(p => p.remove());

  const avDays = itemAvailDays(name);
  const info   = getItemInfo(name);
  const popup  = el('div','unavail-popup');
  popup.innerHTML = `
    <div class="up-name">⚠️ ${name}</div>
    <div class="up-avail">
      ${avDays.length === 7
        ? '✅ Tersedia setiap hari'
        : `📅 Tersedia: ${avDays.join(', ')}<br>❌ Tidak tersedia hari ${day}`}
    </div>
    <div class="up-how">📍 ${info.how}</div>`;

  popup.style.left = Math.min(e.clientX + 10, window.innerWidth - 240) + 'px';
  popup.style.top  = Math.min(e.clientY + 10, window.innerHeight - 120) + 'px';
  document.body.appendChild(popup);

  clearTimeout(_popupTimer);
  _popupTimer = setTimeout(() => popup.remove(), 3000);
  document.addEventListener('click', () => popup.remove(), { once:true });
}

/* ════════════════════════════════════════
   THEME SYSTEM
════════════════════════════════════════ */
const themes = [
  {
    id:'sakura',   name:'Sakura',        sub:'Default · Pink Pastel',      dark:false,
    swatches:['#e91e8c','#7c3aed','#00897b'],
  },
  {
    id:'matcha',   name:'Matcha Garden', sub:'Hijau Sage · Krem Hangat',   dark:false,
    swatches:['#4a7c59','#8b6914','#c17f3a'],
  },
  {
    id:'ocean',    name:'Ocean Breeze',  sub:'Biru Langit · Teal Segar',   dark:false,
    swatches:['#0277bd','#00838f','#f57c00'],
  },
  {
    id:'citrus',   name:'Sunset Citrus', sub:'Oranye · Peach · Coral',     dark:false,
    swatches:['#e65100','#c62828','#f9a825'],
  },
  {
    id:'midnight', name:'Midnight Purple',sub:'Ungu Gelap · Violet · Pink',dark:true,
    swatches:['#d946ef','#818cf8','#fbbf24'],
  },
  {
    id:'forest',   name:'Forest Night',  sub:'Hijau Tua · Teal · Gold',    dark:true,
    swatches:['#4ade80','#22d3ee','#fbbf24'],
  },
  {
    id:'arcade',   name:'Neon Arcade',   sub:'Hitam · Cyan · Magenta Neon',dark:true,
    swatches:['#ff00ff','#00ffff','#ffff00'],
  },
];

const sizes = [
  {
    id:'small',  label:'Kecil',  sub:'Default',
    dots:[{w:28,h:6},{w:22,h:6},{w:25,h:6}],
  },
  {
    id:'medium', label:'Sedang', sub:'Nyaman',
    dots:[{w:28,h:8},{w:22,h:8},{w:25,h:8}],
  },
  {
    id:'large',  label:'Besar',  sub:'Mudah dibaca',
    dots:[{w:28,h:11},{w:22,h:11},{w:25,h:11}],
  },
];

let currentTheme = 'sakura';
let currentSize  = 'small';

function initTheme() {
  try {
    currentTheme = localStorage.getItem('cs7_theme') || 'sakura';
    currentSize  = localStorage.getItem('cs7_size')  || 'small';
  } catch(e) {}
  applyTheme(currentTheme, false);
  applySize(currentSize,   false);
  buildThemePanel();
}

function applyTheme(id, save=true) {
  currentTheme = id;
  if (id === 'sakura') {
    document.body.removeAttribute('data-theme');
  } else {
    document.body.setAttribute('data-theme', id);
  }
  if (save) try { localStorage.setItem('cs7_theme', id); } catch(e) {}
  document.querySelectorAll('.tp-card').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === id);
  });
}

function applySize(id, save=true) {
  currentSize = id;
  if (id === 'small') {
    document.body.removeAttribute('data-size');
  } else {
    document.body.setAttribute('data-size', id);
  }
  if (save) try { localStorage.setItem('cs7_size', id); } catch(e) {}
  document.querySelectorAll('.sz-card').forEach(c => {
    c.classList.toggle('active', c.dataset.size === id);
  });
}

function buildThemePanel() {
  const light  = document.getElementById('tp-light');
  const dark   = document.getElementById('tp-dark');
  const sizeEl = document.getElementById('tp-size');
  if (!light || !dark || !sizeEl) return;

  light.innerHTML = ''; dark.innerHTML = ''; sizeEl.innerHTML = '';

  /* size cards */
  sizes.forEach(s => {
    const card = document.createElement('div');
    card.className = `sz-card${s.id === currentSize ? ' active' : ''}`;
    card.dataset.size = s.id;
    const dotsHtml = s.dots.map(d =>
      `<div class="sz-dot" style="width:${d.w}px;height:${d.h}px"></div>`
    ).join('');
    card.innerHTML = `
      <div class="sz-dots">${dotsHtml}</div>
      <div class="sz-label">${s.label}</div>
      <div class="sz-sub">${s.sub}</div>`;
    card.addEventListener('click', () => applySize(s.id));
    sizeEl.appendChild(card);
  });

  /* theme cards */
  themes.forEach(t => {
    const card = document.createElement('div');
    card.className = `tp-card${t.id === currentTheme ? ' active' : ''}`;
    card.dataset.theme = t.id;
    card.innerHTML = `
      <div class="tp-swatches">
        ${t.swatches.map(s => `<div class="tp-sw" style="background:${s}"></div>`).join('')}
      </div>
      <div class="tp-name">${t.name}</div>
      <div class="tp-sub">${t.sub}</div>`;
    card.addEventListener('click', () => applyTheme(t.id));
    (t.dark ? dark : light).appendChild(card);
  });
}

function toggleThemePanel() {
  const panel   = document.getElementById('theme-panel');
  const overlay = document.getElementById('theme-overlay');
  const open    = panel.style.display !== 'none';
  panel.style.display   = open ? 'none' : 'block';
  overlay.style.display = open ? 'none' : 'block';
}

function closeThemePanel() {
  document.getElementById('theme-panel').style.display   = 'none';
  document.getElementById('theme-overlay').style.display = 'none';
}

/* ════════════════════════════════════════
   JUMP TO ITEM (from gift pill click)
════════════════════════════════════════ */
function jumpToItem(name) {
  const item = items.find(i => i.name === name);
  if (!item) return;
  S.feature = 'item';
  S.selected = name;
  S.subTab = 'cara-dapat';
  document.querySelectorAll('.mnav').forEach(b => {
    b.classList.toggle('active', b.dataset.f === 'item');
  });
  renderAll();
}
