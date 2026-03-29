'use strict';

// JOURNAL — SAVE + SENTIMENT
// ═══════════════════════════════════════════════════════════════════════════

function doSave() {
  var ta      = document.getElementById('jtxt');
  var txt     = ta ? ta.value.trim() : '';
  var content = txt || (_voiceText ? _voiceText.trim() : '');
  if (!content) {
    if (ta) {
      ta.style.borderColor = '#c0392b';
      ta.focus();
      setTimeout(function() { ta.style.borderColor = 'var(--bdr)'; }, 2000);
    }
    return;
  }
  var aith = document.getElementById('aith');
  if (aith) aith.classList.add('sh');
  setTimeout(function() {
    if (aith) aith.classList.remove('sh');
    showResult(content);
  }, 1600);
}

function analyseSentiment(text) {
  var t = text.toLowerCase();
  var countHits = function(words) { return words.filter(function(w) { return t.includes(w); }).length; };

  var crisisHits   = countHits(['suicid','kill myself','end my life','want to die','cant go on',
    "can't go on",'no reason to live','give up on life','disappear forever',
    "don't want to be here",'dont want to be here','want everything to end','not worth living']);
  var severeHits   = countHits(['depressed','devastated','miserable','unbearable','suffering','trapped',
    'broken inside','shattered','completely empty','numb inside','hate myself','hate my life',
    'falling apart','cant cope',"can't cope",'no hope','desperate','nothing left','worthless']);
  var negativeHits = countHits(['sad','crying','tears','sobbing','hurt','pain','grief','heartbroken',
    'lonely','alone','abandoned','exhausted','burnout','panic','anxiety','anxious','scared',
    'frightened','overwhelmed','struggling','helpless','hopeless','useless','failure','failed',
    'terrible','awful','horrible','sick of','tired of everything','not okay','bad day','low mood']);
  var mildNegHits  = countHits(['upset','unhappy','disappointed','frustrated','annoyed','irritated',
    'stressed','worried','nervous','uneasy','uncomfortable','rough day','difficult','hard time',
    'down','gloomy','drained','heavy','not great','meh','unmotivated','restless','bored']);
  var mildPosHits  = countHits(['okay','fine','alright','decent','not bad','calm','peaceful',
    'relaxed','steady','stable','content','balanced','managed','getting better','little better',
    'hopeful','better today','feeling okay','feeling fine','comfortable','settled']);
  var positiveHits = countHits(['happy','joyful','excited','amazing','wonderful','fantastic','great',
    'pleased','satisfied','grateful','thankful','blessed','loved','love','refreshed','energised',
    'energized','motivated','inspired','proud','accomplished','confident','smiled','laughed','fun',
    'enjoyed','enjoying','positive','good day','great day','good mood','feeling good','feeling happy',
    'feeling great','beautiful','lovely','delightful','cheerful','upbeat','optimistic','enthusiastic',
    'lively','bright','radiant','glowing','appreciate','appreciated','valued']);
  var veryPosHits  = countHits(['incredible','euphoric','ecstatic','thrilled','overjoyed','brilliant',
    'perfect','best day','on top of the world','feeling amazing','so happy','so grateful',
    'absolutely amazing','so excited','beyond happy','extremely happy','best feeling','best day ever',
    'phenomenal','outstanding','life is beautiful','life is good','living my best','so blessed',
    'truly blessed','over the moon','could not be happier','pure joy','full of joy','heart is full',
    'so much joy','so much love','feeling incredible','feeling fantastic','absolutely wonderful',
    'extremely grateful','deeply grateful','so thankful','so proud','extremely proud']);
  var intensifiers = countHits(['very','so','really','extremely','absolutely','truly','deeply',
    'incredibly','super','totally','completely','fully','genuinely','sincerely','profoundly']);
  // Negation: only fire when a negation word is closely followed by a positive word (within ~4 words)
  // This prevents "I had no worries" or "nothing could ruin my mood" from suppressing positive scores
  var hasNegation = (function() {
    var negPat = /\b(not|never|don't|dont|didn't|didnt|can't|cant|won't|wont|hardly|barely)\b/g;
    var posPat = /\b(happy|joyful|excited|amazing|wonderful|fantastic|great|pleased|satisfied|grateful|thankful|blessed|loved|refreshed|energis|energiz|motivated|inspired|proud|accomplished|confident|smiled|laughed|fun|enjoyed|enjoying|positive|good|beautiful|lovely|delightful|cheerful|upbeat|optimistic|enthusiastic|lively|bright|radiant|glowing|appreciate|valued|okay|fine|alright|decent|calm|peaceful|relaxed|content|balanced|hopeful|comfortable|settled|incredible|euphoric|ecstatic|thrilled|overjoyed|brilliant|perfect)\b/;
    var m;
    while ((m = negPat.exec(t)) !== null) {
      var after = t.slice(m.index, m.index + 60);
      if (posPat.test(after)) return true;
    }
    return false;
  }());

  var raw = 5;
  raw -= crisisHits   * 2.8;
  raw -= severeHits   * 1.1;
  raw -= negativeHits * 0.7;
  raw -= mildNegHits  * 0.4;
  var pm = hasNegation ? 0.3 : 1.0;
  raw += mildPosHits  * 0.5  * pm;
  raw += positiveHits * 0.95 * pm;
  raw += veryPosHits  * 1.6  * pm;
  if ((positiveHits > 0 || veryPosHits > 0) && !hasNegation) {
    raw += Math.min(intensifiers * 0.15, 0.6);
  }
  var totalNeg = crisisHits + severeHits + negativeHits + mildNegHits;
  var totalPos = mildPosHits + positiveHits + veryPosHits;
  if (totalNeg === 0 && totalPos > 0 && !hasNegation) raw = Math.max(raw, 6.0);
  if (totalNeg === 0 && totalPos === 0) raw = 5.0;

  var cap = (veryPosHits >= 3 && totalNeg === 0) ? 9.5
          : (veryPosHits >= 1 && totalNeg === 0) ? 9.0
          : (positiveHits >= 3 && totalNeg === 0) ? 8.5
          : 9.5;
  var jitter = (Math.random() - 0.5) * 0.3;
  var score  = Math.round(Math.min(cap, Math.max(1.0, raw + jitter)) * 10) / 10;

  var themes = [];
  if (/\b(work|job|office|meeting|boss|colleague|deadline|career)\b/.test(t))  themes.push('Work');
  if (/\b(family|parent|mom|dad|mother|father|sibling|brother|sister)\b/.test(t)) themes.push('Family');
  if (/\b(friend|friendship|social|party|relationship|partner|love)\b/.test(t)) themes.push('Relationships');
  if (/\b(sleep|tired|rest|insomnia|awake|nap|energy)\b/.test(t))              themes.push('Sleep');
  if (/\b(anxious|anxiety|panic|worry|nervous|stress|overwhelm)\b/.test(t))    themes.push('Anxiety');
  if (/\b(grateful|gratitude|thankful|blessed|appreciate)\b/.test(t))          themes.push('Gratitude');
  if (/\b(health|sick|ill|pain|exercise|gym|run|walk|body)\b/.test(t))         themes.push('Health');
  if (/\b(sad|depress|cry|grief|loss|mourn|crying|tears|lonely)\b/.test(t))   themes.push('Sadness');
  if (/\b(happy|joy|excited|fun|laugh|smile|celebrat)\b/.test(t))              themes.push('Joy');
  if (/\b(goal|achiev|success|accomplish|proud|win|progress)\b/.test(t))       themes.push('Achievement');
  if (themes.length === 0) themes.push('Reflection');
  if (themes.length === 1) themes.push(totalPos > totalNeg ? 'Personal growth' : 'Processing');

  return { score: score, themes: themes.slice(0, 3) };
}

