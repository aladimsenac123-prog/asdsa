const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const statusModelos = document.getElementById('statusModelos');
const textoStatusModelos = document.getElementById('textoStatusModelos');
const spinnerModelos = document.getElementById('spinnerModelos');
const badgeQualidade = document.getElementById('badgeQualidade');
const valorConfianca = document.getElementById('valorConfianca');
const barraConfianca = document.getElementById('barraConfianca');
const statusRosto = document.getElementById('statusRosto');
const logReconhecimento = document.getElementById('logReconhecimento');
const btnForcarLogin = document.getElementById('btnForcarLogin');
const btnCapturarFace = document.getElementById('btnCapturarFace');
const btnSalvarCadastro = document.getElementById('btnSalvarCadastro');
const badgeVetorCapturado = document.getElementById('badgeVetorCapturado');
const toggleAutoLogin = document.getElementById('toggleAutoLogin');
const formCadastro = document.getElementById('formCadastro');

let modelosCarregados = false;
let ultimoDescriptorDetectado = null;
let descriptorCapturadoCadastro = null;
let tentandoLogin = false;
let ultimoTimestampTentativa = 0;

function exibirAlerta(mensagem, tipo = 'info') {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show shadow-sm" role="alert">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

async function inicializarFaceApi() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        modelosCarregados = true;
        spinnerModelos.classList.add('d-none');
        statusModelos.classList.replace('alert-info', 'alert-success');
        statusModelos.classList.replace('border-info', 'border-success');
        statusModelos.classList.replace('text-info', 'text-success');
        textoStatusModelos.textContent = 'Redes neurais carregadas com sucesso! Iniciando câmera...';

        await iniciarCamera();
    } catch (erro) {
        console.error('Erro ao carregar modelos face-api.js:', erro);
        exibirAlerta('Falha ao carregar os modelos de IA do face-api.js. Verifique sua conexão.', 'danger');
    }
}

async function iniciarCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360, facingMode: 'user' },
            audio: false
        });
        video.srcObject = stream;
    } catch (erro) {
        console.error('Erro ao acessar webcam:', erro);
        badgeQualidade.className = 'badge bg-danger';
        badgeQualidade.textContent = 'Câmera Bloqueada';
        exibirAlerta('Permita o acesso à webcam no navegador para utilizar o reconhecimento facial.', 'warning');
    }
}

video.addEventListener('play', () => {
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(overlay, displaySize);

    setInterval(async () => {
        if (!modelosCarregados || video.paused || video.ended) return;

        const deteccao = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
            .withFaceLandmarks()
            .withFaceDescriptor();

        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        if (!deteccao) {
            ultimoDescriptorDetectado = null;
            valorConfianca.textContent = '0%';
            barraConfianca.style.width = '0%';
            badgeQualidade.className = 'badge bg-secondary';
            badgeQualidade.textContent = 'Nenhum rosto detectado';
            statusRosto.textContent = 'Posicione seu rosto em frente à webcam.';
            btnForcarLogin.disabled = true;
            btnCapturarFace.disabled = true;
            return;
        }

        const redimensionado = faceapi.resizeResults(deteccao, displaySize);
        faceapi.draw.drawDetections(overlay, redimensionado);
        faceapi.draw.drawFaceLandmarks(overlay, redimensionado);

        const score = Math.round(deteccao.detection.score * 100);
        valorConfianca.textContent = `${score}%`;
        barraConfianca.style.width = `${score}%`;

        // Reflexão de Segurança: Tratamento para câmera embaçada ou baixa iluminação
        if (score < 72) {
            ultimoDescriptorDetectado = null;
            badgeQualidade.className = 'badge bg-warning text-dark';
            badgeQualidade.textContent = 'Imagem Embaçada / Baixa Luz';
            statusRosto.textContent = 'Qualidade insuficiente (<72%). Limpe a câmera ou melhore a iluminação.';
            btnForcarLogin.disabled = true;
            btnCapturarFace.disabled = true;
            return;
        }

        // Rosto nítido e válido
        ultimoDescriptorDetectado = Array.from(deteccao.descriptor);
        badgeQualidade.className = 'badge bg-success';
        badgeQualidade.textContent = `Biometria Nítida (${score}%)`;
        statusRosto.textContent = '68 pontos biométricos rastreados com precisão.';
        btnForcarLogin.disabled = false;
        btnCapturarFace.disabled = false;

        // Se a aba de Login estiver ativa e o Login Automático estiver marcado, tenta autenticar a cada 3.5s
        const abaLoginAtiva = document.getElementById('tabLogin').classList.contains('active');
        const agora = Date.now();
        if (abaLoginAtiva && toggleAutoLogin.checked && !tentandoLogin && (agora - ultimoTimestampTentativa > 3500)) {
            realizarLoginFacial(ultimoDescriptorDetectado, true);
        }
    }, 350);
});

