// ==========================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO SUPABASE
// ==========================================
// IMPORTANTE: Insira aqui a sua URL e a sua chave ANON do painel do Supabase
const SUPABASE_URL = "https://legfoltyfnypowhnscwe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BJ7VdB4lwxbrSoQa-hFDXw_XdOIkk-r";

// Utiliza 'supabaseClient' para evitar conflitos com a biblioteca global da CDN
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Cliente Secundário (Exclusivo para criar novos usuários sem deslogar o ADM)
const supabaseAdminClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false // Não sobrescreve a sessão atual no navegador
    }
});

// Lista global dos módulos do sistema
const MODULOS_SISTEMA = [
    { id: 'painel', nome: 'Painel Principal' },
    { id: 'equipamentos', nome: 'Equipamentos' },
    { id: 'chamados', nome: 'Central de Chamados' },
    { id: 'meus-chamados', nome: 'Meus Chamados' },
    { id: 'usuarios', nome: 'Gerenciar Usuários' },
    { id: 'categorias', nome: 'Categorias e Subcategorias' },
    { id: 'setores', nome: 'Setores e Liberações' },
    { id: 'relatorios', nome: 'Relatórios Avançados' },
    { id: 'licencas', nome: 'Licenças de Software' }
];

// Variáveis de Estado
let paginaAtual = 'painel';
let perfilUsuarioLogado = {
    nome: 'Usuário',
    perfil: 'USER',
    permissoes: ['painel', 'chamados', 'meus-chamados']
};

// ==========================================
// EVENTOS PRINCIPAIS / INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    atualizarAno();
    iniciarRelogio();
    verificarSessao();

    // Toggle de exibição de senha no login
    const btnSenha = document.getElementById('btn-mostrar-senha');
    if (btnSenha) {
        btnSenha.addEventListener('click', () => {
            const inputSenha = document.getElementById('login-senha');
            if (inputSenha) {
                const tipo = inputSenha.getAttribute('type') === 'password' ? 'text' : 'password';
                inputSenha.setAttribute('type', tipo);
                btnSenha.querySelector('i').className = tipo === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            }
        });
    }

    // Evento de Login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', realizarLogin);
    }

    // Evento de Sair
    const btnSair = document.getElementById('btn-sair');
    if (btnSair) {
        btnSair.addEventListener('click', realizarLogout);
    }
});

function atualizarAno() {
    const anoEl = document.getElementById('ano-atual');
    if (anoEl) anoEl.textContent = new Date().getFullYear();
}

function iniciarRelogio() {
    const dataHoraEl = document.getElementById('data-hora');
    if (!dataHoraEl) return;

    const atualizar = () => {
        const agora = new Date();
        dataHoraEl.textContent = agora.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };
    atualizar();
    setInterval(atualizar, 10000);
}

// ==========================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================
async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await carregarPerfilUsuario(session.user.id);
        exibirSistema();
    } else {
        exibirLogin();
    }
}

async function carregarPerfilUsuario(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('perfis')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (data) {
            perfilUsuarioLogado = data;
            const nomeMenu = document.getElementById('nome-usuario-menu');
            const perfilMenu = document.getElementById('perfil-usuario-menu');
            const badgePerfil = document.getElementById('perfil-usuario');

            if (nomeMenu) nomeMenu.textContent = data.nome;
            if (perfilMenu) perfilMenu.textContent = data.perfil === 'ADM' ? 'Administrador' : 'Usuário';
            if (badgePerfil) {
                badgePerfil.innerHTML = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold ${data.perfil === 'ADM' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}">${data.perfil}</span>`;
            }
        }
    } catch (err) {
        console.error('Erro ao carregar perfil do usuário:', err);
    }
}

async function realizarLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const msgErro = document.getElementById('mensagem-erro');
    const btnSubmit = document.getElementById('btn-login-submit');

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Entrando...`;
    msgErro.classList.add('hidden');

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;

        await carregarPerfilUsuario(data.user.id);
        exibirSistema();
    } catch (err) {
        msgErro.textContent = "Erro ao entrar: " + (err.message || "Credenciais inválidas");
        msgErro.classList.remove('hidden');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema`;
    }
}

async function realizarLogout() {
    await supabaseClient.auth.signOut();
    exibirLogin();
}

function exibirLogin() {
    document.getElementById('tela-login').classList.remove('hidden');
    document.getElementById('sistema').classList.add('hidden');
}

function exibirSistema() {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('sistema').classList.remove('hidden');
    navegarPara('painel');
}

