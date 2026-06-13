const STORAGE_KEY = "daily-atlas-v1";

const rituals = [
  "Morning reset",
  "Deep work",
  "Study block",
  "Training",
  "Clean meals",
  "Wind down",
];

const typeLabels = {
  task: "Task",
  schedule: "Schedule",
  meal: "Meal",
  workout: "Workout",
  focus: "Study / Work",
  activity: "Activity",
};

const emptyDay = () => ({
  tasks: [],
  schedule: [],
  meals: [],
  workouts: [],
  focus: [],
  activities: [],
  rituals: {},
  sleep: { bed: "", wake: "", quality: 7 },
  metrics: { water: 0, energy: 5, mood: 5, steps: 0 },
});

let state = loadState();
let activeDate = toDateKey(new Date());

const $ = (selector) => document.querySelector(selector);

const elements = {
  activeDayLabel: $("#activeDayLabel"),
  activityList: $("#activityList"),
  addTaskButton: $("#addTaskButton"),
  captureDialog: $("#captureDialog"),
  datePicker: $("#datePicker"),
  dialogDuration: $("#dialogDuration"),
  dialogEntryTitle: $("#dialogEntryTitle"),
  dialogNote: $("#dialogNote"),
  dialogSave: $("#dialogSave"),
  dialogTime: $("#dialogTime"),
  dialogType: $("#dialogType"),
  energyMetric: $("#energyMetric"),
  focusList: $("#focusList"),
  focusMinutes: $("#focusMinutes"),
  heroDate: $("#heroDate"),
  mealDetail: $("#mealDetail"),
  metricEnergy: $("#metricEnergy"),
  metricForm: $("#metricForm"),
  metricMood: $("#metricMood"),
  metricSteps: $("#metricSteps"),
  metricWater: $("#metricWater"),
  moodMetric: $("#moodMetric"),
  nextDay: $("#nextDay"),
  openCapture: $("#openCapture"),
  prevDay: $("#prevDay"),
  quickDuration: $("#quickDuration"),
  quickForm: $("#quickForm"),
  quickNote: $("#quickNote"),
  quickTime: $("#quickTime"),
  quickTitleInput: $("#quickTitleInput"),
  quickType: $("#quickType"),
  railCompletion: $("#railCompletion"),
  railMeter: $("#railMeter"),
  ritualGrid: $("#ritualGrid"),
  scoreLabel: $("#scoreLabel"),
  scoreRing: $("#scoreRing"),
  scoreValue: $("#scoreValue"),
  sleepAmount: $("#sleepAmount"),
  sleepBed: $("#sleepBed"),
  sleepDetail: $("#sleepDetail"),
  sleepForm: $("#sleepForm"),
  sleepQuality: $("#sleepQuality"),
  sleepWake: $("#sleepWake"),
  taskList: $("#taskList"),
  taskMetric: $("#taskMetric"),
  taskMetricLabel: $("#taskMetricLabel"),
  timelineList: $("#timelineList"),
  todayButton: $("#todayButton"),
  trainingMinutes: $("#trainingMinutes"),
  waterMetric: $("#waterMetric"),
  weekdayLabel: $("#weekdayLabel"),
  workoutDetail: $("#workoutDetail"),
};

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { days: {} };
  } catch {
    return { days: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDay() {
  if (!state.days[activeDate]) {
    state.days[activeDate] = emptyDay();
  }

  return state.days[activeDate];
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey, days) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function formatDay(dateKey, options) {
  return new Intl.DateTimeFormat("en", options).format(fromDateKey(dateKey));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function minutesToLabel(minutes) {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function sleepMinutes(sleep) {
  const bed = timeToMinutes(sleep.bed);
  const wake = timeToMinutes(sleep.wake);
  if (bed === null || wake === null) return 0;
  return wake >= bed ? wake - bed : 1440 - bed + wake;
}

function normalizeItem(type, data) {
  const base = {
    id: createId(),
    title: data.title.trim(),
    time: data.time || "",
    duration: Number(data.duration) || 0,
    note: data.note.trim(),
    type,
  };

  if (type === "task") {
    return { ...base, done: false, priority: "Normal" };
  }

  return base;
}

function collectionFor(type, day = getDay()) {
  const map = {
    task: day.tasks,
    schedule: day.schedule,
    meal: day.meals,
    workout: day.workouts,
    focus: day.focus,
    activity: day.activities,
  };
  return map[type];
}

function addEntry(type, data) {
  if (!data.title.trim()) return false;
  collectionFor(type).push(normalizeItem(type, data));
  saveState();
  render();
  return true;
}

function deleteEntry(type, id) {
  const day = getDay();
  const collection = collectionFor(type, day);
  const index = collection.findIndex((item) => item.id === id);
  if (index >= 0) collection.splice(index, 1);
  saveState();
  render();
}

function toggleTask(id) {
  const task = getDay().tasks.find((item) => item.id === id);
  if (!task) return;
  task.done = !task.done;
  saveState();
  render();
}

function toggleRitual(name) {
  const day = getDay();
  day.rituals[name] = !day.rituals[name];
  saveState();
  render();
}

function calculateScore(day) {
  const taskScore = day.tasks.length
    ? day.tasks.filter((task) => task.done).length / day.tasks.length
    : 0;
  const ritualScore =
    rituals.filter((ritual) => day.rituals[ritual]).length / rituals.length;
  const sleepScore = Math.min(sleepMinutes(day.sleep) / 480, 1);
  const waterScore = Math.min(day.metrics.water / 8, 1);
  const bodyScore = day.workouts.length ? 1 : 0;
  const focusScore = Math.min(totalDuration(day.focus) / 120, 1);

  return Math.round(
    (taskScore * 0.24 +
      ritualScore * 0.22 +
      sleepScore * 0.16 +
      waterScore * 0.12 +
      bodyScore * 0.12 +
      focusScore * 0.14) *
      100,
  );
}

function scoreLabel(score) {
  if (score >= 85) return "Locked in";
  if (score >= 65) return "Strong pace";
  if (score >= 40) return "In motion";
  if (score > 0) return "Warming up";
  return "Ready";
}

function totalDuration(items) {
  return items.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
}

function render() {
  const day = getDay();
  elements.datePicker.value = activeDate;

  elements.weekdayLabel.textContent = formatDay(activeDate, { weekday: "long" });
  elements.heroDate.textContent = formatDay(activeDate, {
    month: "long",
    day: "numeric",
  });
  elements.activeDayLabel.textContent =
    activeDate === toDateKey(new Date()) ? "Today" : formatDay(activeDate, { month: "short", day: "numeric" });

  renderSummary(day);
  renderForms(day);
  renderTimeline(day);
  renderTasks(day);
  renderRituals(day);
  renderFocus(day);
  renderActivities(day);
}

function renderSummary(day) {
  const doneTasks = day.tasks.filter((task) => task.done).length;
  const sleepTotal = sleepMinutes(day.sleep);
  const focusTotal = totalDuration(day.focus);
  const workoutTotal = totalDuration(day.workouts);
  const score = calculateScore(day);

  elements.taskMetric.textContent = `${doneTasks}/${day.tasks.length}`;
  elements.taskMetricLabel.textContent = day.tasks.length ? "completed" : "No tasks";
  elements.waterMetric.textContent = day.metrics.water;
  elements.energyMetric.textContent = day.metrics.energy;
  elements.moodMetric.textContent = day.metrics.mood;

  elements.focusMinutes.textContent = `${minutesToLabel(focusTotal)} focus`;
  elements.trainingMinutes.textContent = `${minutesToLabel(workoutTotal)} training`;
  elements.sleepAmount.textContent = `${minutesToLabel(sleepTotal)} sleep`;

  elements.sleepDetail.textContent = sleepTotal
    ? `${minutesToLabel(sleepTotal)} - ${day.sleep.quality}/10`
    : "Not set";
  elements.mealDetail.textContent = `${day.meals.length} logged`;
  elements.workoutDetail.textContent = day.workouts.length
    ? `${day.workouts.length} - ${minutesToLabel(workoutTotal)}`
    : "0 logged";

  elements.scoreValue.textContent = score;
  elements.scoreRing.style.setProperty("--score", `${score * 3.6}deg`);
  elements.scoreLabel.textContent = scoreLabel(score);
  elements.railCompletion.textContent = `${score}%`;
  elements.railMeter.style.width = `${score}%`;
}

function renderForms(day) {
  elements.sleepBed.value = day.sleep.bed;
  elements.sleepWake.value = day.sleep.wake;
  elements.sleepQuality.value = day.sleep.quality;
  elements.metricWater.value = day.metrics.water;
  elements.metricEnergy.value = day.metrics.energy;
  elements.metricMood.value = day.metrics.mood;
  elements.metricSteps.value = day.metrics.steps;
}

function renderTimeline(day) {
  const timelineItems = [
    ...day.schedule.map((item) => ({ ...item, type: "schedule" })),
    ...day.meals.map((item) => ({ ...item, type: "meal" })),
    ...day.workouts.map((item) => ({ ...item, type: "workout" })),
    ...day.focus.map((item) => ({ ...item, type: "focus" })),
    ...day.activities.map((item) => ({ ...item, type: "activity" })),
  ].sort((a, b) => {
    const aTime = timeToMinutes(a.time) ?? 9999;
    const bTime = timeToMinutes(b.time) ?? 9999;
    return aTime - bTime;
  });

  if (!timelineItems.length) {
    elements.timelineList.innerHTML = emptyState("No timed entries yet");
    return;
  }

  elements.timelineList.innerHTML = timelineItems
    .map(
      (item) => `
        <article class="timeline-item">
          <div class="timeline-time">${item.time || "Anytime"}</div>
          <div class="timeline-main">
            <strong>${escapeHTML(item.title)}</strong>
            <span>${timelineDetail(item)}</span>
          </div>
          <span class="type-chip chip-${item.type}">${typeLabels[item.type]}</span>
        </article>
      `,
    )
    .join("");
}

function timelineDetail(item) {
  const parts = [];
  if (item.duration) parts.push(minutesToLabel(item.duration));
  if (item.note) parts.push(escapeHTML(item.note));
  return parts.join(" - ") || "Logged";
}

function renderTasks(day) {
  if (!day.tasks.length) {
    elements.taskList.innerHTML = emptyState("No tasks yet");
    return;
  }

  elements.taskList.innerHTML = day.tasks
    .map(
      (task) => `
        <article class="item-card ${task.done ? "is-done" : ""}">
          <button class="check-control ${task.done ? "is-checked" : ""}" data-action="toggle-task" data-id="${task.id}" type="button" aria-label="Toggle task">
            <svg><use href="#icon-check"></use></svg>
          </button>
          <div>
            <strong>${escapeHTML(task.title)}</strong>
            <span>${itemDetail(task)}</span>
          </div>
          <button class="delete-button" data-action="delete" data-type="task" data-id="${task.id}" type="button" aria-label="Delete task" title="Delete task">
            <svg><use href="#icon-trash"></use></svg>
          </button>
        </article>
      `,
    )
    .join("");
}

function renderRituals(day) {
  elements.ritualGrid.innerHTML = rituals
    .map(
      (ritual) => `
        <button class="ritual-button ${day.rituals[ritual] ? "is-complete" : ""}" data-action="ritual" data-ritual="${ritual}" type="button">
          <span><svg><use href="#icon-check"></use></svg></span>
          <strong>${ritual}</strong>
        </button>
      `,
    )
    .join("");
}

function renderFocus(day) {
  const combined = [
    ...day.focus.map((item) => ({ ...item, type: "focus" })),
    ...day.schedule
      .filter((item) => /work|study|school|project|client|meeting/i.test(item.title))
      .map((item) => ({ ...item, type: "schedule" })),
  ];

  if (!combined.length) {
    elements.focusList.innerHTML = emptyState("No focus blocks yet");
    return;
  }

  elements.focusList.innerHTML = combined
    .map(
      (item) => `
        <article class="item-card">
          <span class="type-chip chip-${item.type}">${typeLabels[item.type]}</span>
          <div>
            <strong>${escapeHTML(item.title)}</strong>
            <span>${itemDetail(item)}</span>
          </div>
          <button class="delete-button" data-action="delete" data-type="${item.type}" data-id="${item.id}" type="button" aria-label="Delete entry" title="Delete entry">
            <svg><use href="#icon-trash"></use></svg>
          </button>
        </article>
      `,
    )
    .join("");
}

function renderActivities(day) {
  const combined = [
    ...day.meals.map((item) => ({ ...item, type: "meal" })),
    ...day.workouts.map((item) => ({ ...item, type: "workout" })),
    ...day.activities.map((item) => ({ ...item, type: "activity" })),
  ];

  if (!combined.length) {
    elements.activityList.innerHTML = emptyState("No activity logged yet");
    return;
  }

  elements.activityList.innerHTML = combined
    .map(
      (item) => `
        <article class="item-card">
          <span class="type-chip chip-${item.type}">${typeLabels[item.type]}</span>
          <div>
            <strong>${escapeHTML(item.title)}</strong>
            <span>${itemDetail(item)}</span>
          </div>
          <button class="delete-button" data-action="delete" data-type="${item.type}" data-id="${item.id}" type="button" aria-label="Delete entry" title="Delete entry">
            <svg><use href="#icon-trash"></use></svg>
          </button>
        </article>
      `,
    )
    .join("");
}

function itemDetail(item) {
  const parts = [];
  if (item.time) parts.push(item.time);
  if (item.duration) parts.push(minutesToLabel(item.duration));
  if (item.note) parts.push(escapeHTML(item.note));
  return parts.join(" - ") || "Logged";
}

function emptyState(label) {
  return `<div class="empty-state">${label}</div>`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function handleListClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action, id, type, ritual } = target.dataset;
  if (action === "toggle-task") toggleTask(id);
  if (action === "delete") deleteEntry(type, id);
  if (action === "ritual") toggleRitual(ritual);
}

function bindEvents() {
  elements.prevDay.addEventListener("click", () => {
    activeDate = addDays(activeDate, -1);
    render();
  });

  elements.nextDay.addEventListener("click", () => {
    activeDate = addDays(activeDate, 1);
    render();
  });

  elements.todayButton.addEventListener("click", () => {
    activeDate = toDateKey(new Date());
    render();
  });

  elements.datePicker.addEventListener("change", (event) => {
    activeDate = event.target.value || toDateKey(new Date());
    render();
  });

  elements.quickForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const added = addEntry(elements.quickType.value, {
      title: elements.quickTitleInput.value,
      time: elements.quickTime.value,
      duration: elements.quickDuration.value,
      note: elements.quickNote.value,
    });

    if (added) {
      elements.quickTitleInput.value = "";
      elements.quickDuration.value = "";
      elements.quickNote.value = "";
      elements.quickTitleInput.focus();
    }
  });

  elements.addTaskButton.addEventListener("click", () => {
    elements.quickType.value = "task";
    elements.quickTitleInput.focus();
  });

  elements.openCapture.addEventListener("click", () => {
    elements.captureDialog.showModal();
    elements.dialogEntryTitle.focus();
  });

  elements.dialogSave.addEventListener("click", () => {
    const added = addEntry(elements.dialogType.value, {
      title: elements.dialogEntryTitle.value,
      time: elements.dialogTime.value,
      duration: elements.dialogDuration.value,
      note: elements.dialogNote.value,
    });

    if (added) {
      elements.dialogEntryTitle.value = "";
      elements.dialogTime.value = "";
      elements.dialogDuration.value = "";
      elements.dialogNote.value = "";
      elements.captureDialog.close();
    }
  });

  elements.sleepForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const day = getDay();
    day.sleep = {
      bed: elements.sleepBed.value,
      wake: elements.sleepWake.value,
      quality: Number(elements.sleepQuality.value),
    };
    saveState();
    render();
  });

  elements.metricForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const day = getDay();
    day.metrics = {
      water: Number(elements.metricWater.value) || 0,
      energy: Number(elements.metricEnergy.value) || 1,
      mood: Number(elements.metricMood.value) || 1,
      steps: Number(elements.metricSteps.value) || 0,
    };
    saveState();
    render();
  });

  document.addEventListener("click", handleListClick);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.captureDialog.open) {
      elements.captureDialog.close();
    }
  });
}

bindEvents();
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
