// ==========================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO SUPABASE
// ==========================================
// IMPORTANTE: Insira aqui a sua URL e a sua chave ANON do painel do Supabase
const SUPABASE_URL = "https://legfoltyfnypowhnscwe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BJ7VdB4lwxbrSoQa-hFDXw_XdOIkk-r";

// Utiliza 'supabaseClient' para evitar conflitos com a biblioteca global da CDN
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
    sistemaNome: "Sistema TI"
};

const MODULOS_SISTEMA = [
    { id: 'painel', nome: 'Painel Principal' },
    { id: 'equipamentos', nome: 'Equipamentos' },
    { id: 'chamados', nome: 'Central de Chamados' },
    { id: 'meus-chamados', nome: 'Meus Chamados' },
    { id: 'usuarios', nome: 'Gerenciar Usuários' },
    { id: 'categorias', nome: 'Categorias e Subcategorias' },
    { id: 'setores', nome: 'Setores e Liberações' }
];

let usuarioLogado = null;
let perfilUsuarioLogado = null;
let paginaAtual = 'painel';
let filtroPeriodoAtual = 'mes';
let meuGrafico = null;
let dadosChamadosGlobais = [];

// Prevenção contra vulnerabilidades XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const anoAtualEl = document.getElementById('ano-atual');
    if (anoAtualEl) anoAtualEl.textContent = new Date().getFullYear();
    
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    configurarLogin();

    // Verificar se já existe uma sessão ativa
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            await carregarPerfilEIniciar(session.user);
        }
    } catch (err) {
        console.error("Erro ao verificar sessão ativa:", err);
    }
});

function atualizarDataHora() {
    const el = document.getElementById('data-hora');
    if (el) el.textContent = new Date().toLocaleString('pt-BR');
}

// Sistema Universal de Impressão de Relatórios
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
                    .rodape-relatorio { margin-top: 30px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                </style>
            </head>
            <body>
                <h2>${CONFIG.sistemaNome} - Relatório de ${tituloRelatorio}</h2>
                <div class="info-cabecalho">Emitido por: ${perfilUsuarioLogado ? escapeHTML(perfilUsuarioLogado.nome) : 'Sistema'} em ${new Date().toLocaleString('pt-BR')}</div>
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
            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;
            const erro = document.getElementById('mensagem-erro');
            const btnSubmit = document.getElementById('btn-login-submit');

            erro.classList.add('hidden');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Entrando...`;

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ 
                    email: email, 
                    password: senha 
                });
                
                if (error) throw error;

                await carregarPerfilEIniciar(data.user);
            } catch (err) {
                erro.textContent = err.message || 'Erro ao realizar login. Verifique e-mail e senha.';
                erro.classList.remove('hidden');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema`;
            }
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
        btnSair.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            usuarioLogado = null;
            perfilUsuarioLogado = null;
            document.getElementById('tela-login').classList.remove('hidden');
            document.getElementById('sistema').classList.add('hidden');
            document.getElementById('form-login').reset();
        });
    }
}

async function carregarPerfilEIniciar(user) {
    usuarioLogado = user;

    // Busca dados complementares na tabela 'perfis'
    const { data, error } = await supabaseClient
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !data) {
        // Se for o seu e-mail principal, força o perfil de ADM
        perfilUsuarioLogado = {
            nome: user.email ? user.email.split('@')[0] : 'Admin',
            perfil: 'ADM',
            permissoes: MODULOS_SISTEMA.map(m => m.id)
        };
    } else {
        perfilUsuarioLogado = data;
    }

    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('sistema').classList.remove('hidden');
    
    document.getElementById('perfil-usuario').textContent = perfilUsuarioLogado.perfil === 'ADM' ? 'Administrador' : 'Usuário';
    document.getElementById('nome-usuario-menu').textContent = perfilUsuarioLogado.nome;
    document.getElementById('perfil-usuario-menu').textContent = perfilUsuarioLogado.perfil === 'ADM' ? 'Administrador' : 'Usuário';

    construirMenu();
    navegarPara(paginaAtual);
}
}

