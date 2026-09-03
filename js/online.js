// ===================== Modo Online — Salas por código =====================
import { db, ref, get, set, update, onDisconnect } from './firebase-config.js';

// Sem O/0/I/1 pra não confundir na hora de digitar o código.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarCodigoSala() {
  let codigo = '';
  for (let i = 0; i < 5; i++) codigo += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return codigo;
}

// Cria uma sala nova com um código livre e retorna { codigo, ...dadosDaSala }
async function criarSala({ anfitriao, formato, baralho }) {
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const codigo = gerarCodigoSala();
    const salaRef = ref(db, `salasOnline/${codigo}`);
    const existente = await get(salaRef);
    if (existente.exists()) continue;
    const sala = { anfitriao:{...anfitriao,ownerUid:anfitriao.ownerUid}, ownerUid:anfitriao.ownerUid, formato, baralho, status: 'aguardando', presenca:{anfitriao:true,convidado:false}, revanche:{anfitriao:false,convidado:false}, criadoEm: Date.now() };
    await set(salaRef, sala);
    return { codigo, ...sala };
  }
  throw new Error('Não foi possível criar a sala agora. Tente de novo.');
}

// Busca o estado atual de uma sala pelo código (ou null se não existir)
async function buscarSala(codigo) {
  const codigoLimpo = (codigo || '').trim().toUpperCase();
  if (!codigoLimpo) return null;
  const snap = await get(ref(db, `salasOnline/${codigoLimpo}`));
  if (!snap.exists()) return null;
  return { codigo: codigoLimpo, ...snap.val() };
}

// Entra numa sala existente como convidado
async function entrarSala(codigo, convidado) {
  const codigoLimpo = (codigo || '').trim().toUpperCase();
  if (!codigoLimpo) throw new Error('Digite o código da sala.');
  const salaRef = ref(db, `salasOnline/${codigoLimpo}`);
  const snap = await get(salaRef);
  if (!snap.exists()) throw new Error('Sala não encontrada. Confira o código.');
  const sala = snap.val();
  if (sala.status !== 'aguardando') throw new Error('Essa sala já está em uso.');
  if (sala.anfitriao?.chave && sala.anfitriao.chave === convidado.chave) throw new Error('Você é o anfitrião dessa sala — abra ela no outro aparelho.');
  await update(ref(db, `salasOnline/${codigoLimpo}`), { convidado });
  await update(ref(db, `salasOnline/${codigoLimpo}/status`), 'draft');
  return { codigo: codigoLimpo, ...sala, convidado, status: 'draft' };
}

// Envia o elenco pronto (titulares + reservas) pro campo do anfitrião ou do convidado
async function enviarSquadSala(codigo, campo, squad) {
  await update(ref(db, `salasOnline/${codigo}`), { [campo]: squad });
}

// Salva o resultado final da partida na sala (o anfitrião chama isso quando termina de jogar)
async function salvarResultadoSala(codigo, resultado) {
  await update(ref(db, `salasOnline/${codigo}`), { resultado, status: 'finalizada' });
}

// Cancela/apaga uma sala (usado pelo anfitrião antes de alguém entrar)
async function cancelarSala(codigo) {
  await set(ref(db, `salasOnline/${codigo}`), null);
}

// Presença/decisão da revanche ficam separadas por jogador. Assim a sala
// continua viva até os dois saírem e nenhum jogador consegue decidir pelo outro.
async function registrarPresencaSala(codigo, papel) {
  const campo = papel === 'anfitriao' ? 'anfitriao' : 'convidado';
  await update(ref(db, `salasOnline/${codigo}/presenca`), { [campo]: true });
  await onDisconnect(ref(db, `salasOnline/${codigo}/presenca/${campo}`)).set(false);
}

async function decidirRevancheSala(codigo, papel, aceitou) {
  const campo = papel === 'anfitriao' ? 'anfitriao' : 'convidado';
  await update(ref(db, `salasOnline/${codigo}/revanche`), { [campo]: !!aceitou });
}

