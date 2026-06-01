import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const goalOptions = {
  musculacao: [
    ["hipertrofia", "Hipertrofia"],
    ["forca", "Força"],
    ["emagrecimento", "Emagrecimento e definição"],
  ],
  corrida: [
    ["5k", "5 km"],
    ["10k", "10 km"],
    ["21k", "21 km"],
    ["condicionamento", "Condicionamento geral"],
  ],
  casa: [
    ["hiit", "HIIT"],
    ["forca", "Força com peso corporal"],
    ["mobilidade", "Mobilidade e condicionamento"],
  ],
};

const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const state = {
  plan: [],
  activeIndex: 0,
  profile: {},
  planStartDate: null,
  checkins: JSON.parse(localStorage.getItem("forgeCheckins") || "{}"),
  currentUser: null,
  cloudReady: false,
};

const $ = (id) => document.getElementById(id);
let auth = null;
let db = null;

const movementLinks = {
  "Agachamento livre": "https://www.youtube.com/results?search_query=como+fazer+agachamento+livre+correto",
  "Supino reto": "https://www.youtube.com/results?search_query=como+fazer+supino+reto+correto",
  "Remada curvada": "https://www.youtube.com/results?search_query=como+fazer+remada+curvada+correta",
  "Levantamento terra romeno": "https://www.youtube.com/results?search_query=levantamento+terra+romeno+execucao",
  "Desenvolvimento militar": "https://www.youtube.com/results?search_query=desenvolvimento+militar+execucao+correta",
  "Barra fixa ou puxada alta": "https://www.youtube.com/results?search_query=barra+fixa+ou+puxada+alta+execucao",
  "Leg press": "https://www.youtube.com/results?search_query=leg+press+execucao+correta",
  "Cadeira extensora": "https://www.youtube.com/results?search_query=cadeira+extensora+execucao+correta",
  "Mesa flexora": "https://www.youtube.com/results?search_query=mesa+flexora+execucao+correta",
  "Elevação lateral": "https://www.youtube.com/results?search_query=elevacao+lateral+execucao+correta",
  "Rosca direta": "https://www.youtube.com/results?search_query=rosca+direta+execucao+correta",
  "Tríceps corda": "https://www.youtube.com/results?search_query=triceps+corda+execucao+correta",
  "Flexão de braços": "https://www.youtube.com/results?search_query=flexao+de+bracos+execucao+correta",
  "Afundo alternado": "https://www.youtube.com/results?search_query=afundo+alternado+execucao+correta",
  "Prancha": "https://www.youtube.com/results?search_query=prancha+abdominal+execucao+correta",
  "Burpee": "https://www.youtube.com/results?search_query=burpee+execucao+correta",
  "Mountain climber": "https://www.youtube.com/results?search_query=mountain+climber+execucao+correta",
  "Polichinelo": "https://www.youtube.com/results?search_query=polichinelo+execucao+correta",
};

