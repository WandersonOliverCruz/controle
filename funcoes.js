// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = "https://legfoltyfnypowhnscwe.supabase.co";
const SUPABASE_KEY = "sb_publishable_BJ7VdB4lwxbrSoQa-hFDXw_XdOIkk-r";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

let usuarioLogado = null;
let paginaAtual = 'painel';
let filtroPeriodoAtual = 'mes';
let meuGrafico = null;

// Memória local carregada do Supabase
let usuarios = [];
let equipamentos = [];
let chamados = [];
let historicoAlteracoes = [];
let categoriasProblema = [];
let setoresLiberacoes = [];

// Função auxiliar de hash SHA-256
async function hashSenha(senha) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(senha);
    const hash = await crypto.subtle.digest('SHA-256', dados);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Buscar dados online
async function carregarDadosDoBanco() {
    try {
        const { data: dataUsers } = await supabase.from('usuarios').select('*');
        if (dataUsers) usuarios = dataUsers;

        const { data: dataEq } = await supabase.from('equipamentos').select('*');
        if (dataEq) equipamentos = dataEq.map(e => ({ ...e, marcaModelo: e.marca_modelo }));

        const { data: dataCh } = await supabase.from('chamados').select('*').order('id', { ascending: false });
        if (dataCh) chamados = dataCh.map(c => ({
            ...c,
            data: new Date(c.created_at).toLocaleString('pt-BR')
        }));

        const { data: dataCat } = await supabase.from('categorias').select('*');
        if (dataCat) categoriasProblema = dataCat;

        const { data: dataSet } = await supabase.from('setores').select('*');
        if (dataSet) setoresLiberacoes = dataSet.map(s => ({ ...s, tipoLiberacao: s.tipo_liberacao }));

        const { data: dataHist } = await supabase.from('historico').select('*').order('id', { ascending: false });
        if (dataHist) historicoAlteracoes = dataHist.map(h => ({
            ...h,
            data: new Date(h.created_at).toLocaleString('pt-BR')
        }));

        await Aparencia.aplicar();
    } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
    }
}

function validarPermissaoAdmin() {
    if (!usuarioLogado || usuarioLogado.perfil !== 'ADM') {
        alert('Acesso negado! Apenas Administradores podem realizar esta alteração.');
        return false;
    }
    return true;
}

const Aparencia = {
    async salvar(logoBase64, fundoBase64, opacidade, desfoque, corPrincipal, corTexto, fonteTexto) {
        if (!validarPermissaoAdmin()) return;

        const aparencia = {
            id: 1,
            logo: logoBase64,
            fundo: fundoBase64,
            opacidade: Number(opacidade),
            desfoque: Number(desfoque),
            cor_principal: corPrincipal,
            cor_texto: corTexto,
            fonte_texto: fonteTexto
        };

        await supabase.from('aparencia').upsert(aparencia);
        await this.aplicar();
    },
    async aplicar() {
        const { data } = await supabase.from('aparencia').select('*').eq('id', 1).single();
        const aparencia = data || {};
        
        const fundoUrl = aparencia.fundo || CONFIG.fundoPadrao;
        const telaLogin = document.getElementById('tela-login');
        const sistemaEl = document.getElementById('sistema');

        if (telaLogin) {
            telaLogin.style.backgroundImage = `url('${fundoUrl}')`;
            telaLogin.style.backgroundSize = 'cover';
        }
        if (sistemaEl) {
            sistemaEl.style.backgroundImage = `url('${fundoUrl}')`;
            sistemaEl.style.backgroundSize = 'cover';
        }

        const camadas = document.querySelectorAll('.camada-sobreposicao, .camada-sistema-sobreposicao');
        camadas.forEach(camada => {
            const opacidadeDec = (aparencia.opacidade ?? CONFIG.opacidadeFundo) / 100;
            camada.style.backgroundColor = `rgba(15, 23, 42, ${opacidadeDec})`;
            camada.style.backdropFilter = `blur(${aparencia.desfoque ?? CONFIG.desfoqueFundo}px)`;
        });

        const cor = aparencia.cor_principal || CONFIG.corPrincipalPadrao;
        document.documentElement.style.setProperty('--cor-principal', cor);

        const fonte = aparencia.fonte_texto || CONFIG.fontePadrao;
        document.body.style.fontFamily = fonte;

        const logoUrl = aparencia.logo || CONFIG.logoPadrao;
        const areasLogo = document.querySelectorAll('#area-logo-login, #area-logo-menu');
        areasLogo.forEach(area => {
            area.innerHTML = `<img src="${logoUrl}" alt="Logotipo" class="max-h-12 w-auto object-contain">`;
        });
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const anoAtualEl = document.getElementById('ano-atual');
    if (anoAtualEl) anoAtualEl.textContent = new Date().getFullYear();
    
    await carregarDadosDoBanco();
    configurarLogin();
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
});

