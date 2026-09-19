const CONFIG = {
    sistemaNome: "Sistema TI",
    fundoPadrao: "imagens/fundo.jpg",
    logoPadrao: "imagens/logo.png", 
    opacidadeFundo: 20,           
    desfoqueFundo: 4,             
    corPrincipalPadrao: "#37a928", 
    corTextoPadrao: "#000000",     
    fontePadrao: "Inter, sans-serif"
};

const DB = {
    get(nome, padrao = []) {
        const dados = localStorage.getItem(`sistemaTI_${nome}`);
        return dados ? JSON.parse(dados) : padrao;
    },
    set(nome, valor) {
        localStorage.setItem(`sistemaTI_${nome}`, JSON.stringify(valor));
    },
    proximoId(lista) {
        return lista.length ? Math.max(...lista.map(item => item.id)) + 1 : 1;
    }
};

// Trava Geral de Segurança: Verifica se o usuário logado é Administrador
function validarPermissaoAdmin() {
    if (!usuarioLogado || usuarioLogado.perfil !== 'ADM') {
        alert('Acesso negado! Apenas Administradores podem remover ou alterar registros.');
        return false;
    }
    return true;
}

const Aparencia = {
    salvar(logoBase64, fundoBase64, opacidade, desfoque, corPrincipal, corTexto, fonteTexto) {
        if (!validarPermissaoAdmin()) return;

        const atual = DB.get('aparencia', {});
        const aparencia = {
            logo: logoBase64 !== undefined ? logoBase64 : (atual.logo || CONFIG.logoPadrao),
            fundo: fundoBase64 !== undefined ? fundoBase64 : (atual.fundo || CONFIG.fundoPadrao),
            opacidade: opacidade !== undefined ? Number(opacidade) : (atual.opacidade ?? CONFIG.opacidadeFundo),
            desfoque: desfoque !== undefined ? Number(desfoque) : (atual.desfoque ?? CONFIG.desfoqueFundo),
            corPrincipal: corPrincipal || atual.corPrincipal || CONFIG.corPrincipalPadrao,
            corTexto: corTexto || atual.corTexto || CONFIG.corTextoPadrao,
            fonteTexto: fonteTexto || atual.fonteTexto || CONFIG.fontePadrao,
        };
        DB.set('aparencia', aparencia);
        this.aplicar();
        return aparencia;
    },
    aplicar() {
        const aparencia = DB.get('aparencia', {
            fundo: CONFIG.fundoPadrao,
            logo: CONFIG.logoPadrao,
            opacidade: CONFIG.opacidadeFundo,
            desfoque: CONFIG.desfoqueFundo,
            corPrincipal: CONFIG.corPrincipalPadrao,
            corTexto: CONFIG.corTextoPadrao,
            fonteTexto: CONFIG.fontePadrao
        });
        
        const fundoUrl = aparencia.fundo || CONFIG.fundoPadrao;
        const telaLogin = document.getElementById('tela-login');
        const sistemaEl = document.getElementById('sistema');

        if (telaLogin) {
            telaLogin.style.backgroundImage = `url('${fundoUrl}')`;
            telaLogin.style.backgroundSize = 'cover';
            telaLogin.style.backgroundPosition = 'center';
        }
        if (sistemaEl) {
            sistemaEl.style.backgroundImage = `url('${fundoUrl}')`;
            sistemaEl.style.backgroundSize = 'cover';
            sistemaEl.style.backgroundPosition = 'center';
        }

        const camadas = document.querySelectorAll('.camada-sobreposicao, .camada-sistema-sobreposicao');
        camadas.forEach(camada => {
            const opacidadeDec = (aparencia.opacidade !== undefined ? aparencia.opacidade : CONFIG.opacidadeFundo) / 100;
            camada.style.backgroundColor = `rgba(15, 23, 42, ${opacidadeDec})`;
            camada.style.backdropFilter = `blur(${aparencia.desfoque !== undefined ? aparencia.desfoque : CONFIG.desfoqueFundo}px)`;
            camada.style.webkitBackdropFilter = `blur(${aparencia.desfoque !== undefined ? aparencia.desfoque : CONFIG.desfoqueFundo}px)`;
        });

        const cor = aparencia.corPrincipal || CONFIG.corPrincipalPadrao;
        document.documentElement.style.setProperty('--cor-principal', cor);
        document.documentElement.style.setProperty('--cor-principal-clara', `${cor}15`);

        const corTexto = aparencia.corTexto || CONFIG.corTextoPadrao;
        document.documentElement.style.setProperty('--cor-texto-padrao', corTexto);
        document.body.style.color = corTexto;

        const fonte = aparencia.fonteTexto || CONFIG.fontePadrao;
        document.body.style.fontFamily = fonte;

        const logoUrl = aparencia.logo || CONFIG.logoPadrao;
        const areasLogo = document.querySelectorAll('#area-logo-login, #area-logo-menu');
        areasLogo.forEach(area => {
            area.innerHTML = `<img src="${logoUrl}" alt="Logotipo do Sistema" class="max-h-12 w-auto object-contain">`;
        });
    },
    async lerImagem(arquivo) {
        return new Promise((resolver, rejeitar) => {
            const leitor = new FileReader();
            leitor.onload = e => resolver(e.target.result);
            leitor.onerror = rejeitar;
            leitor.readAsDataURL(arquivo);
        });
    }
};