const strengthSessions = [
  {
    title: "Treino A - Peito, ombros e tríceps",
    focus: "Empurrar | Hipertrofia",
    exercises: [
      ex("Supino reto", "4x8-10", "90s", "RPE 8", "Escápulas firmes, pés no chão e barra descendo controlada ao meio do peito."),
      ex("Desenvolvimento militar", "3x8-10", "90s", "RPE 8", "Contraia glúteos e abdômen para proteger a lombar."),
      ex("Supino inclinado com halteres", "3x10-12", "75s", "RPE 8", "Desça até alongar o peitoral e suba sem bater os halteres."),
      ex("Elevação lateral", "4x12-15", "45s", "RPE 9", "Cotovelos levemente flexionados e movimento sem impulso."),
      ex("Tríceps corda", "3x12-15", "60s", "RPE 8", "Abra a corda no final e mantenha os cotovelos parados."),
    ],
  },
  {
    title: "Treino B - Costas e bíceps",
    focus: "Puxar | Volume técnico",
    exercises: [
      ex("Barra fixa ou puxada alta", "4x6-10", "90s", "RPE 8", "Inicie puxando as escápulas para baixo antes de dobrar os cotovelos."),
      ex("Remada curvada", "4x8-10", "90s", "RPE 8", "Coluna neutra, peito aberto e barra vindo em direção ao umbigo."),
      ex("Remada baixa", "3x10-12", "75s", "RPE 8", "Pause um segundo com as escápulas unidas."),
      ex("Face pull", "3x12-15", "60s", "RPE 7", "Puxe na linha do rosto e gire os punhos para trás."),
      ex("Rosca direta", "3x10-12", "60s", "RPE 8", "Sem balançar o tronco; controle a descida."),
    ],
  },
  {
    title: "Treino C - Pernas completas",
    focus: "Inferiores | Base forte",
    exercises: [
      ex("Agachamento livre", "4x6-10", "120s", "RPE 8", "Joelhos acompanham a ponta dos pés e tronco firme."),
      ex("Leg press", "4x10-12", "90s", "RPE 8", "Desça com amplitude segura e não trave os joelhos no topo."),
      ex("Levantamento terra romeno", "3x8-10", "90s", "RPE 8", "Quadril vai para trás e halteres próximos às pernas."),
      ex("Cadeira extensora", "3x12-15", "60s", "RPE 9", "Segure um segundo no topo para recrutar quadríceps."),
      ex("Mesa flexora", "3x12-15", "60s", "RPE 9", "Controle a volta e não tire o quadril do apoio."),
    ],
  },
  {
    title: "Treino D - Ombros, braços e core",
    focus: "Detalhe | Finalização",
    exercises: [
      ex("Desenvolvimento militar", "4x6-8", "105s", "RPE 8", "Suba em linha reta e mantenha costelas baixas."),
      ex("Elevação lateral", "4x12-20", "45s", "RPE 9", "Mantenha tensão constante sem relaxar no fim."),
      ex("Rosca direta", "3x8-12", "60s", "RPE 8", "Punhos neutros e cotovelos próximos ao tronco."),
      ex("Tríceps corda", "3x10-15", "60s", "RPE 8", "Extensão completa sem jogar ombros para frente."),
      ex("Prancha", "4x30-45s", "45s", "Firme", "Linha reta da cabeça aos calcanhares."),
    ],
  },
  {
    title: "Treino E - Full body metabólico",
    focus: "Corpo todo | Gasto calórico",
    exercises: [
      ex("Agachamento livre", "3x10", "75s", "RPE 7", "Carga moderada e execução perfeita."),
      ex("Supino reto", "3x10", "75s", "RPE 7", "Ritmo controlado e sem falhar."),
      ex("Remada curvada", "3x10", "75s", "RPE 7", "Trave o core e puxe com costas."),
      ex("Levantamento terra romeno", "3x12", "75s", "RPE 7", "Alongue posteriores sem arredondar a coluna."),
      ex("Prancha", "3x40s", "45s", "Firme", "Respire sem perder a postura."),
    ],
  },
];

