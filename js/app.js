// ===================== Navegação + Contas (Fase 2b) =====================
import { auth, getSessao, limparSessao, buscarPerfil, criarConta, entrar, atualizarAvatar, registrarPartida, registrarPartidaOnline, registrarHistoricoOnline, buscarRanking, buscarRankingOnline, buscarHistoricoOnline, buscarRankingCodigos, aguardarAuthPronto } from './auth.js';
import { criarSala, buscarSala, entrarSala, enviarSquadSala, salvarResultadoSala, cancelarSala, registrarPresencaSala, decidirRevancheSala, prepararRevancheSala, marcarSaidaSala, criarTorneio, buscarTorneio, entrarTorneio, atualizarTorneio, enviarDraftTorneio, salvarResultadoTorneio, finalizarTorneio } from './online.js';

const AVATARES = ['😀','😎','🦅','🦁','🐯','🐐','🦊','🐼','🐸','🐔','🐺','⭐'];
const RARITY_ICONS = {COMUM:'⚪',RARA:'🟢',RARO:'🟢','ÉPICA':'🔷',LENDÁRIA:'🟣',EXTREME:'🔥',GOAT:'👑'};
function rarityIcon(r){return RARITY_ICONS[r]||'⚪';}

let perfilAtual = null; // { chave, nome, senha, cidade, avatar, vitorias, derrotas }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------- Splash ----------
document.getElementById('startBtn').addEventListener('click', async () => {
  const btn = document.getElementById('startBtn');
  const sessao = getSessao();
  if (sessao) {
    btn.disabled = true;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Carregando…';
    try {
      await aguardarAuthPronto(); // espera o Firebase confirmar o login antes de consultar o perfil
      const perfil = await buscarPerfil(sessao.chave);
      if (perfil) {
        perfilAtual = { chave: sessao.chave, ...perfil };
        abrirMenu();
        return;
      }
      limparSessao(); // sessão inválida (conta apagada, etc.)
    } catch (err) {
      console.error('Falha ao restaurar sessão:', err);
      limparSessao(); // não deixa o jogo travado: volta pro login em vez de ficar em silêncio
    } finally {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
    }
  }
  showScreen('authScreen');
});

// ---------- Abas Entrar / Criar conta ----------
const tabEntrar = document.getElementById('tabEntrar');
const tabCriar = document.getElementById('tabCriar');
const loginForm = document.getElementById('loginForm');
const cadastroForm = document.getElementById('cadastroForm');

tabEntrar.addEventListener('click', () => {
  tabEntrar.classList.add('active');
  tabCriar.classList.remove('active');
  loginForm.classList.remove('hidden');
  cadastroForm.classList.add('hidden');
});

tabCriar.addEventListener('click', () => {
  tabCriar.classList.add('active');
  tabEntrar.classList.remove('active');
  cadastroForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

// ---------- Entrar ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = document.getElementById('loginErro');
  erro.textContent = '';
  const btn = loginForm.querySelector('button[type="submit"]');
  if (btn?.disabled) return; // trava contra duplo toque/duplo submit
  const nome = document.getElementById('loginNome').value;
  const senha = document.getElementById('loginSenha').value;
  if (btn) btn.disabled = true;
  try {
    perfilAtual = await entrar(nome, senha);
    abrirMenu();
  } catch (err) {
    erro.textContent = err.message;
  } finally {
    if (btn) btn.disabled = false;
  }
});

// ---------- Criar conta ----------
cadastroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = document.getElementById('cadErro');
  erro.textContent = '';
  const btn = cadastroForm.querySelector('button[type="submit"]');
  if (btn?.disabled) return; // trava contra duplo toque/duplo submit
  const nome = document.getElementById('cadNome').value;
  const senha = document.getElementById('cadSenha').value;
  const cidade = document.getElementById('cadCidade').value;
  const codigo = document.getElementById('cadCodigo').value;
  if (!cidade) { erro.textContent = 'Escolha uma cidade.'; return; }
  if (btn) btn.disabled = true;
  try {
    perfilAtual = await criarConta(nome, senha, cidade, codigo);
    abrirMenu();
  } catch (err) {
    erro.textContent = err.message;
  } finally {
    if (btn) btn.disabled = false;
  }
});

// ---------- Abrir menu (após login/cadastro/sessão salva) ----------
function abrirMenu() {
  showScreen('menuScreen');
  carregarRanking();
  carregarHistoricoOnlineHome();
}

async function carregarRanking() {
  const box = document.getElementById('rankingBox');
  try {
    const lista = await buscarRankingOnline();
    if (!lista.length) {
      box.innerHTML = '<p class="panel-empty">Ainda ninguém jogou online. Seja o primeiro!</p>';
      return;
    }
    box.innerHTML = '<ol class="ranking-list">' + lista.map(p =>
      `<li class="ranking-item"><span>${p.avatar || '😀'} ${p.nome}</span><span class="muted">${Number(p.vitoriasOnline || 0)} vitórias online</span></li>`
    ).join('') + '</ol>';
  } catch {
    box.innerHTML = '<p class="panel-empty">Em breve — o ranking vai aparecer aqui.</p>';
  }
}

async function carregarHistoricoOnlineHome() {
  const box = document.getElementById('homeHistory');
  if (!box) return;
  try {
    const lista = await buscarHistoricoOnline();
    if (!lista.length) {
      box.innerHTML = '<p class="panel-empty">Nenhuma partida online registrada ainda.</p>';
      return;
    }
    box.innerHTML = lista.map(m =>
      `<div class="history-match"><span class="history-result ${m.result === 'VITÓRIA' ? 'history-win' : m.result === 'DERROTA' ? 'history-loss' : 'history-draw'}">${m.home} × ${m.away}</span><div><div class="history-score">${m.score}</div><div class="history-stadium">${m.stadium || ''}</div></div><span>⚽</span></div>`
    ).join('');
  } catch {
    box.innerHTML = '<p class="panel-empty">Nenhuma partida online registrada ainda.</p>';
  }
}

// ---------- Navegação centralizada ----------
const ACTION_SCREENS = {
  home: 'menuScreen',
  bank: 'bankScreen',
  modos: 'modosScreen',
  profile: 'profileScreen',
  system: 'systemScreen',
  elenco: 'bankScreen',
  draft: 'draftSetupScreen',
  campaign: 'campaignScreen', survival: 'survivalScreen', challenges: 'challengesScreen', local2p: 'local2pScreen', league: 'leagueScreen',
  online: 'onlineScreen',
  tournament: 'tournamentScreen',
  events: 'eventsScreen', eventCodes: 'eventCodesScreen',
  records: 'recordsScreen', achievements: 'achievementsScreen', museum: 'museumScreen'
};

function navigate(action) {
  const target = ACTION_SCREENS[action];
  if (!target) return;
  if (action === 'draft') draftReturnAction = 'modos';
  showScreen(target);
  document.querySelectorAll('[data-action]').forEach(b =>
    b.classList.toggle('active', b.dataset.action === action || (action === 'home' && b.dataset.action === 'none'))
  );
  if (action === 'bank') renderBank();
  if (action === 'eventCodes') carregarRankingCodigos();
  if (action === 'records') renderRecords();
  if (action === 'achievements') renderAchievements();
  if (action === 'museum') renderMuseum();
  if (action === 'league') renderLeagueScreen();
  if (action === 'home' && perfilAtual?.chave) { carregarRanking(); carregarHistoricoOnlineHome(); }
}

document.getElementById('openEventsBtn')?.addEventListener('click', () => navigate('events'));
document.getElementById('backFromEvents')?.addEventListener('click', () => navigate('home'));
document.getElementById('backFromEventCodes')?.addEventListener('click', () => navigate('events'));

async function carregarRankingCodigos() {
  const box = document.getElementById('codesRankingBox');
  if (!box) return;
  box.innerHTML = '<p class="panel-empty">Carregando…</p>';
  try {
    const lista = await buscarRankingCodigos();
    box.innerHTML = '<ol class="ranking-list">' + lista.map((item, i) =>
      `<li class="ranking-item"><span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'} ${item.codigo}</span><span class="muted">${item.logins} login${item.logins === 1 ? '' : 's'}</span></li>`
    ).join('') + '</ol>';
  } catch {
    box.innerHTML = '<p class="panel-empty">Não foi possível carregar o ranking agora.</p>';
  }
}

document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.action));
});

// ---------- Voltar da tela de Modos ----------
document.getElementById('backFromModos').addEventListener('click', () => navigate('home'));

// ---------- Perfil ----------

function renderProfileStats(){
  const history=JSON.parse(localStorage.getItem('cv_match_history')||'[]');
  const partidas=history.length;
  const gols=history.reduce((sum,m)=>sum+Number(String(m.score||'0').split(' × ')[0]||0),0);
  const wins=history.filter(m=>m.result==='VITÓRIA').length;
  const losses=history.filter(m=>m.result==='DERROTA').length;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('statPartidas',partidas); set('statGols',gols); set('statTitulos',Number(localStorage.getItem('cv_titles')||0));
  set('statVitorias',Math.max(Number(perfilAtual?.vitorias||0),wins));
  set('statDerrotas',Math.max(Number(perfilAtual?.derrotas||0),losses));
}

// ---------- Estatísticas de carreira (usadas em Recordes e Conquistas) ----------

function computeCareerStats(){
  const history=JSON.parse(localStorage.getItem('cv_match_history')||'[]');
  const wins=history.filter(m=>m.result==='VITÓRIA');
  const losses=history.filter(m=>m.result==='DERROTA').length;
  const gols=history.reduce((sum,m)=>sum+Number(String(m.score||'0').split(' × ')[0]||0),0);
  const cleanSheets=wins.filter(m=>Number(String(m.score||'0 × 0').split(' × ')[1]||0)===0).length;
  const biggestWin=wins.reduce((max,m)=>{const parts=String(m.score||'0 × 0').split(' × ');return Math.max(max,Number(parts[0]||0)-Number(parts[1]||0));},0);
  return {
    partidas: history.length,
    vitorias: Math.max(Number(perfilAtual?.vitorias||0), wins.length),
    derrotas: Math.max(Number(perfilAtual?.derrotas||0), losses),
    gols,
    titulos: Number(localStorage.getItem('cv_titles')||0),
    survivalRecord: Number(localStorage.getItem('cv_survival_record')||0),
    challengesDone: JSON.parse(localStorage.getItem('cv_challenges_done')||'[]').length,
    vitoriasOnline: Number(perfilAtual?.vitoriasOnline||0),
    derrotasOnline: Number(perfilAtual?.derrotasOnline||0),
    cleanSheets,
    biggestWin
  };
}

// ---------- Recordes ----------