async function hashSenha(senha) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(senha);
    const hash = await crypto.subtle.digest('SHA-256', dados);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const MODULOS_SISTEMA = [
    { id: 'painel', nome: 'Painel Principal' },
    { id: 'equipamentos', nome: 'Equipamentos' },
    { id: 'chamados', nome: 'Central de Chamados' },
    { id: 'meus-chamados', nome: 'Meus Chamados' },
    { id: 'usuarios', nome: 'Gerenciar Usuários' },
    { id: 'categorias', nome: 'Categorias e Subcategorias' },
    { id: 'setores', nome: 'Setores e Liberações' },
    { id: 'aparencia', nome: 'Aparência e Design' },
    { id: 'historico', nome: 'Histórico de Atividades' }
];

let usuarios = DB.get('usuarios', []);
(async () => {
    const hashPadrao = await hashSenha('123');
    const indexAdmin = usuarios.findIndex(u => u.usuario.toLowerCase() === 'wanderson');
    
    const dadosAdmin = {
        id: 1,
        usuario: 'wanderson',
        senha: hashPadrao,
        nome: 'Wanderson (Admin)',
        perfil: 'ADM',
        setor: 'Tecnologia da Informação',
        liberacaoSetor: 'Acesso Total / Infraestrutura',
        email: 'wanderson@suaempresa.com.br',
        ativo: true,
        aprovado: true,
        permissoes: MODULOS_SISTEMA.map(m => m.id)
    };

    if (indexAdmin === -1) {
        usuarios.push(dadosAdmin);
    } else {
        usuarios[indexAdmin].senha = hashPadrao;
        usuarios[indexAdmin].perfil = 'ADM';
        usuarios[indexAdmin].setor = 'Tecnologia da Informação';
        usuarios[indexAdmin].liberacaoSetor = 'Acesso Total / Infraestrutura';
        usuarios[indexAdmin].ativo = true;
        usuarios[indexAdmin].aprovado = true;
        usuarios[indexAdmin].permissoes = MODULOS_SISTEMA.map(m => m.id);
    }
    salvarTudo();
})();

let equipamentos = DB.get('equipamentos', [
    { id: 1, patrimonio: 'PAT-001', tipo: 'Notebook', marcaModelo: 'Dell Latitude 3420', setor: 'Tecnologia da Informação', status: 'Ativo', responsavel: 'Wanderson' },
    { id: 2, patrimonio: 'PAT-002', tipo: 'Computador', marcaModelo: 'Lenovo ThinkCentre', setor: 'Financeiro', status: 'Ativo', responsavel: 'Carlos' }
]);

let chamados = DB.get('chamados', [
    { id: 1, solicitante: 'Wanderson', categoria: 'Hardware (Computadores/Peças)', subcategoria: 'Notebook', descricao: 'Tela piscando ao conectar na dock station.', status: 'Aberto', prioridade: 'Alta', data: new Date().toLocaleString('pt-BR') }
]);

let historicoAlteracoes = DB.get('historico', []);
let categoriasProblema = DB.get('categorias_problema', [
    { id: 1, nome: 'Hardware (Computadores/Peças)', subcategorias: ['Computador', 'Notebook', 'Peças/Componentes'] },
    { id: 2, nome: 'Software / Sistemas', subcategorias: ['Instalação', 'Erro de Sistema', 'Acesso/Credenciais'] },
    { id: 3, nome: 'Rede e Internet', subcategorias: ['Wi-Fi Instável', 'Cabo de Rede', 'VPN'] },
    { id: 4, nome: 'Impressoras e Periféricos', subcategorias: ['Atolamento de Papel', 'Sem Tinta/Toner', 'Configuração'] }
]);

let setoresLiberacoes = DB.get('setores_liberacoes', [
    { id: 1, nome: 'Financeiro', tipoLiberacao: 'Alçada de Pagamento e Relatórios Críticos' },
    { id: 2, nome: 'Recursos Humanos', tipoLiberacao: 'Liberação de Benefícios e Pessoal' },
    { id: 3, nome: 'Tecnologia da Informação', tipoLiberacao: 'Acesso Total / Infraestrutura' },
    { id: 4, nome: 'Comercial / Vendas', tipoLiberacao: 'Requisições de Clientes e Propostas' }
]);

function salvarTudo() {
    DB.set('usuarios', usuarios);
    DB.set('equipamentos', equipamentos);
    DB.set('chamados', chamados);
    DB.set('historico', historicoAlteracoes);
    DB.set('categorias_problema', categoriasProblema);
    DB.set('setores_liberacoes', setoresLiberacoes);
}

window.addEventListener('beforeunload', salvarTudo);

let usuarioLogado = null;
let paginaAtual = 'painel';
let filtroPeriodoAtual = 'mes';
let meuGrafico = null;

document.addEventListener('DOMContentLoaded', async () => {
    const anoAtualEl = document.getElementById('ano-atual');
    if (anoAtualEl) anoAtualEl.textContent = new Date().getFullYear();
    Aparencia.aplicar();
    configurarLogin();
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    injetarEstiloImpressao();
});

function atualizarDataHora() {
    const el = document.getElementById('data-hora');
    if (el) el.textContent = new Date().toLocaleString('pt-BR');
}

function injetarEstiloImpressao() {
    if (document.getElementById('estilo-impressao-dinamico')) return;
    const style = document.createElement('style');
    style.id = 'estilo-impressao-dinamico';
    style.innerHTML = `
        @media print {
            body * { visibility: hidden; }
            .relatorio-impressao, .relatorio-impressao * { visibility: visible; }
            .relatorio-impressao {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 20px;
                box-shadow: none !important;
                border: none !important;
            }
            .nao-imprimir { display: none !important; }
        }
    `;
    document.head.appendChild(style);
}

