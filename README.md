# CAJÁ vs VILA — versão de lançamento

Jogo de futebol baseado em draft, com modos locais, campanha, sobrevivência, desafios, contas, perfil, ranking, partidas online e torneio online para 4 jogadores.

## Recursos liberados
- Contas e sessão
- Perfil com avatar e estatísticas
- Ranking geral e ranking online
- Histórico de partidas online
- Modo Online 1v1 por código
- Torneio Online para 4 jogadores
- Semifinais: 1×2 e 3×4
- Final: vencedor×vencedor
- Disputa de 3º lugar: perdedor×perdedor
- Draft em todas as partidas do torneio
- Torneio não contabiliza no ranking
- PWA para instalação no celular

## Backend
O backend de comunicação usa Firebase Realtime Database.

Antes do lançamento público, siga `ANTES_DO_LANCAMENTO_FIREBASE.md`.

Arquivos importantes:
- `js/firebase-config.js` — configuração do projeto Firebase
- `js/auth.js` — contas, perfil e ranking
- `js/online.js` — salas e torneios
- `js/app.js` — lógica do jogo
- `firebase.database.rules.json` — regras iniciais de segurança
- `firebase.database.indexes.json` — índices recomendados

## Atenção
A configuração atual de contas usa um sistema próprio de nome/senha legado. Para um lançamento público de verdade, migre autenticação e gravação de resultados para Firebase Authentication + backend confiável antes de considerar o ranking competitivo como seguro.