function moodEmoji(s) {
  return s>=9?'🤩': s>=8?'😄': s>=7?'😊': s>=6?'🙂': s>=5?'😐': s>=3.5?'😔': '😢';
}
function moodClass(s) { return s>=6?'mcard-hi': s>=4?'mcard-mid': 'mcard-low'; }
function badgeClass(s) { return s>=6?'ebdg-hi': s>=4?'ebdg-mid': 'ebdg-low'; }

var tips_happy   = ['You are radiating positivity today! Capture this feeling — write down what made it so good so you can revisit it on harder days.',
  'What a wonderful state to be in. Share your energy with someone around you — joy multiplies when given away.',
  'On days like this, reflect on what is working well. Gratitude compounds over time.',
  'Celebrate this moment! Acknowledging good days matters just as much as working through difficult ones.'];
var tips_neutral = ['A short walk, even 10 minutes, can shift your mood significantly.',
  'Try the 3-2-1 grounding: name 3 things you see, 2 you hear, 1 you can touch.',
  'Drink a glass of water, breathe slowly, and acknowledge one thing you did well today.',
  'You showed up to journal — that alone is something to be proud of.'];
var tips_low     = ['When we feel low, our inner critic gets louder. Speak to yourself as you would to a close friend.',
  'It is okay not to be okay. Rest is productive. Give yourself permission to do less today.',
  'Reach out to one person you trust — connection is medicine.',
  'Step outside for five minutes. Natural light and a change of environment can interrupt difficult spirals.'];