async function prepararRevancheSala(codigo) {
  await update(ref(db, `salasOnline/${codigo}`), {
    status: 'draft',
    resultado: null,
    squadAnfitriao: null,
    squadConvidado: null,
    revanche: { anfitriao: false, convidado: false }
  });
}

async function marcarSaidaSala(codigo, papel) {
  const campo = papel === 'anfitriao' ? 'anfitriao' : 'convidado';
  await update(ref(db, `salasOnline/${codigo}/presenca`), { [campo]: false });
}

export { criarSala, buscarSala, entrarSala, enviarSquadSala, salvarResultadoSala, cancelarSala, registrarPresencaSala, decidirRevancheSala, prepararRevancheSala, marcarSaidaSala };

// ===================== Torneio Online — 4 jogadores =====================
async function criarTorneio({anfitriao, formato, baralho}) {
  for (let tentativa=0; tentativa<8; tentativa++) {
    const codigo=gerarCodigoSala();
    const r=ref(db,`torneiosOnline/${codigo}`);
    const snap=await get(r);
    if(snap.exists()) continue;
    const jogadores={slot0:anfitriao};
    const torneio={anfitriao,ownerUid:anfitriao.ownerUid,formato,baralho,status:'aguardando',fase:'semifinais',jogadores,criadoEm:Date.now()};
    await set(r,torneio);
    return {codigo,...torneio};
  }
  throw new Error('Não foi possível criar o torneio agora.');
}

async function buscarTorneio(codigo){
  const c=(codigo||'').trim().toUpperCase(); if(!c)return null;
  const s=await get(ref(db,`torneiosOnline/${c}`));
  return s.exists()?{codigo:c,...s.val()}:null;
}

async function entrarTorneio(codigo,jogador){
  const c=(codigo||'').trim().toUpperCase(); if(!c)throw new Error('Digite o código do torneio.');
  const r=ref(db,`torneiosOnline/${c}`); const s=await get(r);
  if(!s.exists())throw new Error('Torneio não encontrado.');
  const t=s.val(); if(t.status!=='aguardando')throw new Error('Esse torneio já começou.');
  const jogadoresAtuais=t.jogadores||{};
  if(Object.values(jogadoresAtuais).some(j=>j?.chave===jogador.chave))throw new Error('Você já está nesse torneio.');
  const slot=['slot0','slot1','slot2','slot3'].find(x=>!jogadoresAtuais[x]);
  if(!slot)throw new Error('O torneio já está cheio.');
  // Grava só o slot novo (não o objeto "jogadores" inteiro): reescrever slots que já
  // existem (ex.: slot0 do anfitrião) seria negado pelas regras de segurança, que exigem
  // "!data.exists()" para cada slot. Por isso o convidado nunca pode sobrescrever tudo.
  await update(ref(db,`torneiosOnline/${c}/jogadores/${slot}`),jogador);
  const jogadores={...jogadoresAtuais,[slot]:jogador};
  return {codigo:c,...t,jogadores};
}

async function atualizarTorneio(codigo,dados){await update(ref(db,`torneiosOnline/${codigo}`),dados);}
async function enviarDraftTorneio(codigo,fase,partida,slot,squad){
  await update(ref(db,`torneiosOnline/${codigo}/fases/${fase}/${partida}/squads`),{[slot]:squad});
}
async function salvarResultadoTorneio(codigo,fase,partida,resultado){
  await update(ref(db,`torneiosOnline/${codigo}/fases/${fase}/${partida}`),{resultado,status:'finalizada'});
}
async function finalizarTorneio(codigo,resultado){await update(ref(db,`torneiosOnline/${codigo}`),{status:'finalizado',resultado});}

export { criarTorneio, buscarTorneio, entrarTorneio, atualizarTorneio, enviarDraftTorneio, salvarResultadoTorneio, finalizarTorneio };