function renderRecords(){
  const s=computeCareerStats();
  const mainBox=document.getElementById('recordsMainStats');
  if(mainBox){
    mainBox.innerHTML=[['Partidas',s.partidas],['Vitórias',s.vitorias],['Derrotas',s.derrotas],['Gols',s.gols],['Títulos',s.titulos]]
      .map(x=>`<div class="stat-box"><span class="stat-num">${x[1]}</span><span class="stat-label">${x[0]}</span></div>`).join('');
  }
  const bestBox=document.getElementById('recordsBestGrid');
  if(bestBox){
    bestBox.innerHTML=[
      ['🔥',s.survivalRecord,'RECORDE SOBREVIVÊNCIA'],
      ['💥',s.biggestWin>0?`${s.biggestWin} gol${s.biggestWin===1?'':'s'}`:'—','MAIOR GOLEADA'],
      ['🧤',s.cleanSheets,'JOGOS SEM SOFRER GOL'],
      ['🌐',s.vitoriasOnline,'VITÓRIAS ONLINE']
    ].map(x=>`<div class="profile-record"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');
  }
  const rankBox=document.getElementById('recordsGlobalRanking');
  if(rankBox){
    rankBox.innerHTML='<p class="panel-empty">Carregando…</p>';
    buscarRanking().then(lista=>{
      if(!lista.length){rankBox.innerHTML='<p class="panel-empty">Ninguém no ranking ainda. Jogue e apareça aqui!</p>';return;}
      rankBox.innerHTML='<ol class="ranking-list">'+lista.map((p,i)=>`<li class="ranking-item"><span>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'🏅'} ${p.avatar||'😀'} ${p.nome}</span><span class="muted">${p.vitorias||0} vitórias</span></li>`).join('')+'</ol>';
    }).catch(()=>{rankBox.innerHTML='<p class="panel-empty">Não foi possível carregar o ranking agora.</p>';});
  }
}
document.getElementById('backFromRecords')?.addEventListener('click', () => navigate('home'));

// ---------- Conquistas ----------

const ACHIEVEMENTS=[
  {icon:'🥉',name:'Estreante',desc:'Jogue sua primeira partida.',check:s=>s.partidas>=1},
  {icon:'🥈',name:'Veterano',desc:'Jogue 10 partidas.',check:s=>s.partidas>=10},
  {icon:'🥇',name:'Lenda do Clube',desc:'Jogue 30 partidas.',check:s=>s.partidas>=30},
  {icon:'⚽',name:'Artilheiro',desc:'Marque 20 gols no total.',check:s=>s.gols>=20},
  {icon:'💥',name:'Goleada',desc:'Vença uma partida com 4 gols ou mais de diferença.',check:s=>s.biggestWin>=4},
  {icon:'🧤',name:'Muralha',desc:'Vença uma partida sem sofrer gols.',check:s=>s.cleanSheets>=1},
  {icon:'🔥',name:'Sequência de Fogo',desc:'Alcance 5 vitórias seguidas no Modo Sobrevivência.',check:s=>s.survivalRecord>=5},
  {icon:'🏆',name:'Campeão',desc:'Vença a Campanha uma vez.',check:s=>s.titulos>=1},
  {icon:'🎖️',name:'Tricampeão',desc:'Vença a Campanha 3 vezes.',check:s=>s.titulos>=3},
  {icon:'🎯',name:'Desafiante',desc:'Conclua 1 desafio.',check:s=>s.challengesDone>=1},
  {icon:'🧠',name:'Mestre dos Desafios',desc:'Conclua todos os 5 desafios.',check:s=>s.challengesDone>=5},
  {icon:'🌐',name:'Estreante Online',desc:'Jogue 1 partida no Modo Online.',check:s=>(s.vitoriasOnline+s.derrotasOnline)>=1}
];
function renderAchievements(){
  const s=computeCareerStats();
  const box=document.getElementById('achievementsGrid');
  if(!box)return;
  let unlocked=0;
  box.innerHTML=ACHIEVEMENTS.map(a=>{
    const done=a.check(s); if(done)unlocked++;
    return `<div class="achievement-card ${done?'unlocked':''}"><span class="achievement-icon">${a.icon}</span><b>${a.name}</b><small>${a.desc}</small><span class="achievement-lock">${done?'✓ DESBLOQUEADA':'🔒 BLOQUEADA'}</span></div>`;
  }).join('');
  const progress=document.getElementById('achievementsProgress');
  if(progress)progress.textContent=`${unlocked} de ${ACHIEVEMENTS.length} desbloqueadas`;
}
document.getElementById('backFromAchievements')?.addEventListener('click', () => navigate('home'));

document.getElementById('profileBtn').addEventListener('click', () => {
  if (!perfilAtual) return;
  document.getElementById('avatarBtn').textContent = perfilAtual.avatar || '😀';
  document.getElementById('profileNome').textContent = perfilAtual.nome;
  document.getElementById('profileCidade').textContent = perfilAtual.cidade;
  renderProfileStats();
  renderProfileHistory();
  document.getElementById('avatarGrid').classList.add('hidden');
  navigate('profile');
});

document.getElementById('backFromProfile').addEventListener('click', () => navigate('home'));

const avatarGrid = document.getElementById('avatarGrid');
avatarGrid.innerHTML = AVATARES.map(a => `<button type="button" class="avatar-option">${a}</button>`).join('');

document.getElementById('avatarBtn').addEventListener('click', () => {
  avatarGrid.classList.toggle('hidden');
});

avatarGrid.addEventListener('click', async (e) => {
  const btn = e.target.closest('.avatar-option');
  if (!btn || !perfilAtual) return;
  const novoAvatar = btn.textContent;
  perfilAtual.avatar = novoAvatar;
  document.getElementById('avatarBtn').textContent = novoAvatar;
  avatarGrid.classList.add('hidden');
  await atualizarAvatar(perfilAtual.chave, novoAvatar);
  carregarRanking();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  limparSessao();
  perfilAtual = null;
  showScreen('splashScreen');
});

// ---------- Sistema / Configurações ----------
const soundToggle = document.getElementById('soundToggle');
const vibrationToggle = document.getElementById('vibrationToggle');
const clearDataBtn = document.getElementById('clearLocalDataBtn');
if (soundToggle) { soundToggle.checked = localStorage.getItem('cv_sound') !== 'off'; soundToggle.addEventListener('change',()=>localStorage.setItem('cv_sound',soundToggle.checked?'on':'off')); }
if (vibrationToggle) { vibrationToggle.checked = localStorage.getItem('cv_vibration') !== 'off'; vibrationToggle.addEventListener('change',()=>localStorage.setItem('cv_vibration',vibrationToggle.checked?'on':'off')); }
if (clearDataBtn) clearDataBtn.addEventListener('click',()=>{ if(confirm('Limpar preferências locais deste aparelho?')) { localStorage.removeItem('cv_sound'); localStorage.removeItem('cv_vibration'); location.reload(); } });

const defaultCommentatorSel = document.getElementById('defaultCommentator');
if (defaultCommentatorSel) { defaultCommentatorSel.value = localStorage.getItem('cv_commentator') || 'radio-vila'; defaultCommentatorSel.addEventListener('change',()=>localStorage.setItem('cv_commentator', defaultCommentatorSel.value)); }
const defaultSpeedSel = document.getElementById('defaultSpeed');
if (defaultSpeedSel) { defaultSpeedSel.value = localStorage.getItem('cv_default_speed') || '0.5'; defaultSpeedSel.addEventListener('change',()=>localStorage.setItem('cv_default_speed', defaultSpeedSel.value)); }
const cardShineToggle = document.getElementById('cardShineToggle');
function applyCardShine(on){ document.body.classList.toggle('no-card-shine', !on); }
if (cardShineToggle) { const on = localStorage.getItem('cv_card_shine') !== 'off'; cardShineToggle.checked = on; applyCardShine(on); cardShineToggle.addEventListener('change',()=>{ localStorage.setItem('cv_card_shine', cardShineToggle.checked?'on':'off'); applyCardShine(cardShineToggle.checked); }); } else { applyCardShine(localStorage.getItem('cv_card_shine') !== 'off'); }
const reduceMotionToggle = document.getElementById('reduceMotionToggle');
function applyReduceMotion(on){ document.body.classList.toggle('reduce-motion', on); }
if (reduceMotionToggle) { const on = localStorage.getItem('cv_reduce_motion') === 'on'; reduceMotionToggle.checked = on; applyReduceMotion(on); reduceMotionToggle.addEventListener('change',()=>{ localStorage.setItem('cv_reduce_motion', reduceMotionToggle.checked?'on':'off'); applyReduceMotion(reduceMotionToggle.checked); }); } else { applyReduceMotion(localStorage.getItem('cv_reduce_motion') === 'on'); }
const resetProgressBtn = document.getElementById('resetProgressBtn');
if (resetProgressBtn) resetProgressBtn.addEventListener('click',()=>{ if(confirm('Isso vai zerar campanha, recorde de sobrevivência, desafios e títulos deste aparelho. Continuar?')) { ['cv_campaign_stage','cv_survival_record','cv_challenges_done','cv_titles','cv_match_history'].forEach(k=>localStorage.removeItem(k)); location.reload(); } });

// ---------- PWA: Adicionar à tela inicial ----------
let deferredInstallPrompt = null;
const installCard = document.getElementById('installCard');
const installBtn = document.getElementById('installBtn');
const iosHelpBtn = document.getElementById('iosHelpBtn');
const iosModal = document.getElementById('iosModal');
const closeIosModal = document.getElementById('closeIosModal');

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function mostrarInstalacao() {
  if (!isStandalone && installCard) installCard.classList.remove('hidden');
  if (!isIOS && iosHelpBtn) iosHelpBtn.style.display = 'none';
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  mostrarInstalacao();
});

if (isIOS) mostrarInstalacao();

if (installBtn) installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    if (isIOS) iosModal.classList.remove('hidden');
    return;
  }
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (result.outcome === 'accepted') installCard.classList.add('hidden');
});

if (iosHelpBtn) iosHelpBtn.addEventListener('click', () => iosModal.classList.remove('hidden'));
if (closeIosModal) closeIosModal.addEventListener('click', () => iosModal.classList.add('hidden'));
if (iosModal) iosModal.addEventListener('click', (e) => { if (e.target === iosModal) iosModal.classList.add('hidden'); });

// ===================== BANCO DE JOGADORES =====================
import { PLAYERS_NORMAL, PLAYERS_PROFESSIONAL, RARITY_META } from './players.js';
let activeDeck = 'normal';
const deckData = {normal: PLAYERS_NORMAL, professional: PLAYERS_PROFESSIONAL};
const bankScreen = document.getElementById('bankScreen');
const playerGrid = document.getElementById('playerGrid');
const playerSearch = document.getElementById('playerSearch');
const positionFilter = document.getElementById('positionFilter');
const rarityFilter = document.getElementById('rarityFilter');
const compareA = document.getElementById('compareA');
const compareB = document.getElementById('compareB');
const compareResult = document.getElementById('compareResult');
function openBank(){showScreen('bankScreen');renderBank();}
function getFiltered(){const q=(playerSearch.value||'').toLocaleLowerCase('pt-BR').trim();const pos=positionFilter.value;const rar=rarityFilter.value;return deckData[activeDeck].filter(p=>(!q||p.nome.toLocaleLowerCase('pt-BR').includes(q))&&(pos==='TODAS'||p.posicao.split('/').includes(pos))&&(rar==='TODAS'||p.raridade===rar));}
function renderBank(){const list=getFiltered();document.querySelectorAll('.deck-tab').forEach(b=>b.classList.toggle('active',b.dataset.deck===activeDeck));document.getElementById('deckStats').textContent=`Baralho ${activeDeck==='normal'?'Normal':'Profissional'} • ${list.length} de ${deckData[activeDeck].length} cartas`;
playerGrid.innerHTML=list.map(p=>`<article class="player-card" style="--rarity:${p.cor}" data-rarity="${p.raridade}" data-id="${p.id}"><div class="player-top"><span class="player-pos">${p.posicao.replace('ATA','ATQ').replace('MEIA','MEI').replace('GOL','GOL')}</span><strong class="player-ovr">${p.ovr}</strong></div><div class="player-name">${p.nome}</div><div class="player-meta"><span class="rarity-pill">${rarityIcon(p.raridade)} ${p.raridade}</span><span>#${p.numero}</span></div></article>`).join('')||'<div class="panel-empty" style="grid-column:1/-1">Nenhum jogador encontrado.</div>';updateCompareOptions();}
function updateCompareOptions(){const opts=deckData[activeDeck].map(p=>`<option value="${p.id}">${p.nome} — ${p.ovr} OVR</option>`).join('');compareA.innerHTML='<option value="">Jogador 1</option>'+opts;compareB.innerHTML='<option value="">Jogador 2</option>'+opts;compareResult.textContent='Escolha dois jogadores do mesmo baralho.';}
function comparePlayers(){const a=deckData[activeDeck].find(p=>p.id===compareA.value),b=deckData[activeDeck].find(p=>p.id===compareB.value);if(!a||!b){compareResult.textContent='Escolha dois jogadores do mesmo baralho.';return;}const d=a.ovr-b.ovr;if(d===0)compareResult.innerHTML=`<strong>Empate técnico de OVR.</strong><br>${a.nome} e ${b.nome} têm ${a.ovr} OVR.<div class="compare-note">A simulação pode variar conforme posição, formação e outros fatores.</div>`;else{const w=d>0?a:b;compareResult.innerHTML=`<strong>${w.nome} provavelmente ganharia</strong> • ${w.ovr} OVR<br>Diferença: <span class="diff-win">${Math.abs(d)} OVR</span><div class="compare-note">Comparação feita dentro do baralho ${activeDeck==='normal'?'Normal':'Profissional'}.</div>`;}}
document.getElementById('backFromBank').addEventListener('click',()=>navigate('home'));document.querySelectorAll('.deck-tab').forEach(b=>b.addEventListener('click',()=>{activeDeck=b.dataset.deck;playerSearch.value='';positionFilter.value='TODAS';rarityFilter.value='TODAS';renderBank();}));[playerSearch,positionFilter,rarityFilter].forEach(el=>el.addEventListener('input',renderBank));[compareA,compareB].forEach(el=>el.addEventListener('change',comparePlayers));playerGrid.addEventListener('click',e=>{const card=e.target.closest('.player-card');if(!card)return;const p=deckData[activeDeck].find(x=>x.id===card.dataset.id);if(!p)return;compareA.value=p.id;comparePlayers();document.querySelector('.compare-panel')?.scrollIntoView({behavior:'smooth',block:'center'});});


// ===================== MUSEU (HALL DA FAMA) =====================
let museumDeck = 'normal';
const museumGrid = document.getElementById('museumGrid');
function renderMuseum(){
  if(!museumGrid)return;
  document.querySelectorAll('.museum-tab').forEach(b=>b.classList.toggle('active',b.dataset.museumDeck===museumDeck));
  const list=deckData[museumDeck].filter(p=>p.raridade==='GOAT'||p.raridade==='EXTREME').sort((a,b)=>b.ovr-a.ovr);
  museumGrid.innerHTML=list.map(p=>`<article class="player-card" style="--rarity:${p.cor}" data-rarity="${p.raridade}"><div class="player-top"><span class="player-pos">${p.posicao.replace('ATA','ATQ').replace('MEIA','MEI')}</span><strong class="player-ovr">${p.ovr}</strong></div><div class="player-name">${p.nome}</div><div class="player-meta"><span class="rarity-pill">${rarityIcon(p.raridade)} ${p.raridade}</span><span>#${p.numero}</span></div><span class="museum-plaque">🏛️ Hall da Fama</span></article>`).join('')
    ||'<div class="panel-empty" style="grid-column:1/-1">Nenhuma lenda nesse baralho ainda.</div>';
}
document.querySelectorAll('.museum-tab').forEach(b=>b.addEventListener('click',()=>{museumDeck=b.dataset.museumDeck;renderMuseum();}));
document.getElementById('backFromMuseum')?.addEventListener('click', () => navigate('home'));

// ===================== DRAFT RÁPIDO + PLANO DE JOGO =====================
const draftState = {
  deck: 'normal', format: 5, total: 8, round: 1, rerolls: 3,
  user: [], ai: [], currentCards: [], offeredRecently: [], busy: false,
  plan: { formation: null, custom: false, customRoles: [], starters: [], reserves: [], mentality: 'equilibrada', offside: false, counter: false, possession: true, pressure: 2 }
};

const draftDifficulty = document.getElementById('aiDifficulty');
if (draftDifficulty) {
  draftDifficulty.value = localStorage.getItem('cv_ai_difficulty') || 'normal';
  draftDifficulty.addEventListener('change', () => localStorage.setItem('cv_ai_difficulty', draftDifficulty.value));
}

function draftPosition(p) { return (p.posicao || '').split('/'); }
function draftHasPosition(team, pos) { return team.some(p => draftPosition(p).includes(pos)); }
function draftCountPos(team, pos) { return team.filter(p => draftPosition(p).includes(pos)).length; }
function draftStarterNeeds() {
  return draftState.format === 5 ? { GOL:1, MEIA:2, ATA:2 } : { GOL:1, MEIA:5, ATA:5 };
}
function draftLimits() {
  const n = draftStarterNeeds();
  // O limite é para titulares; reservas podem repetir posição.
  return { GOL:n.GOL + 1, MEIA:n.MEIA + (draftState.format === 5 ? 2 : 3), ATA:n.ATA + (draftState.format === 5 ? 2 : 3) };
}
function draftCanAdd(team, p) {
  const limits = draftLimits();
  return draftPosition(p).some(pos => (limits[pos] ?? 99) > draftCountPos(team, pos));
}
function draftNeeds(team) {
  const need = draftStarterNeeds();
  return Object.keys(need).filter(pos => draftCountPos(team,pos) < need[pos]);
}
function draftShuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function draftCandidates(team) {
  const all = deckData[draftState.deck];
  const used = new Set([...draftState.user, ...draftState.ai].map(p => p.id));
  let candidates = all.filter(p => !used.has(p.id) && draftCanAdd(team, p));
  const fresh = candidates.filter(p => !draftState.offeredRecently.includes(p.id));
  if (fresh.length >= 3 && Math.random() > .18) candidates = fresh;
  return candidates;
}
function draftMakeCards() {
  let candidates = draftCandidates(draftState.user);
  const aiCanUse = p => draftCanAdd(draftState.ai,p);
  // Se as regras de posição deixarem poucas opções, relaxa somente o limite de repetição;
  // jogadores já escolhidos continuam bloqueados.
  if (candidates.length < 3) {
    const used = new Set([...draftState.user, ...draftState.ai].map(p => p.id));
    candidates = deckData[draftState.deck].filter(p => !used.has(p.id));
  }
  let both = candidates.filter(aiCanUse);
  if (both.length >= 3) candidates = both;
  else {
    const legalAI = deckData[draftState.deck].filter(p => ![...draftState.user,...draftState.ai].some(x=>x.id===p.id) && aiCanUse(p));
    candidates = draftShuffle([...new Map([...candidates,...legalAI].map(p=>[p.id,p])).values()]);
  }
  const needs = draftNeeds(draftState.user);
  // Goleiro é obrigatório, mas só vira prioridade quando a equipe está perto de fechar.
  if (draftState.total - draftState.user.length <= 2 && needs.includes('GOL')) {
    const gks = candidates.filter(p=>draftPosition(p).includes('GOL'));
    if (gks.length) candidates = [draftShuffle(gks)[0], ...draftShuffle(candidates.filter(p=>!draftPosition(p).includes('GOL')))];
  }
  draftState.currentCards = draftShuffle(candidates).slice(0,3);
  if (draftState.currentCards.length < 3) {
    const used = new Set([...draftState.user, ...draftState.ai, ...draftState.currentCards].map(p => p.id));
    const extra = deckData[draftState.deck].filter(p => !used.has(p.id));
    draftState.currentCards.push(...draftShuffle(extra).slice(0, 3 - draftState.currentCards.length));
  }
  draftState.offeredRecently = draftState.currentCards.map(p=>p.id);
  renderDraftCards();
  updatePositionBoard();
}
function draftScore(p, team, difficulty) {
  const needs = draftNeeds(team);
  let score = p.ovr + Math.random()*8;
  if (needs.includes('GOL') && draftPosition(p).includes('GOL')) score += 25;
  if (needs.includes('ATA') && draftPosition(p).includes('ATA')) score += 7;
  if (needs.includes('MEIA') && draftPosition(p).includes('MEIA')) score += 6;
  if (difficulty === 'easy') score = p.ovr*.45 + Math.random()*30;
  if (difficulty === 'hard') score = p.ovr*1.5 + (needs.includes('GOL')&&draftPosition(p).includes('GOL')?35:0) + Math.random()*5;
  if (difficulty === 'expert') score = p.ovr*2 + (needs.includes('GOL')&&draftPosition(p).includes('GOL')?50:0) + Math.random()*2;
  return score;
}
function draftAiPick(cards) {
  const difficulty = localStorage.getItem('cv_ai_difficulty') || 'normal';
  return [...cards].sort((a,b)=>draftScore(b,draftState.ai,difficulty)-draftScore(a,draftState.ai,difficulty))[0];
}
function renderDraftCards() {
  const box=document.getElementById('draftCards'); if(!box)return;
  box.innerHTML=draftState.currentCards.map((p,i)=>`<button class="draft-player-card" type="button" style="--rarity:${p.cor}" data-rarity="${p.raridade}" data-draft-id="${p.id}">
    <div class="draft-card-top"><span>${p.posicao.replace('MEIA','MEI').replace('ATA','ATQ')}</span><strong>${p.ovr}</strong></div>
    <div class="draft-card-rarity">${rarityIcon(p.raridade)} ${p.raridade}</div><div class="draft-card-name">${p.nome}</div>
    <div class="draft-card-number">CARTA ${i+1}</div></button>`).join('');
}
function updatePositionBoard() {
  const box=document.getElementById('draftPositionBoard'); if(!box)return;
  const need=draftStarterNeeds();
  box.innerHTML=['GOL','MEIA','ATA'].map(pos=>{
    const have=draftCountPos(draftState.user,pos), n=need[pos];
    const status=have>=n?'OK':`FALTAM ${n-have}`;
    return `<div class="position-box ${have>=n?'complete':''}"><b>${pos}</b><strong>${Math.min(have,n)}/${n}</strong><small>${status}</small></div>`;
  }).join('');
  const missing=Object.keys(need).filter(pos=>draftCountPos(draftState.user,pos)<need[pos]);
  const note=document.getElementById('draftPenaltyNote');
  if(note) note.textContent=missing.length ? `Faltando: ${missing.join(' • ')}. O plano adapta jogadores e reduz o OVR conforme a distância da posição.` : 'Posições titulares completas. Reservas podem repetir posições.';
}
function renderDraftRosters() {
  const user=document.getElementById('userRoster'), ai=document.getElementById('aiRoster');
  const avg=arr=>arr.length?Math.round(arr.reduce((s,p)=>s+p.ovr,0)/arr.length):'—';
  user.innerHTML=draftState.user.map((p,i)=>`<div class="roster-player"><span>${i<draftState.format?'⭐':'↳'} ${p.nome}<small>${p.posicao}</small></span><b>${p.ovr}</b></div>`).join('')||'<span class="roster-empty">Nenhum jogador ainda</span>';
  ai.innerHTML=draftState.ai.map((p,i)=>`<div class="roster-player"><span>${i<draftState.format?'⭐':'↳'} ${p.nome}<small>${p.posicao}</small></span><b>${p.ovr}</b></div>`).join('')||'<span class="roster-empty">Nenhum jogador ainda</span>';
  document.getElementById('userRosterOvr').textContent=`OVR ${avg(draftState.user)}`;
  document.getElementById('aiRosterOvr').textContent=`OVR ${avg(draftState.ai)}`;
  document.getElementById('userDraftCount').textContent=`${draftState.user.length}/${draftState.total}`;
  document.getElementById('aiDraftCount').textContent=`${draftState.ai.length}/${draftState.total}`;
  updatePositionBoard();
}
function updateDraftHud(){
  document.getElementById('draftRoundText').textContent=draftState.round;
  document.getElementById('draftRoundBadge').textContent=`R${draftState.round}`;
  document.getElementById('rerollCountText').textContent=draftState.rerolls;
  document.getElementById('rerollBtnCount').textContent=draftState.rerolls;
  document.getElementById('draftTargetText').textContent=draftState.total;
  document.getElementById('rerollDraftBtn').disabled=draftState.rerolls<=0||draftState.busy;
}
function resetDraft(){
  draftState.round=1; draftState.rerolls=3; draftState.user=[]; draftState.ai=[]; draftState.currentCards=[]; draftState.offeredRecently=[]; draftState.busy=false;
  draftState.plan={formation:null,custom:false,customRoles:[],starters:[],reserves:[],mentality:'equilibrada',offside:false,counter:false,possession:true,pressure:2};
}
let draftReturnAction = 'modos';
function openDraftSetup(returnAction){
  if (returnAction) draftReturnAction = returnAction;
  showScreen('draftSetupScreen');
}

function startDraft(){
  resetDraft();
  if (draftReturnAction === 'modos') {
    matchContext.type='normal';matchContext.homeName='WESLLEY FC';matchContext.awayName='ADVERSÁRIO';matchContext.targetBoost=0;matchContext.customHome=null;matchContext.customAway=null;matchContext.challengeId=null;
  }
  draftState.deck=document.querySelector('.draft-choice[data-deck-choice].active')?.dataset.deckChoice||draftState.deck;
  draftState.format=Number(document.querySelector('.draft-choice[data-format-choice].active')?.dataset.formatChoice||draftState.format);
  draftState.total=draftState.format===5?8:15;
  document.getElementById('draftFormatLabel').textContent=`${draftState.format}v${draftState.format} · ${draftState.deck==='normal'?'NORMAL':'PROFISSIONAL'}`;
  showScreen('draftGameScreen'); renderDraftRosters(); updateDraftHud(); draftMakeCards();
  document.getElementById('draftRuleNote').textContent='Escolha 1 das 3 cartas. A IA pega outra carta da mesma rodada.';
}

// ---------- Atribuição de posição + perda de OVR ----------
function positionPenalty(player, target) {
  const pos=draftPosition(player);
  if(pos.includes(target)) return 0;
  if(target==='GOL') return 30;
  if(target==='ATA' && pos.includes('MEIA')) return 7;
  if(target==='MEIA' && pos.includes('ATA')) return 14;
  return 12;
}
function effectiveOvr(player,target){ return Math.max(1,player.ovr-positionPenalty(player,target)); }
function slotDefs(){
  if(draftState.format===5) return [
    {key:'GOL',label:'GOL'}, {key:'DEF',label:'DEF'}, {key:'MEI',label:'MEI'}, {key:'MEI2',label:'MEI'}, {key:'ATA',label:'ATA'}
  ];
  return [
    {key:'GOL',label:'GOL'}, {key:'DEF1',label:'DEF'}, {key:'DEF2',label:'DEF'}, {key:'DEF3',label:'DEF'}, {key:'DEF4',label:'DEF'},
    {key:'MEI1',label:'MEI'}, {key:'MEI2',label:'MEI'}, {key:'MEI3',label:'MEI'},
    {key:'ATA1',label:'ATA'}, {key:'ATA2',label:'ATA'}, {key:'ATA3',label:'ATA'}
  ];
}
function preferredForSlot(slot){
  if(slot==='GOL') return ['GOL'];
  if(slot.startsWith('ATA')) return ['ATA','MEIA'];
  return ['MEIA','ATA'];
}
function autoAssignStarters(players){
  const unused=[...players]; const result=[];
  for(const slot of slotDefs()){
    const prefs=preferredForSlot(slot.key);
    let idx=unused.findIndex(p=>draftPosition(p).some(x=>x===prefs[0]));
    if(idx<0) idx=unused.findIndex(p=>draftPosition(p).some(x=>x===prefs[1]));
    if(idx<0) idx=0;
    if(idx<0) continue;
    const p=unused.splice(idx,1)[0];
    const target=slot.label==='DEF'?'MEIA':slot.label;
    result.push({slot:slot.key,label:slot.label,player:p,ovr:effectiveOvr(p,target)});
  }
  return result;
}
function planBuild(){
  const starters=autoAssignStarters(draftState.user.slice(0,draftState.total));
  const starterIds=new Set(starters.map(x=>x.player.id));
  draftState.plan.starters=starters;
  draftState.plan.reserves=draftState.user.filter(p=>!starterIds.has(p.id));
}
const FORMATIONS={
  5:[{id:'2-2-1',name:'2-2-1',desc:'Equilibrada'},{id:'1-3-1',name:'1-3-1',desc:'Controle'},{id:'1-2-2',name:'1-2-2',desc:'Ofensiva'}],
  11:[{id:'4-3-3',name:'4-3-3',desc:'Ofensiva'},{id:'4-4-2',name:'4-4-2',desc:'Equilibrada'},{id:'3-5-2',name:'3-5-2',desc:'Posse'}]
};
function renderFormationTabs(){
  const box=document.getElementById('formationTabs'); if(!box)return;
  box.innerHTML=FORMATIONS[draftState.format].map((f,i)=>`<button type="button" class="formation-choice ${i===0?'active':''}" data-formation="${f.id}"><b>${f.name}</b><small>${f.desc}</small></button>`).join('') + `<button type="button" class="formation-choice custom" id="customFormationBtn"><b>✎ PRÓPRIA</b><small>Montar do seu jeito</small></button>`;
  draftState.plan.formation=FORMATIONS[draftState.format][0].id;
  draftState.plan.custom=false;
}
function setFormation(id){
  if(!FORMATIONS[draftState.format].some(f=>f.id===id))return;
  draftState.plan.formation=id;
  document.querySelectorAll('.formation-choice').forEach(b=>b.classList.toggle('active',b.dataset.formation===id));
  draftState.plan.custom=false;
  document.getElementById('customFormationEditor')?.classList.add('hidden');
  document.getElementById('planFormationLabel').textContent=id;
  renderFormationPitch();
}
function currentRoles(){
  const count=slotDefs().length;
  if(draftState.plan.custom && draftState.plan.customRoles.length===count) return draftState.plan.customRoles;
  const outfield=count-1;
  const parts=(draftState.plan.formation||'').split('-').map(Number);
  let [def,mei,ata]=parts.length===3 && parts.every(n=>!isNaN(n)) ? parts : (draftState.format===5?[1,2,1]:[4,3,3]);
  let sum=def+mei+ata;
  if(sum!==outfield){ const diff=outfield-sum; ata=Math.max(0,ata+diff); }
  return ['GOL', ...Array(def).fill('DEF'), ...Array(mei).fill('MEI'), ...Array(ata).fill('ATA')];
}
function renderFormationPitch(){
  const pitch=document.getElementById('formationPitch'); if(!pitch)return;
  const roles=currentRoles(); const s=draftState.plan.starters;
  s.forEach((x,i)=>{const role=roles[i]||x.label; const target=role==='DEF'?'MEIA':role; x.label=role; x.ovr=effectiveOvr(x.player,target);});
  const order=['ATA','MEI','DEF','GOL'];
  pitch.innerHTML=order.map(row=>{
    const players=s.filter(x=>x.label===row);
    if(!players.length)return'';
    return `<div class="pitch-row pitch-row-${row}">`+players.map(x=>{
      const idx=s.indexOf(x);
      return `<button class="pitch-player" data-pitch-index="${idx}" type="button">
        <span class="pitch-badge"><b>${x.ovr}</b></span>
        <span class="pitch-name">${x.player.nome}</span>
        <span class="pitch-role">${row}</span>
      </button>`;
    }).join('')+`</div>`;
  }).join('');
}
function renderCustomFormationEditor(){
  const box=document.getElementById('customFormationEditor'); if(!box)return;
  const roles=currentRoles();
  box.innerHTML='<div class="custom-editor-head"><b>✎ SUA FORMAÇÃO</b><small>Escolha a função de cada jogador</small></div>'+roles.map((r,i)=>`<label><span>${i+1}. ${draftState.plan.starters[i]?.player.nome||'Jogador'}</span><select data-role-index="${i}"><option ${r==='GOL'?'selected':''}>GOL</option><option ${r==='DEF'?'selected':''}>DEF</option><option ${r==='MEI'?'selected':''}>MEI</option><option ${r==='ATA'?'selected':''}>ATA</option></select></label>`).join('');
  box.classList.remove('hidden');
}
function applyCustomRoles(){
  draftState.plan.customRoles=[...document.querySelectorAll('#customFormationEditor select')].map(x=>x.value);
  draftState.plan.custom=true; draftState.plan.formation='PRÓPRIA';
  document.getElementById('planFormationLabel').textContent='PRÓPRIA';
  document.querySelectorAll('.formation-choice').forEach(b=>b.classList.remove('active'));
  document.getElementById('customFormationBtn')?.classList.add('active');
  renderFormationPitch(); renderPlanPlayers();
}
function renderPlanPlayers(){
  const box=document.getElementById('planPlayerList'); if(!box)return;
  box.innerHTML=draftState.plan.starters.map((x,i)=>`<div class="plan-player-row"><div class="plan-player-main"><span class="plan-player-pos">${x.label}</span><div><b>${x.player.nome}</b><small>${x.player.posicao} · base ${x.player.ovr}</small></div></div><strong class="plan-player-ovr ${x.ovr<x.player.ovr?'penalty':''}">${x.ovr}</strong></div>`).join('') +
    `<div class="plan-subtitle">RESERVAS · ${draftState.plan.reserves.length}</div>` +
    draftState.plan.reserves.map(p=>`<div class="plan-player-row reserve-row"><div class="plan-player-main"><span class="plan-player-pos reserve">BANCO</span><div><b>${p.nome}</b><small>${p.posicao} · ${p.ovr} OVR</small></div></div><strong>${p.ovr}</strong></div>`).join('');
  document.getElementById('planRosterStatus').textContent=`${draftState.user.length} jogadores`;
}
function renderSubSelects(){
  const st=document.getElementById('subStarter'), rs=document.getElementById('subReserve');
  if(!st||!rs)return;
  st.innerHTML='<option value="">Escolha o titular</option>'+draftState.plan.starters.map((x,i)=>`<option value="${i}">${x.label} · ${x.player.nome} (${x.ovr})</option>`).join('');
  rs.innerHTML='<option value="">Escolha o reserva</option>'+draftState.plan.reserves.map((p,i)=>`<option value="${i}">${p.nome} · ${p.ovr}</option>`).join('');
}
function renderGamePlan(){
  renderFormationTabs(); renderFormationPitch(); renderPlanPlayers(); renderSubSelects();
  document.getElementById('planTeamCount').textContent=`${draftState.user.length}/${draftState.total}`;
  const avg=draftState.plan.starters.length?Math.round(draftState.plan.starters.reduce((a,x)=>a+x.ovr,0)/draftState.plan.starters.length):0;
  document.getElementById('planTeamOvr').textContent=avg;
  document.getElementById('planFormationLabel').textContent=draftState.plan.formation;
  document.querySelectorAll('[data-mentality]').forEach(b=>b.classList.toggle('active',b.dataset.mentality===draftState.plan.mentality));
  ['offside','counter','possession'].forEach(k=>{const el=document.getElementById(k+'Toggle'); el.dataset.on=String(draftState.plan[k]); el.textContent=draftState.plan[k]?'SIM':'NÃO'; el.classList.toggle('on',draftState.plan[k]);});
  const r=document.getElementById('pressureRange'); if(r)r.value=draftState.plan.pressure;
  updatePressureLabel();
}
function openGamePlan(){ planBuild(); showScreen('gamePlanScreen'); renderGamePlan(); }
function finishDraft(){
  const avg=arr=>arr.length?Math.round(arr.reduce((s,p)=>s+p.ovr,0)/arr.length):0;
  const u=avg(draftState.user), a=avg(draftState.ai);
  document.getElementById('resultUserOvr').textContent=u; document.getElementById('resultAiOvr').textContent=a;
  if(onlineState.active){
    document.getElementById('draftResultTitle').textContent='🌐 Seu elenco está pronto!';
    document.getElementById('draftResultSummary').textContent=`${draftState.user.length} jogadores escolhidos. OVR médio: ${u}. Ajuste seu plano de jogo e envie pra sala.`;
  } else {
    document.getElementById('draftResultTitle').textContent=u>a?'🏆 Você venceu o Draft!':u<a?'🤖 A IA levou essa!':'⚖️ Empate no Draft!';
    document.getElementById('draftResultSummary').textContent=`${draftState.user.length} jogadores para você e ${draftState.ai.length} para a IA. OVR médio: ${u} x ${a}.`;
  }
  openGamePlan();
}
function handleDraftPick(id){
  if(draftState.busy)return;
  const chosen=draftState.currentCards.find(p=>p.id===id); if(!chosen||!draftCanAdd(draftState.user,chosen))return;
  draftState.busy=true; draftState.user.push(chosen);
  const remaining=draftState.currentCards.filter(p=>p.id!==chosen.id);
  const legal=remaining.filter(p=>draftCanAdd(draftState.ai,p));
  const aiChosen=legal.length?draftAiPick(legal):null;
  if(aiChosen)draftState.ai.push(aiChosen);
  renderDraftRosters();
  if(draftState.user.length>=draftState.total){setTimeout(finishDraft,200);return;}
  draftState.round++;
  setTimeout(()=>{draftState.busy=false;updateDraftHud();draftMakeCards();},200);
}
function updatePressureLabel(){const v=Number(document.getElementById('pressureRange')?.value||2); document.getElementById('pressureValue').textContent=v===1?'Baixa':v===3?'Alta':'Média'; draftState.plan.pressure=v;}

document.querySelectorAll('[data-deck-choice]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-deck-choice]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}));
document.querySelectorAll('[data-format-choice]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-format-choice]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}));
document.getElementById('startDraftBtn')?.addEventListener('click',startDraft);
document.getElementById('draftCards')?.addEventListener('click',e=>{const card=e.target.closest('[data-draft-id]');if(card)handleDraftPick(card.dataset.draftId);});
document.getElementById('rerollDraftBtn')?.addEventListener('click',()=>{if(draftState.rerolls<=0||draftState.busy)return;draftState.rerolls--;updateDraftHud();draftMakeCards();});
document.getElementById('backFromDraftSetup')?.addEventListener('click',()=>navigate(draftReturnAction));
document.getElementById('backFromDraftGame')?.addEventListener('click',()=>{
  if(tournamentState.active){
    if(!confirm('Sair do torneio? Você perderá a participação.'))return;
    sairTorneio();
    return;
  }
  if(onlineState.active){
    if(!confirm('Sair do Draft Online? Você vai perder o lugar na sala.'))return;
    const codigo=onlineState.codigo;
    marcarSaidaSala(codigo,onlineState.papel).catch(()=>{});
    resetOnlineState();
    navigate('online');
    return;
  }
  if(confirm('Sair do Draft? O progresso desta partida será perdido.'))navigate('draft');
});
document.getElementById('backFromDraftResult')?.addEventListener('click',()=>navigate('draft'));
document.getElementById('newDraftBtn')?.addEventListener('click',openDraftSetup);
document.getElementById('resultHomeBtn')?.addEventListener('click',()=>navigate('home'));


document.getElementById('formationTabs')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-formation]'); if(b){setFormation(b.dataset.formation);return;}
  if(e.target.closest('#customFormationBtn')){draftState.plan.custom=true;draftState.plan.customRoles=currentRoles();renderCustomFormationEditor();applyCustomRoles();}
});
document.getElementById('customFormationEditor')?.addEventListener('change',applyCustomRoles);
document.getElementById('mentalityChoices')?.addEventListener('click',e=>{const b=e.target.closest('[data-mentality]');if(!b)return;draftState.plan.mentality=b.dataset.mentality;document.querySelectorAll('[data-mentality]').forEach(x=>x.classList.toggle('active',x===b));});
['offside','counter','possession'].forEach(k=>document.getElementById(k+'Toggle')?.addEventListener('click',e=>{draftState.plan[k]=!draftState.plan[k];e.currentTarget.dataset.on=String(draftState.plan[k]);e.currentTarget.textContent=draftState.plan[k]?'SIM':'NÃO';e.currentTarget.classList.toggle('on',draftState.plan[k]);}));
document.getElementById('pressureRange')?.addEventListener('input',updatePressureLabel);
document.getElementById('makeSubBtn')?.addEventListener('click',()=>{
  const si=Number(document.getElementById('subStarter').value), ri=Number(document.getElementById('subReserve').value);
  if(Number.isNaN(si)||Number.isNaN(ri))return;
  const starter=draftState.plan.starters[si], reserve=draftState.plan.reserves[ri]; if(!starter||!reserve)return;
  const outgoing=starter.player, incoming=reserve;
  draftState.plan.reserves[ri]=outgoing; starter.player=incoming; starter.ovr=effectiveOvr(incoming,starter.label==='DEF'?'MEIA':starter.label);
  document.getElementById('substitutionNote').textContent=`Entrou ${incoming.nome} no lugar de ${outgoing.nome}.`;
  renderPlanPlayers(); renderFormationPitch(); renderSubSelects();
});
document.getElementById('saveGamePlanBtn')?.addEventListener('click',()=>{ if(tournamentState.active){ submitTournamentDraft(); return; } if(onlineState.active){ submitOnlineSquad(); return; } if(draftReturnAction==='league'){ finalizeLeagueCreation(); return; } openMatchSimulation(); });
document.getElementById('openPlanAgainBtn')?.addEventListener('click',()=>{showScreen('gamePlanScreen');renderGamePlan();});
document.getElementById('backFromGamePlan')?.addEventListener('click',()=>showScreen('draftResultScreen'));



// ===================== MOTOR DE SIMULAÇÃO =====================
const STADIUMS = [
  {id:'cagepa', name:'Quadra do lado da CAGEPA', icon:'🏟️', weather:'☁️ Nublado'},
  {id:'estadio', name:'Quadra do estádio', icon:'🏟️', weather:'🌤️ Parcialmente nublado'},
  {id:'campo-vila', name:'Campo da Vila', icon:'🌿', weather:'☀️ Sol'},
  {id:'quadra-vila', name:'Quadra da Vila', icon:'🏘️', weather:'☁️ Nublado'},
  {id:'society', name:'Society', icon:'⚽', weather:'🌤️ Fim de tarde'},
  {id:'ronaldao', name:'Ronaldao', icon:'🏆', weather:'🌙 Noite'}
];
const COMMENTATORS = {
  'radio-vila': {name:'Rádio Vila', goal:['É GOOOOOL! A rede balança!','QUE GOL! A torcida levanta!','Bateu bonito e guardou!'], card:['Cartão para a jogada. O árbitro não deixou passar.'], assist:['Que passe! Assistência de muita categoria.'], start:['A bola está rolando! Começa a partida.'], half:['Intervalo! Hora de respirar e ajustar o plano.'], end:['Fim de jogo! Está encerrada a partida.']},
  'voz-cagepa': {name:'Voz da CAGEPA', goal:['GOOOOOL! Explode a quadra da CAGEPA!','É GOL! Jogada rápida e finalização certeira!'], card:['Amarelo mostrado pelo árbitro.'], assist:['Passe açucarado e assistência perfeita!'], start:['Rola a bola! Tudo pronto para o espetáculo.'], half:['Intervalo de jogo.'], end:['Apita o árbitro: fim de partida!']},
  'locutor-classico': {name:'Locutor Clássico', goal:['Senhoras e senhores, que pintura! GOOOOOL!','A bola encontra o caminho das redes!'], card:['O árbitro registra a infração com cartão.'], assist:['Assistência de mestre na construção do gol.'], start:['Começa o duelo!'], half:['Fim do primeiro tempo.'], end:['Termina o jogo!']},
  'narracao-rapida': {name:'Narração Rápida', goal:['GOL! GOL! GOL!','É GOOOOOL!'], card:['AMARELO!'], assist:['ASSISTÊNCIA!'], start:['BOLA ROLANDO!'], half:['INTERVALO!'], end:['FIM!']}
};
const matchContext = {
  type:'normal', homeName:'WESLLEY FC', awayName:'ADVERSÁRIO', targetBoost:0,
  customHome:null, customAway:null, challengeId:null
};
const matchState = {
  running:false, finished:false, minute:0, speed:0.5, timer:null, stadium:STADIUMS[3], commentator:'radio-vila',
  home:[], away:[], reserves:[], awayReserves:[], score:[0,0], events:[], stats:{home:{posse:52,finalizacoes:0,gol:0,passes:0,faltas:0},away:{posse:48,finalizacoes:0,gol:0,passes:0,faltas:0}}, lastEventPlayer:null, momentum:0
};
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function spawnBall(side,kind){
  const pitch=document.getElementById('matchPitch'); if(!pitch)return;
  pitch.querySelector('.ball-marker')?.remove();
  const ball=document.createElement('div');
  ball.className=`ball-marker ball-fly-${side}${kind==='goal'?' ball-goal':''}`;
  pitch.appendChild(ball);
  setTimeout(()=>ball.remove(),600);
  if(kind==='goal'){pitch.classList.add('flash-goal');setTimeout(()=>pitch.classList.remove('flash-goal'),350);}
}
function renderPossessionBar(){
  const h=matchState.stats.home.posse,a=matchState.stats.away.posse;
  const bh=document.getElementById('possHomeBar'),ba=document.getElementById('possAwayBar'),lb=document.getElementById('possLabel');
  if(bh)bh.style.width=h+'%'; if(ba)ba.style.width=a+'%'; if(lb)lb.textContent=`${h}% posse · ${a}%`;
}
function randomItem(a){return a[Math.floor(Math.random()*a.length)];}
function shuffle(a){return [...a].sort(()=>Math.random()-.5);}
function avgOvr(arr){return arr.length?Math.round(arr.reduce((s,p)=>s+(p.ovr||0),0)/arr.length):0;}
function teamStrength(starters, side='home'){
  const base=avgOvr(starters.map(x=>x.player||x));
  const plan=draftState.plan;
  const mentality=plan.mentality==='ofensiva'?2:plan.mentality==='defensiva'?-2:0;
  const pressure=(Number(plan.pressure||2)-2)*1.5;
  const possession=plan.possession?1.2:0;
  const counter=plan.counter?1.1:0;
  const formationBonus=plan.formation==='PRÓPRIA'?1:plan.formation?.startsWith('3-5')?1.5:0;
  return base+mentality+pressure+possession+counter+formationBonus+(side==='away'?Math.random()*3-1.5:0);
}
function buildOpponent(){
  const deck=deckData[draftState.deck]||PLAYERS_NORMAL;
  const need=draftState.format===5?5:11;
  const shuffled=shuffle(deck);
  const target=Math.max(0,avgOvr(draftState.plan.starters.map(x=>x.player))-2+Math.round(Math.random()*5)+(Number(matchContext.targetBoost)||0));
  const ranked=shuffled.sort((a,b)=>Math.abs(a.ovr-target)-Math.abs(b.ovr-target));
  const chosen=[]; const ids=new Set();
  const keeper=ranked.find(p=>draftPosition(p).includes('GOL'));
  if(keeper){chosen.push(keeper);ids.add(keeper.id);}
  for(const p of ranked){if(chosen.length>=need)break;if(ids.has(p.id))continue;chosen.push(p);ids.add(p.id);}
  return {starters:chosen.slice(0,need),reserves:ranked.filter(p=>!ids.has(p.id)).slice(0,Math.max(3,need===5?3:5))};
}
function roleForIndex(i){
  const roles=currentRoles(); return roles[i]||'MEI';
}
function markerPositions(count,side){
  const five=[
    {x:50,y:88},{x:28,y:67},{x:72,y:67},{x:38,y:45},{x:62,y:45}
  ];
  const eleven=[
    {x:50,y:91},{x:18,y:73},{x:38,y:77},{x:62,y:77},{x:82,y:73},{x:18,y:54},{x:50,y:57},{x:82,y:54},{x:22,y:30},{x:50,y:26},{x:78,y:30}
  ];
  const base=(count===5?five:eleven).slice(0,count);
  return base.map(p=>({x:p.x,y:side==='home'?p.y:100-p.y}));
}
function renderMatchPitch(highlightId=''){
  const pitch=document.getElementById('matchPitch'); if(!pitch)return;
  if(!pitch.querySelector('.pitch-circle')){
    const circle=document.createElement('div'); circle.className='pitch-circle'; pitch.appendChild(circle);
  }
  const homePos=markerPositions(matchState.home.length,'home'), awayPos=markerPositions(matchState.away.length,'away');
  const seen=new Set();
  const apply=(p,i,side,pos)=>{
    const data=pos[i]; const id=p.id||`${side}-${i}`; seen.add(id);
    const event=id===matchState.lastEventPlayer?.id?matchState.lastEventPlayer.type:'';
    const icon=event==='goal'?'⚽':event==='yellow'?'🟨':event==='red'?'🟥':event==='assist'?'✨':'';
    let el=pitch.querySelector(`.match-player[data-player-id="${CSS.escape(id)}"]`);
    if(!el){
      el=document.createElement('div');
      el.dataset.playerId=id;
      el.innerHTML='<span class="player-rating"></span><span class="player-name"></span>';
      pitch.appendChild(el);
    }
    // classe base + eventos (mantém o elemento vivo p/ a transição de posição animar suave)
    el.className=`match-player ${side==='away'?'away':''} ${event==='goal'?'event-goal':''} ${event==='yellow'||event==='red'?'event-card':''} ${event==='assist'?'event-assist':''}`.trim();
    el.style.left=data.x+'%'; el.style.top=data.y+'%';
    el.querySelector('.player-rating').textContent=p.ovr;
    el.querySelector('.player-name').textContent=p.nome;
    let evEl=el.querySelector('.player-event');
    if(icon){ if(!evEl){evEl=document.createElement('span');evEl.className='player-event';el.appendChild(evEl);} evEl.textContent=icon; }
    else if(evEl){ evEl.remove(); }
  };
  matchState.home.forEach((p,i)=>apply(p,i,'home',homePos));
  matchState.away.forEach((p,i)=>apply(p,i,'away',awayPos));
  // remove jogadores que não existem mais nesta escalação (ex.: substituição)
  pitch.querySelectorAll('.match-player').forEach(el=>{ if(!seen.has(el.dataset.playerId)) el.remove(); });
}
function setupMatchSubs(){
  const a=document.getElementById('matchSubStarter'),b=document.getElementById('matchSubReserve');
  a.innerHTML='<option value="">Titular</option>'+matchState.home.map((p,i)=>`<option value="${i}">${p.nome}</option>`).join('');
  b.innerHTML='<option value="">Reserva</option>'+matchState.reserves.map((p,i)=>`<option value="${i}">${p.nome}</option>`).join('');
}
function renderStadiums(){
  const box=document.getElementById('stadiumGrid'); if(!box)return;
  box.innerHTML=STADIUMS.map(s=>`<button class="stadium-choice ${s.id===matchState.stadium.id?'active':''}" data-stadium="${s.id}" type="button">${s.icon}<br>${s.name}</button>`).join('');
}
function renderLiveStats(){
  const box=document.getElementById('liveStats'); if(!box)return;
  const h=matchState.stats.home,a=matchState.stats.away;
  box.innerHTML=[['POSSE',`${h.posse}%`,`%${a.posse}`],['FINALIZAÇÕES',h.finalizacoes,a.finalizacoes],['NO GOL',h.gol,a.gol],['PASSES',h.passes,a.passes],['FALTAS',h.faltas,a.faltas]].map(x=>`<div class="live-stat"><b>${x[1]} · ${x[2]}</b><span>${x[0]}</span></div>`).join('');
}
function renderTimeline(target='matchTimeline'){
  const box=document.getElementById(target); if(!box)return;
  box.innerHTML=matchState.events.slice().reverse().map(e=>`<div class="timeline-event"><time>${e.minute}'</time><span class="event-icon">${e.icon}</span><div><b>${e.title}</b><small>${e.detail}</small></div></div>`).join('')||'<div class="panel-empty">Nenhum evento ainda.</div>';
}
function setCommentary(text){const el=document.getElementById('liveCommentary');if(el)el.textContent=text;}
function addEvent(minute,icon,title,detail,commentaryType,player,side){
  const e={minute,icon,title,detail,side}; matchState.events.push(e); matchState.lastEventPlayer=player?{id:player.id,type:commentaryType}:null;
  const c=COMMENTATORS[matchState.commentator]||COMMENTATORS['radio-vila'];
  const arr=c[commentaryType]||c.goal||[]; setCommentary(randomItem(arr));
  renderTimeline(); renderMatchPitch();
  setTimeout(()=>{if(matchState.running){matchState.lastEventPlayer=null;renderMatchPitch();}},650);
}
const DECISION_LIBRARY = [
  {id:'chutar',icon:'🥅',name:'Chutar',desc:'Finalizar a jogada imediatamente.',shot:1.55,pass:0.65,dribble:.85},
  {id:'passar',icon:'➡️',name:'Passar',desc:'Circular a bola e procurar espaço.',shot:.85,pass:1.45,dribble:.9},
  {id:'driblar',icon:'🌀',name:'Driblar',desc:'Tentar passar pelo marcador.',shot:1.1,pass:.8,dribble:1.5},
  {id:'recuar',icon:'↩️',name:'Recuar',desc:'Diminuir o risco e reorganizar.',shot:.55,pass:1.1,dribble:.6},
  {id:'pressionar',icon:'🔥',name:'Pressionar',desc:'Apertar o adversário na saída.',shot:1.15,pass:.75,dribble:1.05},
  {id:'cruzar',icon:'🎯',name:'Cruzar',desc:'Colocar a bola na área.',shot:1.3,pass:1.0,dribble:.8},
  {id:'tocar-rapido',icon:'⚡',name:'Tocar rápido',desc:'Um toque e acelerar a jogada.',shot:1.0,pass:1.3,dribble:1.05},
  {id:'tabelinha',icon:'🔁',name:'Fazer tabelinha',desc:'Trocar passes curtos para entrar na área.',shot:1.15,pass:1.5,dribble:1.0},
  {id:'lancar',icon:'📡',name:'Lançar',desc:'Bola longa nas costas da defesa.',shot:1.25,pass:1.15,dribble:.75},
  {id:'segurar',icon:'🛡️',name:'Segurar a bola',desc:'Prender o jogo e gastar tempo.',shot:.65,pass:1.2,dribble:.7},
  {id:'marcacao',icon:'👊',name:'Marcação forte',desc:'Ganhar a disputa no corpo a corpo.',shot:1.0,pass:.7,dribble:1.2},
  {id:'contra-ataque',icon:'🚀',name:'Contra-ataque',desc:'Acelerar assim que recuperar.',shot:1.4,pass:1.25,dribble:1.2},
  {id:'cadenciar',icon:'🎛️',name:'Cadenciar',desc:'Reduzir o ritmo e manter o controle.',shot:.7,pass:1.35,dribble:.65}
];
const decisionState={pending:false,side:'home',choices:[],mult:1,history:[],nextAt:8};
const DECISION_MINUTES=[8,18,29,41,53,64,76,85];
function decisionSide(){
  const h=matchState.stats.home.posse; return Math.random()*100<h?'home':'away';
}
function renderDecisionPanel(){
  const panel=document.getElementById('decisionPanel'); if(!panel)return;
  const side=decisionState.side; const team=side==='home'?matchState.homeName:matchState.awayName;
  document.getElementById('decisionTeamLabel').textContent=team;
  panel.classList.remove('side-home','side-away'); panel.classList.add(side==='home'?'side-home':'side-away');
  const situation=randomItem(['Ataque rápido pelo meio.','Espaço aberto pela lateral.','Marcador chegou perto.','A equipe recuperou a bola.','Último passe antes da finalização.','Bola parada curta.','Defesa adversária desorganizada.','Dois jogadores contra dois marcadores.','A torcida aumenta a pressão.','O atacante recebeu livre.']);
  document.getElementById('decisionSituation').textContent=situation;
  document.getElementById('decisionChoices').innerHTML=decisionState.choices.map(c=>`<button class="decision-choice" data-decision="${c.id}" type="button"><span>${c.icon}</span><b>${c.name}</b><small>${c.desc}</small></button>`).join('');
  panel.classList.remove('hidden');
}
function askMatchDecision(){
  if(matchState.finished||decisionState.pending)return;
  decisionState.pending=true; decisionState.side=decisionSide(); decisionState.choices=shuffle(DECISION_LIBRARY).slice(0,4); matchState.running=false; renderDecisionPanel(); setCommentary(`🧠 Decisão de ${decisionState.side==='home'?matchState.homeName:matchState.awayName}.`);
}
function applyDecision(id){
  if(!decisionState.pending)return;
  const c=DECISION_LIBRARY.find(x=>x.id===id); if(!c)return;
  decisionState.mult=c.shot;
  const decisionStats=matchState.stats[decisionState.side];
  decisionStats.passes += c.id==='passar'||c.id==='tocar-rapido'?3:1;
  decisionStats.finalizacoes += c.id==='chutar'||c.id==='cruzar'?1:0;
  decisionStats.faltas += c.id==='pressionar'&&Math.random()<.2?1:0;
  decisionState.history.push({minute:matchState.minute,side:decisionState.side,id});
  const side=decisionState.side; const p=randomItem(matchState[side]);
  const text={chutar:'escolheu CHUTAR',passar:'escolheu PASSAR',driblar:'escolheu DRIBLAR',recuar:'escolheu RECUAR',pressionar:'escolheu PRESSIONAR',cruzar:'escolheu CRUZAR', 'tocar-rapido':'escolheu TOCAR RÁPIDO'}[id];
  addEvent(matchState.minute,'🧠','DECISÃO',`${p?.nome||'A equipe'} ${text}.`, 'assist', p, side);
  const panel=document.getElementById('decisionPanel'); if(panel)panel.classList.add('hidden');
  decisionState.pending=false; decisionState.nextAt=DECISION_MINUTES.find(m=>m>matchState.minute)||999;
  matchState.running=true; startMatchTimer();
}

function generateMatchEvent(){
  const hs=teamStrength(matchState.home), as=teamStrength(matchState.away,'away');
  const diff=hs-as;
  const dm=decisionState.mult||1;
  matchState.momentum=clamp(matchState.momentum*0.92,-15,15);
  const side=Math.random()<(0.5+clamp(diff*.015+matchState.momentum*.012,-.28,.28))?'home':'away';
  const other=side==='home'?'away':'home';
  const stats=matchState.stats[side];
  matchState.stats[side].posse=clamp(matchState.stats[side].posse+0.7,25,75);
  matchState.stats[other].posse=100-matchState.stats[side].posse;
  stats.passes+=Math.floor(4+Math.random()*9); stats.finalizacoes+=Math.random()<.12?1:0; stats.faltas+=Math.random()<.08?1:0;
  if(Math.random()<(0.014+Math.max(-.006,Math.min(.008,diff*.00025)))*dm){
    const scorer=randomItem(matchState[side]); matchState.score[side==='home'?0:1]++; stats.gol++;
    stats.finalizacoes++; const assist=Math.random()<.72?randomItem(matchState[side].filter(p=>p.id!==scorer.id)):null;
    matchState.momentum=clamp(matchState.momentum+(side==='home'?4.5:-4.5),-15,15);
    addEvent(matchState.minute,'⚽','GOL!',`${scorer.nome}${assist?' · assistência de '+assist.nome:''}`, 'goal',scorer,side);
    spawnBall(side,'goal');
    if(assist){setTimeout(()=>{matchState.lastEventPlayer={id:assist.id,type:'assist'};renderMatchPitch();},220);}
    return;
  }
  if(Math.random()<.035){const p=randomItem(matchState[side]); const red=Math.random()<.08; matchState.momentum=clamp(matchState.momentum+(side==='home'?-2:2),-15,15); addEvent(matchState.minute,red?'🟥':'🟨',red?'EXPULSÃO':'CARTÃO',`${p.nome} recebeu ${red?'cartão vermelho':'cartão amarelo'}.`,red?'red':'yellow',p,side);return;}
  if(Math.random()<.025){const p=randomItem(matchState[side]);addEvent(matchState.minute,'🔄','SUBSTITUIÇÃO',`${p.nome} foi substituído por decisão tática.`,'assist',p,side);return;}
  if(Math.random()<.022){const p=randomItem(matchState[side]);addEvent(matchState.minute,'⚽','CHANCE',`${p.nome} chegou com perigo... e parou na defesa!`, 'assist',p,side);spawnBall(side,'miss');}
}
function updateScoreboard(){
  document.getElementById('matchMinute').textContent=`${matchState.minute}'`;
  document.getElementById('matchScore').textContent=`${matchState.score[0]} × ${matchState.score[1]}`;
  document.getElementById('matchProgress').style.width=`${(matchState.minute/90)*100}%`;
  document.getElementById('matchStadiumLabel').textContent=matchState.stadium.name;
  document.getElementById('matchWeather').textContent=matchState.stadium.weather;
  renderPossessionBar();
}
function tickMatch(){
  if(!matchState.running)return;
  matchState.minute=Math.min(90,matchState.minute+1);
  if(DECISION_MINUTES.includes(matchState.minute) && matchState.minute!==90){ askMatchDecision(); updateScoreboard(); renderLiveStats(); return; }
  if(matchState.minute===45){addEvent(45,'⏸️','INTERVALO','Fim do primeiro tempo.','half');}
  else if(matchState.minute===90){addEvent(90,'🏁','FIM','Fim da partida.','end');finishMatch();return;}
  else generateMatchEvent();
  updateScoreboard(); renderLiveStats();
}
function stopMatchTimer(){if(matchState.timer){clearInterval(matchState.timer);matchState.timer=null;}}
function startMatchTimer(){stopMatchTimer();if(matchState.finished)return;matchState.running=true;document.getElementById('timelineStatus').textContent='AO VIVO';matchState.timer=setInterval(tickMatch,450*matchState.speed);}
function jumpToResult(){if(matchState.finished)return;document.getElementById('decisionPanel')?.classList.add('hidden');decisionState.pending=false;stopMatchTimer();matchState.running=true;while(matchState.minute<90){matchState.minute++;if(matchState.minute===45)addEvent(45,'⏸️','INTERVALO','Fim do primeiro tempo.','half');else if(matchState.minute<90)generateMatchEvent();}matchState.running=false;addEvent(90,'🏁','FIM','Fim da partida.','end');finishMatch();}
function finishMatch(){
  stopMatchTimer(); matchState.running=false;matchState.finished=true;matchState.minute=90;updateScoreboard();renderLiveStats();renderTimeline('finalTimeline');
  const hs=matchState.score[0],as=matchState.score[1],result=hs>as?'VITÓRIA':hs<as?'DERROTA':'EMPATE';
  document.getElementById('finalHomeName').textContent=matchState.homeName||'WESLLEY FC';document.getElementById('finalAwayName').textContent=matchState.awayName||'ADVERSÁRIO';document.getElementById('finalScore').textContent=`${hs} × ${as}`;
  document.getElementById('finalWinnerNote').textContent=result==='VITÓRIA'?'🏆 Vitória!':result==='DERROTA'?'Derrota — próxima partida!':'⚖️ Empate!';
  document.getElementById('timelineStatus').textContent='FIM';
  const h=matchState.stats.home,a=matchState.stats.away;
  document.getElementById('finalStats').innerHTML=[['POSSE',`${h.posse}%`,`${a.posse}%`],['FINALIZAÇÕES',h.finalizacoes,a.finalizacoes],['CHUTES NO GOL',h.gol,a.gol],['PASSES',h.passes,a.passes],['FALTAS',h.faltas,a.faltas]].map(x=>`<div class="final-stat"><span>${x[0]}</span><b>${x[1]} · ${x[2]}</b></div>`).join('');
  if(matchContext.type!=='tournament'){
    saveMatchHistory(result);
    registrarPartida(perfilAtual?.chave,result).then(async()=>{if(perfilAtual?.chave){const p=await buscarPerfil(perfilAtual.chave);if(p)perfilAtual={chave:perfilAtual.chave,...p};}}).catch(()=>{});
  }
  if(matchContext.type==='tournament'){
    concluirPartidaTorneio(hs,as,result);
    return;
  }
  if(matchContext.type==='online' && perfilAtual?.chave){
    registrarPartidaOnline(perfilAtual.chave,result).catch(()=>{});
    registrarHistoricoOnline({result,home:matchState.homeName||'WESLLEY FC',away:matchState.awayName||'ADVERSÁRIO',score:matchState.score.join(' × '),stadium:matchState.stadium.name}).catch(()=>{});
    if(onlineState.active && onlineState.papel==='anfitriao' && onlineState.codigo){
      salvarResultadoSala(onlineState.codigo,{placarCasa:hs,placarFora:as,homeName:matchState.homeName||'WESLLEY FC',awayName:matchState.awayName||'ADVERSÁRIO',stadium:matchState.stadium.name,resultadoAnfitriao:result}).catch(()=>{});
      iniciarPollingResultadoOnline();
    }
  }
  handleSpecialMatchFinish(result);
  showScreen('matchResultScreen');
}
function saveMatchHistory(result){
  const history=JSON.parse(localStorage.getItem('cv_match_history')||'[]');
  history.unshift({date:Date.now(),result,home:matchState.homeName||'WESLLEY FC',away:matchState.awayName||'ADVERSÁRIO',score:matchState.score.join(' × '),stadium:matchState.stadium.name,events:matchState.events.slice(-8)});
  localStorage.setItem('cv_match_history',JSON.stringify(history.slice(0,12)));renderProfileHistory();
}
function renderProfileHistory(){
  renderProfileStats();
  const box=document.getElementById('profileHistory');if(!box)return;const history=JSON.parse(localStorage.getItem('cv_match_history')||'[]');
  const markup=history.slice(0,8).map(m=>`<div class="history-match"><span class="history-result ${m.result==='VITÓRIA'?'history-win':m.result==='DERROTA'?'history-loss':'history-draw'}">${m.result}</span><div><div class="history-score">${m.score}</div><div class="history-stadium">${m.stadium}</div></div><span>⚽</span></div>`).join('');
  box.innerHTML=history.length?markup:'<p class="panel-empty">Nenhuma partida registrada ainda.</p>';
}
function makeGeneratedTeam(target, need){
  const deck=deckData[draftState.deck]||PLAYERS_NORMAL, ranked=shuffle(deck).sort((a,b)=>Math.abs(a.ovr-target)-Math.abs(b.ovr-target));
  const chosen=[]; const ids=new Set();
  const keeper=ranked.find(p=>draftPosition(p).includes('GOL')); if(keeper){chosen.push(keeper);ids.add(keeper.id);}
  for(const p of ranked){if(chosen.length>=need)break;if(ids.has(p.id))continue;chosen.push(p);ids.add(p.id);}
  return chosen.slice(0,need);
}
function openMatchSimulation(){
  stopMatchTimer();
  const need=draftState.format===5?5:11;
  let opponent, homePlayers, reserves, awayPlayers;
  if(matchContext.customHome && matchContext.customAway){
    homePlayers=matchContext.customHome.starters; reserves=matchContext.customHome.reserves||[];
    awayPlayers=matchContext.customAway.starters; matchState.awayReserves=matchContext.customAway.reserves||[];
  } else {
    opponent=buildOpponent(); homePlayers=draftState.plan.starters.map(x=>x.player); reserves=draftState.plan.reserves.slice(); awayPlayers=opponent.starters; matchState.awayReserves=opponent.reserves;
  }
  const defSpeed = localStorage.getItem('cv_default_speed') || '0.5';
  const defCommentator = localStorage.getItem('cv_commentator') || 'radio-vila';
  matchState.running=false;matchState.finished=false;matchState.minute=0;matchState.speed=Number(defSpeed);matchState.stadium=STADIUMS[3];matchState.commentator=defCommentator;
  matchState.home=homePlayers;matchState.reserves=reserves;matchState.away=awayPlayers;matchState.score=[0,0];matchState.events=[];
  decisionState.pending=false;decisionState.side='home';decisionState.choices=[];decisionState.mult=1;decisionState.history=[];decisionState.nextAt=8;document.getElementById('decisionPanel')?.classList.add('hidden');
  matchState.homeName=matchContext.homeName||'WESLLEY FC';matchState.awayName=matchContext.awayName||'ADVERSÁRIO';
  const homeAvg=avgOvr(homePlayers),awayAvg=avgOvr(awayPlayers);
  const possession=Math.max(38,Math.min(62,50+Math.round((homeAvg-awayAvg)*.7)+Math.round(Math.random()*6-3)));
  matchState.stats={home:{posse:possession,finalizacoes:0,gol:0,passes:0,faltas:0},away:{posse:100-possession,finalizacoes:0,gol:0,passes:0,faltas:0}};
  document.getElementById('homeTeamName').textContent=matchState.homeName;document.getElementById('awayTeamName').textContent=matchState.awayName;
  document.getElementById('commentatorSelect').value=defCommentator;document.getElementById('commentatorName').textContent=COMMENTATORS[defCommentator].name;document.getElementById('matchSubNote').textContent='Nenhuma substituição feita.';
  renderStadiums();setupMatchSubs();renderMatchPitch();renderTimeline();renderLiveStats();updateScoreboard();setCommentary('A bola vai rolar. Boa partida!');
  document.querySelectorAll('.match-speed').forEach(b=>b.classList.toggle('active',b.dataset.speed===defSpeed));
  showScreen('matchScreen');startMatchTimer();
}
document.getElementById('matchSoundBtn')?.addEventListener('click',e=>{e.currentTarget.textContent=e.currentTarget.textContent==='🔔'?'🔕':'🔔';});
document.querySelectorAll('.match-speed').forEach(b=>b.addEventListener('click',()=>{if(b.id==='finishMatchBtn'){jumpToResult();return;}matchState.speed=Number(b.dataset.speed);document.querySelectorAll('.match-speed').forEach(x=>x.classList.toggle('active',x===b));if(matchState.running)startMatchTimer();}));
document.getElementById('stadiumGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-stadium]');if(!b)return;matchState.stadium=STADIUMS.find(x=>x.id===b.dataset.stadium)||matchState.stadium;renderStadiums();updateScoreboard();});
document.getElementById('commentatorSelect')?.addEventListener('change',e=>{matchState.commentator=e.target.value;document.getElementById('commentatorName').textContent=COMMENTATORS[matchState.commentator].name;});
document.getElementById('matchMakeSubBtn')?.addEventListener('click',()=>{const si=Number(document.getElementById('matchSubStarter').value),ri=Number(document.getElementById('matchSubReserve').value);if(Number.isNaN(si)||Number.isNaN(ri))return;const out=matchState.home[si],incoming=matchState.reserves[ri];if(!out||!incoming)return;matchState.home[si]=incoming;matchState.reserves[ri]=out;addEvent(matchState.minute,'🔄','SUBSTITUIÇÃO',`${incoming.nome} entrou no lugar de ${out.nome}.`,'assist',incoming,'home');document.getElementById('matchSubNote').textContent=`Entrou ${incoming.nome} no lugar de ${out.nome}.`;setupMatchSubs();renderMatchPitch();});
document.getElementById('continueAfterMatchBtn')?.addEventListener('click',handleSpecialContinue);
document.getElementById('replayMatchBtn')?.addEventListener('click',()=>{
  if(document.getElementById('replayMatchBtn')?.textContent.includes('VOLTAR')){ if(matchContext.type==='online') sairDaSalaOnline(); else { matchContext.type='normal'; navigate('home'); } return; }
  if(matchContext.type==='online'){aceitarRevancheOnline();return;}
  openMatchSimulation();
});