const homeSessions = [
  {
    title: "HIIT 10 minutos - Forja rápida",
    focus: "Alta intensidade | Sem equipamento",
    exercises: [
      ex("Polichinelo", "40s", "20s", "RPE 7", "Aqueça elevando a frequência sem perder coordenação."),
      ex("Burpee", "30s", "30s", "RPE 9", "Peito ao chão opcional; mantenha aterrissagem suave."),
      ex("Mountain climber", "40s", "20s", "RPE 8", "Quadril baixo e joelhos alternando rápido."),
      ex("Agachamento com salto", "30s", "30s", "RPE 9", "Aterrisse flexionando joelhos e quadril."),
      ex("Prancha", "40s", "20s", "Firme", "Não deixe a lombar cair."),
    ],
  },
  {
    title: "Casa A - Pernas e core",
    focus: "Força corporal",
    exercises: [
      ex("Agachamento livre", "4x15", "45s", "RPE 8", "Use mochila se precisar aumentar a dificuldade."),
      ex("Afundo alternado", "3x12 por perna", "60s", "RPE 8", "Passo firme e joelho da frente alinhado."),
      ex("Ponte de glúteo", "4x15", "45s", "RPE 8", "Contraia glúteos no topo por um segundo."),
      ex("Panturrilha em pé", "4x20", "30s", "RPE 8", "Suba alto e desça devagar."),
      ex("Prancha", "4x35s", "40s", "Firme", "Empurre o chão com os antebraços."),
    ],
  },
  {
    title: "Casa B - Peito, costas e braços",
    focus: "Força corporal",
    exercises: [
      ex("Flexão de braços", "5x6-15", "60s", "RPE 8", "Ajuste joelhos no chão se necessário."),
      ex("Remada na mesa ou toalha", "4x8-12", "75s", "RPE 8", "Puxe o peito em direção ao apoio com controle."),
      ex("Flexão diamante", "3x6-10", "60s", "RPE 8", "Cotovelos próximos ao corpo."),
      ex("Prancha com toque no ombro", "3x20 toques", "45s", "Firme", "Evite balançar o quadril."),
      ex("Superman", "3x15", "40s", "Leve", "Eleve braços e pernas sem forçar o pescoço."),
    ],
  },
  {
    title: "Casa C - Condicionamento 20 minutos",
    focus: "Circuito",
    exercises: [
      ex("Polichinelo", "3x60s", "30s", "RPE 7", "Mantenha ritmo constante."),
      ex("Afundo alternado", "3x14 por perna", "45s", "RPE 8", "Controle a descida."),
      ex("Mountain climber", "3x45s", "30s", "RPE 8", "Respiração curta e quadril estável."),
      ex("Flexão de braços", "3xAMRAP", "60s", "RPE 8", "Pare duas repetições antes de falhar."),
      ex("Prancha lateral", "3x30s por lado", "30s", "Firme", "Quadril alto e corpo alinhado."),
    ],
  },
];

const runSessions = [
  {
    title: "Corrida leve + técnica",
    focus: "Base aeróbica",
    exercises: [
      ex("Aquecimento caminhando", "8 min", "-", "Leve", "Comece confortável e solte ombros e braços."),
      ex("Corrida leve", "25-45 min", "-", "Z2 / conversa", "Ritmo em que ainda dá para falar frases curtas."),
      ex("Educativos de corrida", "4x60m", "60s", "Técnico", "Skipping, dribbling e passada curta com postura alta."),
      ex("Desaceleração", "5 min", "-", "Leve", "Caminhe até a respiração normalizar."),
    ],
  },
  {
    title: "Intervalado curto",
    focus: "Velocidade controlada",
    exercises: [
      ex("Aquecimento trotando", "10 min", "-", "Leve", "Inclua mobilidade de tornozelo e quadril."),
      ex("Tiros fortes", "10x1 min", "1 min trote", "RPE 8-9", "Forte, mas sem sprintar; mantenha técnica limpa."),
      ex("Trote leve", "8 min", "-", "Z2", "Recupere em ritmo fácil."),
      ex("Alongamento leve", "5 min", "-", "Solto", "Foque panturrilhas, quadríceps e posterior."),
    ],
  },
  {
    title: "Tempo run",
    focus: "Ritmo sustentado",
    exercises: [
      ex("Aquecimento", "12 min", "-", "Leve", "Progressivo, sem pressa."),
      ex("Bloco ritmo alvo", "2x12 min", "3 min trote", "RPE 7-8", "Ritmo desafiador que você sustenta com controle."),
      ex("Soltura", "8 min", "-", "Leve", "Respiração voltando ao normal."),
    ],
  },
  {
    title: "Longão progressivo",
    focus: "Resistência",
    exercises: [
      ex("Corrida fácil", "40-100 min", "-", "Z2", "Comece conservador; o objetivo é acumular tempo."),
      ex("Final progressivo", "10 min", "-", "RPE 6-7", "Acelere levemente sem transformar em tiro."),
      ex("Caminhada", "5 min", "-", "Leve", "Use para baixar a frequência cardíaca."),
    ],
  },
  {
    title: "Subidas",
    focus: "Força específica",
    exercises: [
      ex("Aquecimento", "12 min", "-", "Leve", "Procure uma subida segura e curta."),
      ex("Repetições em subida", "8x40s", "descida andando", "RPE 8", "Passos curtos, braços ativos e tronco alto."),
      ex("Trote plano", "10 min", "-", "Leve", "Solte as pernas no final."),
    ],
  },
];

