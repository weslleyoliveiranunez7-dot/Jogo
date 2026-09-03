# Antes do lançamento — Firebase

## 1. Ativar Authentication
No Firebase Console:
- Authentication → Sign-in method
- Ative **Anonymous** para a camada técnica de sessão do jogo.
- Para contas reais, o ideal é migrar login/senha próprio para **Email/Password** ou outro provedor. Não publique o campo de senha atual em produção.

## 2. Ativar Realtime Database
- Build → Realtime Database → Create database.
- Escolha a região mais próxima do público.
- Importe `firebase.database.rules.json` nas Rules.
- Configure os índices de `firebase.database.indexes.json`.

## 3. NÃO usar regras públicas em produção
Nunca publique:
```json
{ "rules": { ".read": true, ".write": true } }
```
Isso permite que qualquer pessoa apague ranking, altere perfis e resultados.

## 4. Ponto importante para o ranking
O ranking atual é alimentado pelo cliente. Para lançamento público, o resultado de uma partida não deve ser considerado confiável só porque veio do navegador.

**Recomendação antes de abrir para o público:** colocar a gravação definitiva de resultado em Cloud Functions/Cloud Run, validando a sala, os dois jogadores e o resultado antes de atualizar `usuarios/*` e `historicoOnline/*`.

## 5. Servidor / comunicação
O app usa Firebase Realtime Database como backend das salas:
- `salasOnline/*` → partidas online
- `torneiosOnline/*` → torneios de 4 jogadores
- `usuarios/*` → perfis e estatísticas
- `historicoOnline/*` → histórico público de partidas
- `codigosEvento/*` → contagem dos códigos de evento

## 6. Teste obrigatório antes de publicar
Use quatro contas diferentes e quatro aparelhos/abas:
1. Jogador 1 cria torneio.
2. Jogadores 2, 3 e 4 entram pelo código.
3. Verifique se as duas semifinais aparecem corretamente.
4. Faça os dois drafts.
5. Termine as duas partidas.
6. Verifique final e disputa de 3º lugar.
7. Faça os dois drafts novamente.
8. Termine final e 3º lugar.
9. Confirme que o torneio **não altera o ranking**.
10. Teste queda de conexão e reentrada.
11. Teste duas salas/tournaments simultâneos.
12. Teste criação de conta, login, avatar, perfil e ranking.

## 7. Publicação
Depois dos testes:
- GitHub Pages / hospedagem HTTPS.
- Cadastre o domínio autorizado no Firebase Authentication.
- Verifique CORS/domínio autorizado, se aplicável.
- Publique regras e índices.
- Faça backup/export do Realtime Database.
- Só então divulgue o link.