// ===================== MODOS EXTRAS — CAMPANHA / SOBREVIVÊNCIA / DESAFIOS / 2P =====================
const CAMPAIGN_STAGES=['OITAVAS','QUARTAS','SEMIFINAL','FINAL'];
const OPPONENT_NAMES=['União Cajá','Vila Nova FC','Ronaldo City','CAGEPA United','Society Kings','Estádio FC','Boqueirão Stars','Manecos Atlético','Caldas Brandão','Sítios Vizinhos','Ronaldao FC','Trovão da Vila'];
const campaignState={stage:Number(localStorage.getItem('cv_campaign_stage')||0),opponent:null};
const survivalState={streak:0,record:Number(localStorage.getItem('cv_survival_record')||0)};
const challenges=[
  {id:'win2',icon:'⚡',name:'Vitória por 2',desc:'Vença a partida por pelo menos 2 gols.',boost:1},
  {id:'fourgoals',icon:'🔥',name:'Artilharia',desc:'Marque 4 ou mais gols na partida.',boost:2},
  {id:'clean',icon:'🧤',name:'Muralha',desc:'Vença sem sofrer gols.',boost:2},
  {id:'possession',icon:'📊',name:'Dono da bola',desc:'Vença com 55% ou mais de posse.',boost:3},
  {id:'fastgoal',icon:'⏱️',name:'Gol relâmpago',desc:'Vença marcando pelo menos 1 gol.',boost:4}
];
function randomOpponentName(){return randomItem(OPPONENT_NAMES);}
function campaignOpponentForStage(){
  const base=78+campaignState.stage*4;
  campaignState.opponent=randomOpponentName();
  return {name:campaignState.opponent,ovr:Math.min(100,base+Math.floor(Math.random()*4))};
}
function renderCampaign(){
  const progress=document.getElementById('campaignProgress');if(!progress)return;
  progress.innerHTML=CAMPAIGN_STAGES.map((s,i)=>`<div class="stage-node ${i<campaignState.stage?'done':''} ${i===campaignState.stage?'current':''}"><span>${i<campaignState.stage?'✓':i+1}</span><b>${s}</b></div>`).join('');
  const opp=campaignOpponentForStage();
  document.getElementById('campaignOpponent').textContent=opp.name;
  document.getElementById('campaignStageLabel').textContent=CAMPAIGN_STAGES[campaignState.stage]||'FINAL';
  document.getElementById('campaignForce').textContent=opp.ovr;
  document.getElementById('campaignDifficulty').textContent=`Força do adversário: ${opp.ovr} OVR · +${campaignState.stage*3} de dificuldade`;
}
function startCampaignStage(){
  if(campaignState.stage>3){campaignState.stage=0;localStorage.setItem('cv_campaign_stage','0');}
  const opp=campaignOpponentForStage();
  matchContext.type='campaign';matchContext.homeName='WESLLEY FC';matchContext.awayName=opp.name;matchContext.targetBoost=campaignState.stage*3;matchContext.customHome=null;matchContext.customAway=null;
  openDraftSetup('campaign');
}
function resetCampaign(){campaignState.stage=0;campaignState.opponent=null;localStorage.setItem('cv_campaign_stage','0');renderCampaign();}
function survivalRecord(){return Number(localStorage.getItem('cv_survival_record')||0);}
function renderSurvival(){const r=survivalRecord();document.getElementById('survivalRecord').textContent=r;document.getElementById('survivalStreak').textContent=survivalState.streak;document.getElementById('survivalDifficulty').textContent=`Próximo adversário: +${survivalState.streak*2} de dificuldade.`;}
function startSurvival(){
  if(survivalState.streak===0)survivalState.streak=0;
  matchContext.type='survival';matchContext.homeName='WESLLEY FC';matchContext.awayName=randomOpponentName();matchContext.targetBoost=Math.min(14,survivalState.streak*2);matchContext.customHome=null;matchContext.customAway=null;
  openDraftSetup('survival');
}
function challengeDone(id){
  return JSON.parse(localStorage.getItem('cv_challenges_done')||'[]').includes(id);
}
function renderChallenges(){
  const box=document.getElementById('challengeList');if(!box)return;
  box.innerHTML=challenges.map(c=>`<button class="challenge-card ${challengeDone(c.id)?'challenge-complete':''}" data-challenge="${c.id}">
    <span class="challenge-icon">${c.icon}</span><div><b>${c.name}</b><small>${c.desc}</small></div><strong>${challengeDone(c.id)?'✓ FEITO':'JOGAR'}</strong>
  </button>`).join('');
}
function startChallenge(id){
  const c=challenges.find(x=>x.id===id);if(!c)return;
  matchContext.type='challenge';matchContext.challengeId=id;matchContext.homeName='WESLLEY FC';matchContext.awayName=randomOpponentName();matchContext.targetBoost=c.boost;matchContext.customHome=null;matchContext.customAway=null;
  openDraftSetup('challenges');
}
// ===================== LIGA OFFLINE (pontos corridos) =====================
function loadLeague(){ try{return JSON.parse(localStorage.getItem('cv_league_state')||'null');}catch{return null;} }
function saveLeague(st){ localStorage.setItem('cv_league_state', JSON.stringify(st)); }
function leagueTeamName(st,id){ const t=st.teams.find(x=>x.id===id); return t?t.name:'???'; }
function generateRoundRobin(ids){
  // método do círculo: 1 time fica fixo, os outros giram a cada rodada
  const arr=ids.slice(1), fixed=ids[0], rounds=[];
  for(let r=0;r<ids.length-1;r++){
    const order=[fixed,...arr], round=[];
    for(let i=0;i<ids.length/2;i++){
      const home=order[i], away=order[ids.length-1-i];
      round.push({home, away, played:false, hs:null, as:null});
    }
    rounds.push(round);
    arr.push(arr.shift());
  }
  return rounds;
}
function leagueGoals(forca,rival){
  const diff=(forca-rival)/25;
  return Math.max(0, Math.min(6, Math.round((1+Math.random()*2+diff)*(0.4+Math.random()))));
}
function leagueApplyResult(st,fx,hs,as){
  fx.played=true; fx.hs=hs; fx.as=as;
  const th=st.table[fx.home], ta=st.table[fx.away];
  th.j++; ta.j++; th.gp+=hs; th.gc+=as; ta.gp+=as; ta.gc+=hs;
  if(hs>as){th.v++; th.pts+=3; ta.d++;}
  else if(hs<as){ta.v++; ta.pts+=3; th.d++;}
  else {th.e++; ta.e++; th.pts++; ta.pts++;}
}
function leagueSimAiFixture(st,fx){
  const home=st.teams.find(t=>t.id===fx.home), away=st.teams.find(t=>t.id===fx.away);
  leagueApplyResult(st, fx, leagueGoals(home.forca,away.forca), leagueGoals(away.forca,home.forca));
}
function leagueAutoSimRound(st,ri){
  const round=st.rounds[ri]; if(!round)return;
  round.forEach(fx=>{ if(!fx.played && fx.home!==0 && fx.away!==0) leagueSimAiFixture(st,fx); });
}
function leagueFindUserFixture(st){
  const round=st.rounds[st.currentRound]; if(!round)return null;
  return round.find(fx=>!fx.played && (fx.home===0||fx.away===0)) || null;
}
function leagueOrderedIds(st){
  return st.teams.map(t=>t.id).sort((a,b)=>{
    const ta=st.table[a], tb=st.table[b];
    if(tb.pts!==ta.pts) return tb.pts-ta.pts;
    if((tb.gp-tb.gc)!==(ta.gp-ta.gc)) return (tb.gp-tb.gc)-(ta.gp-ta.gc);
    return tb.gp-ta.gp;
  });
}
let leaguePendingTeams = 6;
function createLeague(){
  leaguePendingTeams=Number(document.querySelector('[data-league-teams].active')?.dataset.leagueTeams||6);
  resetDraft();
  openDraftSetup('league'); // usuário faz o draft do time UMA VEZ; o time vale pra temporada toda
}
function finalizeLeagueCreation(){
  const numTeams=leaguePendingTeams, deck=draftState.deck, format=draftState.format;
  const rivalNames=shuffle(OPPONENT_NAMES).slice(0,numTeams-1);
  const teams=[{id:0,name:perfilAtual?.nome||'WESLLEY FC',isUser:true,forca:84}];
  rivalNames.forEach((name,i)=>teams.push({id:i+1,name,isUser:false,forca:76+Math.floor(Math.random()*17)}));
  const table={}; teams.forEach(t=>table[t.id]={pts:0,j:0,v:0,e:0,d:0,gp:0,gc:0});
  const userSquad={starters:draftState.plan.starters.map(x=>x.player),reserves:draftState.plan.reserves.slice()};
  const st={active:true,finished:false,deck,format,teams,table,userSquad,rounds:generateRoundRobin(teams.map(t=>t.id)),currentRound:0,champion:null};
  leagueAutoSimRound(st,0);
  saveLeague(st);
  renderLeagueScreen(); showScreen('leagueScreen');
}
function resetLeague(){ localStorage.removeItem('cv_league_state'); renderLeagueScreen(); }
function leagueBuildOpponentSquad(st,opp){
  const deck=deckData[st.deck]||PLAYERS_NORMAL, need=st.format===5?5:11;
  const target=Math.max(0, avgOvr(st.userSquad.starters)-2+Math.round(Math.random()*5)+(opp.forca-84));
  const ranked=shuffle(deck).sort((a,b)=>Math.abs(a.ovr-target)-Math.abs(b.ovr-target));
  const chosen=[]; const ids=new Set();
  const keeper=ranked.find(p=>draftPosition(p).includes('GOL')); if(keeper){chosen.push(keeper);ids.add(keeper.id);}
  for(const p of ranked){if(chosen.length>=need)break;if(ids.has(p.id))continue;chosen.push(p);ids.add(p.id);}
  return {starters:chosen.slice(0,need),reserves:ranked.filter(p=>!ids.has(p.id)).slice(0,Math.max(3,need===5?3:5))};
}
function startLeagueFixture(fx,st){
  const oppId=fx.home===0?fx.away:fx.home, opp=st.teams.find(t=>t.id===oppId);
  matchContext.type='league'; matchContext.homeName=perfilAtual?.nome||'WESLLEY FC'; matchContext.awayName=opp.name;
  matchContext.targetBoost=0; matchContext.challengeId=null;
  matchContext.customHome={starters:st.userSquad.starters,reserves:st.userSquad.reserves};
  matchContext.customAway=leagueBuildOpponentSquad(st,opp);
  openMatchSimulation(); // time da liga já está pronto: vai direto pra partida, sem draft de novo
}
function leagueFinishMatch(result){
  const st=loadLeague(); if(!st)return;
  const fx=leagueFindUserFixture(st); if(!fx)return;
  const hs=matchState.score[0], as=matchState.score[1];
  if(fx.home===0) leagueApplyResult(st,fx,hs,as); else leagueApplyResult(st,fx,as,hs);
  st.currentRound++;
  if(st.currentRound>=st.rounds.length){
    st.finished=true; st.champion=leagueTeamName(st,leagueOrderedIds(st)[0]);
    if(st.champion===leagueTeamName(st,0)) localStorage.setItem('cv_titles',String(Number(localStorage.getItem('cv_titles')||0)+1));
  } else {
    leagueAutoSimRound(st,st.currentRound);
  }
  saveLeague(st);
}
function renderLeagueTable(st){
  const box=document.getElementById('leagueTable'); if(!box)return;
  const head='<div class="league-table-head"><span>#</span><span>TIME</span><span>J</span><span>V</span><span>E</span><span>D</span><span>SG</span><span>PTS</span></div>';
  const rows=leagueOrderedIds(st).map((id,i)=>{
    const t=st.table[id], team=st.teams.find(x=>x.id===id);
    return `<div class="league-row ${team.isUser?'is-user':''}"><span>${i+1}</span><span>${team.name}</span><span>${t.j}</span><span>${t.v}</span><span>${t.e}</span><span>${t.d}</span><span>${t.gp-t.gc}</span><span>${t.pts}</span></div>`;
  }).join('');
  box.innerHTML=head+rows;
}
function renderLeagueCalendar(st){
  const box=document.getElementById('leagueCalendar'); if(!box)return;
  box.innerHTML=st.rounds.map((round,ri)=>{
    const fixtures=round.map(fx=>{
      const isUser=fx.home===0||fx.away===0;
      const score=fx.played?`<span class="league-score">${fx.hs} × ${fx.as}</span>`:(ri===st.currentRound&&isUser&&!st.finished?`<button class="btn btn-primary league-play-btn" data-league-play="1" type="button">🃏 JOGAR</button>`:'<span class="league-score">— × —</span>');
      return `<div class="league-fixture ${isUser?'is-user':''}"><span>${leagueTeamName(st,fx.home)}</span>${score}<span>${leagueTeamName(st,fx.away)}</span></div>`;
    }).join('');
    return `<div class="league-round"><div class="league-round-title">RODADA ${ri+1}${ri===st.currentRound&&!st.finished?' • ATUAL':''}</div>${fixtures}</div>`;
  }).join('');
}
function renderLeagueScreen(){
  const st=loadLeague();
  const setupCard=document.getElementById('leagueSetupCard'), activeBox=document.getElementById('leagueActiveBox');
  if(!st || !st.active){ setupCard.classList.remove('hidden'); activeBox.classList.add('hidden'); return; }
  setupCard.classList.add('hidden'); activeBox.classList.remove('hidden');
  document.getElementById('leagueHeroSub').textContent = st.finished ? `🏆 CAMPEÃO: ${st.champion}` : `Rodada ${st.currentRound+1} de ${st.rounds.length}`;
  renderLeagueTable(st); renderLeagueCalendar(st);
}
document.querySelectorAll('[data-league-teams]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-league-teams]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
document.getElementById('startLeagueBtn')?.addEventListener('click',createLeague);
document.getElementById('resetLeagueBtn')?.addEventListener('click',()=>{if(confirm('Isso vai encerrar a temporada atual e começar uma liga nova. Continuar?'))resetLeague();});
document.getElementById('backFromLeague')?.addEventListener('click',()=>navigate('modos'));
document.getElementById('leagueCalendar')?.addEventListener('click',e=>{
  if(!e.target.closest('[data-league-play]'))return;
  const st=loadLeague(); if(!st)return; const fx=leagueFindUserFixture(st); if(!fx)return;
  startLeagueFixture(fx,st);
});


function teamForLocal(target,need){
  return {starters:makeGeneratedTeam(target,need),reserves:makeGeneratedTeam(target,Math.max(3,need===5?3:5))};
}
const localDraftState={p1:[],p2:[],names:['Jogador 1','Jogador 2'],turn:0,total:5,deck:'normal',cards:[],busy:false};
function localDraftPool(){return shuffle(deckData[localDraftState.deck]||PLAYERS_NORMAL);}
function localDraftCanAdd(arr,p){return !arr.some(x=>x.id===p.id);}
function localDraftMakeCards(){
  const pool=localDraftPool(); const picked=new Set([...localDraftState.p1,...localDraftState.p2].map(p=>p.id));
  localDraftState.cards=pool.filter(p=>!picked.has(p.id)).slice(0,3);
  const box=document.getElementById('localDraftCards');if(!box)return;
  box.innerHTML=localDraftState.cards.map(p=>`<button class="draft-player-card local-draft-card" style="--rarity:${p.cor}" data-rarity="${p.raridade||'COMUM'}" data-local-draft-id="${p.id}" type="button"><div class="draft-card-top"><span>${(p.posicao||'').replace('MEIA','MEI').replace('ATA','ATQ')}</span><strong>${p.ovr}</strong></div><div class="draft-card-rarity">${rarityIcon(p.raridade)} ${p.raridade||'COMUM'}</div><div class="draft-card-name">${p.nome}</div></button>`).join('');
}
function localDraftRender(){
  const n1=localDraftState.names[0],n2=localDraftState.names[1],total=localDraftState.total;
  document.getElementById('localDraftP1Label').textContent=n1;document.getElementById('localDraftP2Label').textContent=n2;
  document.getElementById('localRosterAName').textContent=n1;document.getElementById('localRosterBName').textContent=n2;
  document.getElementById('localDraftP1Count').textContent=`${localDraftState.p1.length}/${total}`;document.getElementById('localDraftP2Count').textContent=`${localDraftState.p2.length}/${total}`;
  const picker=localDraftState.turn%2===0?n1:n2;document.getElementById('localDraftPicker').textContent=picker;document.getElementById('localDraftTurnText').textContent=Math.floor(localDraftState.turn/2)+1;document.getElementById('localDraftRoundBadge').textContent=`T${localDraftState.turn+1}`;
  const avg=a=>a.length?Math.round(a.reduce((s,p)=>s+p.ovr,0)/a.length):0;document.getElementById('localRosterAOvr').textContent=`OVR ${avg(localDraftState.p1)||'—'}`;document.getElementById('localRosterBOvr').textContent=`OVR ${avg(localDraftState.p2)||'—'}`;
  document.getElementById('localRosterA').innerHTML=localDraftState.p1.map(p=>`<div class="roster-player"><span>${p.nome}</span><b>${p.ovr}</b></div>`).join('')||'<div class="panel-empty">Aguardando escolhas…</div>';
  document.getElementById('localRosterB').innerHTML=localDraftState.p2.map(p=>`<div class="roster-player"><span>${p.nome}</span><b>${p.ovr}</b></div>`).join('')||'<div class="panel-empty">Aguardando escolhas…</div>';
}
function startLocalDraft(){
  localDraftState.names=[(document.getElementById('localP1Name').value||'Jogador 1').trim().slice(0,18),(document.getElementById('localP2Name').value||'Jogador 2').trim().slice(0,18)];
  localDraftState.total=Number(document.querySelector('[data-local-format].active')?.dataset.localFormat||5);localDraftState.deck=document.querySelector('[data-local-deck].active')?.dataset.localDeck||'normal';localDraftState.p1=[];localDraftState.p2=[];localDraftState.turn=0;localDraftState.busy=false;
  document.getElementById('localDraftFormat').textContent=`${localDraftState.total}v${localDraftState.total} · ${localDraftState.deck==='professional'?'PROFISSIONAL':'NORMAL'}`;showScreen('localDraftScreen');localDraftRender();localDraftMakeCards();
}
function finishLocalDraft(){
  const target=84, need=localDraftState.total;
  const reservesA=makeGeneratedTeam(target,Math.max(3,need===5?3:5)), reservesB=makeGeneratedTeam(target,Math.max(3,need===5?3:5));
  matchContext.type='local2p';matchContext.homeName=localDraftState.names[0];matchContext.awayName=localDraftState.names[1];matchContext.targetBoost=0;
  matchContext.customHome={starters:localDraftState.p1,reserves:reservesA};matchContext.customAway={starters:localDraftState.p2,reserves:reservesB};openMatchSimulation();
}
function handleLocalDraftPick(id){
  if(localDraftState.busy)return;const p=localDraftState.cards.find(x=>x.id===id);if(!p)return;const arr=localDraftState.turn%2===0?localDraftState.p1:localDraftState.p2;if(!localDraftCanAdd(arr,p))return;
  localDraftState.busy=true;arr.push(p);localDraftState.turn++;localDraftRender();
  if(localDraftState.p1.length>=localDraftState.total&&localDraftState.p2.length>=localDraftState.total){setTimeout(finishLocalDraft,240);return;}
  setTimeout(()=>{localDraftState.busy=false;localDraftMakeCards();localDraftRender();},170);
}

function startLocal2P(){ startLocalDraft(); }
function challengeCheck(c,hs,as){
  if(c.id==='win2')return hs-as>=2;
  if(c.id==='fourgoals')return hs>=4;
  if(c.id==='clean')return hs>as&&as===0;
  if(c.id==='possession')return hs>as&&matchState.stats.home.posse>=55;
  if(c.id==='fastgoal')return hs>as&&hs>=1;
  return false;
}
function markChallenge(id){
  const done=JSON.parse(localStorage.getItem('cv_challenges_done')||'[]');if(!done.includes(id))done.push(id);localStorage.setItem('cv_challenges_done',JSON.stringify(done));
}
function handleSpecialMatchFinish(result){
  const hs=matchState.score[0],as=matchState.score[1];
  const btn=document.getElementById('continueAfterMatchBtn');
  if(matchContext.type==='campaign'){
    if(result==='VITÓRIA'){
      if(campaignState.stage===3){
        localStorage.setItem('cv_campaign_stage','4');localStorage.setItem('cv_titles',String(Number(localStorage.getItem('cv_titles')||0)+1));
        campaignState.stage=4;document.getElementById('finalWinnerNote').textContent='🏆 CAMPEÃO DA CAMPANHA!';
        btn.textContent='VOLTAR AO MENU';btn.dataset.special='campaign-champion';
      } else {
        campaignState.stage++;localStorage.setItem('cv_campaign_stage',String(campaignState.stage));
        btn.textContent='➡️ PRÓXIMA FASE';btn.dataset.special='campaign-next';
      }
    } else {btn.textContent='↩️ VOLTAR À CAMPANHA';btn.dataset.special='campaign-retry';}
  } else if(matchContext.type==='survival'){
    if(result==='VITÓRIA'){
      survivalState.streak++;if(survivalState.streak>survivalRecord()){localStorage.setItem('cv_survival_record',String(survivalState.streak));}
      btn.textContent='🔥 PRÓXIMA PARTIDA';btn.dataset.special='survival-next';
    } else {
      survivalState.streak=0;btn.textContent='🏠 ENCERRAR SEQUÊNCIA';btn.dataset.special='survival-end';
    }
  } else if(matchContext.type==='challenge'){
    const c=challenges.find(x=>x.id===matchContext.challengeId);
    if(c&&result==='VITÓRIA'&&challengeCheck(c,hs,as)){markChallenge(c.id);document.getElementById('finalWinnerNote').textContent='🎯 DESAFIO CONCLUÍDO!';}
    else if(c){document.getElementById('finalWinnerNote').textContent=result==='VITÓRIA'?'Quase! A condição do desafio não foi cumprida.':'Desafio não concluído.';}
    btn.textContent='🎯 VOLTAR AOS DESAFIOS';btn.dataset.special='challenges';
  } else if(matchContext.type==='league'){
    leagueFinishMatch(result);
    const st=loadLeague();
    document.getElementById('finalWinnerNote').textContent = st?.finished ? `🏆 FIM DA LIGA — CAMPEÃO: ${st.champion}` : '📅 Rodada registrada na tabela.';
    btn.textContent='📋 VOLTAR À LIGA';btn.dataset.special='league-back';
  } else if(matchContext.type==='local2p'){
    btn.textContent='🔁 REVANCHE';btn.dataset.special='local2p-revanche';
  } else if(matchContext.type==='online'){
    btn.textContent='🔁 ACEITAR REVANCHE';btn.dataset.special='online-revanche';
    document.getElementById('replayMatchBtn').textContent='🏠 VOLTAR AO INÍCIO';
  } else {
    btn.textContent='🔁 REVANCHE';btn.dataset.special='normal-revanche';
  }
  if(matchContext.type!=='online') document.getElementById('replayMatchBtn').textContent='🏠 VOLTAR AO INÍCIO';
}
function handleSpecialContinue(){
  const special=document.getElementById('continueAfterMatchBtn')?.dataset.special||'';
  if(special==='campaign-next'){renderCampaign();showScreen('campaignScreen');return;}
  if(special==='campaign-retry'){renderCampaign();showScreen('campaignScreen');return;}
  if(special==='campaign-champion'){renderCampaign();showScreen('campaignScreen');return;}
  if(special==='survival-next'){renderSurvival();showScreen('survivalScreen');return;}
  if(special==='survival-end'){renderSurvival();showScreen('survivalScreen');return;}
  if(special==='challenges'){renderChallenges();showScreen('challengesScreen');return;}
  if(special==='league-back'){renderLeagueScreen();showScreen('leagueScreen');return;}
  if(special==='local2p-revanche'){openMatchSimulation();return;}
  if(special==='online-revanche'){aceitarRevancheOnline();return;}
  if(special==='normal-revanche'){openMatchSimulation();return;}
  renderProfileHistory();showScreen('profileScreen');if(perfilAtual){document.getElementById('profileNome').textContent=perfilAtual.nome;document.getElementById('profileCidade').textContent=perfilAtual.cidade;renderProfileStats();}
}
const _finishMatchOriginal=finishMatch;
// Finish is already declared above; wrap its externally visible behavior by intercepting the result screen setup via a small post hook.
const _renderProfileStatsOriginal=renderProfileStats;
renderProfileStats=function(){
  _renderProfileStatsOriginal();
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('profileSurvivalRecord',survivalRecord());
  set('profileChallengesDone',JSON.parse(localStorage.getItem('cv_challenges_done')||'[]').length);
  set('profileCampaignTitles',Number(localStorage.getItem('cv_titles')||0));
};

document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>{
  const a=btn.dataset.action;
  if(a==='campaign'){renderCampaign();}
  if(a==='survival'){survivalState.streak=0;renderSurvival();}
  if(a==='challenges'){renderChallenges();}
  if(a==='league'){renderLeagueScreen();}
}));