function ex(name, sets, rest, intensity, detail) {
  return {
    name,
    sets,
    rest,
    intensity,
    detail,
    link: movementLinks[name] || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} execução correta`)}`,
  };
}

function init() {
  updateGoalOptions();
  setupFirebase();
  showPage("welcomePage");
  $("startForge").addEventListener("click", () => showPage(state.currentUser || !state.cloudReady ? "formPage" : "authPage"));
  $("authForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loginClient();
  });
  $("signupBtn").addEventListener("click", createClientAccount);
  $("skipCloudBtn").addEventListener("click", () => showPage("formPage"));
  $("backToIntro").addEventListener("click", () => showPage("welcomePage"));
  $("newWorkoutBtn").addEventListener("click", () => showPage("formPage"));
  $("logoutBtn").addEventListener("click", logoutClient);
  $("modality").addEventListener("change", updateGoalOptions);
  $("profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    generatePlan();
  });
  $("exportBtn").addEventListener("click", exportWorkout);
  $("checkInBtn").addEventListener("click", checkIn);
  $("prevDay").addEventListener("click", () => changeDay(-1));
  $("nextDay").addEventListener("click", () => changeDay(1));
  $("clearProgress").addEventListener("click", clearProgress);
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("page-active", page.id === pageId);
  });
}

function setupFirebase() {
  if (!isFirebaseConfigured()) {
    setCloudStatus("Modo local");
    setAuthMessage("Configure o Firebase para ativar salvamento em nuvem.", "error");
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    state.cloudReady = true;
    setCloudStatus("Nuvem pronta");
    onAuthStateChanged(auth, async (user) => {
      state.currentUser = user;
      if (!user) {
        setCloudStatus("Nuvem pronta");
        return;
      }

      setCloudStatus(`Conectado: ${user.email}`);
      await loadCloudState();
    });
  } catch (error) {
    state.cloudReady = false;
    setCloudStatus("Modo local");
    setAuthMessage(firebaseErrorMessage(error), "error");
  }
}

function isFirebaseConfigured() {
  return firebaseConfig.projectId && !firebaseConfig.projectId.includes("COLE_");
}

async function loginClient() {
  if (!canUseCloud()) return;
  setAuthMessage("Entrando...", "");
  try {
    await signInWithEmailAndPassword(auth, $("authEmail").value.trim(), $("authPassword").value);
    setAuthMessage("Login realizado.", "success");
    showPage("formPage");
  } catch (error) {
    setAuthMessage(firebaseErrorMessage(error), "error");
  }
}

async function createClientAccount() {
  if (!canUseCloud()) return;
  setAuthMessage("Criando conta...", "");
  try {
    await createUserWithEmailAndPassword(auth, $("authEmail").value.trim(), $("authPassword").value);
    setAuthMessage("Conta criada e conectada.", "success");
    showPage("formPage");
  } catch (error) {
    setAuthMessage(firebaseErrorMessage(error), "error");
  }
}

async function logoutClient() {
  if (!auth) {
    showPage("welcomePage");
    return;
  }
  await signOut(auth);
  state.currentUser = null;
  state.plan = [];
  state.profile = {};
  state.planStartDate = null;
  state.checkins = {};
  localStorage.removeItem("forgeCheckins");
  showPage("welcomePage");
}