function dispararImpressao(tituloRelatorio, elementoHtmlConteudo) {
    const janela = window.open('', '_blank', 'width=900,height=650');
    janela.document.write(`
        <html>
            <head>
                <title>Relatório - ${tituloRelatorio}</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; margin: 20px; }
                    h2 { text-align: center; color: #111; margin-bottom: 5px; }
                    .info-cabecalho { text-align: center; font-size: 12px; color: #666; margin-bottom: 25px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                    th { background-color: #f1f5f9; color: #1e293b; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .rodape-relatorio { margin-top: 30px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; pt: 10px; }
                </style>
            </head>
            <body>
                <h2>${CONFIG.sistemaNome} - Relatório de ${tituloRelatorio}</h2>
                <div class="info-cabecalho">Emitido por: ${usuarioLogado ? usuarioLogado.nome : 'Sistema'} em ${new Date().toLocaleString('pt-BR')}</div>
                ${elementoHtmlConteudo}
                <div class="rodape-relatorio">Gerado automaticamente pelo ${CONFIG.sistemaNome}</div>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
        </html>
    `);
    janela.document.close();
}

function configurarLogin() {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usuarioDigitado = document.getElementById('login-usuario').value.trim();
            const senha = document.getElementById('login-senha').value;
            const erro = document.getElementById('mensagem-erro');
            erro.classList.add('hidden');

            const hash = await hashSenha(senha);
            const encontrado = usuarios.find(u => u.usuario.toLowerCase() === usuarioDigitado.toLowerCase());

            if (!encontrado) {
                erro.textContent = 'Usuário não encontrado no sistema!';
                erro.classList.remove('hidden');
                return;
            }

            if (encontrado.tentativasFalhas >= 3) {
                erro.textContent = 'Conta temporariamente bloqueada por excesso de falhas. Contate um Administrador.';
                erro.classList.remove('hidden');
                return;
            }

            if (encontrado.senha !== hash) {
                encontrado.tentativasFalhas = (encontrado.tentativasFalhas || 0) + 1;
                salvarTudo();
                const restantes = 3 - encontrado.tentativasFalhas;
                erro.textContent = `Senha incorreta! Tentativas restantes: ${restantes > 0 ? restantes : 0}`;
                erro.classList.remove('hidden');
                return;
            }

            if (!encontrado.ativo || !encontrado.aprovado) {
                erro.textContent = 'Usuário inativo ou pendente de aprovação!';
                erro.classList.remove('hidden');
                return;
            }

            encontrado.tentativasFalhas = 0;
            usuarioLogado = encontrado;
            
            historicoAlteracoes.unshift({
                id: DB.proximoId(historicoAlteracoes),
                acao: `Login bem-sucedido: ${usuarioLogado.nome} (${usuarioLogado.perfil})`,
                data: new Date().toLocaleString('pt-BR')
            });
            salvarTudo();

            iniciarSistema();
        });
    }

    const btnMostrarSenha = document.getElementById('btn-mostrar-senha');
    if (btnMostrarSenha) {
        btnMostrarSenha.addEventListener('click', () => {
            const campo = document.getElementById('login-senha');
            const icone = document.querySelector('#btn-mostrar-senha i');
            campo.type = campo.type === 'password' ? 'text' : 'password';
            icone.classList.toggle('fa-eye');
            icone.classList.toggle('fa-eye-slash');
        });
    }

    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', () => {
            if (usuarioLogado) {
                historicoAlteracoes.unshift({
                    id: DB.proximoId(historicoAlteracoes),
                    acao: `Logout do sistema: ${usuarioLogado.nome}`,
                    data: new Date().toLocaleString('pt-BR')
                });
                salvarTudo();
            }
            usuarioLogado = null;
            document.getElementById('tela-login').classList.remove('hidden');
            document.getElementById('sistema').classList.add('hidden');
            document.getElementById('form-login').reset();
            Aparencia.aplicar();
        });
    }
}

function iniciarSistema() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('sistema').classList.remove('hidden');
    document.getElementById('perfil-usuario').textContent = usuarioLogado.perfil === 'ADM' ? 'Administrador' : 'Usuário';
    document.getElementById('nome-usuario-menu').textContent = usuarioLogado.nome;
    document.getElementById('perfil-usuario-menu').textContent = usuarioLogado.perfil === 'ADM' ? 'Administrador' : 'Usuário';
    
    construirMenu();
    
    const permissoesUsuario = usuarioLogado.permissoes || MODULOS_SISTEMA.map(m => m.id);
    if (usuarioLogado.perfil !== 'ADM' && !permissoesUsuario.includes(paginaAtual) && permissoesUsuario.length > 0) {
        paginaAtual = permissoesUsuario[0];
    }
    
    navegarPara(paginaAtual);
}