// ==========================================
// CONSTRUÇÃO DA HOTBAR / NAVEGAÇÃO
// ==========================================
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
        { id: 'setores', icone: 'fa-building-shield', nome: 'Setores e Liberações', desc: 'Hierarquia e Permissões' },
        { id: 'relatorios', icone: 'fa-file-chart-column', nome: 'Relatórios Avançados', desc: 'Métricas e Análises' },
        { id: 'licencas', icone: 'fa-key', nome: 'Licenças de Software', desc: 'Chaves e Validades' }
    ];

    const itensFiltrados = perfilUsuarioLogado.perfil === 'ADM' 
        ? todosItens 
        : todosItens.filter(item => permissoesUsuario.includes(item.id));

    menu.innerHTML = itensFiltrados.map(item => `
        <button onclick="navegarPara('${item.id}')" 
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-1 ${paginaAtual === item.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}">
            <i class="fa-solid ${item.icone} text-base w-5 text-center"></i>
            <div class="text-left min-w-0 flex-1">
                <p class="font-semibold text-xs leading-tight truncate">${item.nome}</p>
                <p class="text-[10px] opacity-75 truncate">${item.desc}</p>
            </div>
        </button>
    `).join('');
}

function navegarPara(pagina) {
    paginaAtual = pagina;
    construirMenu();

    const conteudo = document.getElementById('conteudo-pagina');
    const tituloEl = document.getElementById('titulo-pagina');
    if (!conteudo) return;

    switch(pagina) {
        case 'painel': 
            if (tituloEl) tituloEl.textContent = 'Painel Principal';
            carregarPainel(conteudo); 
            break;
        case 'equipamentos': 
            if (tituloEl) tituloEl.textContent = 'Equipamentos';
            carregarEquipamentos(conteudo); 
            break;
        case 'chamados': 
            if (tituloEl) tituloEl.textContent = 'Central de Chamados';
            carregarChamados(conteudo); 
            break;
        case 'meus-chamados': 
            if (tituloEl) tituloEl.textContent = 'Meus Chamados';
            carregarMeusChamados(conteudo); 
            break;
        case 'usuarios': 
            if (tituloEl) tituloEl.textContent = 'Gerenciar Usuários';
            carregarUsuarios(conteudo); 
            break;
        case 'categorias': 
            if (tituloEl) tituloEl.textContent = 'Categorias e Subcategorias';
            carregarCategorias(conteudo); 
            break;
        case 'setores': 
            if (tituloEl) tituloEl.textContent = 'Setores e Liberações';
            carregarSetores(conteudo); 
            break;
        case 'relatorios': 
            if (tituloEl) tituloEl.textContent = 'Relatórios Avançados';
            carregarRelatorios(conteudo); 
            break;
        case 'licencas': 
            if (tituloEl) tituloEl.textContent = 'Licenças de Software';
            carregarLicencas(conteudo); 
            break;
    }
}

// ==========================================
// CARREGAMENTO DAS TELAS
// ==========================================