document.getElementById('backFromCampaign')?.addEventListener('click',()=>navigate('modos'));
document.getElementById('startCampaignBtn')?.addEventListener('click',startCampaignStage);
document.getElementById('resetCampaignBtn')?.addEventListener('click',()=>{if(confirm('Recomeçar a campanha?'))resetCampaign();});
document.getElementById('backFromSurvival')?.addEventListener('click',()=>navigate('modos'));
document.getElementById('startSurvivalBtn')?.addEventListener('click',startSurvival);
document.getElementById('backFromChallenges')?.addEventListener('click',()=>navigate('modos'));
document.getElementById('challengeList')?.addEventListener('click',e=>{const b=e.target.closest('[data-challenge]');if(b)startChallenge(b.dataset.challenge);});
document.getElementById('backFromLocal2p')?.addEventListener('click',()=>navigate('modos'));
document.getElementById('startLocal2pBtn')?.addEventListener('click',startLocal2P);

document.getElementById('localDraftCards')?.addEventListener('click',e=>{const b=e.target.closest('[data-local-draft-id]');if(b)handleLocalDraftPick(b.dataset.localDraftId);});
document.getElementById('backFromLocalDraft')?.addEventListener('click',()=>navigate('local2p'));
document.getElementById('decisionChoices')?.addEventListener('click',e=>{const b=e.target.closest('[data-decision]');if(b)applyDecision(b.dataset.decision);});
document.querySelectorAll('[data-local-format]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-local-format]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
document.querySelectorAll('[data-local-deck]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-local-deck]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));

// ===================== MODO ONLINE — Salas por código =====================
const onlineState = {
  active: false,   // true durante todo o fluxo online (draft, plano, espera, partida)
  codigo: null,
  papel: null,      // 'anfitriao' | 'convidado'
  formato: 5,
  baralho: 'normal',
  pollTimer: null
};

function pararPollingOnline(){ if(onlineState.pollTimer){clearInterval(onlineState.pollTimer);onlineState.pollTimer=null;} }
function resetOnlineState(){ pararPollingOnline(); onlineState.active=false; onlineState.codigo=null; onlineState.papel=null; }
function meuJogadorOnline(){ return { chave: perfilAtual?.chave||null, nome: perfilAtual?.nome||'Jogador', avatar: perfilAtual?.avatar||'😀', ownerUid: auth.currentUser?.uid||null }; }

// ---------- Lobby: abas Criar / Entrar ----------
const onlineTabCriar=document.getElementById('onlineTabCriar'), onlineTabEntrar=document.getElementById('onlineTabEntrar');
const onlineCreatePane=document.getElementById('onlineCreatePane'), onlineJoinPane=document.getElementById('onlineJoinPane');
onlineTabCriar?.addEventListener('click',()=>{onlineTabCriar.classList.add('active');onlineTabEntrar.classList.remove('active');onlineCreatePane.classList.remove('hidden');onlineJoinPane.classList.add('hidden');});
onlineTabEntrar?.addEventListener('click',()=>{onlineTabEntrar.classList.add('active');onlineTabCriar.classList.remove('active');onlineJoinPane.classList.remove('hidden');onlineCreatePane.classList.add('hidden');});
document.querySelectorAll('[data-online-deck]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-online-deck]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
document.querySelectorAll('[data-online-format]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-online-format]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));

document.getElementById('backFromOnline')?.addEventListener('click',()=>navigate('modos'));
document.getElementById('backFromOnlineRoom')?.addEventListener('click',()=>{
  if(!confirm('Sair da sala online?'))return;
  const codigo=onlineState.codigo, eraAnfitriao=onlineState.papel==='anfitriao';
  if(codigo){marcarSaidaSala(codigo,onlineState.papel).catch(()=>{});}
  resetOnlineState();
  if(codigo && eraAnfitriao && !document.getElementById('onlineResultBlock')?.classList.contains('hidden')) { /* resultado fica salvo até os dois saírem */ }
  navigate('online');
});
// ---------- Blocos da tela de status da sala ----------
function showOnlineRoomBlock(id){
  ['onlineCodeBlock','onlineWaitingBlock','onlineResultBlock'].forEach(x=>document.getElementById(x)?.classList.toggle('hidden',x!==id));
  const erro=document.getElementById('onlineRoomErro'); if(erro) erro.textContent='';
}

// ---------- Criar sala ----------
document.getElementById('criarSalaBtn')?.addEventListener('click', async ()=>{
  const erro=document.getElementById('onlineCreateErro'); erro.textContent='';
  if(!perfilAtual?.chave){ erro.textContent='Faça login pra jogar online.'; return; }
  const baralho=document.querySelector('[data-online-deck].active')?.dataset.onlineDeck||'normal';
  const formato=Number(document.querySelector('[data-online-format].active')?.dataset.onlineFormat||5);
  const btn=document.getElementById('criarSalaBtn'); btn.disabled=true;
  try{
    const sala=await criarSala({anfitriao:meuJogadorOnline(),formato,baralho});
    onlineState.active=true; onlineState.codigo=sala.codigo; onlineState.papel='anfitriao'; onlineState.formato=formato; onlineState.baralho=baralho;
    await registrarPresencaSala(sala.codigo,'anfitriao');
    showScreen('onlineRoomScreen');
    showOnlineRoomBlock('onlineCodeBlock');
    document.getElementById('onlineCodeDisplay').textContent=sala.codigo;
    document.getElementById('onlineWaitingText').textContent='Aguardando adversário entrar…';
    iniciarPollingEspera();
  }catch(err){ erro.textContent=err.message||'Não foi possível criar a sala.'; }
  finally{ btn.disabled=false; }
});

// ---------- Copiar código ----------
document.getElementById('copyCodeBtn')?.addEventListener('click', async ()=>{
  const codigo=onlineState.codigo; if(!codigo) return;
  const btn=document.getElementById('copyCodeBtn');
  try{ await navigator.clipboard.writeText(codigo); }
  catch{
    const temp=document.createElement('textarea'); temp.value=codigo; temp.style.position='fixed'; temp.style.opacity='0';
    document.body.appendChild(temp); temp.select();
    try{document.execCommand('copy');}catch{}
    document.body.removeChild(temp);
  }
  const original=btn.textContent; btn.textContent='✅ CÓDIGO COPIADO!';
  setTimeout(()=>{btn.textContent=original;},1800);
});

// ---------- Cancelar sala (antes de alguém entrar) ----------
document.getElementById('cancelSalaBtn')?.addEventListener('click', async ()=>{
  if(!confirm('Cancelar essa sala?'))return;
  const codigo=onlineState.codigo;
  resetOnlineState();
  if(codigo) cancelarSala(codigo).catch(()=>{});
  navigate('online');
});

// ---------- Entrar em sala ----------
document.getElementById('entrarSalaBtn')?.addEventListener('click', async ()=>{
  const erro=document.getElementById('onlineJoinErro'); erro.textContent='';
  if(!perfilAtual?.chave){ erro.textContent='Faça login pra jogar online.'; return; }
  const codigo=(document.getElementById('onlineCodeInput').value||'').trim().toUpperCase();
  if(!codigo){ erro.textContent='Digite o código da sala.'; return; }
  const btn=document.getElementById('entrarSalaBtn'); btn.disabled=true;
  try{
    const sala=await entrarSala(codigo,meuJogadorOnline());
    onlineState.active=true; onlineState.codigo=sala.codigo; onlineState.papel='convidado'; onlineState.formato=Number(sala.formato)||5; onlineState.baralho=sala.baralho||'normal';
    await registrarPresencaSala(sala.codigo,'convidado');
    document.getElementById('onlineCodeInput').value='';
    startOnlineDraft();
  }catch(err){ erro.textContent=err.message||'Não foi possível entrar na sala.'; }
  finally{ btn.disabled=false; }
});

// ---------- Anfitrião: esperar o convidado entrar ----------
function iniciarPollingEspera(){
  pararPollingOnline();
  onlineState.pollTimer=setInterval(async ()=>{
    try{
      const sala=await buscarSala(onlineState.codigo);
      if(!sala){ pararPollingOnline(); return; }
      if(sala.convidado){ pararPollingOnline(); startOnlineDraft(); }
    }catch{}
  },2500);
}

// ---------- Começar o draft online (anfitrião ou convidado) ----------
function startOnlineDraft(){
  onlineResultRecorded=false;
  resetDraft();
  matchContext.type='online'; matchContext.homeName='WESLLEY FC'; matchContext.awayName='ADVERSÁRIO'; matchContext.targetBoost=0; matchContext.customHome=null; matchContext.customAway=null; matchContext.challengeId=null;
  draftReturnAction='online';
  draftState.deck=onlineState.baralho; draftState.format=onlineState.formato; draftState.total=draftState.format===5?8:15;
  document.getElementById('draftFormatLabel').textContent=`${draftState.format}v${draftState.format} · ${draftState.deck==='normal'?'NORMAL':'PROFISSIONAL'} · 🌐 ONLINE`;
  showScreen('draftGameScreen'); renderDraftRosters(); updateDraftHud(); draftMakeCards();
  document.getElementById('draftRuleNote').textContent='Monte seu time. Esse é só o seu draft — a partida de verdade será contra seu adversário online.';
}

// ---------- Enviar elenco pronto pra sala ----------
async function submitOnlineSquad(){
  if(!onlineState.active){ openMatchSimulation(); return; }
  const squad={ ownerUid:auth.currentUser?.uid||null, nome: perfilAtual?.nome||'Jogador', starters: draftState.plan.starters.map(x=>x.player), reserves: draftState.plan.reserves.slice(), formation: draftState.plan.formation };
  showScreen('onlineRoomScreen');
  showOnlineRoomBlock('onlineWaitingBlock');
  document.getElementById('onlineWaitingCode').textContent=onlineState.codigo||'';
  document.getElementById('onlineWaitingTitle').textContent='Time enviado!';
  document.getElementById('onlineWaitingSub').textContent='Aguardando o adversário terminar o time dele…';
  try{
    const campo=onlineState.papel==='anfitriao'?'squadAnfitriao':'squadConvidado';
    await enviarSquadSala(onlineState.codigo,campo,squad);
    iniciarPollingSquad();
  }catch{
    document.getElementById('onlineRoomErro').textContent='Não foi possível enviar seu time. Tente de novo.';
  }
}

// ---------- Esperar o elenco do adversário / o fim da partida ----------
function iniciarPollingSquad(){
  pararPollingOnline();
  onlineState.pollTimer=setInterval(async ()=>{
    try{
      const sala=await buscarSala(onlineState.codigo);
      if(!sala){ pararPollingOnline(); document.getElementById('onlineRoomErro').textContent='A sala foi encerrada.'; return; }
      if(onlineState.papel==='anfitriao'){
        if(sala.squadAnfitriao && sala.squadConvidado){ pararPollingOnline(); iniciarPartidaOnline(sala); }
      } else if(sala.status==='finalizada' && sala.resultado){
        pararPollingOnline(); mostrarResultadoOnlineConvidado(sala);
      }
    }catch{}
  },2500);
}

// ---------- Anfitrião: começar a partida de verdade contra o elenco do adversário ----------
function iniciarPartidaOnline(sala){
  onlineResultRecorded=false;
  matchContext.type='online';
  matchContext.homeName=perfilAtual?.nome||sala.anfitriao?.nome||'VOCÊ';
  matchContext.awayName=sala.convidado?.nome||sala.squadConvidado?.nome||'ADVERSÁRIO';
  matchContext.targetBoost=0;
  matchContext.customHome={starters:sala.squadAnfitriao.starters,reserves:sala.squadAnfitriao.reserves||[]};
  matchContext.customAway={starters:sala.squadConvidado.starters,reserves:sala.squadConvidado.reserves||[]};
  openMatchSimulation();
}

// ---------- Resultado online + revanche sincronizada ----------
let onlineResultRecorded=false;
function onlineMeuCampo(){return onlineState.papel==='anfitriao'?'anfitriao':'convidado';}
function renderOnlineResultState(sala){
  const r=sala.resultado||{};
  const meuResultado = r.resultadoAnfitriao==='VITÓRIA'?'DERROTA':r.resultadoAnfitriao==='DERROTA'?'VITÓRIA':'EMPATE';
  const rev=sala.revanche||{};
  const pres=sala.presenca||{};
  const campo=onlineMeuCampo();
  const outro=campo==='anfitriao'?'convidado':'anfitriao';
  const aceite=!!rev[campo], outroAceitou=!!rev[outro], outroPresente=pres[outro]!==false;
  const teams=document.getElementById('onlineResultScoreTeams');
  if(teams)teams.textContent=`${r.awayName||'Você'} × ${r.homeName||'Adversário'}`;
  const score=document.getElementById('onlineResultScore');
  if(score)score.textContent=`${r.placarFora??0} × ${r.placarCasa??0}`;
  const note=document.getElementById('onlineResultNote');
  if(note){
    if(!outroPresente) note.textContent='O adversário saiu. A sala continua aberta, mas a revanche não pode começar.';
    else if(aceite&&outroAceitou) note.textContent='🔄 Os dois aceitaram! Preparando a revanche…';
    else if(aceite) note.textContent='⏳ Você aceitou a revanche. Aguardando o adversário aceitar também…';
    else if(outroAceitou) note.textContent='⚡ O adversário quer revanche. Aceite para começar uma nova partida.';
    else note.textContent=meuResultado==='VITÓRIA'?'🏆 Você venceu essa partida online!':meuResultado==='DERROTA'?'Você perdeu essa. Bora tentar de novo!':'⚖️ Empate na partida online.';
  }
  const rem=document.getElementById('onlineResultRematchBtn');
  if(rem){rem.disabled=!outroPresente||aceite;rem.textContent=aceite?'✅ REVANCHE ACEITA':'🔁 ACEITAR REVANCHE';}
}
async function mostrarResultadoOnlineConvidado(sala){
  showScreen('onlineRoomScreen');
  showOnlineRoomBlock('onlineResultBlock');
  if(perfilAtual?.chave && !onlineResultRecorded){
    const r=sala.resultado||{};
    const meuResultado=r.resultadoAnfitriao==='VITÓRIA'?'DERROTA':r.resultadoAnfitriao==='DERROTA'?'VITÓRIA':'EMPATE';
    onlineResultRecorded=true;
    registrarPartidaOnline(perfilAtual.chave,meuResultado).then(async()=>{const p=await buscarPerfil(perfilAtual.chave);if(p)perfilAtual={chave:perfilAtual.chave,...p};}).catch(()=>{});
  }
  renderOnlineResultState(sala);
  iniciarPollingResultadoOnline();
}
async function aceitarRevancheOnline(){
  if(!onlineState.active||!onlineState.codigo)return;
  try{
    await decidirRevancheSala(onlineState.codigo,onlineState.papel,true);
    showScreen('onlineRoomScreen');showOnlineRoomBlock('onlineWaitingBlock');
    document.getElementById('onlineWaitingCode').textContent=onlineState.codigo;
    document.getElementById('onlineWaitingTitle').textContent='Revanche solicitada!';
    document.getElementById('onlineWaitingSub').textContent='Aguardando o adversário aceitar também…';
    iniciarPollingResultadoOnline();
  }catch(e){document.getElementById('onlineRoomErro').textContent='Não foi possível registrar a revanche. Tente novamente.';}
}
async function iniciarPollingResultadoOnline(){
  pararPollingOnline();
  onlineState.pollTimer=setInterval(async()=>{
    try{
      const sala=await buscarSala(onlineState.codigo); if(!sala){resetOnlineState();return;}
      const pres=sala.presenca||{};
      if(sala.status==='finalizada' && sala.revanche?.anfitriao && sala.revanche?.convidado && onlineState.papel==='anfitriao'){
        await prepararRevancheSala(onlineState.codigo);
        return;
      }
      if(sala.status==='draft' && sala.revanche?.anfitriao===false && sala.revanche?.convidado===false && !sala.squadAnfitriao && !sala.squadConvidado){
        pararPollingOnline();
        startOnlineDraft();
        return;
      }
      if(sala.status==='finalizada'&&sala.resultado){
        if(document.getElementById('matchResultScreen')?.classList.contains('active') && onlineState.papel==='anfitriao'){
          // mantém a tela final do anfitrião; apenas atualiza a decisão da revanche em segundo plano.
          const rev=sala.revanche||{};const outro=onlineState.papel==='anfitriao'?'convidado':'anfitriao';
          const btn=document.getElementById('continueAfterMatchBtn');
          if(btn){btn.disabled=pres[outro]===false||!!rev.anfitriao;btn.textContent=rev.anfitriao?'✅ REVANCHE ACEITA':'🔁 ACEITAR REVANCHE';}
        } else if(onlineState.papel==='convidado') mostrarResultadoOnlineConvidado(sala);
      }
    }catch{}
  },1800);
}
async function sairDaSalaOnline(){
  const codigo=onlineState.codigo,papel=onlineState.papel;
  if(!codigo)return navigate('online');
  try{await marcarSaidaSala(codigo,papel);}catch{}
  resetOnlineState();
  navigate('home');
}

document.getElementById('onlineResultRematchBtn')?.addEventListener('click',aceitarRevancheOnline);
document.getElementById('onlineResultHomeBtn')?.addEventListener('click',sairDaSalaOnline);


// ===================== TORNEIO ONLINE — BRACKET 4 JOGADORES =====================
const tournamentState={active:false,codigo:null,papel:null,slot:null,formato:5,baralho:'normal',pollTimer:null,matchKey:null,draftPhase:null};
function pararPollingTorneio(){if(tournamentState.pollTimer){clearInterval(tournamentState.pollTimer);tournamentState.pollTimer=null;}}
function resetTournamentState(){pararPollingTorneio();Object.assign(tournamentState,{active:false,codigo:null,papel:null,slot:null,formato:5,baralho:'normal',matchKey:null,draftPhase:null});}
function meuJogadorTorneio(){return {chave:perfilAtual?.chave||null,nome:perfilAtual?.nome||'Jogador',avatar:perfilAtual?.avatar||'😀',ownerUid:auth.currentUser?.uid||null};}
function tourPlayers(t){return Object.entries(t.jogadores||{}).filter(([,j])=>j).sort((a,b)=>a[0].localeCompare(b[0]));}
function tourMatchForSlot(t){const f=t.fases?.[t.fase];if(!f)return null;for(const k of ['partida1','partida2'])if(f[k]?.players?.includes(tournamentState.slot))return k;return null;}
function tourShowRoom(title,status){document.getElementById('tournamentLobby')?.classList.add('hidden');document.getElementById('tournamentResult')?.classList.add('hidden');document.getElementById('tournamentRoom')?.classList.remove('hidden');document.getElementById('tournamentCodeDisplay').textContent=tournamentState.codigo||'';document.getElementById('tournamentRoomTitle').textContent=title;document.getElementById('tournamentRoomStatus').textContent=status;}
function tourRenderPlayers(t){const ps=tourPlayers(t);document.getElementById('tournamentRoomPlayers').innerHTML=ps.map(([slot,j])=>`<b>${slot.replace('slot','Jogador ')}:</b> ${j.nome}`).join('<br>');document.getElementById('tournamentRoomStatus').textContent=`${ps.length}/4 jogadores · ${t.fase==='semifinais'?'SEMIFINAIS':t.fase==='finais'?'FINAIS':'ENCERRADO'}`;}
function tourStartDraft(t){
  tournamentState.formato=Number(t.formato)||5;tournamentState.baralho=t.baralho||'normal';
  const match=tourMatchForSlot(t);tournamentState.matchKey=match;
  if(!match)return;
  resetDraft();draftReturnAction='tournament';draftState.deck=tournamentState.baralho;draftState.format=tournamentState.formato;draftState.total=draftState.format===5?8:15;
  matchContext.type='tournament';matchContext.homeName=meuJogadorTorneio().nome;matchContext.awayName='Adversário';matchContext.customHome=null;matchContext.customAway=null;matchContext.challengeId=null;
  document.getElementById('draftFormatLabel').textContent=`${draftState.format}v${draftState.format} · ${draftState.baralho==='normal'?'NORMAL':'PROFISSIONAL'} · 🏆 TORNEIO`;
  showScreen('draftGameScreen');renderDraftRosters();updateDraftHud();draftMakeCards();document.getElementById('draftRuleNote').textContent=`🏆 ${t.fase==='semifinais'?'SEMIFINAL':'FINAL / 3º LUGAR'} · Você está na ${match==='partida1'?'Partida 1':'Partida 2'}. Faça seu draft e depois ajuste o plano.`;
}
async function submitTournamentDraft(){
  const t=await buscarTorneio(tournamentState.codigo);if(!t)return;
  const squad={ownerUid:meuJogadorTorneio().ownerUid,nome:meuJogadorTorneio().nome,starters:draftState.plan.starters.map(x=>x.player),reserves:draftState.plan.reserves.slice(),formation:draftState.plan.formation};
  await enviarDraftTorneio(tournamentState.codigo,t.fase,tournamentState.matchKey,tournamentState.slot,squad);
  tourShowRoom('Time enviado!','Aguardando os dois jogadores da sua partida terminarem o draft…');tourRenderPlayers(t);iniciarPollingTorneio();
}
function iniciarPollingTorneio(){pararPollingTorneio();tournamentState.pollTimer=setInterval(async()=>{try{const t=await buscarTorneio(tournamentState.codigo);if(!t){resetTournamentState();return;}tourRenderPlayers(t);if(t.status==='finalizado'){mostrarResultadoTorneio(t);return;}if(tournamentState.papel==='anfitriao'&&!t.fases&&(t.status==='draft_semifinais'||Object.keys(t.jogadores||{}).length===4)){await atualizarTorneio(t.codigo,{status:'draft_semifinais',fases:{semifinais:{partida1:{players:['slot0','slot1'],squads:{}},partida2:{players:['slot2','slot3'],squads:{}}}}});return;}if((t.status==='draft_semifinais'||t.fase==='finais') && tournamentState.draftPhase!==t.fase){tournamentState.draftPhase=t.fase;tourStartDraft(t);return;}const f=t.fases?.[t.fase],m=tourMatchForSlot(t);if(!f||!m)return;
    if(f[m]?.resultado){
      // aguarda a outra partida e depois todos recebem nova chave
      if(f.partida1?.resultado&&f.partida2?.resultado){if(t.fase==='semifinais'){if(tournamentState.papel==='anfitriao')await prepararFinaisTorneio(t);}else if(t.fase==='finais'){if(tournamentState.papel==='anfitriao')await concluirTorneio(t);}}
      else tourShowRoom('Partida encerrada!','Aguardando o resultado da outra partida…');
    } else if(f[m]?.squads?.[tournamentState.slot] && f[m]?.squads?.[f[m].players.find(x=>x!==tournamentState.slot)]){
      if(tournamentState.papel==='anfitriao' && !f[m].status) iniciarPartidaTorneioHost(t,m);
    }
  }catch(e){}},1800);}
function iniciarPartidaTorneioHost(t,m){const f=t.fases[t.fase], players=f[m].players;const a=f[m].squads[players[0]],b=f[m].squads[players[1]];f[m].status='em_andamento';atualizarTorneio(t.codigo,{[`fases/${t.fase}/${m}/status`]:'em_andamento'}).catch(()=>{});matchContext.type='tournament';matchContext.tournament={fase:t.fase,partida:m,players,squads:{[players[0]]:a,[players[1]]:b}};matchContext.homeName=a.nome;matchContext.awayName=b.nome;matchContext.customHome={starters:a.starters,reserves:a.reserves||[]};matchContext.customAway={starters:b.starters,reserves:b.reserves||[]};openMatchSimulation();}
async function concluirPartidaTorneio(hs,as,result){
  const tm=matchContext.tournament;if(!tm)return;
  let winner=hs>as?tm.players[0]:hs<as?tm.players[1]:tm.players[Math.random()<.5?0:1];let loser=winner===tm.players[0]?tm.players[1]:tm.players[0];
  await salvarResultadoTorneio(tournamentState.codigo,tm.fase,tm.partida,{placar:[hs,as],winner,loser,home:tm.squads[tm.players[0]].nome,away:tm.squads[tm.players[1]].nome});
  showScreen('tournamentScreen');tourShowRoom('Partida encerrada!',`Placar ${hs} × ${as}. Aguardando a outra partida…`);iniciarPollingTorneio();
}
async function prepararFinaisTorneio(t){
  const f=t.fases.semifinais,w1=f.partida1.resultado.winner,l1=f.partida1.resultado.loser,w2=f.partida2.resultado.winner,l2=f.partida2.resultado.loser;
  await atualizarTorneio(t.codigo,{fase:'finais','fases/finais':{partida1:{players:[w1,w2],squads:{}},partida2:{players:[l1,l2],squads:{}}}});
}
async function concluirTorneio(t){const f=t.fases.finais,w=f.partida1.resultado.winner,third=f.partida2.resultado.winner;await finalizarTorneio(t.codigo,{campeao:w,terceiro:third,final:f.partida1.resultado,terceiroLugar:f.partida2.resultado});}
function mostrarResultadoTorneio(t){pararPollingTorneio();showScreen('tournamentScreen');document.getElementById('tournamentLobby')?.classList.add('hidden');document.getElementById('tournamentRoom')?.classList.add('hidden');document.getElementById('tournamentResult')?.classList.remove('hidden');const r=t.resultado||{};const champ=t.jogadores?.[r.campeao]?.nome||'Campeão';const third=t.jogadores?.[r.terceiro]?.nome||'3º lugar';document.getElementById('tournamentChampion').textContent=`🏆 CAMPEÃO: ${champ}`;document.getElementById('tournamentResultText').textContent=`3º lugar: ${third}. O torneio não foi salvo no ranking.`;}
async function sairTorneio(){const c=tournamentState.codigo,host=tournamentState.papel==='anfitriao';resetTournamentState();if(host&&c)atualizarTorneio(c,{status:'cancelado'}).catch(()=>{});navigate('tournament');}

document.getElementById('backFromTournament')?.addEventListener('click',()=>{resetTournamentState();navigate('modos');});
document.getElementById('tournamentTabCreate')?.addEventListener('click',()=>{document.getElementById('tournamentTabCreate').classList.add('active');document.getElementById('tournamentTabJoin').classList.remove('active');document.getElementById('tournamentCreatePane').classList.remove('hidden');document.getElementById('tournamentJoinPane').classList.add('hidden');});
document.getElementById('tournamentTabJoin')?.addEventListener('click',()=>{document.getElementById('tournamentTabJoin').classList.add('active');document.getElementById('tournamentTabCreate').classList.remove('active');document.getElementById('tournamentJoinPane').classList.remove('hidden');document.getElementById('tournamentCreatePane').classList.add('hidden');});
document.querySelectorAll('[data-tour-deck]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tour-deck]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
document.querySelectorAll('[data-tour-format]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tour-format]').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
document.getElementById('criarTorneioBtn')?.addEventListener('click',async()=>{const e=document.getElementById('tournamentCreateError');e.textContent='';if(!perfilAtual?.chave){e.textContent='Faça login para jogar online.';return;}try{const t=await criarTorneio({anfitriao:meuJogadorTorneio(),formato:Number(document.querySelector('[data-tour-format].active')?.dataset.tourFormat||5),baralho:document.querySelector('[data-tour-deck].active')?.dataset.tourDeck||'normal'});tournamentState.active=true;tournamentState.codigo=t.codigo;tournamentState.papel='anfitriao';tournamentState.slot='slot0';tourShowRoom('Aguardando os outros 3 jogadores…','1/4 jogadores');document.getElementById('tournamentCancelBtn').classList.remove('hidden');iniciarPollingTorneio();}catch(err){e.textContent=err.message||'Erro ao criar torneio.';}});
document.getElementById('entrarTorneioBtn')?.addEventListener('click',async()=>{const e=document.getElementById('tournamentJoinError');e.textContent='';if(!perfilAtual?.chave){e.textContent='Faça login para jogar online.';return;}try{const c=document.getElementById('tournamentCodeInput').value.trim().toUpperCase();const t=await entrarTorneio(c,meuJogadorTorneio());const slot=Object.entries(t.jogadores).find(([k,v])=>v?.chave===perfilAtual.chave)?.[0];tournamentState.active=true;tournamentState.codigo=c;tournamentState.papel='convidado';tournamentState.slot=slot;tournamentState.formato=Number(t.formato)||5;tournamentState.baralho=t.baralho||'normal';tourShowRoom('Entrou no torneio!','Aguardando o quarto jogador…');tourRenderPlayers(t);iniciarPollingTorneio();}catch(err){e.textContent=err.message||'Erro ao entrar.';}});
document.getElementById('tournamentCancelBtn')?.addEventListener('click',()=>{if(confirm('Cancelar o torneio?'))sairTorneio();});
document.getElementById('tournamentHomeBtn')?.addEventListener('click',()=>{resetTournamentState();navigate('home');});