function canUseCloud() {
  if (state.cloudReady && auth && db) return true;
  setAuthMessage("Firebase ainda não foi configurado. Use o modo local ou preencha firebase-config.js.", "error");
  return false;
}

function setAuthMessage(message, type) {
  const target = $("authMessage");
  target.textContent = message;
  target.className = `status-message ${type || ""}`.trim();
}

function setCloudStatus(message) {
  $("cloudStatus").textContent = message;
  $("dashboardCloudStatus").textContent = message;
}

function updateGoalOptions() {
  const modality = $("modality").value;
  $("goal").innerHTML = goalOptions[modality]
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function readProfile() {
  return {
    name: $("clientName").value.trim() || "Cliente Forge",
    modality: $("modality").value,
    goal: $("goal").value,
    level: $("level").value,
    days: Number($("daysPerWeek").value),
    length: $("planLength").value,
    duration: Number($("duration").value),
    notes: $("notes").value.trim(),
  };
}

async function generatePlan() {
  state.profile = readProfile();
  state.planStartDate = stripTime(new Date());
  const totalDays = state.profile.length === "monthly" ? 28 : 7;
  const sessions = chooseSessions(state.profile);
  state.plan = Array.from({ length: totalDays }, (_, index) => buildDay(index, sessions));
  state.activeIndex = 0;
  renderWorkout();
  renderCalendar();
  updateAlert();
  showPage("dashboardPage");
  await saveCloudState();
}

function chooseSessions(profile) {
  if (profile.modality === "corrida") return adaptRunSessions(profile);
  if (profile.modality === "casa") return adaptHomeSessions(profile);
  return adaptStrengthSessions(profile);
}

function adaptStrengthSessions(profile) {
  const base = strengthSessions.map(cloneSession);
  if (profile.goal === "forca") {
    base.forEach((session) => {
      session.focus = session.focus.replace("Hipertrofia", "Força");
      session.exercises.slice(0, 2).forEach((exercise) => {
        exercise.sets = profile.level === "avancado" ? "5x3-5" : "4x4-6";
        exercise.rest = "120-180s";
        exercise.intensity = "RPE 8";
      });
    });
  }
  if (profile.goal === "emagrecimento") {
    base.push(cloneSession(strengthSessions[4]));
    base.forEach((session) => {
      session.focus = `${session.focus} | Descanso curto`;
      session.exercises.forEach((exercise) => {
        if (exercise.rest.includes("90") || exercise.rest.includes("120")) exercise.rest = "60-75s";
      });
    });
  }
  if (profile.days <= 3) return [base[0], base[1], base[2]];
  if (profile.days === 4) return [base[0], base[1], base[2], base[4]];
  return base;
}

function adaptHomeSessions(profile) {
  const base = homeSessions.map(cloneSession);
  if (profile.goal === "hiit") return [base[0], base[3], base[0], base[2], base[3], base[1]];
  if (profile.goal === "mobilidade") {
    base.push({
      title: "Casa D - Mobilidade ativa",
      focus: "Recuperação e amplitude",
      exercises: [
        ex("Mobilidade de quadril", "3x60s", "20s", "Leve", "Movimente em amplitude sem dor."),
        ex("Mobilidade torácica", "3x10 por lado", "20s", "Leve", "Gire com respiração controlada."),
        ex("Agachamento isométrico", "3x40s", "40s", "Moderado", "Fique no ponto mais baixo confortável."),
        ex("Prancha", "3x30s", "30s", "Firme", "Mantenha alinhamento total."),
      ],
    });
  }
  return base;
}

function adaptRunSessions(profile) {
  const base = runSessions.map(cloneSession);
  if (profile.goal === "5k") return [base[0], base[1], base[0], base[2], base[3]];
  if (profile.goal === "10k") return [base[0], base[1], base[2], base[0], base[3], base[4]];
  if (profile.goal === "21k") return [base[0], base[2], base[0], base[1], base[3], base[0]];
  return [base[0], base[4], base[0], base[1], base[3]];
}

function buildDay(index, sessions) {
  const date = addDays(state.planStartDate, index);
  const dayOfWeek = date.getDay();
  const restSlots = state.profile.days === 6 ? [0] : state.profile.days === 5 ? [0, 4] : state.profile.days === 4 ? [0, 3, 6] : [0, 2, 4, 6];
  const isRest = restSlots.includes(dayOfWeek);
  const week = Math.floor(index / 7) + 1;
  if (isRest) {
    return {
      date,
      dateKey: isoDate(date),
      dateLabel: formatDateLabel(date, week),
      title: "Recuperação ativa",
      focus: "Mobilidade, caminhada leve e sono",
      isRest: true,
      exercises: [
        ex("Caminhada leve", "20-30 min", "-", "Leve", "Mantenha ritmo confortável."),
        ex("Mobilidade geral", "10 min", "-", "Leve", "Quadril, tornozelos, ombros e coluna torácica."),
      ],
    };
  }
  const trainedBefore = Array.from({ length: index + 1 }, (_, i) => !restSlots.includes(addDays(state.planStartDate, i).getDay())).filter(Boolean).length - 1;
  const session = cloneSession(sessions[trainedBefore % sessions.length]);
  session.date = date;
  session.dateKey = isoDate(date);
  session.dateLabel = formatDateLabel(date, week);
  session.progression = progressionText(week);
  return session;
}

function progressionText(week) {
  if (week === 1) return "Base técnica: deixe 2 repetições na reserva.";
  if (week === 2) return "Progresso: adicione 1 série nos exercícios principais ou 2,5-5% de carga.";
  if (week === 3) return "Pico controlado: mantenha carga alta sem sacrificar execução.";
  return "Consolidação: reduza 10-15% do volume se sentir fadiga acumulada.";
}

function renderWorkout() {
  const day = state.plan[state.activeIndex];
  if (!day) return;
  $("dashboardTitle").textContent = `${state.profile.name} · ${labelFor(state.profile.modality)}`;
  $("activeDateLabel").textContent = day.dateLabel;
  $("planTitle").textContent = day.title;
  $("workoutMeta").innerHTML = [
    labelFor(state.profile.goal),
    state.profile.level,
    `${state.profile.duration} min`,
    day.focus,
    day.progression || "Recuperação inteligente",
  ]
    .map((item) => `<span>${item}</span>`)
    .join("");
  $("workoutList").className = "exercise-list";
  $("workoutList").innerHTML = day.exercises
    .map(
      (exercise, index) => `
        <article class="exercise-card">
          <div class="exercise-index">${index + 1}</div>
          <div>
            <h3>${exercise.name}</h3>
            <p>${exercise.detail}</p>
            <ul class="prescription">
              <li>${exercise.sets}</li>
              <li>Descanso: ${exercise.rest}</li>
              <li>Intensidade: ${exercise.intensity}</li>
            </ul>
          </div>
          <a class="video-link" href="${exercise.link}" target="_blank" rel="noreferrer">Ver execução</a>
        </article>
      `
    )
    .join("");
}

function renderCalendar() {
  if (!state.planStartDate) return;
  const month = state.planStartDate.getMonth();
  const year = state.planStartDate.getFullYear();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const planByDate = new Map(state.plan.map((day, index) => [day.dateKey, { day, index }]));
  const blanks = Array.from({ length: firstDay.getDay() }, () => `<div class="calendar-day empty"></div>`);
  const days = Array.from({ length: daysInMonth }, (_, dayNumber) => {
    const date = new Date(year, month, dayNumber + 1);
    const dateKey = isoDate(date);
    const planned = planByDate.get(dateKey);
    if (!planned) {
      return `
        <button class="calendar-day" disabled>
          <strong>${dayNumber + 1}</strong>
          <span>Fora do plano</span>
        </button>
      `;
    }
    const { day, index } = planned;
    const status = state.checkins[calendarKey(index)] ? "done" : isPastDate(date) && !day.isRest ? "missed" : "";
    const todayClass = dateKey === isoDate(new Date()) ? "today" : "";
    const activeClass = index === state.activeIndex ? "active" : "";
    const statusText = state.checkins[calendarKey(index)] ? "Concluído" : day.isRest ? "Recuperação" : "Pendente";
    return `
      <button class="calendar-day ${status} ${todayClass} ${activeClass}" data-index="${index}">
        <strong>${dayNumber + 1}</strong>
        <span>${day.title}</span>
        <span>${statusText}</span>
      </button>
    `;
  });
  $("calendarTitle").textContent = `${monthName(state.planStartDate)} ${year}`;
  $("calendar").innerHTML = [...blanks, ...days].join("");
  document.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.dataset.index) return;
      state.activeIndex = Number(button.dataset.index);
      renderWorkout();
      renderCalendar();
      saveCloudState();
    });
  });
}