var tips_crit    = ['You are not alone, even when it feels that way. Difficult feelings are temporary — they pass.',
  'Please talk to someone right now. Reaching out is one of the bravest things a person can do.',
  'Crisis support is available 24/7. You deserve care and support. Your emergency contact is shown below.'];

function getMoodTip(score, falling) {
  if (score >= 8.5) return { cls:'tip-info', title:'🌟 You are glowing today', body: tips_happy[Math.floor(Math.random()*tips_happy.length)] };
  if (score >= 7 && !falling) return null;
  if (score >= 5 && !falling) return { cls:'tip-info', title:'💡 A gentle nudge', body: tips_neutral[Math.floor(Math.random()*tips_neutral.length)] };
  var extra = falling ? ' Your mood has been falling across recent entries. Please consider speaking to someone you trust.' : '';
  if (score >= 3.5) return { cls:'tip-warn', title:'🌱 Take care of yourself today', body: tips_low[Math.floor(Math.random()*tips_low.length)] + extra };
  return { cls:'tip-crit', title:'💛 We are here for you', body: tips_crit[Math.floor(Math.random()*tips_crit.length)] };
}

function showResult(content) {
  var analysis = analyseSentiment(content);
  var score    = analysis.score;
  var pool = [
    {s:9.5, l:'Joyful and energised — a wonderful day'},
    {s:8.0, l:'Warm and hopeful — things are good'},
    {s:7.0, l:'Calm and positive — steady energy'},
    {s:6.0, l:'Mostly okay — grounded and balanced'},
    {s:5.0, l:'Neutral — taking it day by day'},
    {s:4.0, l:'Low and heavy — be kind to yourself'},
    {s:3.0, l:'Struggling — you are not alone'},
    {s:2.0, l:'Very difficult — please reach out'},
    {s:1.2, l:'In crisis — support is available now'}
  ];
  var p = pool.reduce(function(a,b) { return Math.abs(b.s-score) < Math.abs(a.s-score) ? b : a; });
  var finalThemes = analysis.themes.length ? analysis.themes : ['Reflection'];

  var now2   = new Date();
  var m2     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dateStr = m2[now2.getMonth()] + ' ' + now2.getDate() + ', ' + now2.getFullYear();
  var timeStr = now2.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  var entry = {
    score:    score,
    label:    p.l,
    emoji:    moodEmoji(score),
    themes:   finalThemes,
    text:     content.slice(0, 90) + (content.length > 90 ? '…' : ''),
    fullText: content,
    title:    'Entry #' + (entries.length + 1),
    type:     'Text',
    date:     dateStr + ' · ' + timeStr
  };
  entries.unshift(entry);
  persistUser();   // <-- save to localStorage immediately after every entry

  var mc = document.getElementById('mcard-inner');
  if (mc) mc.className = 'mcard ' + moodClass(score);
  var set = function(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; };
  set('m-emoji', moodEmoji(score));
  set('m-score', score.toFixed(1));
  set('m-lbl',   p.l);
  var thEl = document.getElementById('m-themes');
  if (thEl) thEl.innerHTML = finalThemes.map(function(t){ return '<span class="mtheme">'+t+'</span>'; }).join('');
  var mr = document.getElementById('mresult');
  if (mr) mr.style.display = 'block';

  var rr      = entries.slice(0,4).map(function(e){ return e.score; });
  var falling = rr.length >= 3 && rr[0] < rr[1] && rr[1] < rr[2];
  var tip     = getMoodTip(score, falling);
  var tc      = document.getElementById('tip-card');
  if (tip) {
    document.getElementById('tip-inner').className     = 'tip-card ' + tip.cls;
    document.getElementById('tip-title').textContent   = tip.title;
    document.getElementById('tip-body').textContent    = tip.body;
    if (tc) tc.style.display = 'block';
  } else {
    if (tc) tc.style.display = 'none';
  }

  checkCritical(score);
  renderEntryList();
  updateInsights();
  renderCharts();

  // Clear composer
  var ta = document.getElementById('jtxt');
  if (ta) ta.value = '';
  _voiceText = '';
  var vs = document.getElementById('vstrip');
  if (vs) { vs.textContent = ''; vs.style.display = 'none'; }
}

// ═══════════════════════════════════════════════════════════════════════════