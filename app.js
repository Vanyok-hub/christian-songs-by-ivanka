import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config } from "./config.js";

const BUCKET = "songs";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const supabase = config.supabaseUrl && config.publishableKey
  ? createClient(config.supabaseUrl, config.publishableKey)
  : null;
const $ = (selector) => document.querySelector(selector);
const trackList = $("#track-list");
const notice = $("#notice");
const loginDialog = $("#login-dialog");
let tracks = [];
let isAdmin = false;
let toastTimer;

$("#year").textContent = new Date().getFullYear();

function notify(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("error", isError);
  notice.classList.add("toast");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => notice.classList.remove("toast"), 4200);
}

function cleanError(error) {
  const message = error?.message || "Сталася невідома помилка.";
  if (/row-level security|permission denied/i.test(message)) return "Немає дозволу. Перевір правила доступу Supabase.";
  if (/invalid login credentials/i.test(message)) return "Неправильний email або пароль.";
  return message;
}

function makeEmpty(message, detail = "") {
  trackList.replaceChildren();
  const box = document.createElement("div");
  box.className = "empty-state";
  const icon = document.createElement("div");
  icon.className = "empty-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "♫";
  const heading = document.createElement("h3");
  heading.textContent = message;
  const paragraph = document.createElement("p");
  paragraph.textContent = detail;
  box.append(icon, heading, paragraph);
  trackList.append(box);
}

function renderTracks() {
  const query = $("#search").value.trim().toLocaleLowerCase("uk");
  const visible = tracks.filter((track) => `${track.title} ${track.artist} ${track.description || ""}`.toLocaleLowerCase("uk").includes(query));
  trackList.replaceChildren();
  if (!visible.length) {
    makeEmpty(tracks.length ? "Нічого не знайдено" : "Тут звучатимуть твої пісні", tracks.length ? "Спробуй інший запит." : "Музика з’явиться після першого завантаження.");
    $("#track-count").textContent = tracks.length ? "0 результатів" : "Музична бібліотека";
    return;
  }
  $("#track-count").textContent = `${tracks.length} ${tracks.length === 1 ? "ПІСНЯ" : "ПІСЕНЬ"}`;
  for (const track of visible) {
    const card = document.createElement("article");
    card.className = "track-card";
    const art = document.createElement("div");
    art.className = "track-art";
    art.setAttribute("aria-hidden", "true");
    art.textContent = "♫";
    const info = document.createElement("div");
    info.className = "track-info";
    const title = document.createElement("p");
    title.className = "track-title";
    title.textContent = track.title;
    const artist = document.createElement("p");
    artist.className = "track-artist";
    artist.textContent = track.artist;
    info.append(title, artist);
    if (track.description) {
      const description = document.createElement("p");
      description.className = "track-description";
      description.textContent = track.description;
      info.append(description);
    }
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = supabase.storage.from(BUCKET).getPublicUrl(track.storage_path).data.publicUrl;
    audio.setAttribute("aria-label", `Слухати ${track.title} — ${track.artist}`);
    card.append(art, info, audio);
    const actions = document.createElement("div");
    actions.className = "track-actions";
    const download = document.createElement("a");
    download.className = "mini-button download-button";
    download.textContent = "Завантажити";
    download.href = supabase.storage.from(BUCKET).getPublicUrl(track.storage_path, { download: downloadFileName(track) }).data.publicUrl;
    download.setAttribute("aria-label", `Завантажити ${track.title}`);
    actions.append(download);
    if (isAdmin) {
      const edit = document.createElement("button");
      edit.className = "mini-button";
      edit.type = "button";
      edit.textContent = "Редагувати";
      edit.addEventListener("click", () => editTrack(track));
      const remove = document.createElement("button");
      remove.className = "mini-button";
      remove.type = "button";
      remove.textContent = "Видалити";
      remove.addEventListener("click", () => deleteTrack(track));
      actions.append(edit, remove);
    }
    card.append(actions);
    trackList.append(card);
  }
}

