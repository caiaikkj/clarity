import type { Lang } from './translations'

export interface GuideSection {
  title: string
  items: string[]
}

export interface GuideContent {
  title: string
  subtitle: string
  sections: GuideSection[]
  footer: string
}

export const GUIDE: Record<Lang, GuideContent> = {
  'pt-BR': {
    title: 'Guia rápido',
    subtitle: 'Tudo o que o Clarity faz e como usar, em poucos minutos.',
    sections: [
      {
        title: 'Primeiros passos',
        items: [
          'Toque em Adicionar medicamento. Comece a digitar o nome (ex.: Glifage, Novalgina, Puran T4) e escolha uma sugestão: dosagem, princípio ativo e regra de administração são preenchidos na hora, sem internet.',
          'Você também pode colar uma receita ou fotografar a caixa (a foto precisa de uma chave do Gemini em Ajustes).',
          'Defina os horários, o estoque e o ponto de reposição e salve. O medicamento aparece na linha do tempo de Hoje.',
        ],
      },
      {
        title: 'Hoje',
        items: [
          'A linha do tempo é dividida em Manhã, Tarde, Noite e Se necessário. Toque em Marcar como tomado para registrar uma dose; use Desfazer se errar.',
          'Reagendamento inteligente: se você tomar um item atrasado e outra dose de hoje precisa de intervalo de absorção (ex.: magnésio e levotiroxina), o horário dele é adiado automaticamente e um selo explica o motivo. Toque em Restaurar horário para voltar ao original.',
          'Para remédios Se necessário, use Registrar dose só quando tomar.',
          'Os cartões mostram doses de hoje, sequência de dias, aderência e a próxima dose. Um aviso aparece quando o estoque está acabando.',
          'A barra de anotação rápida no topo é o seu "brain dump": toque no microfone para ditar (quando o navegador suporta) ou escreva algo como "Tomei magnésio às 22h, dormi bem" ou "dor de cabeça depois do café". O Clarity identifica medicamentos, sintomas e hábitos, e marca a dose como tomada quando você diz que tomou.',
        ],
      },
      {
        title: 'Armário',
        items: [
          'Lista todos os itens ativos com estoque, dias restantes, preço e notas ligadas.',
          'Bula abre a bula digital: para que serve, como tomar, efeitos colaterais e contraindicações em cartões. O resumo é gerado pelo Gemini no seu idioma (precisa da chave), fica salvo no aparelho e funciona offline. Use Atualizar para gerar de novo e os links para a bula oficial da ANVISA e do Consulta Remédios.',
          'Repor / Preços registra compras (atualiza o estoque), guarda o histórico de preços, mostra o princípio ativo para pedir o genérico e abre a busca de farmácias próximas.',
          'A lixeira remove o item. Suplementos podem não estar no openFDA, e tudo bem.',
        ],
      },
      {
        title: 'Insights',
        items: [
          'No topo, Posso misturar? checa um remédio, alimento ou bebida avulsa contra o seu esquema. Depois, Padrões Detectados compara adesão e sintomas; o verificador analisa cada par de itens ativos. Com a chave do Gemini, o Resumo Inteligente gera observações dos últimos 14 dias.',
        ],
      },
      {
        title: 'Relatório',
        items: [
          'Resumo limpo para a consulta: esquema atual, aderência de 7 e 30 dias, estoques baixos, interações sinalizadas e padrões de sintomas.',
          'Copie como texto ou imprima. Os padrões mostram coocorrência, não causa.',
        ],
      },
      {
        title: 'Ajustes e idioma',
        items: [
          'O seletor PT | EN troca a interface e o idioma das respostas da IA. A escolha fica salva.',
          'Em Ajustes, cole sua chave do Google AI Studio e use Testar chave. Sem chave, o app continua funcionando com marcação local.',
          'Entrar / Nuvem é opcional: com email e senha ou link mágico, o Clarity sincroniza medicamentos, doses e notas na sua conta Supabase. Sem login, tudo continua só no aparelho.',
          'Você pode apagar todos os seus dados em Ajustes a qualquer momento.',
        ],
      },
      {
        title: 'Offline e instalação',
        items: [
          'Depois do primeiro acesso, o Clarity abre sem internet e seus dados continuam disponíveis. Um aviso "Offline" aparece quando a conexão cai.',
          'Para instalar: no iPhone, Compartilhar > Adicionar à Tela de Início; no Android/Chrome, menu > Instalar app.',
        ],
      },
      {
        title: 'Privacidade',
        items: [
          'Sem login, seus dados e sua chave ficam apenas neste navegador (localStorage). Com a nuvem ligada, medicamentos, doses e notas também são salvos na sua conta Supabase; a chave do Gemini permanece só no navegador.',
          'Textos e fotos só são enviados ao Gemini quando você usa esses recursos. O Clarity organiza sua rotina e não substitui orientação médica.',
        ],
      },
    ],
    footer: 'Dica: no Armário, abra Detalhes da bula depois de adicionar a chave para traduzir as bulas em inglês.',
  },
  'en-US': {
    title: 'Quick guide',
    subtitle: 'What Clarity does and how to use it, in a few minutes.',
    sections: [
      {
        title: 'Getting started',
        items: [
          'Tap Add medication. Start typing a name (e.g. Glifage, Novalgina, Puran T4) and pick a suggestion: strength, active ingredient and administration rule fill in instantly, offline.',
          'You can also paste a prescription or photograph the box (photo scanning needs a Gemini key in Settings).',
          'Set the dose times, stock and refill threshold, then save. The medication shows up on the Today timeline.',
        ],
      },
      {
        title: 'Today',
        items: [
          'The timeline is split into Morning, Afternoon, Night and As needed. Tap Mark Taken to log a dose; use Undo if you tapped by mistake.',
          'Smart rescheduling: if you take an item late and another dose today needs an absorption gap (e.g. magnesium and levothyroxine), its time is pushed back automatically and a badge explains why. Tap Restore time to go back to the original.',
          'For As needed items, tap Log dose only when you actually take one.',
          'The cards show doses today, your streak, adherence and the next dose. A banner appears when stock is running low.',
          'The quick note bar at the top is your brain dump: tap the microphone to dictate (when your browser supports it) or write things like "Took magnesium at 10pm, slept great" or "headache after coffee". Clarity detects medications, symptoms and habits, and marks the dose as taken when you say you took it.',
        ],
      },
      {
        title: 'Cabinet',
        items: [
          'Lists every active item with stock, days of supply, price and linked notes.',
          'Label opens the digital package insert: what it is for, how to take it, side effects and contraindications as scannable cards. Gemini writes the summary in your language (needs a key), it is saved on your device and works offline. Use Regenerate to refresh it, and the links to the official ANVISA and Consulta Remédios leaflets.',
          'Refill / Prices logs purchases (updates stock), keeps a price history, shows the active ingredient so you can ask for the generic, and opens a nearby pharmacy search.',
          'The trash icon removes an item. Supplements may not be in openFDA, and that is fine.',
        ],
      },
      {
        title: 'Insights',
        items: [
          'At the top, Can I mix this? checks a one-off medication, food or drink against your regimen. Then Detected Patterns compares adherence and symptoms, and the interaction checker reviews every active pair. With a Gemini key, AI Deep Dive writes observations from the last 14 days.',
        ],
      },
      {
        title: 'Briefing',
        items: [
          'A clean summary for your appointment: current regimen, 7 and 30-day adherence, low stock, flagged interactions and symptom patterns.',
          'Copy it as text or print it. Patterns show co-occurrence, not cause.',
        ],
      },
      {
        title: 'Settings and language',
        items: [
          'The PT | EN switch changes the interface and the language of AI answers. Your choice is saved.',
          'In Settings, paste your Google AI Studio key and press Test key. Without a key the app still works with on-device tagging.',
          'Sign In / Cloud is optional: with email and password or a magic link, Clarity syncs medications, doses and notes to your Supabase account. Without signing in, everything stays on this device.',
          'You can clear all your data in Settings at any time.',
        ],
      },
      {
        title: 'Offline and install',
        items: [
          'After the first visit, Clarity opens without internet and your data stays available. An "Offline" badge appears when the connection drops.',
          'To install: on iPhone, Share > Add to Home Screen; on Android/Chrome, menu > Install app.',
        ],
      },
      {
        title: 'Privacy',
        items: [
          'When signed out, your data and key stay only in this browser (localStorage). With cloud sync on, medications, doses and notes are also saved in your Supabase account; the Gemini key stays in the browser only.',
          'Text and photos are sent to Gemini only when you use those features. Clarity organises your routine and is not medical advice.',
        ],
      },
    ],
    footer: 'Tip: in the Cabinet, open Label details to read the label for each medication.',
  },
}