function checkIn() {
  state.checkins[calendarKey(state.activeIndex)] = new Date().toISOString();
  localStorage.setItem("forgeCheckins", JSON.stringify(state.checkins));
  renderCalendar();
  updateAlert();
  saveCloudState();
}

function clearProgress() {
  state.checkins = {};
  localStorage.removeItem("forgeCheckins");
  renderCalendar();
  updateAlert();
  saveCloudState();
}

function updateAlert() {
  const missed = state.plan.filter((day, index) => isPastDate(day.date) && !day.isRest && !state.checkins[calendarKey(index)]).length;
  const checkinsForPlan = state.plan.filter((_, index) => state.checkins[calendarKey(index)]).length;
  if (missed > 0) {
    $("alertTitle").textContent = `${missed} treino(s) ficaram para trás.`;
    $("alertText").textContent = "Volte hoje com uma sessão mais leve. Constância vence perfeição.";
    return;
  }
  $("alertTitle").textContent = checkinsForPlan ? `${checkinsForPlan} check-in(s) registrados.` : "Pronto para forjar constância.";
  $("alertText").textContent = checkinsForPlan ? "Boa. Agora mantenha o próximo treino simples e bem feito." : "Faça check-in hoje e mantenha a sequência viva.";
}

async function saveCloudState() {
  localStorage.setItem("forgeCheckins", JSON.stringify(state.checkins));
  if (!state.cloudReady || !state.currentUser || !db || !state.plan.length) return;

  const payload = {
    profile: state.profile,
    planStartDate: isoDate(state.planStartDate),
    activeIndex: state.activeIndex,
    checkins: state.checkins,
    plan: state.plan.map(serializeDay),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", state.currentUser.uid), {
    email: state.currentUser.email,
    displayName: state.profile.name || state.currentUser.email,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, "users", state.currentUser.uid, "plans", "current"), payload, { merge: true });
}

