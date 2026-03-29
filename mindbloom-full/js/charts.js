'use strict';

// CRITICAL ALERT
// ═══════════════════════════════════════════════════════════════════════════

function checkCritical(currentScore) {
  var r       = entries.slice(0,3).map(function(e){ return e.score; });
  var avg     = r.length ? r.reduce(function(a,b){ return a+b; },0)/r.length : 10;
  var latest  = (currentScore !== undefined) ? currentScore : (entries.length ? entries[0].score : 10);
  var falling = r.length >= 3 && r[0] < r[1] && r[1] < r[2];
  var crit    = latest <= 4 || (falling && avg < 5) || latest <= 2;

  var ca = document.getElementById('crit-alert');
  if (ca) ca.style.display = crit ? 'block' : 'none';

  var rawNum    = emgNumber || '';
  var cleanNum  = rawNum.replace(/[\s\-().+]/g, '');
  var displayNum = rawNum || 'your emergency contact';
  var helpMsg   = 'Hi, I really need your support right now. I am going through a very difficult time. Please reach out to me. — sent via MindBloom';
  var enc       = encodeURIComponent(helpMsg);

  var callBtn = document.getElementById('emg-call-btn');
  if (callBtn) {
    callBtn.textContent = '📞 Call ' + (rawNum || 'emergency contact');
    callBtn.onclick = function(ev) {
      ev.preventDefault();
      if (!cleanNum) { alert('Please set an emergency contact number in Settings first.'); return; }
      var a = document.createElement('a');
      a.href = 'tel:' + cleanNum;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };
  }
  var smsBtn = document.getElementById('emg-sms-btn');
  if (smsBtn) {
    smsBtn.textContent = '💬 Text ' + (rawNum || 'emergency contact');
    smsBtn.onclick = function(ev) {
      ev.preventDefault();
      if (!cleanNum) { alert('Please set an emergency contact number in Settings first.'); return; }
      var a = document.createElement('a');
      a.href = 'sms:' + cleanNum + '&body=' + enc;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function() {
        if (confirm('If the SMS app did not open, tap OK to copy the message.')) {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(helpMsg).then(function() {
              alert('Copied! Send it to ' + displayNum);
            }).catch(function() { prompt('Copy this:', helpMsg); });
          } else { prompt('Copy this:', helpMsg); }
        }
      }, 1500);
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNAL LIST
// ═══════════════════════════════════════════════════════════════════════════

function renderEntryList() {
  var list = document.getElementById('elist');
  if (!list) return;
  if (!entries.length) {
    list.innerHTML = '<div style="text-align:center;padding:36px;color:var(--ts);font-size:13px">No entries yet. Write your first one above! 🌱</div>';
    var cnt = document.getElementById('journal-count');
    if (cnt) cnt.textContent = '0 entries';
    return;
  }
  list.innerHTML = entries.map(function(e, i) {
    var isLow   = e.score < 4;
    var pillBg  = isLow ? 'rgba(192,57,43,.1)' : 'rgba(74,124,89,.1)';
    var pillCol = isLow ? '#922b21' : 'var(--fo)';
    var pills   = (e.themes||[]).map(function(t) {
      return '<span style="background:'+pillBg+';color:'+pillCol+';padding:2px 8px;border-radius:10px;font-size:10px">'+t+'</span>';
    }).join('');
    return '<div class="eitem" data-score="'+e.score+'" data-text="'+(e.fullText||e.text||'').toLowerCase().replace(/"/g,"'").slice(0,200)+'">'
      + '<div class="embdg '+badgeClass(e.score)+'" style="min-width:38px">'+e.score.toFixed(1)+'</div>'
      + '<div style="flex:1">'
      + '<div class="ettl">'+(e.title||('Entry #'+(entries.length-i)))+'</div>'
      + '<div style="font-size:13px;color:var(--tm);line-height:1.65;margin:3px 0 6px">'+(e.fullText||e.text||'')+'</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<span class="emta">'+e.date+' · '+(e.type||'Text')+' · '+moodEmoji(e.score)+' '+e.label+'</span>'
      + pills
      + '</div></div></div>';
  }).join('');
  updateJournalCount();
}

function updateJournalCount() {
  var items   = document.querySelectorAll('#elist .eitem');
  var visible = 0;
  items.forEach(function(item) {
    if (item.style.display !== 'none') visible++;
  });
  var cnt = document.getElementById('journal-count');
  if (cnt) cnt.textContent = visible + ' of ' + entries.length + ' ' + (entries.length===1?'entry':'entries');
}

function filterEntries() {
  var q = ((document.getElementById('journal-search')||{}).value||'').toLowerCase().trim();
  var f = ((document.getElementById('journal-filter')||{}).value)||'all';
  var items = document.querySelectorAll('#elist .eitem');
  var shown = 0;
  items.forEach(function(item) {
    var score  = parseFloat(item.dataset.score||'5');
    var text   = (item.dataset.text||'') + ' ' + (item.textContent||'').toLowerCase();
    var matchQ = !q || text.includes(q);
    var matchF = f==='all' || (f==='high' && score>=7) || (f==='mid' && score>=4 && score<7) || (f==='low' && score<4);
    var show   = matchQ && matchF;
    item.style.display = show ? 'flex' : 'none';
    if (show) shown++;
  });
  var empty = document.getElementById('journal-empty');
  if (empty) empty.style.display = (shown===0 && entries.length>0) ? 'block' : 'none';
  var cnt = document.getElementById('journal-count');
  if (cnt) cnt.textContent = shown + ' of ' + entries.length + ' ' + (entries.length===1?'entry':'entries');
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

function updateInsights() {
  if (!entries.length) {
    var set2 = function(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; };
    set2('ins-avg','—'); set2('ins-trend','no entries yet');
    set2('ins-cnt','0'); set2('ins-streak','—');
    var th = document.getElementById('ins-themes');
    if (th) th.innerHTML = '<span style="font-size:12px;color:var(--ts)">Add entries to see themes</span>';
    return;
  }
  var avg = entries.reduce(function(a,e){ return a+e.score; },0) / entries.length;
  var set = function(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; };
  set('ins-avg',   avg.toFixed(1));
  set('ins-trend', entries.length>1 ? (entries[0].score>entries[1].score?'↑ improving':'↓ declining') : '— baseline');
  set('ins-cnt',   String(entries.length));
  set('ins-streak', '🔥 ' + Math.min(entries.length, 365) + '-entry streak');
  var tmap = {};
  entries.forEach(function(e) {
    (e.themes||[]).forEach(function(t) { tmap[t] = (tmap[t]||0)+1; });
  });
  var th = document.getElementById('ins-themes');
  if (th) {
    th.innerHTML = Object.entries(tmap).sort(function(a,b){ return b[1]-a[1]; }).slice(0,8)
      .map(function(kv){ return '<span style="background:var(--dw);color:var(--fo);padding:4px 11px;border-radius:16px;font-size:12px">'+kv[0]+' ×'+kv[1]+'</span>'; }).join('');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOOD CHART (SVG line chart)
// ═══════════════════════════════════════════════════════════════════════════

function renderCharts() {
  renderChart('home-chart','home-chart-labels');
  renderChart('ins-chart', 'ins-chart-labels');
}

function renderChart(svgId, labelsId) {
  var svg = document.getElementById(svgId);
  var lbl = document.getElementById(labelsId);
  if (!svg) return;
  var data = entries.slice().reverse();
  var W=600, H=200, PL=42, PR=16, PT=12, PB=8;
  var cw=W-PL-PR, ch=H-PT-PB;
  var toY = function(score){ return PT+ch*(1-((score-5)*2+10)/20); };
  var toX = function(i){ return PL+i*(cw/Math.max(data.length-1,1)); };
  var ax  = isDark?'rgba(180,200,185,0.2)':'rgba(74,124,89,0.15)';
  var tc  = isDark?'rgba(180,200,185,0.6)':'rgba(74,124,89,0.7)';
  var lc  = isDark?'#7aab8a':'#4a7c59';
  var zeroY = toY(5);
  var out = '';
  [10,5,0,-5,-10].forEach(function(v){
    var y = PT+ch*(1-(v+10)/20);
    out += '<line x1="'+PL+'" y1="'+y+'" x2="'+(W-PR)+'" y2="'+y+'" stroke="'+ax+'" stroke-width="1"/>';
    out += '<text x="'+(PL-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="'+tc+'" font-family="DM Sans,sans-serif">'+v+'</text>';
  });
  out += '<line x1="'+PL+'" y1="'+zeroY+'" x2="'+(W-PR)+'" y2="'+zeroY+'" stroke="'+(isDark?'rgba(180,200,185,0.35)':'rgba(74,124,89,0.3)')+'" stroke-width="1" stroke-dasharray="4 4"/>';
  out += '<line x1="'+PL+'" y1="'+PT+'" x2="'+PL+'" y2="'+(H-PB)+'" stroke="'+ax+'" stroke-width="1"/>';
  if (data.length >= 2) {
    var pts = data.map(function(e,i){ return {x:toX(i), y:toY(e.score)}; });
    var d   = 'M '+pts[0].x+' '+pts[0].y;
    for (var i=0; i<pts.length-1; i++) {
      var cp1x=pts[i].x+(pts[i+1].x-pts[i].x)*0.4, cp1y=pts[i].y;
      var cp2x=pts[i].x+(pts[i+1].x-pts[i].x)*0.6, cp2y=pts[i+1].y;
      d += ' C '+cp1x+' '+cp1y+' '+cp2x+' '+cp2y+' '+pts[i+1].x+' '+pts[i+1].y;
    }
    out += '<path d="'+d+' L '+pts[pts.length-1].x+' '+zeroY+' L '+pts[0].x+' '+zeroY+' Z" fill="'+(isDark?'rgba(122,171,138,0.12)':'rgba(74,124,89,0.08)')+'"/>';
    out += '<path d="'+d+'" fill="none" stroke="'+lc+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    pts.forEach(function(p,i){
      var s=data[i].score;
      var cc=s<3.5?'#c0392b': s<5?'#e8a000': lc;
      out += '<circle cx="'+p.x+'" cy="'+p.y+'" r="4.5" fill="'+cc+'" stroke="'+(isDark?'#162019':'#fff')+'" stroke-width="2"/>';
    });
  } else if (data.length===1) {
    var x=toX(0), y=toY(data[0].score);
    out += '<circle cx="'+x+'" cy="'+y+'" r="5" fill="'+lc+'" stroke="'+(isDark?'#162019':'#fff')+'" stroke-width="2"/>';
  } else {
    out += '<text x="'+(PL+cw/2)+'" y="'+(PT+ch/2)+'" text-anchor="middle" font-size="12" fill="'+tc+'">No entries yet</text>';
  }
  svg.innerHTML = out;
  if (lbl) {
    if (data.length > 1) {
      var step = Math.ceil(data.length/6);
      lbl.innerHTML = data.filter(function(_,i){ return i%step===0||i===data.length-1; })
        .map(function(e){ return '<span>'+e.date.split(' · ')[0]+'</span>'; }).join('');
    } else { lbl.innerHTML = ''; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-LOGIN ON PAGE LOAD
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
  var session = loadSession();
  if (session && session.email) {
    var user = userDB[session.email];
    if (user && user.sessionToken && user.sessionToken === session.token) {
      // Valid session — restore everything silently
      currentEmail = session.email;
      userName     = user.name || '';
      emgNumber    = user.emg  || '';
      isDark       = (user.theme === 'dark');
      entries      = user.entries ? user.entries.map(function(e){ return Object.assign({},e); }) : [];
      user.lastLogin = new Date().toISOString();
      saveDB();
      applyThemeUI();
      goToDash();
      return;
    }
  }
  go('land');
});
</script>

<!-- ═══════════════════════════════════════════════
     CAMERA / EMOTION DETECTION MODAL