function construirMenu() {
    const menu = document.getElementById('menu-principal');
    if (!menu) return;

    const permissoesUsuario = usuarioLogado.permissoes || MODULOS_SISTEMA.map(m => m.id);

    const todosItens = [
        { id: 'painel', icone: 'fa-chart-pie', nome: 'Painel Principal', desc: 'Dashboard e Indicadores' },
        { id: 'equipamentos', icone: 'fa-desktop', nome: 'Equipamentos', desc: 'Parque de Ativos' },
        { id: 'chamados', icone: 'fa-ticket', nome: 'Central de Chamados', desc: 'Ocorrências e Suporte' },
        { id: 'meus-chamados', icone: 'fa-list-check', nome: 'Meus Chamados', desc: 'Acompanhamento Pessoal' },
        { id: 'usuarios', icone: 'fa-users-gear', nome: 'Gerenciar Usuários', desc: 'Controle de Acessos' },
        { id: 'categorias', icone: 'fa-tags', nome: 'Categorias e Subcategorias', desc: 'Classificação de Problemas' },
        { id: 'setores', icone: 'fa-building-shield', nome: 'Setores e Liberações', desc: 'Hierarquia e Permissões' },
        { id: 'aparencia', icone: 'fa-palette', nome: 'Aparência e Design', desc: 'Personalização Visual' },
        { id: 'historico', icone: 'fa-clock-rotate-left', nome: 'Histórico de Atividades', desc: 'Auditoria do Sistema' },
    ];

    const itensFiltrados = usuarioLogado.perfil === 'ADM' 
        ? todosItens 
        : todosItens.filter(item => permissoesUsuario.includes(item.id));
    
    menu.innerHTML = itensFiltrados.map(item => `
        <div class="menu-item flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${paginaAtual === item.id ? 'menu-item-ativo shadow-sm' : 'hover:bg-slate-200/60'}" data-pagina="${item.id}" style="${paginaAtual === item.id ? 'background-color: var(--cor-principal); color: #ffffff;' : 'color: var(--cor-texto-padrao);'}">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-sm shadow-sm" style="${paginaAtual === item.id ? 'background-color: rgba(255,255,255,0.2); color: #ffffff;' : 'background-color: #f1f5f9; color: var(--cor-principal);'}">
                <i class="fa-solid ${item.icone}"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-xs font-bold tracking-wide">${item.nome}</span>
                <span class="text-[10px] opacity-75">${item.desc}</span>
            </div>
        </div>
    `).join('');

    menu.querySelectorAll('.menu-item').forEach(link => {
        link.addEventListener('click', () => navegarPara(link.dataset.pagina));
    });
}

function navegarPara(pagina) {
    const permissoesUsuario = usuarioLogado.permissoes || MODULOS_SISTEMA.map(m => m.id);
    if (usuarioLogado.perfil !== 'ADM' && !permissoesUsuario.includes(pagina)) {
        alert('Você não tem permissão para acessar este módulo.');
        return;
    }

    paginaAtual = pagina;
    construirMenu();
    const titulos = {
        painel: 'Painel Principal <span class="text-xs font-normal text-slate-500 block mt-0.5">Visão geral e métricas de desempenho em tempo real</span>',
        equipamentos: 'Gestão de Equipamentos <span class="text-xs font-normal text-slate-500 block mt-0.5">Controle completo do parque tecnológico e ativos</span>',
        chamados: 'Central de Chamados <span class="text-xs font-normal text-slate-500 block mt-0.5">Acompanhamento e resolução de ocorrências de TI</span>',
        'meus-chamados': 'Meus Chamados <span class="text-xs font-normal text-slate-500 block mt-0.5">Histórico e solicitações abertas por você</span>',
        usuarios: 'Gerenciamento de Usuários <span class="text-xs font-normal text-slate-500 block mt-0.5">Controle total de acessos, perfis, cadastros e permissões</span>',
        categorias: 'Gestão de Categorias <span class="text-xs font-normal text-slate-500 block mt-0.5">Organização de tipos de problemas e subcategorias</span>',
        setores: 'Gestão de Setores e Liberações <span class="text-xs font-normal text-slate-500 block mt-0.5">Alçadas e permissões corporativas estruturadas</span>',
        aparencia: 'Aparência e Design <span class="text-xs font-normal text-slate-500 block mt-0.5">Personalização avançada de fontes, cores, botões, transparência e imagens</span>',
        historico: 'Histórico de Alterações <span class="text-xs font-normal text-slate-500 block mt-0.5">Auditoria detalhada de eventos e modificações</span>'
    };
    const elTitulo = document.getElementById('titulo-pagina');
    if (elTitulo) elTitulo.innerHTML = titulos[pagina];
    const conteudo = document.getElementById('conteudo-pagina');
    if (!conteudo) return;

    switch(pagina) {
        case 'painel': carregarPainel(conteudo); break;
        case 'equipamentos': carregarEquipamentos(conteudo); break;
        case 'chamados': carregarChamados(conteudo); break;
        case 'meus-chamados': carregarMeusChamados(conteudo); break;
        case 'usuarios': if (usuarioLogado.perfil === 'ADM') carregarUsuarios(conteudo); break;
        case 'categorias': if (usuarioLogado.perfil === 'ADM') carregarCategorias(conteudo); break;
        case 'setores': carregarSetores(conteudo); break;
        case 'aparencia': if (usuarioLogado.perfil === 'ADM') carregarAparencia(conteudo); break;
        case 'historico': if (usuarioLogado.perfil === 'ADM') carregarHistorico(conteudo); break;
    }
    
    setTimeout(() => Aparencia.aplicar(), 50);
}

