// ==========================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO SUPABASE
// ==========================================
// IMPORTANTE: Altere estas duas variáveis com as credenciais do seu painel Supabase
const SUPABASE_URL = "https://legfoltyfnypowhnscwe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BJ7VdB4lwxbrSoQa-hFDXw_XdOIkk-r";

// Cria o cliente atribuindo à variável global sem usar 'const' para evitar conflito com a biblioteca CDN
supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Prevenção de vulnerabilidades XSS ao renderizar HTML dinâmico
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

    // Verificar se já existe uma sessão ativa no Supabase
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
        perfilUsuarioLogado = {
            nome: user.email ? user.email.split('@')[0] : 'Usuário',
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

// 1. PAINEL PRINCIPAL
async function carregarPainel(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando indicadores...</div>`;

    const { data: chamados } = await supabaseClient.from('chamados').select('*');
    const { data: equipamentos } = await supabaseClient.from('equipamentos').select('*');

    const listaChamados = chamados || [];
    const listaEquipamentos = equipamentos || [];

    const abertos = listaChamados.filter(c => c.status === 'Aberto').length;
    const ativos = listaEquipamentos.filter(e => e.status === 'Ativo').length;
    const manutencao = listaEquipamentos.filter(e => e.status === 'Manutenção').length;
    const totalChamados = listaChamados.length;
    const taxaResolucao = totalChamados > 0 ? (((totalChamados - abertos) / totalChamados) * 100).toFixed(1) : 100;

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 w-full">
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Equipamentos Ativos</span>
                <h4 class="text-3xl font-black text-slate-900 mt-1">${ativos}</h4>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Chamados Abertos</span>
                <h4 class="text-3xl font-black text-rose-600 mt-1">${abertos}</h4>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Em Manutenção</span>
                <h4 class="text-3xl font-black text-amber-600 mt-1">${manutencao}</h4>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Taxa de Resolução</span>
                <h4 class="text-3xl font-black text-emerald-600 mt-1">${taxaResolucao}%</h4>
            </div>
        </div>
    `;
}

// 2. EQUIPAMENTOS
async function carregarEquipamentos(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando equipamentos...</div>`;

    const { data: equipamentos } = await supabaseClient.from('equipamentos').select('*').order('id', { ascending: false });

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
            <h3 class="font-bold text-slate-900 text-sm mb-4">Parque de Ativos Cadastrados</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">Patrimônio</th><th class="p-3">Tipo / Modelo</th><th class="p-3">Setor</th><th class="p-3">Responsável</th><th class="p-3">Status</th><th class="p-3 text-right">Ações</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${(equipamentos || []).map(e => `
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

async function removerEquipamento(id) {
    if (!confirm("Deseja realmente remover este equipamento?")) return;
    await supabaseClient.from('equipamentos').delete().eq('id', id);
    carregarEquipamentos(document.getElementById('conteudo-pagina'));
}

// 3. CENTRAL DE CHAMADOS
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
            <h3 class="font-bold text-slate-900 text-sm mb-4">Todos os Chamados</h3>
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

async function fecharChamado(id) {
    await supabaseClient.from('chamados').update({ status: 'Concluído' }).eq('id', id);
    carregarChamados(document.getElementById('conteudo-pagina'));
}

// 4. MEUS CHAMADOS
async function carregarMeusChamados(container) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Carregando seus chamados...</div>`;

    const { data: meus } = await supabaseClient
        .from('chamados')
        .select('*')
        .eq('solicitante_id', usuarioLogado.id)
        .order('id', { ascending: false });

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Meus Chamados Solicitados</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Categoria</th><th class="p-3">Descrição</th><th class="p-3">Status</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${(meus || []).length > 0 ? (meus || []).map(c => `
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

// 5. GERENCIAR USUÁRIOS
async function carregarUsuarios(container) {
    const { data: perfis } = await supabaseClient.from('perfis').select('*');

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Usuários Cadastrados no Banco</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">Nome / Usuário</th><th class="p-3">Setor</th><th class="p-3">Perfil</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${(perfis || []).map(u => `
                            <tr>
                                <td class="p-3 font-bold">${escapeHTML(u.nome)}<br><span class="font-normal text-slate-400">@${escapeHTML(u.usuario)}</span></td>
                                <td class="p-3">${escapeHTML(u.setor || 'N/A')}</td>
                                <td class="p-3 font-semibold">${escapeHTML(u.perfil)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 6. CATEGORIAS
async function carregarCategorias(container) {
    const { data: categorias } = await supabaseClient.from('categorias_problema').select('*');

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Categorias Mapeadas</h3>
            <ul class="divide-y divide-slate-100">
                ${(categorias || []).map(c => `
                    <li class="py-3 flex justify-between items-center text-xs">
                        <span class="font-bold text-slate-800">${escapeHTML(c.nome)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

// 7. SETORES E LIBERAÇÕES
async function carregarSetores(container) {
    const { data: setores } = await supabaseClient.from('setores_liberacoes').select('*');

    container.innerHTML = `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 w-full">
            <h3 class="font-bold text-slate-900 text-sm mb-4">Setores e Permissões</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-700">
                    <thead class="bg-slate-50 uppercase text-[10px] text-slate-500">
                        <tr><th class="p-3">#ID</th><th class="p-3">Setor</th><th class="p-3">Regra de Liberação</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${(setores || []).map(s => `
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