async function loadCloudState() {
  if (!state.cloudReady || !state.currentUser || !db) return;

  const snapshot = await getDoc(doc(db, "users", state.currentUser.uid, "plans", "current"));
  if (!snapshot.exists()) return;

  const data = snapshot.data();
  state.profile = data.profile || {};
  state.planStartDate = data.planStartDate ? parseDate(data.planStartDate) : stripTime(new Date());
  state.activeIndex = Number(data.activeIndex || 0);
  state.checkins = data.checkins || {};
  state.plan = Array.isArray(data.plan) ? data.plan.map(deserializeDay) : [];
  localStorage.setItem("forgeCheckins", JSON.stringify(state.checkins));

  if (state.plan.length) {
    hydrateFormFromProfile();
    renderWorkout();
    renderCalendar();
    updateAlert();
    showPage("dashboardPage");
  }
}

function serializeDay(day) {
  return {
    ...day,
    date: isoDate(day.date),
  };
}

function deserializeDay(day) {
  return {
    ...day,
    date: parseDate(day.date || day.dateKey),
  };
}

function hydrateFormFromProfile() {
  if (!state.profile.name) return;
  $("clientName").value = state.profile.name;
  $("modality").value = state.profile.modality;
  updateGoalOptions();
  $("goal").value = state.profile.goal;
  $("level").value = state.profile.level;
  $("daysPerWeek").value = String(state.profile.days);
  $("planLength").value = state.profile.length;
  $("duration").value = String(state.profile.duration);
  $("notes").value = state.profile.notes || "";
}

