// ===================== Contas, sessão e ranking =====================
import { db, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, get, set, update, query, orderByChild, limitToLast, increment } from './firebase-config.js';
const SESSION_KEY='cvvSessao';
// Evita a corrida entre "app abriu" e "Firebase terminou de restaurar o login":
// só resolve quando o Firebase confirmar (uma vez) o estado real de autenticação.
let _authProntoResolve; const _authPronto = new Promise(res => { _authProntoResolve = res; });
onAuthStateChanged(auth, () => { if (_authProntoResolve) { _authProntoResolve(); _authProntoResolve = null; } });
function aguardarAuthPronto(){ return _authPronto; }
const CODIGOS_VALIDOS=['AND','ALE','PLZ','JCR','MTH'];
function chaveNome(nome){return nome.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');}
function emailInterno(chave){return `${chave}@login.cajavila.app`;}
function getSessao(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function salvarSessao(chave){localStorage.setItem(SESSION_KEY,JSON.stringify({chave}))}
function limparSessao(){localStorage.removeItem(SESSION_KEY); signOut(auth).catch(()=>{});}
async function buscarPerfil(chave){const s=await get(ref(db,`usuarios/${chave}`));return s.exists()?{chave,...s.val()}:null;}
async function registrarLoginCodigo(codigo){if(!codigo||!CODIGOS_VALIDOS.includes(codigo)||!auth.currentUser)return;await update(ref(db,`codigosEvento/${codigo}`),{logins:increment(1)});}
async function criarConta(nome,senha,cidade,codigo){
 const chave=chaveNome(nome); if(!chave)throw new Error('Digite um nome válido.'); if(senha.length<6)throw new Error('A senha precisa ter pelo menos 6 caracteres.');
 const idx=ref(db,`nomes/${chave}`), old=await get(idx); if(old.exists())throw new Error('Esse nome já está em uso.');
 const codigoLimpo=(codigo||'').trim().toUpperCase(), codigoValido=CODIGOS_VALIDOS.includes(codigoLimpo)?codigoLimpo:null;
 let cred;
 try{
   cred=await createUserWithEmailAndPassword(auth,emailInterno(chave),senha);
 }catch(err){
   if(err.code==='auth/email-already-in-use'){
     // O nome estava livre em "nomes/*" mas o login já existe no Firebase Auth — sobrou de uma
     // tentativa anterior que falhou no meio do caminho (ex.: toque duplo no botão). Se a senha
     // digitada agora bater com a da conta órfã, é a mesma pessoa: recupera e completa o cadastro.
     try{ cred=await signInWithEmailAndPassword(auth,emailInterno(chave),senha); }
     catch{ throw new Error('Esse nome já está em uso.'); }
   } else throw err;
 }
 const perfil={nome:nome.trim(),cidade:cidade||'',avatar:'😀',vitorias:0,derrotas:0,vitoriasOnline:0,derrotasOnline:0,criadoEm:Date.now(),ownerUid:cred.user.uid}; if(codigoValido)perfil.codigo=codigoValido;
 await set(ref(db,`usuarios/${chave}`),perfil); await set(idx,{ownerUid:cred.user.uid}); salvarSessao(chave); if(codigoValido)await registrarLoginCodigo(codigoValido); return {chave,...perfil};
}
async function entrar(nome,senha){const chave=chaveNome(nome);const n=await get(ref(db,`nomes/${chave}`));if(!n.exists())throw new Error('Nome ou senha incorretos.');await signInWithEmailAndPassword(auth,emailInterno(chave),senha);const p=await buscarPerfil(chave);if(!p)throw new Error('Perfil não encontrado.');salvarSessao(chave);if(p.codigo)await registrarLoginCodigo(p.codigo);return p;}
async function atualizarAvatar(chave,avatar){if(auth.currentUser)await update(ref(db,`usuarios/${chave}`),{avatar});}
async function registrarPartida(chave,r){const p=await buscarPerfil(chave);if(!p)return;await update(ref(db,`usuarios/${chave}`),{vitorias:Number(p.vitorias||0)+(r==='VITÓRIA'?1:0),derrotas:Number(p.derrotas||0)+(r==='DERROTA'?1:0)});}
async function registrarPartidaOnline(chave,r){const p=await buscarPerfil(chave);if(!p)return;await update(ref(db,`usuarios/${chave}`),{vitoriasOnline:Number(p.vitoriasOnline||0)+(r==='VITÓRIA'?1:0),derrotasOnline:Number(p.derrotasOnline||0)+(r==='DERROTA'?1:0)});}
async function registrarHistoricoOnline(dados){if(!auth.currentUser)return;const id=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;await set(ref(db,`historicoOnline/${id}`),{...dados,data:Date.now(),ownerUid:auth.currentUser.uid});}
async function buscarRanking(){const q=query(ref(db,'usuarios'),orderByChild('vitorias'),limitToLast(5));const s=await get(q);const a=[];s.forEach(c=>a.push(c.val()));return a.sort((x,y)=>(y.vitorias||0)-(x.vitorias||0));}
async function buscarRankingOnline(){const q=query(ref(db,'usuarios'),orderByChild('vitoriasOnline'),limitToLast(5));const s=await get(q);const a=[];s.forEach(c=>a.push(c.val()));return a.sort((x,y)=>(y.vitoriasOnline||0)-(x.vitoriasOnline||0));}
async function buscarHistoricoOnline(){const q=query(ref(db,'historicoOnline'),orderByChild('data'),limitToLast(5));const s=await get(q);const a=[];s.forEach(c=>a.push(c.val()));return a.sort((x,y)=>y.data-x.data);}
async function buscarRankingCodigos(){const s=await get(ref(db,'codigosEvento'));const d=s.exists()?s.val():{};return CODIGOS_VALIDOS.map(c=>({codigo:c,logins:Number(d[c]?.logins||0)})).sort((a,b)=>b.logins-a.logins);}
export {auth,getSessao,salvarSessao,limparSessao,buscarPerfil,criarConta,entrar,atualizarAvatar,registrarPartida,registrarPartidaOnline,registrarHistoricoOnline,buscarRanking,buscarRankingOnline,buscarHistoricoOnline,buscarRankingCodigos,CODIGOS_VALIDOS,aguardarAuthPronto};
