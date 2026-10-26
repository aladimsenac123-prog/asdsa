function exibirAlertaPainel(mensagem, tipo = 'success') {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show shadow-sm" role="alert">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

async function verificarSessaoPainel() {
    try {
        const res = await fetch('/api/perfil');
        if (!res.ok) {
            window.location.href = '/';
            return;
        }
        const dados = await res.json();
        document.getElementById('nomeColaborador').textContent = dados.usuario.nome;
        document.getElementById('emailColaborador').textContent = dados.usuario.email;
        document.getElementById('setorColaborador').textContent = dados.usuario.setor;
        document.getElementById('badgeConfiancaSessao').innerHTML = `<i class="bi bi-fingerprint me-1"></i> Precisão Biométrica: ${dados.usuario.confiancaSessao}%`;

        await carregarHistorico();
    } catch (erro) {
        window.location.href = '/';
    }
}

async function carregarHistorico() {
    try {
        const res = await fetch('/api/ponto');
        if (!res.ok) return;
        const dados = await res.json();

        document.getElementById('totalColaboradores').textContent = dados.totalColaboradores;
        const tbody = document.getElementById('tabelaRegistros');

        if (!dados.registros || dados.registros.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-4">Nenhum registro encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = dados.registros.map(r => `
            <tr>
                <td class="fw-bold text-white">${r.nome}</td>
                <td><span class="badge bg-secondary">${r.setor}</span></td>
                <td><span class="badge bg-info text-dark">${r.tipo}</span></td>
                <td class="text-success fw-bold">${r.confianca ? r.confianca + '%' : '99%'}</td>
                <td class="small text-secondary">${r.data} às ${r.hora}</td>
            </tr>
        `).join('');
    } catch (erro) {
        console.error('Erro ao carregar histórico:', erro);
    }
}

async function registrarPonto(tipo) {
    try {
        const res = await fetch('/api/ponto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo })
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.mensagem);

        exibirAlertaPainel(`✅ ${dados.mensagem}`, 'success');
        await carregarHistorico();
    } catch (erro) {
        exibirAlertaPainel(`❌ ${erro.message}`, 'danger');
    }
}

document.getElementById('btnLogout').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
});

window.addEventListener('DOMContentLoaded', verificarSessaoPainel);
