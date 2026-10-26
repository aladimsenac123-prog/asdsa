# 🧬 HealthTech BioAuth — "Você é a sua senha"

Aplicação web de **Controle de Acesso Biométrico e Ponto Eletrônico** desenvolvida para um laboratório de pesquisas clínicas (HealthTech), eliminando fraudes de empréstimo de crachás e senhas por meio de reconhecimento facial em tempo real com **`face-api.js`** e **Node.js + SQLite**.

---

## 🚀 Funcionalidades Entregues

1. **Cadastro Biométrico (`/`)**:
   - Captura em tempo real dos **68 pontos faciais (*Landmarks*)** e extração do **vetor biométrico de 128 dimensões (*Face Descriptor*)** via `face-api.js`.
   - Prevenção de duplicidade biométrica (impede que um mesmo rosto seja cadastrado para duas contas diferentes).
   - **Termo Obrigatório de Uso e LGPD** integrado na tela de cadastro.
2. **Login Facial Automático Zero-Senha (`/`)**:
   - Reconhecimento automático pela webcam sem necessidade de digitar senhas.
   - Cálculo de **Distância Euclidiana** no servidor (`< 0.55`) e validação de qualidade mínima de imagem (`>= 72%`).
3. **Painel Secreto Nível 3 (`/painel.html`)**:
   - Rota protegida por sessão (`express-session` + cookie `httpOnly`).
   - Registro de batida de ponto biométrico e liberação de áreas restritas com log de auditoria em tempo real.

---

## 🛡️ Relatório de Reflexão de Segurança e LGPD

### 1. O que acontece se a câmera estiver embaçada ou com baixa iluminação?
* **Impacto Técnico:** A rede neural (`TinyFaceDetector` / `FaceLandmark68Net`) terá queda no *Confidence Score* ao localizar os contornos dos olhos, nariz e boca, gerando **Falsos Negativos** (não reconhece o colaborador legítimo) ou extraindo um vetor ruidoso.
* **Mitigação Implementada no Sistema:** O frontend monitora em tempo real o `detection.score`. Caso a nitidez fique abaixo de **72%**, o sistema bloqueia a captura/autenticação e exibe o alerta visual `"Imagem Embaçada / Baixa Luz — Limpe a câmera ou melhore a iluminação"`. Em ambiente produtivo hospitalar, recomenda-se câmera com infravermelho (IR) e contingência via MFA/token físico temporário supervisionado.

### 2. E se um invasor colocar uma foto impressa do funcionário na frente da webcam (Ataque de *Spoofing*)?
* **Impacto Técnico:** Câmeras RGB 2D convencionais podem ser enganadas por fotos impressas ou telas de celular (*Presentation Attack / Spoofing*), pois a geometria 2D dos 68 pontos faciais permanece proporcional na fotografia.
* **Soluções de Mitigação (*Liveness Detection*):**
  - **Desafio-Resposta Ativo (*Active Liveness*):** Exigir que o usuário pisque os olhos (monitorando o *Eye Aspect Ratio - EAR* pelos pontos dos olhos no `faceLandmark68Net`) ou movimente a cabeça antes de validar o login.
  - **Liveness Passivo / Sensores 3D:** Uso de análise de textura/reflexo de superfície (redes anti-spoofing baseadas em padrões Moiré e reflexão especular) ou câmeras com sensor de profundidade infravermelho (Time-of-Flight / Structured Light, similar ao FaceID).

### 3. Como a LGPD trata o armazenamento dessas fotos no banco de dados?
* **Enquadramento Legal:** Pela **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**, dados biométricos são classificados como **Dados Pessoais Sensíveis (Art. 5º, inciso II)**, exigindo bases legais estritas como **Consentimento específico e destacado (Art. 11, I)** ou **Prevenção à fraude e segurança do titular (Art. 11, II, 'g')**.
* **Arquitetura *Privacy by Design* Implementada:**
  - **Nenhuma foto é salva no banco de dados:** Aplicamos o **Princípio da Minimização de Dados (Art. 6º, III)**. A imagem da webcam é processada exclusivamente na memória RAM do navegador do usuário e descartada imediatamente.
  - **Vetor Matemático Irreversível:** Apenas o array numérico de 128 números de ponto flutuante (`face_descriptor`) é transmitido e armazenado no SQLite. A partir desse vetor matemático não é possível reconstruir a fotografia original do colaborador.

---

## 📜 Documento de Termos de Uso e LGPD (Exibido na Tela de Cadastro)

> *"Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - Art. 5º, II e Art. 11), informamos que sua imagem capturada pela webcam é processada exclusivamente em memória local no seu navegador para a extração de um descritor biométrico matemático irreversível (vetor numérico de 128 dimensões). Nenhuma fotografia ou vídeo do seu rosto é salvo no banco de dados (Princípio da Minimização de Dados). O vetor biométrico será utilizado única e exclusivamente para autenticação intransferível de ponto e prevenção a fraudes de controle de acesso às áreas restritas do laboratório HealthTech."*

---

## 💻 Como Executar o Projeto Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor
npm start

# 3. Acessar no navegador
http://localhost:3000
```