function atualizarDataHora() {
    const el = document.getElementById('data-hora');
    if (el) el.textContent = new Date().toLocaleString('pt-BR');
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

            const { data: usuarioBD, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('usuario', usuarioDigitado)
                .single();

            if (error || !usuarioBD) {
                erro.textContent = 'Usuário não encontrado!';
                erro.classList.remove('hidden');
                return;
            }

            if (usuarioBD.senha !== hash) {
                erro.textContent = 'Senha incorreta!';
                erro.classList.remove('hidden');
                return;
            }

            if (!usuarioBD.ativo || !usuarioBD.aprovado) {
                erro.textContent = 'Usuário inativo ou pendente de aprovação!';
                erro.classList.remove('hidden');
                return;
            }

            usuarioLogado = usuarioBD;
            
            await supabase.from('historico').insert({
                acao: `Login bem-sucedido: ${usuarioLogado.nome} (${usuarioLogado.perfil})`
            });

            iniciarSistema();
        });
    }

    const btnMostrarSenha = document.getElementById('btn-mostrar-senha');
    if (btnMostrarSenha) {
        btnMostrarSenha.addEventListener('click', () => {
            const campo = document.getElementById('login-senha');
            campo.type = campo.type === 'password' ? 'text' : 'password';
        });
    }

    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            if (usuarioLogado) {
                await supabase.from('historico').insert({
                    acao: `Logout do sistema: ${usuarioLogado.nome}`
                });
            }
            usuarioLogado = null;
            document.getElementById('tela-login').classList.remove('hidden');
            document.getElementById('sistema').classList.add('hidden');
            document.getElementById('form-login').reset();
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
    navegarPara('painel');
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
        <div class="menu-item flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${paginaAtual === item.id ? 'menu-item-ativo shadow-sm' : 'hover:bg-slate-200/60'}" data-pagina="${item.id}">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-sm shadow-sm">
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

async function navegarPara(pagina) {
    paginaAtual = pagina;
    construirMenu();
    await carregarDadosDoBanco();
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
        case 'aparencia': if (usuarioLogado.perfil === 'ADM') carregarAparenciaUI(conteudo); break;
        case 'historico': if (usuarioLogado.perfil === 'ADM') carregarHistorico(conteudo); break;
    }
}

// TROCA DE SENHA INTERNA
async function alterarSenhaPropria(novaSenha) {
    if (!usuarioLogado) return;
    const hash = await hashSenha(novaSenha);
    
    const { error } = await supabase
        .from('usuarios')
        .update({ senha: hash })
        .eq('id', usuarioLogado.id);

    if (!error) {
        alert('Senha alterada com sucesso!');
        await supabase.from('historico').insert({
            acao: `Troca de senha realizada pelo usuário: ${usuarioLogado.nome}`
        });
    } else {
        alert('Erro ao alterar senha no banco de dados.');
    }
}
