/* ==========================================================================
   SISTEMA DE GESTÃO DE CHAMADOS - VERSÃO MONOLÍTICA LOCAL
   ========================================================================== */

// --- BANCO DE DADOS LOCAL (LOCALSTORAGE) ---
const DB = {
    get: (chave) => JSON.parse(localStorage.getItem(chave)) || null,
    set: (chave, valor) => localStorage.setItem(chave, JSON.stringify(valor)),
    init: () => {
        if (!DB.get('usuarios')) {
            // Usuário admin padrão se a base estiver vazia
            DB.set('usuarios', [{
                id: '1',
                nome: 'Administrador',
                email: 'admin@admin.com',
                senha: DB.hashSenha('admin123'),
                cargo: 'Administrador',
                departamento: 'TI',
                nivelAcesso: 'Admin',
                status: 'Ativo'
            }]);
        }
        if (!DB.get('chamados')) DB.set('chamados', []);
        if (!DB.get('historicoAlteracoes')) DB.set('historicoAlteracoes', []);
        if (!DB.get('configAparencia')) {
            DB.set('configAparencia', {
                nomeEmpresa: 'Sistema de Chamados',
                corPrimaria: '#2563eb',
                logoUrl: ''
            });
        }
    },
    hashSenha: (senha) => {
        // Criptografia simples/mock para uso em cliente local
        return btoa(senha);
    }
};

// Inicializa a estrutura de dados local
DB.init();

// --- ESTADO GLOBAL DA APLICAÇÃO ---
let usuarioLogado = DB.get('usuarioLogado') || null;

// --- REGISTRO DE LOGS DE AUDITORIA ---
function registrarLog(acao, detalhe) {
    const historico = DB.get('historicoAlteracoes') || [];
    historico.push({
        id: Date.now().toString(),
        dataHora: new Date().toLocaleString('pt-BR'),
        usuario: usuarioLogado ? usuarioLogado.nome : 'Sistema',
        acao: acao,
        detalhe: detalhe
    });
    DB.set('historicoAlteracoes', historico);
}

// --- CONTROLE DE PERMISSÕES (RBAC) ---
function validarPermissaoAdmin() {
    if (!usuarioLogado || usuarioLogado.nivelAcesso !== 'Admin') {
        alert('Acesso negado. Esta função requer privilégios de Administrador.');
        return false;
    }
    return true;
}

// --- GESTÃO DE PERFIL E AUTENTICAÇÃO ---
function autenticarUsuario(email, senha) {
    const usuarios = DB.get('usuarios') || [];
    const hash = DB.hashSenha(senha);
    const usuario = usuarios.find(u => u.email === email && u.senha === hash);

    if (usuario) {
        if (usuario.status !== 'Ativo') {
            alert('Usuário inativo. Entre em contato com o administrador.');
            return false;
        }
        usuarioLogado = usuario;
        DB.set('usuarioLogado', usuario);
        registrarLog('Login', `Usuário ${usuario.nome} realizou login.`);
        return true;
    }
    alert('E-mail ou senha incorretos.');
    return false;
}

function encerrarSessao() {
    if (usuarioLogado) {
        registrarLog('Logout', `Usuário ${usuarioLogado.nome} encerrou a sessão.`);
    }
    usuarioLogado = null;
    localStorage.removeItem('usuarioLogado');
    window.location.reload();
}

function atualizarPerfil(novosDados) {
    if (!usuarioLogado) return;
    const usuarios = DB.get('usuarios') || [];
    const index = usuarios.findIndex(u => u.id === usuarioLogado.id);

    if (index !== -1) {
        usuarios[index] = { ...usuarios[index], ...novosDados };
        if (novosDados.novaSenha) {
            usuarios[index].senha = DB.hashSenha(novosDados.novaSenha);
        }
        DB.set('usuarios', usuarios);
        usuarioLogado = usuarios[index];
        DB.set('usuarioLogado', usuarioLogado);
        registrarLog('Atualização de Perfil', `Perfil do usuário ${usuarioLogado.nome} atualizado.`);
        alert('Perfil atualizado com sucesso!');
    }
}

// --- GESTÃO DE APARÊNCIA ---
function salvarConfigAparencia(nomeEmpresa, corPrimaria, logoBase64) {
    if (!validarPermissaoAdmin()) return;
    
    const config = {
        nomeEmpresa: nomeEmpresa,
        corPrimaria: corPrimaria,
        logoUrl: logoBase64 || (DB.get('configAparencia')?.logoUrl || '')
    };
    
    DB.set('configAparencia', config);
    aplicarTema();
    registrarLog('Configuração', 'Configurações de aparência da empresa atualizadas.');
    alert('Aparência atualizada!');
}

function aplicarTema() {
    const config = DB.get('configAparencia');
    if (config) {
        document.documentElement.style.setProperty('--primary-color', config.corPrimaria);
        const elementosNome = document.querySelectorAll('.empresa-nome');
        elementosNome.forEach(el => el.textContent = config.nomeEmpresa);
        
        if (config.logoUrl) {
            const elementosLogo = document.querySelectorAll('.empresa-logo');
            elementosLogo.forEach(el => el.src = config.logoUrl);
        }
    }
}

// --- IMPRESSÃO DE RELATÓRIOS ---
function dispararImpressao(titulo, htmlConteudo) {
    const janelaImpressao = window.open('', '_blank', 'width=800,height=600');
    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório - ${titulo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                h1 { color: #111; border-bottom: 2px solid #ccc; padding-bottom: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
                .rodape { margin-top: 30px; font-size: 0.8em; color: #777; }
            </style>
        </head>
        <body>
            <h1>${titulo}</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')} por ${usuarioLogado ? usuarioLogado.nome : 'Sistema'}</p>
            ${htmlConteudo}
            <div class="rodape">Relatório emitido via Sistema de Gestão Interna.</div>
        </body>
        </html>
    `);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    janelaImpressao.print();
    janelaImpressao.close();
}

// --- IMPRESSÃO DO PAINEL GERAL (CORRIGIDO) ---
function imprimirRelatorioPainel() {
    const chamados = DB.get('chamados') || [];
    
    const htmlConteudo = `
        <div>
            <h3>Resumo dos Chamados Registrados</h3>
            <table>
                <thead>
                    <tr>
                        <th>Solicitante</th>
                        <th>Categoria / Subcategoria</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Data de Abertura</th>
                    </tr>
                </thead>
                <tbody>
                    ${chamados.length > 0 ? chamados.map(c => `
                        <tr>
                            <td>${c.solicitante}</td>
                            <td>${c.categoria}${c.subcategoria ? '- ' + c.subcategoria : ''}</td>
                            <td>${c.status}</td>
                            <td>${c.prioridade}</td>
                            <td>${c.data}</td>
                        </tr>
                    `).join('') : `<tr><td colspan="5" style="text-align:center;">Nenhum chamado encontrado</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    dispararImpressao('Painel Geral', htmlConteudo);
}