// 1. PAINEL PRINCIPAL
function carregarPainel(container) {
    const abertos = chamados.filter(c => c.status === 'Aberto').length;
    const ativos = equipamentos.filter(e => e.status === 'Ativo').length;
    const manutencao = equipamentos.filter(e => e.status === 'Manutenção').length;
    const totalChamados = chamados.length;
    const taxaResolucao = totalChamados > 0 ? (((totalChamados - abertos) / totalChamados) * 100).toFixed(1) : 100;
    
    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 w-full">
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Equipamentos Ativos</span>
                        <h4 class="text-3xl font-black text-slate-900 mt-1">${ativos}</h4>
                    </div>
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" style="background-color: var(--cor-principal-clara); color: var(--cor-principal);">
                        <i class="fa-solid fa-desktop"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chamados Abertos</span>
                        <h4 class="text-3xl font-black text-rose-600 mt-1">${abertos}</h4>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                        <i class="fa-solid fa-ticket"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Em Manutenção</span>
                        <h4 class="text-3xl font-black text-amber-600 mt-1">${manutencao}</h4>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                        <i class="fa-solid fa-gears"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Taxa de Resolução</span>
                        <h4 class="text-3xl font-black text-emerald-600 mt-1">${taxaResolucao}%</h4>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                        <i class="fa-solid fa-chart-pie"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <i class="fa-solid fa-chart-column" style="color: var(--cor-principal);"></i> 
                    Fluxo de Chamados
                </h3>
                
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
                        <button onclick="alterarFiltroGrafico('dia')" id="btn-filtro-dia" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${filtroPeriodoAtual === 'dia' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}">Dia</button>
                        <button onclick="alterarFiltroGrafico('semana')" id="btn-filtro-semana" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${filtroPeriodoAtual === 'semana' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}">Semana</button>
                        <button onclick="alterarFiltroGrafico('mes')" id="btn-filtro-mes" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${filtroPeriodoAtual === 'mes' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}">Mês</button>
                    </div>

                    <button onclick="imprimirRelatorioPainel()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition">
                        <i class="fa-solid fa-print"></i> Imprimir Relatório
                    </button>
                </div>
            </div>
            <div class="relative h-72"><canvas id="graficoMes"></canvas></div>
        </div>
    `;
    renderizarGraficos();
}

function alterarFiltroGrafico(tipo) {
    filtroPeriodoAtual = tipo;
    ['dia', 'semana', 'mes'].forEach(p => {
        const btn = document.getElementById(`btn-filtro-${p}`);
        if (btn) {
            btn.className = `px-3 py-1 rounded-lg text-xs font-bold transition-all ${p === tipo ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`;
        }
    });
    renderizarGraficos();
}

function renderizarGraficos() {
    let labels = [];
    let dados = [];

    if (filtroPeriodoAtual === 'dia') {
        labels = ['08h', '10h', '12h', '14h', '16h', '18h'];
        dados = new Array(6).fill(0);
        chamados.forEach(c => {
            if (c.data) {
                const horaStr = c.data.split(' ')[1];
                if (horaStr) {
                    const hora = parseInt(horaStr.split(':')[0], 10);
                    if (hora >= 8 && hora < 10) dados[0]++;
                    else if (hora >= 10 && hora < 12) dados[1]++;
                    else if (hora >= 12 && hora < 14) dados[2]++;
                    else if (hora >= 14 && hora < 16) dados[3]++;
                    else if (hora >= 16 && hora < 18) dados[4]++;
                    else if (hora >= 18) dados[5]++;
                }
            }
        });
    } else if (filtroPeriodoAtual === 'semana') {
        labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dados = new Array(7).fill(0);
        chamados.forEach(c => {
            if (c.data) {
                const partes = c.data.split(' ')[0].split('/');
                if (partes.length === 3) {
                    const dataObj = new Date(partes[2], partes[1] - 1, partes[0]);
                    const diaSemana = dataObj.getDay();
                    if (!isNaN(diaSemana)) dados[diaSemana]++;
                }
            }
        });
    } else {
        labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        dados = new Array(12).fill(0);
        chamados.forEach(c => {
            if (c.data) {
                const partes = c.data.split(' ')[0].split('/');
                if (partes.length === 3) {
                    const mesIdx = parseInt(partes[1], 10) - 1;
                    if (mesIdx >= 0 && mesIdx < 12) dados[mesIdx]++;
                }
            }
        });
    }

    const corAtual = DB.get('aparencia', {}).corPrincipal || CONFIG.corPrincipalPadrao;
    const ctxMes = document.getElementById('graficoMes');

    if (ctxMes) {
        if (meuGrafico) meuGrafico.destroy();

        meuGrafico = new Chart(ctxMes, {
            type: 'bar',
            data: { 
                labels: labels, 
                datasets: [{ 
                    label: 'Chamados', 
                    data: dados, 
                    backgroundColor: corAtual, 
                    borderRadius: 6 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }, 
                    x: { grid: { display: false } } 
                } 
            }
        });
    }
}

function imprimirRelatorioPainel() {
    const abertos = chamados.filter(c => c.status === 'Aberto').length;
    const ativos = equipamentos.filter(e => e.status === 'Ativo').length;
    const manutencao = equipamentos.filter(e => e.status === 'Manutenção').length;
    const totalChamados = chamados.length;
    const taxaResolucao = totalChamados > 0 ? (((totalChamados - abertos) / totalChamados) * 100).toFixed(1) : 100;
    
    let periodoTexto = filtroPeriodoAtual === 'dia' ? 'Diário' : (filtroPeriodoAtual === 'semana' ? 'Semanal' : 'Mensal');

    const htmlConteudo = `
        <div style="margin-bottom: 20px;">
            <h3>Resumo Geral do Parque e Atendimentos</h3>
            <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;"><b>Equipamentos Ativos:</b> ${ativos}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;"><b>Chamados Abertos:</b> ${abertos}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;"><b>Em Manutenção:</b> ${manutencao}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;"><b>Taxa de Resolução:</b> ${taxaResolucao}%</td>
                </tr>
            </table>

            <h3>Detalhamento dos Chamados — Visão ${periodoTexto}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Solicitante</th>
                        <th>Categoria / Subcategoria</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Data Abertura</th>
                    </tr>
                </thead>
                <tbody>
                    ${chamados.length > 0 ? chamados.map(c => `
                        <tr>
                            <td>${c.solicitante || 'N/A'}</td>
                            <td>${c.categoria || '-'} / ${c.subcategoria || '-'}</td>
                            <td><b>${c.status}</b></td>
                            <td>${c.prioridade || 'Normal'}</td>
                            <td>${c.data}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="text-align:center;">Nenhum chamado registrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    dispararImpressao(`Dashboard & Fluxo de Chamados (${filtroPeriodoAtual.toUpperCase()})`, htmlConteudo);
}

// 2. EQUIPAMENTOS
function carregarEquipamentos(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Cadastrar Novo Equipamento</h3>
            <form id="form-equipamento" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input type="text" id="eq-patrimonio" placeholder="Patrimônio (Ex: PAT-100)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-900">
                <input type="text" id="eq-tipo" placeholder="Tipo (Ex: Notebook, Impressora)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-900">
                <input type="text" id="eq-modelo" placeholder="Marca e Modelo" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-900">
                <input type="text" id="eq-setor" placeholder="Setor Responsável" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-900">
                <input type="text" id="eq-resp" placeholder="Nome do Responsável" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-900">
                <select id="eq-status" class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none text-slate-900">
                    <option value="Ativo">Ativo</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Inativo">Inativo</option>
                </select>
                <button type="submit" class="sm:col-span-3 py-3 rounded-xl text-white font-bold text-xs shadow-sm transition" style="background-color: var(--cor-principal);">Cadastrar Equipamento</button>
            </form>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900 text-sm">Parque de Ativos Cadastrados</h3>
                <button onclick="imprimirRelatorioEquipamentos()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fa-solid fa-print"></i> Imprimir Relatório
                </button>
            </div>
            <div class="overflow-x-auto">
                <table id="tabela-rel-equipamentos" class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">Patrimônio</th><th class="p-3">Tipo / Modelo</th><th class="p-3">Setor</th><th class="p-3">Responsável</th><th class="p-3">Status</th><th class="p-3 text-right nao-imprimir">Ações</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${equipamentos.map(e => `
                            <tr>
                                <td class="p-3 font-bold text-slate-900">${e.patrimonio}</td>
                                <td class="p-3">${e.tipo} - ${e.marcaModelo}</td>
                                <td class="p-3">${e.setor}</td>
                                <td class="p-3">${e.responsavel}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${e.status}</span></td>
                                <td class="p-3 text-right nao-imprimir">
                                    <button onclick="removerEquipamento(${e.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('form-equipamento').addEventListener('submit', (e) => {
        e.preventDefault();
        equipamentos.push({
            id: DB.proximoId(equipamentos),
            patrimonio: document.getElementById('eq-patrimonio').value,
            tipo: document.getElementById('eq-tipo').value,
            marcaModelo: document.getElementById('eq-modelo').value,
            setor: document.getElementById('eq-setor').value,
            responsavel: document.getElementById('eq-resp').value,
            status: document.getElementById('eq-status').value
        });
        salvarTudo();
        carregarEquipamentos(container);
    });
}

function imprimirRelatorioEquipamentos() {
    const htmlTabela = `
        <table>
            <thead>
                <tr><th>Patrimônio</th><th>Tipo / Modelo</th><th>Setor</th><th>Responsável</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${equipamentos.map(e => `
                    <tr>
                        <td><b>${e.patrimonio}</b></td>
                        <td>${e.tipo} - ${e.marcaModelo}</td>
                        <td>${e.setor}</td>
                        <td>${e.responsavel}</td>
                        <td>${e.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    dispararImpressao('Equipamentos e Ativos', htmlTabela);
}

function removerEquipamento(id) {
    if (!validarPermissaoAdmin()) return;
    
    equipamentos = equipamentos.filter(e => e.id !== id);
    salvarTudo();
    carregarEquipamentos(document.getElementById('conteudo-pagina'));
}

// 3. CENTRAL DE CHAMADOS
function carregarChamados(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Abrir Novo Chamado de Suporte</h3>
            <form id="form-chamado" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select id="ch-categoria" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="">Selecione a Categoria</option>
                    ${categoriasProblema.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('')}
                </select>
                <select id="ch-prioridade" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="Baixa">Prioridade Baixa</option>
                    <option value="Média" selected>Prioridade Média</option>
                    <option value="Alta">Prioridade Alta</option>
                </select>
                <textarea id="ch-descricao" placeholder="Descreva detalhadamente o problema..." required class="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 h-24"></textarea>
                <button type="submit" class="sm:col-span-2 py-3 rounded-xl text-white font-bold text-xs shadow-sm transition" style="background-color: var(--cor-principal);">Registrar Chamado</button>
            </form>
        </div>
        
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Todos os Chamados do Sistema</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Solicitante</th><th class="p-3">Categoria</th><th class="p-3">Descrição</th><th class="p-3">Prioridade</th><th class="p-3">Status</th><th class="p-3 text-right">Ação</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${chamados.map(c => `
                            <tr>
                                <td class="p-3 font-bold">#${c.id}</td>
                                <td class="p-3">${c.solicitante}</td>
                                <td class="p-3">${c.categoria}</td>
                                <td class="p-3 truncate max-w-xs">${c.descricao}</td>
                                <td class="p-3 font-semibold">${c.prioridade}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Aberto' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">${c.status}</span></td>
                                <td class="p-3 text-right">
                                    ${c.status === 'Aberto' ? `<button onclick="fecharChamado(${c.id})" class="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold">Concluir</button>` : '<span class="text-slate-400">Finalizado</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('form-chamado').addEventListener('submit', (e) => {
        e.preventDefault();
        chamados.unshift({
            id: DB.proximoId(chamados),
            solicitante: usuarioLogado.nome,
            categoria: document.getElementById('ch-categoria').value,
            subcategoria: 'Geral',
            descricao: document.getElementById('ch-descricao').value,
            prioridade: document.getElementById('ch-prioridade').value,
            status: 'Aberto',
            data: new Date().toLocaleString('pt-BR')
        });
        salvarTudo();
        carregarChamados(container);
    });
}

function fecharChamado(id) {
    if (!validarPermissaoAdmin()) return;

    const chamado = chamados.find(c => c.id === id);
    if (chamado) {
        chamado.status = 'Concluído';
        salvarTudo();
        carregarChamados(document.getElementById('conteudo-pagina'));
    }
}

// 4. MEUS CHAMADOS
function carregarMeusChamados(container) {
    const meus = chamados.filter(c => c.solicitante === usuarioLogado.nome);
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Meus Chamados Solicitados</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Categoria</th><th class="p-3">Descrição</th><th class="p-3">Data</th><th class="p-3">Status</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${meus.length > 0 ? meus.map(c => `
                            <tr>
                                <td class="p-3 font-bold">#${c.id}</td>
                                <td class="p-3">${c.categoria}</td>
                                <td class="p-3">${c.descricao}</td>
                                <td class="p-3">${c.data}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Aberto' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">${c.status}</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum chamado aberto por você.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 5. GERENCIAR USUÁRIOS
function carregarUsuarios(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Cadastrar Novo Usuário e Configurar Nível de Acesso</h3>
            <form id="form-usuario" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" id="us-nome" placeholder="Nome Completo" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="us-login" placeholder="Login de Usuário" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="email" id="us-email" placeholder="E-mail" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="password" id="us-senha" placeholder="Senha" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                
                <select id="us-setor" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="">Selecione o Setor</option>
                    ${setoresLiberacoes.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('')}
                </select>

                <select id="us-perfil" class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="USER">Usuário Padrão</option>
                    <option value="ADM">Administrador (Acesso Total)</option>
                </select>

                <div class="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label class="block text-xs font-bold text-slate-800 mb-2">Módulos Liberados para Acesso:</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        ${MODULOS_SISTEMA.map(m => `
                            <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                <input type="checkbox" name="us-permissoes" value="${m.id}" checked class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
                                ${m.nome}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <button type="submit" class="sm:col-span-2 py-3 rounded-xl text-white font-bold text-xs shadow-sm transition" style="background-color: var(--cor-principal);">Cadastrar Usuário</button>
            </form>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Usuários e Níveis de Acesso Configurados</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr>
                            <th class="p-3">Nome / Login</th>
                            <th class="p-3">Setor</th>
                            <th class="p-3">Liberação do Setor</th>
                            <th class="p-3">Módulos Liberados</th>
                            <th class="p-3">Perfil</th>
                            <th class="p-3">Status</th>
                            <th class="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${usuarios.map(u => {
                            const setorObj = setoresLiberacoes.find(s => s.nome === u.setor);
                            const liberacao = setorObj ? setorObj.tipoLiberacao : (u.perfil === 'ADM' ? 'Acesso Total' : 'Geral');
                            const totalModulos = u.permissoes ? u.permissoes.length : MODULOS_SISTEMA.length;
                            return `
                                <tr>
                                    <td class="p-3 font-bold">${u.nome}<br><span class="font-normal text-slate-400">@${u.usuario}</span></td>
                                    <td class="p-3 font-semibold text-slate-800">${u.setor || 'Não informado'}</td>
                                    <td class="p-3 text-slate-500">${liberacao}</td>
                                    <td class="p-3 font-semibold text-emerald-600">${totalModulos} de ${MODULOS_SISTEMA.length} módulos</td>
                                    <td class="p-3 font-semibold">${u.perfil}</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                    <td class="p-3 text-right">
                                        <button onclick="alternarStatusUsuario(${u.id})" class="text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-bold">${u.ativo ? 'Desativar' : 'Ativar'}</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('form-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validarPermissaoAdmin()) return;

        const hash = await hashSenha(document.getElementById('us-senha').value);
        const setorNome = document.getElementById('us-setor').value;
        const setorObj = setoresLiberacoes.find(s => s.nome === setorNome);

        const checkboxes = document.querySelectorAll('input[name="us-permissoes"]:checked');
        const permissoesSelecionadas = Array.from(checkboxes).map(cb => cb.value);

        usuarios.push({
            id: DB.proximoId(usuarios),
            nome: document.getElementById('us-nome').value,
            usuario: document.getElementById('us-login').value,
            email: document.getElementById('us-email').value,
            senha: hash,
            setor: setorNome,
            liberacaoSetor: setorObj ? setorObj.tipoLiberacao : 'Geral',
            perfil: document.getElementById('us-perfil').value,
            ativo: true,
            aprovado: true,
            permissoes: permissoesSelecionadas
        });
        salvarTudo();
        carregarUsuarios(container);
    });
}

function alternarStatusUsuario(id) {
    if (!validarPermissaoAdmin()) return;

    const user = usuarios.find(u => u.id === id);
    if (user && user.usuario !== 'wanderson') {
        user.ativo = !user.ativo;
        salvarTudo();
        carregarUsuarios(document.getElementById('conteudo-pagina'));
    }
}

// 6. CATEGORIAS E SUBCATEGORIAS
function carregarCategorias(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Adicionar Nova Categoria</h3>
            <form id="form-categoria" class="flex gap-4">
                <input type="text" id="cat-nome" placeholder="Nome da Categoria" required class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <button type="submit" class="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition" style="background-color: var(--cor-principal);">Salvar</button>
            </form>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Categorias Mapeadas</h3>
            <ul class="divide-y divide-slate-100">
                ${categoriasProblema.map(c => `
                    <li class="py-3 flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-800">${c.nome}</span>
                        <span class="text-slate-400">${c.subcategorias ? c.subcategorias.join(', ') : 'Geral'}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    document.getElementById('form-categoria').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validarPermissaoAdmin()) return;

        categoriasProblema.push({
            id: DB.proximoId(categoriasProblema),
            nome: document.getElementById('cat-nome').value,
            subcategorias: ['Geral']
        });
        salvarTudo();
        carregarCategorias(container);
    });
}

// 7. SETORES E LIBERAÇÕES
function carregarSetores(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Cadastrar Novo Setor e Definir Regra de Liberação</h3>
            <form id="form-setor" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" id="st-nome" placeholder="Nome do Setor (Ex: Logística, Diretoria)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="st-liberacao" placeholder="Tipo de Liberação / Alçada (Ex: Aprovação de Despesas)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <button type="submit" class="sm:col-span-2 py-3 rounded-xl text-white font-bold text-xs shadow-sm transition" style="background-color: var(--cor-principal);">Cadastrar Setor e Liberação</button>
            </form>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Setores e Permissões Cadastradas</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr>
                            <th class="p-3">#ID</th>
                            <th class="p-3">Nome do Setor</th>
                            <th class="p-3">Nível / Regra de Liberação</th>
                            <th class="p-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${setoresLiberacoes.map(s => `
                            <tr>
                                <td class="p-3 font-bold text-slate-400">#${s.id}</td>
                                <td class="p-3 font-bold text-slate-900">${s.nome}</td>
                                <td class="p-3 font-semibold text-slate-600">${s.tipoLiberacao}</td>
                                <td class="p-3 text-right">
                                    <button onclick="removerSetor(${s.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('form-setor').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validarPermissaoAdmin()) return;

        setoresLiberacoes.push({
            id: DB.proximoId(setoresLiberacoes),
            nome: document.getElementById('st-nome').value,
            tipoLiberacao: document.getElementById('st-liberacao').value
        });
        salvarTudo();
        carregarSetores(container);
    });
}