function construirMenu() {
    const menu = document.getElementById('menu-principal');
    if (!menu) return;

    const permissoesUsuario = perfilUsuarioLogado.permissoes || MODULOS_SISTEMA.map(m => m.id);

    const todosItens = [
        { id: 'painel', icone: 'fa-chart-pie', nome: 'Painel Principal', desc: 'Dashboard e Indicadores' },
        { id: 'equipamentos', icone: 'fa-desktop', nome: 'Equipamentos', desc: 'Parque de Ativos' },
        { id: 'chamados', icone: 'fa-ticket', nome: 'Central de Chamados', desc: 'Ocorrências e Suporte' },
        { id: 'meus-chamados', icone: 'fa-list-check', nome: 'Meus Chamados', desc: 'Acompanhamento Pessoal' },
        { id: 'usuarios', icone: 'fa-users-gear', nome: 'Gerenciar Usuários', desc: 'Controle de Acessos' },
        { id: 'categorias', icone: 'fa-tags', nome: 'Categorias e Subcategorias', desc: 'Classificação de Problemas' },
        { id: 'setores', icone: 'fa-building-shield', nome: 'Setores e Liberações', desc: 'Hierarquia e Permissões' }
    ];

    const itensFiltrados = perfilUsuarioLogado.perfil === 'ADM' 
        ? todosItens 
        : todosItens.filter(item => permissoesUsuario.includes(item.id));
    
    menu.innerHTML = itensFiltrados.map(item => `
        <div class="menu-item flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${paginaAtual === item.id ? 'menu-item-ativo shadow-sm' : 'hover:bg-slate-200/60'}" data-pagina="${item.id}">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-sm shadow-sm bg-slate-100">
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
    paginaAtual = pagina;
    construirMenu();

    const conteudo = document.getElementById('conteudo-pagina');
    if (!conteudo) return;

    switch(pagina) {
        case 'painel': carregarPainel(conteudo); break;
        case 'equipamentos': carregarEquipamentos(conteudo); break;
        case 'chamados': carregarChamados(conteudo); break;
        case 'meus-chamados': carregarMeusChamados(conteudo); break;
        case 'usuarios': carregarUsuarios(conteudo); break;
        case 'categorias': carregarCategorias(conteudo); break;
        case 'setores': carregarSetores(conteudo); break;
    }
}

// ==========================================
// 1. PAINEL PRINCIPAL & DASHBOARD COM GRÁFICO
// ==========================================
async function carregarPainel(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando indicadores...</div>`;

    const { data: chamados } = await supabaseClient.from('chamados').select('*');
    const { data: equipamentos } = await supabaseClient.from('equipamentos').select('*');

    dadosChamadosGlobais = chamados || [];
    const listaEquipamentos = equipamentos || [];

    const abertos = dadosChamadosGlobais.filter(c => c.status === 'Aberto').length;
    const ativos = listaEquipamentos.filter(e => e.status === 'Ativo').length;
    const manutencao = listaEquipamentos.filter(e => e.status === 'Manutenção').length;
    const totalChamados = dadosChamadosGlobais.length;
    const taxaResolucao = totalChamados > 0 ? (((totalChamados - abertos) / totalChamados) * 100).toFixed(1) : 100;

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 w-full">
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Equipamentos Ativos</span>
                        <h4 class="text-3xl font-black text-slate-900 mt-1">${ativos}</h4>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
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
                    <i class="fa-solid fa-chart-column text-emerald-600"></i> 
                    Fluxo de Chamados
                </h3>
                
                <div class="flex items-center gap-2 flex-wrap">
                    <div class="bg-slate-100 p-1 rounded-xl flex gap-1">
                        <button onclick="alterarFiltroGrafico('dia')" id="btn-filtro-dia" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${filtroPeriodoAtual === 'dia' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}">Dia</button>
                        <button onclick="alterarFiltroGrafico('semana')" id="btn-filtro-semana" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${filtroPeriodoAtual === 'semana' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}">Semana</button>
                        <button onclick="alterarFiltroGrafico('mes')" id="btn-filtro-mes" class="px-3 py-1 rounded-lg text-xs font-bold transition-all ${filtroPeriodoAtual === 'mes' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}">Mês</button>
                    </div>

                    <button onclick="imprimirRelatorioPainel(${ativos}, ${abertos}, ${manutencao}, '${taxaResolucao}')" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition">
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
        dadosChamadosGlobais.forEach(c => {
            if (c.created_at) {
                const dataObj = new Date(c.created_at);
                const hora = dataObj.getHours();
                if (hora >= 8 && hora < 10) dados[0]++;
                else if (hora >= 10 && hora < 12) dados[1]++;
                else if (hora >= 12 && hora < 14) dados[2]++;
                else if (hora >= 14 && hora < 16) dados[3]++;
                else if (hora >= 16 && hora < 18) dados[4]++;
                else if (hora >= 18) dados[5]++;
            }
        });
    } else if (filtroPeriodoAtual === 'semana') {
        labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dados = new Array(7).fill(0);
        dadosChamadosGlobais.forEach(c => {
            if (c.created_at) {
                const dataObj = new Date(c.created_at);
                const diaSemana = dataObj.getDay();
                if (!isNaN(diaSemana)) dados[diaSemana]++;
            }
        });
    } else {
        labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        dados = new Array(12).fill(0);
        dadosChamadosGlobais.forEach(c => {
            if (c.created_at) {
                const dataObj = new Date(c.created_at);
                const mesIdx = dataObj.getMonth();
                if (mesIdx >= 0 && mesIdx < 12) dados[mesIdx]++;
            }
        });
    }

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
                    backgroundColor: '#10b981', 
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

function imprimirRelatorioPainel(ativos, abertos, manutencao, taxaResolucao) {
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
                        <th>Categoria</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Data Abertura</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosChamadosGlobais.length > 0 ? dadosChamadosGlobais.map(c => `
                        <tr>
                            <td>${escapeHTML(c.solicitante_nome)}</td>
                            <td>${escapeHTML(c.categoria)}</td>
                            <td><b>${escapeHTML(c.status)}</b></td>
                            <td>${escapeHTML(c.prioridade || 'Média')}</td>
                            <td>${new Date(c.created_at).toLocaleString('pt-BR')}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" style="text-align:center;">Nenhum chamado registrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    dispararImpressao(`Dashboard & Fluxo de Chamados (${filtroPeriodoAtual.toUpperCase()})`, htmlConteudo);
}

// ==========================================
// 2. EQUIPAMENTOS
// ==========================================
async function carregarEquipamentos(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando equipamentos...</div>`;

    const { data: equipamentos } = await supabaseClient.from('equipamentos').select('*').order('id', { ascending: false });
    const listaEquipamentos = equipamentos || [];

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Cadastrar Novo Equipamento</h3>
            <form id="form-equipamento" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input type="text" id="eq-patrimonio" placeholder="Patrimônio (Ex: PAT-100)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="eq-tipo" placeholder="Tipo (Ex: Notebook)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="eq-modelo" placeholder="Marca e Modelo" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="eq-setor" placeholder="Setor Responsável" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="eq-resp" placeholder="Nome do Responsável" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <select id="eq-status" class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="Ativo">Ativo</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Inativo">Inativo</option>
                </select>
                <button type="submit" class="sm:col-span-3 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold text-xs shadow-sm transition">Cadastrar Equipamento</button>
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
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">Patrimônio</th><th class="p-3">Tipo / Modelo</th><th class="p-3">Setor</th><th class="p-3">Responsável</th><th class="p-3">Status</th><th class="p-3 text-right">Ações</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${listaEquipamentos.map(e => `
                            <tr>
                                <td class="p-3 font-bold text-slate-900">${escapeHTML(e.patrimonio)}</td>
                                <td class="p-3">${escapeHTML(e.tipo)} -${escapeHTML(e.marca_modelo)}</td>
                                <td class="p-3">${escapeHTML(e.setor)}</td>
                                <td class="p-3">${escapeHTML(e.responsavel)}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${escapeHTML(e.status)}</span></td>
                                <td class="p-3 text-right">
                                    <button onclick="removerEquipamento(${e.id})" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('form-equipamento').addEventListener('submit', async (e) => {
        e.preventDefault();
        await supabaseClient.from('equipamentos').insert([{
            patrimonio: document.getElementById('eq-patrimonio').value,
            tipo: document.getElementById('eq-tipo').value,
            marca_modelo: document.getElementById('eq-modelo').value,
            setor: document.getElementById('eq-setor').value,
            responsavel: document.getElementById('eq-resp').value,
            status: document.getElementById('eq-status').value
        }]);
        carregarEquipamentos(container);
    });
}

async function imprimirRelatorioEquipamentos() {
    const { data: equipamentos } = await supabaseClient.from('equipamentos').select('*').order('id', { ascending: false });
    const htmlTabela = `
        <table>
            <thead>
                <tr><th>Patrimônio</th><th>Tipo / Modelo</th><th>Setor</th><th>Responsável</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${(equipamentos || []).map(e => `
                    <tr>
                        <td><b>${escapeHTML(e.patrimonio)}</b></td>
                        <td>${escapeHTML(e.tipo)} -${escapeHTML(e.marca_modelo)}</td>
                        <td>${escapeHTML(e.setor)}</td>
                        <td>${escapeHTML(e.responsavel)}</td>
                        <td>${escapeHTML(e.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    dispararImpressao('Parque de Equipamentos e Ativos', htmlTabela);
}

async function removerEquipamento(id) {
    if (!confirm("Deseja realmente remover este equipamento?")) return;
    await supabaseClient.from('equipamentos').delete().eq('id', id);
    carregarEquipamentos(document.getElementById('conteudo-pagina'));
}

// ==========================================
// 3. CENTRAL DE CHAMADOS
// ==========================================
async function carregarChamados(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando chamados...</div>`;

    const { data: chamados } = await supabaseClient.from('chamados').select('*').order('id', { ascending: false });
    const { data: categorias } = await supabaseClient.from('categorias_problema').select('*');

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Abrir Novo Chamado de Suporte</h3>
            <form id="form-chamado" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select id="ch-categoria" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="">Selecione a Categoria</option>
                    ${(categorias || []).map(c => `<option value="${escapeHTML(c.nome)}">${escapeHTML(c.nome)}</option>`).join('')}
                </select>
                <select id="ch-prioridade" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="Baixa">Prioridade Baixa</option>
                    <option value="Média" selected>Prioridade Média</option>
                    <option value="Alta">Prioridade Alta</option>
                </select>
                <textarea id="ch-descricao" placeholder="Descreva detalhadamente o problema..." required class="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 h-24"></textarea>
                <button type="submit" class="sm:col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold text-xs shadow-sm transition">Registrar Chamado</button>
            </form>
        </div>
        
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900 text-sm">Todos os Chamados</h3>
                <button onclick="imprimirRelatorioChamados()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fa-solid fa-print"></i> Imprimir Relatório
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Solicitante</th><th class="p-3">Categoria</th><th class="p-3">Descrição</th><th class="p-3">Prioridade</th><th class="p-3">Status</th><th class="p-3 text-right">Ação</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${(chamados || []).map(c => `
                            <tr>
                                <td class="p-3 font-bold">#${c.id}</td>
                                <td class="p-3">${escapeHTML(c.solicitante_nome)}</td>
                                <td class="p-3">${escapeHTML(c.categoria)}</td>
                                <td class="p-3 truncate max-w-xs">${escapeHTML(c.descricao)}</td>
                                <td class="p-3 font-semibold">${escapeHTML(c.prioridade)}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Aberto' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">${escapeHTML(c.status)}</span></td>
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

    document.getElementById('form-chamado').addEventListener('submit', async (e) => {
        e.preventDefault();
        await supabaseClient.from('chamados').insert([{
            solicitante_id: usuarioLogado.id,
            solicitante_nome: perfilUsuarioLogado.nome,
            categoria: document.getElementById('ch-categoria').value,
            descricao: document.getElementById('ch-descricao').value,
            prioridade: document.getElementById('ch-prioridade').value,
            status: 'Aberto'
        }]);
        carregarChamados(container);
    });
}

async function imprimirRelatorioChamados() {
    const { data: chamados } = await supabaseClient.from('chamados').select('*').order('id', { ascending: false });
    const htmlTabela = `
        <table>
            <thead>
                <tr><th>#ID</th><th>Solicitante</th><th>Categoria</th><th>Descrição</th><th>Prioridade</th><th>Status</th><th>Data</th></tr>
            </thead>
            <tbody>
                ${(chamados || []).map(c => `
                    <tr>
                        <td>#${c.id}</td>
                        <td>${escapeHTML(c.solicitante_nome)}</td>
                        <td>${escapeHTML(c.categoria)}</td>
                        <td>${escapeHTML(c.descricao)}</td>
                        <td>${escapeHTML(c.prioridade || 'Média')}</td>
                        <td><b>${escapeHTML(c.status)}</b></td>
                        <td>${new Date(c.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    dispararImpressao('Central de Chamados', htmlTabela);
}

async function fecharChamado(id) {
    await supabaseClient.from('chamados').update({ status: 'Concluído' }).eq('id', id);
    carregarChamados(document.getElementById('conteudo-pagina'));
}

// ==========================================
// 4. MEUS CHAMADOS
// ==========================================
async function carregarMeusChamados(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando seus chamados...</div>`;

    const { data: meus } = await supabaseClient
        .from('chamados')
        .select('*')
        .eq('solicitante_id', usuarioLogado.id)
        .order('id', { ascending: false });

    const listaMeus = meus || [];

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900 text-sm">Meus Chamados Solicitados</h3>
                <button onclick="imprimirRelatorioMeusChamados()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fa-solid fa-print"></i> Imprimir Relatório
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Categoria</th><th class="p-3">Descrição</th><th class="p-3">Status</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${listaMeus.length > 0 ? listaMeus.map(c => `
                            <tr>
                                <td class="p-3 font-bold">#${c.id}</td>
                                <td class="p-3">${escapeHTML(c.categoria)}</td>
                                <td class="p-3">${escapeHTML(c.descricao)}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Aberto' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">${escapeHTML(c.status)}</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhum chamado aberto por você.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function imprimirRelatorioMeusChamados() {
    const { data: meus } = await supabaseClient
        .from('chamados')
        .select('*')
        .eq('solicitante_id', usuarioLogado.id)
        .order('id', { ascending: false });

    const htmlTabela = `
        <table>
            <thead>
                <tr><th>#ID</th><th>Categoria</th><th>Descrição</th><th>Status</th><th>Data</th></tr>
            </thead>
            <tbody>
                ${(meus || []).map(c => `
                    <tr>
                        <td>#${c.id}</td>
                        <td>${escapeHTML(c.categoria)}</td>
                        <td>${escapeHTML(c.descricao)}</td>
                        <td><b>${escapeHTML(c.status)}</b></td>
                        <td>${new Date(c.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    dispararImpressao(`Meus Chamados (${escapeHTML(perfilUsuarioLogado.nome)})`, htmlTabela);
}

// ==========================================
// 5. GERENCIAR USUÁRIOS E PERMISSÕES
// ==========================================
async function carregarUsuarios(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando usuários...</div>`;

    // Busca todos os perfis e setores do Supabase
    const { data: perfis } = await supabaseClient.from('perfis').select('*');
    const { data: setores } = await supabaseClient.from('setores_liberacoes').select('*');

    const listaPerfis = perfis || [];
    const listaSetores = setores || [];

    container.innerHTML = `
        <!-- FORMULÁRIO DE CRIAÇÃO DE NOVO USUÁRIO -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Cadastrar Novo Usuário e Definir Nível de Acesso</h3>
            <form id="form-criar-usuario" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" id="us-nome" placeholder="Nome Completo" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="text" id="us-login" placeholder="Nome de Usuário (ex: joao.silva)" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="email" id="us-email" placeholder="E-mail Corporativo" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                <input type="password" id="us-senha" placeholder="Senha Inicial" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                
                <select id="us-setor" required class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900">
                    <option value="">Selecione o Setor</option>
                    ${listaSetores.map(s => `<option value="${escapeHTML(s.nome)}">${escapeHTML(s.nome)}</option>`).join('')}
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

                <div id="msg-erro-usuario" class="sm:col-span-2 text-rose-600 text-xs hidden"></div>

                <button type="submit" id="btn-salvar-usuario" class="sm:col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold text-xs shadow-sm transition">
                    Cadastrar Usuário
                </button>
            </form>
        </div>

        <!-- LISTA DE USUÁRIOS E EDIÇÃO -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900 text-sm">Usuários Cadastrados no Banco</h3>
                <button onclick="imprimirRelatorioUsuarios()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fa-solid fa-print"></i> Imprimir Relatório
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr>
                            <th class="p-3">Nome / Usuário</th>
                            <th class="p-3">Setor</th>
                            <th class="p-3">Nível de Perfil</th>
                            <th class="p-3">Módulos Acessíveis</th>
                            <th class="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${listaPerfis.map(u => {
                            const modulosAcesso = u.permissoes ? u.permissoes.length : 0;
                            return `
                                <tr>
                                    <td class="p-3 font-bold">${escapeHTML(u.nome)}<br><span class="font-normal text-slate-400">@${escapeHTML(u.usuario)}</span></td>
                                    <td class="p-3">${escapeHTML(u.setor || 'Não Informado')}</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.perfil === 'ADM' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}">${escapeHTML(u.perfil)}</span></td>
                                    <td class="p-3 font-semibold text-emerald-600">${modulosAcesso} de${MODULOS_SISTEMA.length} módulos</td>
                                    <td class="p-3 text-right">
                                        <button onclick="abrirModalEditarPermissao('${u.id}', '${escapeHTML(u.nome)}', '${u.perfil}', '${u.setor \vert{}\vert{} ''}', '${(u.permissoes || []).join(',')}')" class="text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-700">
                                            <i class="fa-solid fa-pen-to-square"></i> Alterar Permissões
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- MODAL DE EDIÇÃO DE PERMISSÕES -->
        <div id="modal-editar-permissao" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center hidden z-50 p-4">
            <div class="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                <h3 class="font-bold text-slate-900 text-base mb-1" id="modal-usr-titulo">Alterar Permissões</h3>
                <p class="text-xs text-slate-500 mb-4">Modifique o nível de acesso e as telas visíveis para este usuário.</p>
                
                <input type="hidden" id="edit-usr-id">
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold mb-1">Perfil de Acesso</label>
                        <select id="edit-usr-perfil" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                            <option value="USER">Usuário Padrão</option>
                            <option value="ADM">Administrador (Acesso Total)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold mb-1">Setor</label>
                        <select id="edit-usr-setor" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                            ${listaSetores.map(s => `<option value="${escapeHTML(s.nome)}">${escapeHTML(s.nome)}</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold mb-2">Módulos Liberados:</label>
                        <div class="grid grid-cols-2 gap-2" id="box-permissoes-edit">
                            ${MODULOS_SISTEMA.map(m => `
                                <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                    <input type="checkbox" value="${m.id}" class="chk-edit-perm rounded border-slate-300 text-emerald-600">
                                    ${m.nome}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="fecharModalEditar()" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancelar</button>
                    <button type="button" onclick="salvarAlteracaoPermissao()" class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">Salvar Alterações</button>
                </div>
            </div>
        </div>
    `;

    // Evento de Submissão do Formulário de Criação de Usuário
    document.getElementById('form-criar-usuario').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('us-nome').value.trim();
        const usuario = document.getElementById('us-login').value.trim().toLowerCase();
        const email = document.getElementById('us-email').value.trim();
        const senha = document.getElementById('us-senha').value;
        const setor = document.getElementById('us-setor').value;
        const perfil = document.getElementById('us-perfil').value;
        const msgErro = document.getElementById('msg-erro-usuario');
        const btnSubmit = document.getElementById('btn-salvar-usuario');

        const checkboxes = document.querySelectorAll('input[name="us-permissoes"]:checked');
        const permissoes = Array.from(checkboxes).map(cb => cb.value);

        msgErro.classList.add('hidden');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...`;

        try {
            // 1. Cria o utilizador no Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: { nome_completo: nome }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Insere/Atualiza os dados de permissão na tabela 'perfis'
                const { error: perfilError } = await supabaseClient.from('perfis').insert([{
                    id: authData.user.id,
                    nome: nome,
                    usuario: usuario,
                    perfil: perfil,
                    setor: setor,
                    permissoes: permissoes
                }]);

                if (perfilError) throw perfilError;

                alert('Usuário cadastrado com sucesso!');
                carregarUsuarios(container);
            }
        } catch (err) {
            msgErro.textContent = err.message || 'Erro ao cadastrar usuário.';
            msgErro.classList.remove('hidden');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `Cadastrar Usuário`;
        }
    });
}

// Funções Auxiliares do Modal de Edição
function abrirModalEditarPermissao(id, nome, perfil, setor, permissoesStr) {
    document.getElementById('edit-usr-id').value = id;
    document.getElementById('modal-usr-titulo').textContent = `Alterar Permissões: ${nome}`;
    document.getElementById('edit-usr-perfil').value = perfil;
    document.getElementById('edit-usr-setor').value = setor;

    const listaPermissoes = permissoesStr ? permissoesStr.split(',') : [];
    const checkboxes = document.querySelectorAll('.chk-edit-perm');
    checkboxes.forEach(cb => {
        cb.checked = listaPermissoes.includes(cb.value);
    });

    document.getElementById('modal-editar-permissao').classList.remove('hidden');
}

function fecharModalEditar() {
    document.getElementById('modal-editar-permissao').classList.add('hidden');
}

async function salvarAlteracaoPermissao() {
    const id = document.getElementById('edit-usr-id').value;
    const perfil = document.getElementById('edit-usr-perfil').value;
    const setor = document.getElementById('edit-usr-setor').value;

    const checkboxes = document.querySelectorAll('.chk-edit-perm:checked');
    const permissoes = Array.from(checkboxes).map(cb => cb.value);

    const { error } = await supabaseClient
        .from('perfis')
        .update({
            perfil: perfil,
            setor: setor,
            permissoes: permissoes
        })
        .eq('id', id);

    if (error) {
        alert('Erro ao atualizar permissões: ' + error.message);
    } else {
        alert('Permissões do usuário atualizadas com sucesso!');
        fecharModalEditar();
        carregarUsuarios(document.getElementById('conteudo-pagina'));
    }
}

// ==========================================
// 6. CATEGORIAS E SUBCATEGORIAS
// ==========================================
async function carregarCategorias(container) {
    const { data: categorias } = await supabaseClient.from('categorias_problema').select('*');
    const listaCategorias = categorias || [];

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900 text-sm">Categorias Mapeadas</h3>
                <button onclick="imprimirRelatorioCategorias()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fa-solid fa-print"></i> Imprimir Relatório
                </button>
            </div>
            <ul class="divide-y divide-slate-100">
                ${listaCategorias.map(c => `
                    <li class="py-3 flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-800">${escapeHTML(c.nome)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

async function imprimirRelatorioCategorias() {
    const { data: categorias } = await supabaseClient.from('categorias_problema').select('*');
    const htmlTabela = `
        <table>
            <thead>
                <tr><th>#ID</th><th>Nome da Categoria</th></tr>
            </thead>
            <tbody>
                ${(categorias || []).map(c => `
                    <tr>
                        <td>#${c.id}</td>
                        <td><b>${escapeHTML(c.nome)}</b></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    dispararImpressao('Mapeamento de Categorias', htmlTabela);
}

// ==========================================
// 7. SETORES E LIBERAÇÕES
// ==========================================
async function carregarSetores(container) {
    const { data: setores } = await supabaseClient.from('setores_liberacoes').select('*');
    const listaSetores = setores || [];

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-slate-900 text-sm">Setores e Permissões</h3>
                <button onclick="imprimirRelatorioSetores()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i class="fa-solid fa-print"></i> Imprimir Relatório
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Setor</th><th class="p-3">Regra de Liberação</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${listaSetores.map(s => `
                            <tr>
                                <td class="p-3 font-bold">#${s.id}</td>
                                <td class="p-3 font-bold text-slate-900">${escapeHTML(s.nome)}</td>
                                <td class="p-3 text-slate-600">${escapeHTML(s.tipo_liberacao)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function imprimirRelatorioSetores() {
    const { data: setores } = await supabaseClient.from('setores_liberacoes').select('*');
    const htmlTabela = `
        <table>
            <thead>
                <tr><th>#ID</th><th>Nome do Setor</th><th>Regra / Tipo de Liberação</th></tr>
            </thead>
            <tbody>
                ${(setores || []).map(s => `
                    <tr>
                        <td>#${s.id}</td>
                        <td><b>${escapeHTML(s.nome)}</b></td>
                        <td>${escapeHTML(s.tipo_liberacao)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    dispararImpressao('Estrutura de Setores e Liberações', htmlTabela);
}