function changeDay(delta) {
  if (!state.plan.length) return;
  state.activeIndex = Math.min(Math.max(state.activeIndex + delta, 0), state.plan.length - 1);
  renderWorkout();
  renderCalendar();
  saveCloudState();
}

function exportWorkout() {
  const day = state.plan[state.activeIndex];
  if (!day) return;
  const canvas = $("exportCanvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#080807";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ef6c1b";
  ctx.fillRect(0, 0, 1080, 18);
  ctx.fillRect(64, 80, 116, 116);
  ctx.fillStyle = "#080807";
  ctx.font = "800 42px Inter, Arial";
  ctx.fillText("TF", 96, 150);
  ctx.fillStyle = "#ef6c1b";
  ctx.font = "800 34px Inter, Arial";
  ctx.fillText("THE FORGE", 220, 110);
  ctx.fillStyle = "#fff7ee";
  ctx.font = "800 54px Inter, Arial";
  wrapText(ctx, day.title, 220, 175, 760, 60);
  ctx.fillStyle = "#c9b8aa";
  ctx.font = "500 26px Inter, Arial";
  ctx.fillText(`${state.profile.name} · ${day.dateLabel} · Criado por Mario Farias`, 64, 270);
  ctx.strokeStyle = "#34261e";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 315, 952, 850);
  let y = 375;
  day.exercises.slice(0, 8).forEach((exercise, index) => {
    ctx.fillStyle = "#ef6c1b";
    ctx.font = "800 26px Inter, Arial";
    ctx.fillText(`${index + 1}. ${exercise.name}`, 96, y);
    ctx.fillStyle = "#fff7ee";
    ctx.font = "700 22px Inter, Arial";
    ctx.fillText(`${exercise.sets} · descanso ${exercise.rest} · ${exercise.intensity}`, 96, y + 34);
    ctx.fillStyle = "#c9b8aa";
    ctx.font = "500 20px Inter, Arial";
    y = wrapText(ctx, exercise.detail, 96, y + 66, 860, 26) + 32;
  });
  ctx.fillStyle = "#b64a12";
  ctx.fillRect(64, 1210, 952, 72);
  ctx.fillStyle = "#fff7ee";
  ctx.font = "800 28px Inter, Arial";
  ctx.fillText("Forjado para treinar com clareza, intensidade e constância.", 92, 1255);
  const link = document.createElement("a");
  link.download = `the-forge-${slugify(day.title)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  words.forEach((word) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cursor);
      line = `${word} `;
      cursor += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line.trim(), x, cursor);
  return cursor;
}

function labelFor(value) {
  const all = Object.values(goalOptions).flat();
  return all.find(([id]) => id === value)?.[1] || {
    musculacao: "Musculação",
    corrida: "Corrida",
    casa: "Casa sem equipamentos",
  }[value] || value;
}

function calendarKey(index) {
  const day = state.plan[index];
  return `${state.profile.name}-${state.profile.modality}-${state.profile.goal}-${day?.dateKey || index}`;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isoDate(date) {
  return stripTime(date).toISOString().slice(0, 10);
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isPastDate(date) {
  return stripTime(date) < stripTime(new Date());
}

function formatDateLabel(date, week) {
  return `Semana ${week} · ${weekdayNames[date.getDay()]} · ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(date) {
  return date.toLocaleDateString("pt-BR", { month: "long" }).replace(/^\w/, (letter) => letter.toUpperCase());
}

function firebaseErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Este e-mail já tem conta. Use Entrar.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
  };
  return messages[error.code] || "Não foi possível conectar ao Firebase agora.";
}

function cloneSession(session) {
  return JSON.parse(JSON.stringify(session));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

init();
