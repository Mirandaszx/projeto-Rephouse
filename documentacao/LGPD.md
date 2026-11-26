# Adequação à LGPD (26/11/2026)

O RepHouse trata dados pessoais de moradores (nome, e-mail, foto opcional, vínculo com a república, despesas, pagamentos, comprovantes, tarefas e notificações). Esta página registra o que foi implementado para atender a Lei nº 13.709/2018 e o que depende da equipe.

## O que foi implementado

| Requisito | Artigo | Implementação | Verificação |
|---|---|---|---|
| Transparência: política de privacidade e termos de uso | arts. 6º, VI; 9º; 33 | Página pública `/privacidade` em linguagem simples: dados, finalidades e bases legais, quem vê, operadores (hospedagem, envio de e-mail, Google), transferência internacional, cookies, retenção, direitos, segurança e termos. Aviso dos termos no cadastro e link no login e em Meu perfil. | `interface/testes-pr2/privacidade.spec.ts` |
| Contato para titulares | art. 41 | `GET /api/privacidade` devolve o contato lido de `PRIVACY_CONTACT_EMAIL` (ou `EMAIL_FROM`). O e-mail não fica fixo no código publicado. | `testes/request-privacidade.test.ts` |
| Acesso e portabilidade | art. 18, II e V | `GET /api/me/dados` gera um JSON (`rephouse-meus-dados.json`) com conta, repúblicas, partes nas despesas, pagamentos, despesas criadas, tarefas e notificações. Os campos são escolhidos um a um: senhas, hashes, tokens e conteúdo de arquivos nunca entram, nem dados de outros moradores. Botão **Baixar meus dados** em Meu perfil. | testes HTTP e de navegador |
| Eliminação | arts. 16 e 18, VI | A exclusão da conta anonimiza na mesma transação: nome vira "Ex-morador", e-mail vira um endereço inválido único, a senha é apagada e foto, vínculo com o Google, links de e-mail, desafios, e-mail verificado e notificações da pessoa são apagados. Avisos de entrada e saída com o nome dela passam a "Ex-morador". O histórico financeiro e de tarefas da república permanece, sem identificar a pessoa (legítimo interesse dos demais moradores). O e-mail fica livre para uma conta nova. | `testes/request-privacidade.test.ts`, `google.test.ts`, `request-email.test.ts`, `request-notificacoes-gerais.test.ts` |
| Minimização e retenção | arts. 6º, III; 15; 16 | Limpeza automática a cada 6 horas (e na partida da API): links de e-mail, desafios do Google e limites de envio vencidos há mais de um dia são apagados. | `testes/request-privacidade.test.ts` |
| Menor privilégio no banco | art. 46 | A conta técnica da API continua sem `DELETE` nas tabelas de identidade, links e notificações. A anonimização e a limpeza ficam em duas funções `SECURITY DEFINER` (migração `202611260002_lgpd_anonimizacao_limpeza`) com `search_path` fixo, e a de anonimização recusa contas que não estejam excluídas. | `testes/permissoes-db.test.ts` (API com permissões limitadas) |

Controles que já existiam e entram na mesma conta: senhas com Argon2id, sessão de uma hora com revogação, isolamento por república, logs sem senha, token ou conteúdo de arquivo, cookies apenas essenciais (sem publicidade ou análise) e testes de segurança na CI.

## Bases legais usadas na política

- **Execução do serviço** (art. 7º, V): conta, república, divisão de contas, tarefas, avisos e e-mails de acesso.
- **Legítimo interesse** (art. 7º, IX): segurança (limites de tentativas, registros técnicos) e manutenção do histórico financeiro compartilhado da república.
- **Consentimento** (art. 7º, I): foto de perfil, removível a qualquer momento.

## O que depende da equipe

1. **Responsável pelos dados:** a política cita "a equipe do projeto RepHouse". Se a disciplina exigir, incluir nomes ou a instituição.
2. **Contato de privacidade:** hoje é o remetente do Brevo. Para trocar, definir `PRIVACY_CONTACT_EMAIL` no ambiente. A política promete resposta em até 15 dias.
3. **Brevo:** desligar o rastreamento de aberturas e de cliques nos e-mails transacionais (os links de acesso não devem passar por redirecionamento de rastreio).
4. **Registros de hospedagem:** conferir no Render por quanto tempo os logs ficam guardados e ajustar a seção "Por quanto tempo", se necessário.
5. **Incidentes:** se houver vazamento com risco aos titulares, comunicar os afetados e a ANPD (art. 48).
