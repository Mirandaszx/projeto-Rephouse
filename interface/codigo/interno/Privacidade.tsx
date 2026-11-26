import { useEffect, useState } from 'react'
import { request } from '../api'
import { WorkspaceBrand } from './WorkspaceUI'
import AppearanceControl from '../aparencia/AppearanceControl'
import './workspace.css'
import './privacidade.css'

/**
 * Política de Privacidade e Termos de Uso (LGPD, 26/11/2026). O contato vem da API (PRIVACY_CONTACT_EMAIL ou
 * EMAIL_FROM), para o e-mail da equipe não ficar fixo no código publicado no GitHub.
 */
export default function Privacidade() {
  const [contato, setContato] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    const controller = new AbortController()
    request<{ contato: string | null }>('/privacidade', undefined, undefined, undefined, controller.signal)
      .then(data => setContato(data.contato)).catch(() => { if (!controller.signal.aborted) setContato(null) })
    return () => controller.abort()
  }, [])
  const signedIn = Boolean(sessionStorage.getItem('rephouse-token'))
  const email = contato
    ? <a href={`mailto:${contato}?subject=${encodeURIComponent('Privacidade no RepHouse')}`}>{contato}</a>
    : contato === null ? <strong>pelo e-mail da equipe informado na apresentação do projeto</strong> : <span>carregando…</span>

  return <main className="republica rep-internal workspace-privacy">
    <header><WorkspaceBrand href="/" /><AppearanceControl compact /></header>
    <article aria-labelledby="privacy-title">
      <p className="workspace-privacy-meta">Versão de 26 de novembro de 2026</p>
      <h1 id="privacy-title">Privacidade e termos de uso</h1>
      <p className="workspace-privacy-lead">O RepHouse ajuda moradores de repúblicas a dividir contas e tarefas. Para isso, guarda alguns dados seus. Esta página explica quais, para quê, quem vê e como você controla tudo, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD).</p>

      <nav aria-label="Nesta página"><ul>
        <li><a href="#quem">Quem cuida dos seus dados</a></li><li><a href="#dados">Quais dados guardamos</a></li>
        <li><a href="#finalidade">Para que usamos</a></li><li><a href="#quem-ve">Quem vê</a></li>
        <li><a href="#compartilhamento">Serviços que usamos</a></li><li><a href="#cookies">Cookies e armazenamento</a></li>
        <li><a href="#tempo">Por quanto tempo</a></li><li><a href="#direitos">Seus direitos</a></li>
        <li><a href="#seguranca">Segurança</a></li><li><a href="#termos">Termos de uso</a></li>
      </ul></nav>

      <section id="quem"><h2>Quem cuida dos seus dados</h2>
        <p>O RepHouse é um projeto acadêmico desenvolvido por estudantes. A equipe do projeto RepHouse é a responsável pelos seus dados (a "controladora", na LGPD). Para qualquer pedido ou dúvida sobre privacidade, fale com a equipe: {email}.</p>
      </section>

      <section id="dados"><h2>Quais dados guardamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome, e-mail e senha. A senha nunca é guardada como texto: guardamos só uma versão embaralhada (hash Argon2id), que não permite descobri-la.</li>
          <li><strong>Entrar com o Google (se você escolher):</strong> o identificador da sua conta Google e a confirmação de que o e-mail é seu. Não recebemos sua senha do Google.</li>
          <li><strong>Foto de perfil (opcional):</strong> a imagem que você enviar, recortada por você.</li>
          <li><strong>República:</strong> a casa em que você mora, quando entrou e se ainda mora lá.</li>
          <li><strong>Contas da casa:</strong> despesas, sua parte em cada uma, pagamentos e os comprovantes que você enviar.</li>
          <li><strong>Tarefas e avisos:</strong> tarefas da casa e as notificações que você recebe.</li>
          <li><strong>Registros técnicos:</strong> data, endereço acessado e resultado de cada pedido ao sistema, sem senha nem código de acesso, para segurança e para corrigir erros. O endereço IP é usado só no momento, para limitar tentativas repetidas.</li>
        </ul>
        <p>Não pedimos documentos, endereço, telefone nem dados sensíveis (como saúde, religião ou origem).</p>
      </section>

      <section id="finalidade"><h2>Para que usamos e com qual base legal</h2>
        <ul>
          <li><strong>Para o RepHouse funcionar</strong> (conta, república, divisão de contas, tarefas, avisos e e-mails de acesso): execução do serviço que você pediu ao criar a conta (LGPD, art. 7º, V).</li>
          <li><strong>Para proteger a sua conta e a de todos</strong> (limite de tentativas, registros técnicos) e <strong>para manter o histórico financeiro da casa</strong> que os outros moradores dividem com você: legítimo interesse (art. 7º, IX), sempre no mínimo necessário.</li>
          <li><strong>Foto de perfil:</strong> seu consentimento (art. 7º, I). Você pode removê-la quando quiser, em Meu perfil.</li>
        </ul>
        <p>Não vendemos seus dados, não mostramos anúncios e não usamos seus dados para nenhuma outra finalidade.</p>
      </section>

      <section id="quem-ve"><h2>Quem vê seus dados</h2>
        <ul>
          <li><strong>Moradores da sua república:</strong> seu nome, sua foto, sua parte nas despesas, seus pagamentos e as tarefas da casa. Seu e-mail não aparece para eles.</li>
          <li><strong>Administrador da república:</strong> o mesmo que os moradores, e pode desativar seu vínculo com a casa.</li>
          <li><strong>Equipe do RepHouse:</strong> só o necessário para suporte e para bloquear contas que descumpram estes termos.</li>
        </ul>
      </section>

      <section id="compartilhamento"><h2>Serviços que usamos</h2>
        <p>Para funcionar, o RepHouse usa empresas que tratam dados em nosso nome e seguindo nossas instruções (os "operadores", na LGPD):</p>
        <ul>
          <li><strong>Hospedagem e banco de dados</strong> (Render): onde o sistema e os dados ficam guardados.</li>
          <li><strong>Envio de e-mails</strong> (Brevo): para mandar os links de acesso. Recebe seu e-mail e o conteúdo da mensagem.</li>
          <li><strong>Google</strong>, apenas se você escolher entrar com o Google.</li>
        </ul>
        <p>Esses serviços podem guardar dados fora do Brasil. Usamos apenas provedores que se comprometem com garantias de proteção compatíveis com a LGPD (art. 33).</p>
      </section>

      <section id="cookies"><h2>Cookies e armazenamento no navegador</h2>
        <p>Usamos só o essencial para o login funcionar com segurança: um cookie que confirma que o link de acesso foi aberto no mesmo navegador do pedido (vale até 24 horas) e outro para entrar com o Google (vale alguns minutos). Sua sessão fica guardada só nesta aba e some quando você a fecha. Preferências como tema claro ou escuro e o Modo simples ficam no seu navegador. Não usamos cookies de publicidade nem de análise.</p>
      </section>

      <section id="tempo"><h2>Por quanto tempo guardamos</h2>
        <ul>
          <li><strong>Enquanto sua conta existir</strong>, guardamos os dados acima.</li>
          <li><strong>Quando você exclui a conta</strong>, na mesma hora seu nome vira "Ex-morador" e seu e-mail, sua senha, sua foto, o vínculo com o Google e suas notificações são apagados. As despesas e tarefas da casa continuam, porque os outros moradores dependem delas, mas sem identificar você. Seu e-mail fica livre para uma nova conta.</li>
          <li><strong>Links e códigos de acesso</strong> são apagados automaticamente até um dia depois de vencerem.</li>
          <li><strong>Registros técnicos</strong> ficam apenas pelo tempo definido pelo serviço de hospedagem, para segurança e diagnóstico.</li>
        </ul>
      </section>

      <section id="direitos"><h2>Seus direitos e como exercê-los</h2>
        <p>A LGPD (art. 18) garante a você, a qualquer momento:</p>
        <ul>
          <li><strong>Saber e acessar</strong> quais dados temos, e <strong>levar seus dados</strong> para outro serviço: em Meu perfil, use <strong>Baixar meus dados</strong>.</li>
          <li><strong>Corrigir</strong> dados: em Meu perfil, você muda seu nome e sua foto.</li>
          <li><strong>Excluir</strong> sua conta e seus dados pessoais: em Meu perfil, <strong>Excluir minha conta</strong>.</li>
          <li><strong>Retirar o consentimento</strong> da foto, removendo-a, e saber com quem compartilhamos dados, nesta página.</li>
          <li>Pedir qualquer outra coisa sobre seus dados pelo contato da equipe ({email}). Respondemos em até 15 dias.</li>
          <li>Reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer">gov.br/anpd</a>.</li>
        </ul>
      </section>

      <section id="seguranca"><h2>Como protegemos</h2>
        <p>Conexão criptografada (HTTPS), senhas embaralhadas com Argon2id, sessão que expira em uma hora, cada pessoa só enxerga a própria república, o sistema acessa o banco com o mínimo de permissões e há testes automáticos de segurança a cada mudança. Se acontecer um incidente que traga risco a você, avisaremos você e a ANPD (art. 48).</p>
      </section>

      <section id="termos"><h2>Termos de uso</h2>
        <ul>
          <li>O RepHouse serve para organizar contas e tarefas de uma moradia compartilhada. É destinado a pessoas a partir de 18 anos.</li>
          <li>Você é responsável pelo que cadastra: valores, comprovantes, tarefas e nomes. Cadastre só o que os moradores da casa podem ver.</li>
          <li>Não use o RepHouse para enganar outras pessoas, para fins ilegais ou para tentar acessar dados de outras repúblicas. Contas que fizerem isso podem ser bloqueadas.</li>
          <li>O RepHouse é um projeto acadêmico, oferecido gratuitamente e sem garantia de funcionamento contínuo. Ele organiza as contas, mas não faz cobranças nem pagamentos.</li>
          <li>Podemos atualizar esta página. A data no topo mostra a versão em vigor; mudanças importantes serão avisadas no próprio RepHouse.</li>
          <li>Estes termos seguem a lei brasileira.</li>
        </ul>
      </section>

      <p className="workspace-privacy-back"><a className="workspace-return" href={signedIn ? '/republica' : '/'}>{signedIn ? 'Voltar à república' : 'Voltar ao início'}</a></p>
    </article>
  </main>
}