// 1. PAINEL PRINCIPAL
async function carregarPainel(container) {
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p class="text-xs font-semibold text-slate-400">Total de Chamados</p>
                <h4 id="dash-total-chamados" class="text-2xl font-bold text-slate-900 mt-1">...</h4>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p class="text-xs font-semibold text-slate-400">Equipamentos Ativos</p>
                <h4 id="dash-total-equipamentos" class="text-2xl font-bold text-slate-900 mt-1">...</h4>
            </div>
            <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p class="text-xs font-semibold text-slate-400">Usuários Ativos</p>
                <h4 id="dash-total-usuarios" class="text-2xl font-bold text-slate-900 mt-1">...</h4>
            </div>
        </div>
    `;

    const { count: countChamados } = await supabaseClient.from('chamados').select('*', { count: 'exact', head: true });
    const { count: countEquip } = await supabaseClient.from('equipamentos').select('*', { count: 'exact', head: true });
    const { count: countUser } = await supabaseClient.from('perfis').select('*', { count: 'exact', head: true });

    document.getElementById('dash-total-chamados').textContent = countChamados || 0;
    document.getElementById('dash-total-equipamentos').textContent = countEquip || 0;
    document.getElementById('dash-total-usuarios').textContent = countUser || 0;
}

// 2. GERENCIAR USUÁRIOS E PERMISSÕES
async function carregarUsuarios(container) {
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            
            <!-- FORMULÁRIO DE CADASTRO -->
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-fit">
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        <i class="fa-solid fa-user-plus"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-sm">Novo Usuário</h3>
                        <p class="text-[11px] text-slate-500">Cadastre o usuário e defina os acessos</p>
                    </div>
                </div>

                <form id="form-novo-usuario" onsubmit="salvarNovoUsuario(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
                        <input type="text" id="novo-nome" class="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: João Silva" required>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Nome de Usuário (login)</label>
                        <input type="text" id="novo-usuario-login" class="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: joaosilva" required>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">E-mail de Acesso</label>
                        <input type="email" id="novo-email" class="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="joao@empresa.com" required>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Senha Inicial</label>
                        <input type="password" id="nova-senha" class="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Mínimo 6 caracteres" minlength="6" required>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Perfil</label>
                            <select id="novo-perfil" class="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="USER">USER (Comum)</option>
                                <option value="ADM">ADM (Administrador)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Setor</label>
                            <input type="text" id="novo-setor" class="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: TI, RH, Financeiro">
                        </div>
                    </div>

                    <!-- SELEÇÃO DE PERMISSÕES/MENUS -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-2">Permissões de Acesso aos Menus:</label>
                        <div class="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            ${MODULOS_SISTEMA.map(m => `
                                <label class="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 cursor-pointer transition-all">
                                    <input type="checkbox" name="permissoes-modulo" value="${m.id}" class="rounded text-indigo-600 focus:ring-indigo-500" checked>
                                    <span class="text-xs font-medium text-slate-700">${m.nome}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div id="mensagem-status-usuario" class="text-xs hidden p-2.5 rounded-xl"></div>

                    <button type="submit" id="btn-cadastrar-usuario" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-plus"></i> Cadastrar Usuário
                    </button>
                </form>
            </div>

            <!-- LISTA DE USUÁRIOS -->
            <div class="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 class="font-bold text-slate-900 text-sm mb-4">Usuários Cadastrados</h3>
                <div id="loading-usuarios" class="text-xs text-slate-500">Carregando usuários...</div>
                <div id="container-tabela-usuarios" class="hidden overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-600">
                        <thead class="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                            <tr>
                                <th class="p-3">Nome / Usuário</th>
                                <th class="p-3">Perfil</th>
                                <th class="p-3">Setor</th>
                                <th class="p-3">Permissões</th>
                            </tr>
                        </thead>
                        <tbody id="lista-usuarios-body" class="divide-y divide-slate-100"></tbody>
                    </table>
                </div>
            </div>

        </div>
    `;

    await listarUsuariosCadastrados();
}

async function salvarNovoUsuario(e) {
    e.preventDefault();

    const statusEl = document.getElementById('mensagem-status-usuario');
    const btnSubmit = document.getElementById('btn-cadastrar-usuario');

    const nome = document.getElementById('novo-nome').value.trim();
    const usuarioLogin = document.getElementById('novo-usuario-login').value.trim();
    const email = document.getElementById('novo-email').value.trim();
    const senha = document.getElementById('nova-senha').value;
    const perfil = document.getElementById('novo-perfil').value;
    const setor = document.getElementById('novo-setor').value.trim() || 'Geral';

    const checkboxes = document.querySelectorAll('input[name="permissoes-modulo"]:checked');
    const permissoes = Array.from(checkboxes).map(cb => cb.value);

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando...`;
    statusEl.classList.add('hidden');

    try {
        // 1. Cria usuário no Auth via cliente secundário
        const { data: authData, error: authError } = await supabaseAdminClient.auth.signUp({
            email: email,
            password: senha
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Não foi possível criar o usuário no sistema de autenticação.");

        const novoUserId = authData.user.id;

        // 2. Grava os dados complementares na tabela public.perfis
        const { error: perfilError } = await supabaseClient
            .from('perfis')
            .insert([
                {
                    id: novoUserId,
                    nome: nome,
                    usuario: usuarioLogin,
                    perfil: perfil,
                    setor: setor,
                    permissoes: permissoes
                }
            ]);

        if (perfilError) throw perfilError;

        statusEl.className = "text-xs p-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-medium block";
        statusEl.textContent = "Usuário cadastrado com sucesso!";
        
        document.getElementById('form-novo-usuario').reset();
        await listarUsuariosCadastrados();

    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        statusEl.className = "text-xs p-2.5 rounded-xl bg-rose-50 text-rose-700 font-medium block";
        statusEl.textContent = "Erro: " + (err.message || 'Falha ao cadastrar usuário.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="fa-solid fa-plus"></i> Cadastrar Usuário`;
    }
}

async function listarUsuariosCadastrados() {
    const loadingEl = document.getElementById('loading-usuarios');
    const containerTabela = document.getElementById('container-tabela-usuarios');
    const tbody = document.getElementById('lista-usuarios-body');

    if (!tbody) return;

    const { data: usuarios, error } = await supabaseClient
        .from('perfis')
        .select('*')
        .order('nome', { ascending: true });

    if (error) {
        if (loadingEl) loadingEl.textContent = 'Erro ao carregar lista de usuários: ' + error.message;
        return;
    }

    if (loadingEl) loadingEl.classList.add('hidden');
    if (containerTabela) containerTabela.classList.remove('hidden');

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhum usuário cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = usuarios.map(u => `
        <tr class="hover:bg-slate-50 transition-all">
            <td class="p-3">
                <p class="font-semibold text-slate-900">${u.nome}</p>
                <p class="text-[10px] text-slate-400">@${u.usuario}</p>
            </td>
            <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.perfil === 'ADM' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}">
                    ${u.perfil}
                </span>
            </td>
            <td class="p-3 text-slate-500">${u.setor || 'N/A'}</td>
            <td class="p-3">
                <div class="flex flex-wrap gap-1">
                    ${(u.permissoes || []).map(p => `
                        <span class="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600 font-medium">${p}</span>
                    `).join('')}
                </div>
            </td>
        </tr>
    `).join('');
}

// 3. LICENÇAS DE SOFTWARE
async function carregarLicencas(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h3 class="font-bold text-slate-900 text-sm">Gestão de Licenças de Software</h3>
                    <p class="text-xs text-slate-500">Controle de chaves e licenças ativas na empresa</p>
                </div>
            </div>
            <div id="loading-licencas" class="text-xs text-slate-500">Carregando licenças do banco de dados...</div>
            <div id="container-tabela-licencas" class="hidden overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-600">
                    <thead class="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                        <tr>
                            <th class="p-3">Software</th>
                            <th class="p-3">Chave de Licença</th>
                            <th class="p-3">Quantidade</th>
                            <th class="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody id="lista-licencas-body" class="divide-y divide-slate-100"></tbody>
                </table>
            </div>
        </div>
    `;

    const { data: licencas, error } = await supabaseClient.from('licencas').select('*');
    const loadingEl = document.getElementById('loading-licencas');
    const containerTabela = document.getElementById('container-tabela-licencas');
    const tbody = document.getElementById('lista-licencas-body');

    if (error) {
        if (loadingEl) loadingEl.textContent = 'Erro ao carregar licenças: ' + error.message;
        return;
    }

    if (loadingEl) loadingEl.classList.add('hidden');
    if (containerTabela) containerTabela.classList.remove('hidden');

    if (licencas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma licença cadastrada na tabela public.licencas.</td></tr>`;
        return;
    }

    tbody.innerHTML = licencas.map(item => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-medium text-slate-900">${item.software}</td>
            <td class="p-3 font-mono text-slate-500">${item.chave_licenca}</td>
            <td class="p-3">${item.quantidade || 1}</td>
            <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    ${item.status || 'Ativa'}
                </span>
            </td>
        </tr>
    `).join('');
}

// 4. RELATÓRIOS AVANÇADOS
async function carregarRelatorios(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-1">Relatórios e Métricas</h3>
            <p class="text-xs text-slate-500 mb-6">Visão geral do atendimento e infraestrutura</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 class="font-semibold text-xs text-slate-700 mb-2">Chamados por Categoria</h4>
                    <p class="text-xs text-slate-400">Em breve gráficos comparativos...</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 class="font-semibold text-xs text-slate-700 mb-2">Equipamentos por Setor</h4>
                    <p class="text-xs text-slate-400">Em breve gráficos comparativos...</p>
                </div>
            </div>
        </div>
    `;
}

// 5. MÓDULOS PADRÃO DO SISTEMA
async function carregarEquipamentos(container) {
    container.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><h3 class="font-bold text-slate-900 text-sm">Equipamentos</h3></div>`;
}

async function carregarChamados(container) {
    container.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><h3 class="font-bold text-slate-900 text-sm">Central de Chamados</h3></div>`;
}

async function carregarMeusChamados(container) {
    container.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><h3 class="font-bold text-slate-900 text-sm">Meus Chamados</h3></div>`;
}

async function carregarCategorias(container) {
    container.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><h3 class="font-bold text-slate-900 text-sm">Categorias e Subcategorias</h3></div>`;
}

async function carregarSetores(container) {
    container.innerHTML = `<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"><h3 class="font-bold text-slate-900 text-sm">Setores e Liberações</h3></div>`;
}