function downloadFileName(track) {
  const ext = track.storage_path.split(".").pop() || "mp3";
  const safeTitle = track.title.replace(/[\\/:*?"<>|]/g, "-").trim() || "song";
  return `${safeTitle}.${ext}`;
}

async function loadSettings() {
  const { data, error } = await supabase.from("site_settings").select("key,value");
  if (error) throw error;
  const values = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
  if (values.page_title) $("#hero-title").textContent = values.page_title;
  if (values.page_description) $("#hero-description").textContent = values.page_description;
  const form = $("#site-settings-form");
  form.elements.title.value = values.page_title || "Музика, що торкається серця.";
  form.elements.description.value = values.page_description || "Християнські пісні Іванки — щирі мелодії про віру, любов і світло, яке ми несемо одне одному.";
}

async function loadTracks() {
  const { data, error } = await supabase.from("tracks").select("id,title,artist,description,storage_path,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  tracks = data || [];
  renderTracks();
}

function setAdminView(enabled) {
  isAdmin = enabled;
  $("#admin-panel").hidden = !enabled;
  $("#admin-open").textContent = enabled ? "Керування увімкнено" : "Вхід адміністратора";
  renderTracks();
}

async function checkSession() {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  const authorized = Boolean(user && config.adminUserId && user.id === config.adminUserId);
  if (user && !authorized) await supabase.auth.signOut();
  setAdminView(authorized);
}

function getExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "mp3";
}

async function editTrack(track) {
  const title = window.prompt("Назва пісні", track.title);
  if (title === null) return;
  const artist = window.prompt("Виконавець", track.artist);
  if (artist === null) return;
  const description = window.prompt("Короткий опис (можна залишити порожнім)", track.description || "");
  if (description === null) return;
  const { error } = await supabase.from("tracks").update({ title: title.trim(), artist: artist.trim(), description: description.trim() }).eq("id", track.id);
  if (error) return notify(cleanError(error), true);
  await loadTracks();
  notify("Дані пісні оновлено.");
}

async function deleteTrack(track) {
  if (!window.confirm(`Видалити «${track.title}»?`)) return;
  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) return notify(cleanError(error), true);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([track.storage_path]);
  await loadTracks();
  notify(storageError ? "Пісню прибрано зі сторінки, але аудіофайл лишився у сховищі." : "Пісню видалено.", Boolean(storageError));
}

$("#search").addEventListener("input", renderTracks);
$("#admin-open").addEventListener("click", () => {
  if (isAdmin) {
    $("#admin-panel").scrollIntoView({ behavior: "smooth" });
    return;
  }
  $("#login-status").textContent = supabase ? "" : "Сховище ще не під’єднане. Спочатку завершіть налаштування Supabase.";
  loginDialog.showModal();
});
$("#login-close").addEventListener("click", () => loginDialog.close());
loginDialog.addEventListener("click", (event) => { if (event.target === loginDialog) loginDialog.close(); });
$("#file-name").addEventListener("click", () => {});
$("#audio-file").addEventListener("change", (event) => {
  $("#file-name").textContent = event.target.files?.[0]?.name || "Файл ще не вибрано";
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) return;
  const form = event.currentTarget;
  const status = $("#login-status");
  status.textContent = "Входимо…";
  const { error } = await supabase.auth.signInWithPassword({ email: form.elements.email.value.trim(), password: form.elements.password.value });
  if (error) return status.textContent = cleanError(error);
  await checkSession();
  if (!isAdmin) {
    status.textContent = "Цей обліковий запис не має прав адміністратора.";
    return;
  }
  loginDialog.close();
  form.reset();
  await loadSettings();
  await loadTracks();
  $("#admin-panel").scrollIntoView({ behavior: "smooth" });
  notify("Вхід виконано.");
});

$("#sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
  setAdminView(false);
  notify("Ви вийшли з режиму адміністратора.");
});

$("#site-settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin) return;
  const form = event.currentTarget;
  const rows = [
    { key: "page_title", value: form.elements.title.value.trim() },
    { key: "page_description", value: form.elements.description.value.trim() }
  ];
  const { error } = await supabase.from("site_settings").upsert(rows);
  if (error) return notify(cleanError(error), true);
  $("#hero-title").textContent = rows[0].value;
  $("#hero-description").textContent = rows[1].value;
  notify("Текст сторінки збережено.");
});

$("#upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin) return;
  const form = event.currentTarget;
  const file = form.elements.audio.files[0];
  const status = $("#upload-status");
  if (!file) return;
  if (file.size > MAX_FILE_BYTES) {
    status.textContent = "Файл завеликий. Максимальний розмір — 50 МБ.";
    return;
  }
  const title = form.elements.title.value.trim();
  const artist = form.elements.artist.value.trim();
  if (!title || !artist) return;
  const path = `${crypto.randomUUID()}.${getExtension(file.name)}`;
  status.textContent = "Завантажую аудіо…";
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "audio/mpeg", upsert: false });
  if (uploadError) {
    status.textContent = cleanError(uploadError);
    return;
  }
  const { error: insertError } = await supabase.from("tracks").insert({ title, artist, description: form.elements.description.value.trim(), storage_path: path });
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    status.textContent = cleanError(insertError);
    return;
  }
  form.reset();
  form.elements.artist.value = "Іванка";
  $("#file-name").textContent = "Файл ще не вибрано";
  status.textContent = "Пісню завантажено.";
  await loadTracks();
});

async function start() {
  if (!supabase) {
    makeEmpty("Скоро тут звучатиме музика", "Сховище під’єднується адміністратором перед публікацією.");
    notice.textContent = "Щоб увімкнути пісні й адмінпанель, заповніть config.js і налаштуйте Supabase за README.";
    return;
  }
  try {
    await loadSettings();
    await loadTracks();
    await checkSession();
    supabase.auth.onAuthStateChange(() => checkSession());
  } catch (error) {
    notice.textContent = `Не вдалося завантажити дані: ${cleanError(error)}`;
  }
}

start();