function removerSetor(id) {
    if (!validarPermissaoAdmin()) return;

    setoresLiberacoes = setoresLiberacoes.filter(s => s.id !== id);
    salvarTudo();
    carregarSetores(document.getElementById('conteudo-pagina'));
}

// 8. APARÊNCIA E DESIGN
function carregarAparencia(container) {
    const ap = DB.get('aparencia', {});
    const fonteAtual = ap.fonteTexto || CONFIG.fontePadrao;

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Personalização Visual e Branding</h3>
            <form id="form-aparencia" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs font-bold mb-1">Cor Principal (HEX)</label>
                        <input type="color" id="ap-cor" value="${ap.corPrincipal || '#37a928'}" class="w-full h-10 rounded-xl cursor-pointer">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1">Opacidade da Camada (${ap.opacidade || 20}%)</label>
                        <input type="range" id="ap-opacidade" min="0" max="100" value="${ap.opacidade || 20}" class="w-full">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1">Fonte do Sistema</label>
                        <select id="ap-fonte" class="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 font-semibold">
                            <option value="Inter, sans-serif" ${fonteAtual.includes('Inter') ? 'selected' : ''}>Inter (Padrão)</option>
                            <option value="Roboto, sans-serif" ${fonteAtual.includes('Roboto') ? 'selected' : ''}>Roboto</option>
                            <option value="Poppins, sans-serif" ${fonteAtual.includes('Poppins') ? 'selected' : ''}>Poppins</option>
                            <option value="'Open Sans', sans-serif" ${fonteAtual.includes('Open Sans') ? 'selected' : ''}>Open Sans</option>
                            <option value="'Segoe UI', sans-serif" ${fonteAtual.includes('Segoe UI') ? 'selected' : ''}>Segoe UI</option>
                            <option value="Montserrat, sans-serif" ${fonteAtual.includes('Montserrat') ? 'selected' : ''}>Montserrat</option>
                            <option value="Arial, sans-serif" ${fonteAtual.includes('Arial') ? 'selected' : ''}>Arial</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold mb-1">Logotipo Personalizado</label>
                        <input type="file" id="ap-logo" accept="image/*" class="text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-bold mb-1">Imagem de Fundo</label>
                        <input type="file" id="ap-fundo" accept="image/*" class="text-xs">
                    </div>
                </div>

                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-xs shadow-sm transition" style="background-color: var(--cor-principal);">Aplicar e Salvar Alterações</button>
            </form>
        </div>
    `;

    document.getElementById('form-aparencia').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validarPermissaoAdmin()) return;

        let logoB64, fundoB64;

        const fLogo = document.getElementById('ap-logo').files[0];
        const fFundo = document.getElementById('ap-fundo').files[0];

        if (fLogo) logoB64 = await Aparencia.lerImagem(fLogo);
        if (fFundo) fundoB64 = await Aparencia.lerImagem(fFundo);

        Aparencia.salvar(
            logoB64,
            fundoB64,
            document.getElementById('ap-opacidade').value,
            4,
            document.getElementById('ap-cor').value,
            '#000000',
            document.getElementById('ap-fonte').value
        );
        alert('Configurações de aparência e tipografia atualizadas!');
    });
}

// 9. HISTÓRICO DE ATIVIDADES
function carregarHistorico(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Auditoria e Registro de Eventos</h3>
            <ul class="divide-y divide-slate-100 text-xs">
                ${historicoAlteracoes.length > 0 ? historicoAlteracoes.map(h => `
                    <li class="py-3 flex justify-between items-center">
                        <span class="text-slate-800">${h.acao}</span>
                        <span class="text-slate-400 text-[10px]">${h.data}</span>
                    </li>
                `).join('') : '<li class="py-4 text-center text-slate-400">Nenhum evento registrado ainda.</li>'}
            </ul>
        </div>
    `;
}