// Botão de Capturar Pontos Biométricos na aba de Cadastro
btnCapturarFace.addEventListener('click', () => {
    if (!ultimoDescriptorDetectado || ultimoDescriptorDetectado.length !== 128) {
        exibirAlerta('Posicione seu rosto com nitidez antes de capturar os pontos biométricos.', 'warning');
        return;
    }

    descriptorCapturadoCadastro = [...ultimoDescriptorDetectado];
    badgeVetorCapturado.className = 'badge bg-success';
    badgeVetorCapturado.textContent = '128 Pontos Capturados ✓';
    btnSalvarCadastro.disabled = false;
    exibirAlerta('Vetor biométrico de 128 dimensões extraído com sucesso! Preencha os dados e aceite o termo LGPD.', 'success');
});

// Submissão do Cadastro Biométrico
formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!descriptorCapturadoCadastro) {
        exibirAlerta('Capture os pontos biométricos da sua face antes de finalizar o cadastro.', 'warning');
        return;
    }

    const payload = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        setor: document.getElementById('setor').value,
        consentimentoLgpd: document.getElementById('consentimentoLgpd').checked,
        faceDescriptor: descriptorCapturadoCadastro
    };

    btnSalvarCadastro.disabled = true;
    btnSalvarCadastro.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criptografando Vetor e Salvando...';

    try {
        const res = await fetch('/api/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const dados = await res.json();

        if (!res.ok) {
            throw new Error(dados.mensagem || 'Erro ao cadastrar biometria.');
        }

        exibirAlerta(`✅ ${dados.mensagem} Agora basta olhar para a câmera na aba de Login!`, 'success');
        formCadastro.reset();
        descriptorCapturadoCadastro = null;
        badgeVetorCapturado.className = 'badge bg-warning text-dark';
        badgeVetorCapturado.textContent = 'Não capturado';

        // Muda para a aba de Login
        document.getElementById('tab-login-btn').click();
    } catch (erro) {
        exibirAlerta(`❌ ${erro.message}`, 'danger');
        btnSalvarCadastro.disabled = false;
    } finally {
        btnSalvarCadastro.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Finalizar Cadastro Biométrico';
    }
});

// Autenticação Facial no Backend
async function realizarLoginFacial(descriptor, silencioso = false) {
    if (!descriptor || tentandoLogin) return;

    tentandoLogin = true;
    ultimoTimestampTentativa = Date.now();
    logReconhecimento.innerHTML = '<span class="text-info"><i class="bi bi-arrow-repeat me-1"></i>Comparando vetor de 128 dimensões com o banco de dados...</span>';

    try {
        const res = await fetch('/api/login-facial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faceDescriptor: descriptor })
        });
        const dados = await res.json();

        if (!res.ok) {
            logReconhecimento.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>${dados.mensagem}</span>`;
            if (!silencioso) {
                exibirAlerta(dados.mensagem, 'warning');
            }
            return;
        }

        logReconhecimento.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Reconhecido: ${dados.usuario.nome} (Similaridade: ${dados.usuario.confianca}%)! Redirecionando...</span>`;
        exibirAlerta(`🔓 ${dados.mensagem} Redirecionando para o Painel Secreto...`, 'success');

        setTimeout(() => {
            window.location.href = '/painel.html';
        }, 1000);
    } catch (erro) {
        console.error('Erro no login facial:', erro);
    } finally {
        tentandoLogin = false;
    }
}

btnForcarLogin.addEventListener('click', () => {
    if (ultimoDescriptorDetectado) {
        realizarLoginFacial(ultimoDescriptorDetectado, false);
    }
});

window.addEventListener('DOMContentLoaded', inicializarFaceApi);
