const QWEATHER_API_KEY = "7bdc48c1f40f4eb8b5053d519037fcd4";
const QWEATHER_PROJECT_ID = "4BKUH9KMDF";
const QWEATHER_API_HOST = "https://mr3wt3r22y.re.qweatherapi.com";
const QWEATHER_API_ENDPOINT = `${QWEATHER_API_HOST}/v7/weather/now`;
const DEEPSEEK_API_KEY = "sk-vywlbdorqpfjdccrjelgiqzzeirohbguzydqsstcafeqcjkt";
const DEEPSEEK_API_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-ai/DeepSeek-V3.2";

const START_DATE = "2026-01-23";
const XI_AN_LOCATION = "101110101";
const PHOTO_MANIFEST_URL = "./assets/photos/photos.json";
const PHOTO_TOTAL = 65;
const PHOTO_FILES = Array.from({ length: PHOTO_TOTAL }, (_, index) => `${index + 1}.jpg`);
const DAILY_PHOTO_COUNT = 5;
const BEIJING_OFFSET = 8 * 60 * 60 * 1000;

const fallbackWeather = {
  city: "西安",
  text: "温柔晴天",
  temp: "--",
  windDir: "微风",
  humidity: "--"
};

const fallbackDailySets = [
  {
    advice: "贺佳妮，今天先把节奏放稳一点。该吃饭就吃饭，该休息就休息，方小鼠在认真惦记你。",
    capsule: "今天的小幸运，是方小鼠又想起了宝宝。",
    moods: {
      happy: "今天开心就多笑一会儿，老婆的好心情值得被记下来，方小维也跟着高兴。",
      sad: "委屈的话不用急着解释，先缓一缓。我在这边听你说，慢慢来就好。",
      angry: "生气也正常，先别憋着。方小鼠站你这边，等你消消气再一起想办法。",
      tired: "累了就先停一下，宝宝今天已经很努力了。剩下的事可以晚一点再说。"
    }
  },
  {
    advice: "老婆，今天也不用把所有事都做完。先照顾好眼前这一小段，方小维会一直给你留着耐心。",
    capsule: "普通的一天，因为贺佳妮变得有点特别。",
    moods: {
      happy: "听到你开心，我也会放心一点。今天这份好心情，方小鼠申请一起存档。",
      sad: "如果今天有点难过，就先别为难自己。宝宝可以沉默一会儿，我也会陪着。",
      angry: "不开心就说出来，别一个人闷着。老婆负责表达，方小维负责认真听。",
      tired: "好累的话就把手机放一放，喝口水，闭会儿眼。我会在这里等你回来。"
    }
  },
  {
    advice: "宝宝，今天把自己排前面一点。天气怎样都没关系，方小鼠都希望你过得舒服、轻松一点。",
    capsule: "方小维今天也偷偷给贺佳妮加了一颗星。",
    moods: {
      happy: "开心就很好，别急着切回认真模式。老婆今天的快乐，方小鼠也想沾一点。",
      sad: "难过的时候不用装没事。方小维在，宝宝可以把今天的小情绪放下来。",
      angry: "先让自己喘口气，别急着讲道理。你生气的原因，我会认真听。",
      tired: "辛苦啦，今天先少给自己一点压力。休息不是偷懒，是给明天留力气。"
    }
  }
];

let moodCopy = fallbackDailySets[0].moods;
let scratchState = null;
let missState = null;

const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", () => {
  initEnvelope();
  renderBeijingDate();
  renderLoveDays();
  initScratchCard();
  initCarousel();
  initMoodBoard();
  initMissButton();
  initWeatherAndDailyCopy();
  scheduleMidnightRefresh();
});

function initEnvelope() {
  const gate = $("#introGate");
  const opener = $("#openEnvelope");
  let touchStartY = 0;
  let opened = false;

  const open = () => {
    if (opened) return;
    opened = true;
    gate.classList.add("is-opening");

    window.setTimeout(() => {
      document.body.classList.add("intro-complete");
      gate.classList.add("is-done");
    }, 920);
  };

  opener.addEventListener("click", open);
  gate.addEventListener("touchstart", (event) => {
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  gate.addEventListener("touchmove", (event) => {
    const moveY = event.touches[0].clientY - touchStartY;
    if (moveY < -34) open();
  }, { passive: true });

  if (window.location.hash === "#open") {
    window.setTimeout(open, 250);
  }
}

function renderBeijingDate() {
  const target = $("#beijingDate");
  const text = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());

  target.textContent = `北京时间 ${text}`;
  window.setTimeout(renderBeijingDate, 60 * 1000);
}

function renderLoveDays() {
  const target = $("#loveDays");
  const start = createLocalDate(START_DATE);
  const today = getBeijingDateOnly();
  const diff = today.getTime() - start.getTime();
  const day = Math.max(1, Math.floor(diff / 86400000) + 1);
  target.textContent = String(day);
}

function createLocalDate(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

async function initWeatherAndDailyCopy({ force = false } = {}) {
  const weather = await fetchWeather();
  renderWeather(weather);
  applyWeatherTheme(weather);

  const daily = await getDailyContent(weather, { force });
  applyDailyContent(daily);
}

async function fetchWeather() {
  if (!QWEATHER_API_KEY.trim()) {
    return fallbackWeather;
  }

  const url = new URL(QWEATHER_API_ENDPOINT);
  url.searchParams.set("location", XI_AN_LOCATION);
  url.searchParams.set("key", QWEATHER_API_KEY);
  url.searchParams.set("lang", "zh");
  url.searchParams.set("unit", "m");

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error("Weather request failed");

    const data = await response.json();
    if (data.code !== "200" || !data.now) throw new Error("Weather data unavailable");

    return {
      city: "西安",
      text: data.now.text || fallbackWeather.text,
      temp: data.now.temp || fallbackWeather.temp,
      windDir: data.now.windDir || fallbackWeather.windDir,
      humidity: data.now.humidity || fallbackWeather.humidity,
      icon: data.now.icon || ""
    };
  } catch (error) {
    console.warn("天气获取失败，已使用本地备用内容。", error);
    return fallbackWeather;
  }
}

function renderWeather(weather) {
  $("#weatherCity").textContent = weather.city || "西安";
  $("#weatherText").textContent = weather.text;
  $("#weatherTemp").textContent = weather.temp === "--" ? "--°C" : `${weather.temp}°C`;
  $("#weatherMeta").textContent = `${weather.windDir || "微风"} · 湿度 ${weather.humidity || "--"}%`;
}

function applyWeatherTheme(weather) {
  document.body.classList.remove("weather-sunny", "weather-rainy", "weather-snowy", "weather-night");
  document.body.classList.add(getWeatherClass(weather));
}

function getWeatherClass(weather) {
  const text = `${weather.text || ""}${weather.icon || ""}`;
  const hour = getBeijingParts().hour;

  if (text.includes("雪")) return "weather-snowy";
  if (text.includes("雨") || text.includes("雷") || text.includes("阴")) return "weather-rainy";
  if (hour >= 18 || hour < 6 || text.includes("夜")) return "weather-night";
  return "weather-sunny";
}

async function getDailyContent(weather, { force = false } = {}) {
  const cycleKey = getBeijingDayKey();
  const cacheKey = `xiaoheer-daily-content-${cycleKey}`;
  const cached = readJson(cacheKey);

  if (!force && cached?.source === "ai" && isValidDailyContent(cached.content)) {
    return cached.content;
  }

  const fallback = getFallbackDailyContent(cycleKey, weather);
  const aiContent = await fetchDeepSeekDailyContent(weather, cycleKey);

  if (aiContent) {
    writeJson(cacheKey, {
      source: "ai",
      content: aiContent,
      savedAt: new Date().toISOString()
    });
    return aiContent;
  }

  return fallback;
}

async function fetchDeepSeekDailyContent(weather, cycleKey) {
  if (!DEEPSEEK_API_KEY.trim()) return null;

  const prompt = buildDailyPrompt(weather, cycleKey);

  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        stream: false,
        enable_thinking: false,
        messages: [
          {
            role: "system",
            content: "你是一个会写自然中文日常短句的人。文案写给女朋友，可以称呼她为贺佳妮、老婆、宝宝、小贺儿，称呼要轮换但别堆叠；男朋友可以自称方小鼠或方小维。语气像真实恋人发来的提醒，温柔、具体、轻松，有一点俏皮，但不要油腻、不要夸张、不要过度身体描写、不要土味情话。输出可以长一点，有趣一点。只返回合法 JSON，不要 Markdown。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.82,
        max_tokens: 520
      })
    });

    if (!response.ok) throw new Error("DeepSeek request failed");

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    const content = parseDailyContent(raw);
    return isValidDailyContent(content) ? content : null;
  } catch (error) {
    console.warn("AI 每日文案获取失败，已使用本地备用内容。", error);
    return null;
  }
}

function buildDailyPrompt(weather, cycleKey) {
  const styles = [
    "像早上出门前的一句自然提醒",
    "像午休时发来的一条简短消息",
    "像睡前复盘今天的小纸条",
    "轻松一点，带一点日常玩笑",
    "像方小鼠认真但不啰嗦的关心",
    "有一点画面感，但不要写成情诗"
  ];
  const scenes = [
    "结合天气给一个具体的小建议，比如带伞、少冰、早点休息、补水、添衣",
    "把天气、今天的节奏和方小维的惦记自然放在一起",
    "提醒她不用把自己逼太紧，先处理眼前这一小段",
    "给她一点稳定感，但不要写成宣誓或承诺",
    "写得像今天专门发给贺佳妮的一条消息，不要像通用模板",
    "可以带一点俏皮称呼，但一句话里不要连续出现多个昵称"
  ];
  const names = [
    "贺佳妮",
    "老婆",
    "宝宝",
    "小贺儿"
  ];
  const senderNames = [
    "方小鼠",
    "方小维"
  ];
  const seed = hashString(cycleKey);
  const style = styles[seed % styles.length];
  const scene = scenes[Math.floor(seed / 7) % scenes.length];
  const preferredName = names[Math.floor(seed / 11) % names.length];
  const senderName = senderNames[Math.floor(seed / 13) % senderNames.length];

  return [
    `今天的北京时间日期周期是：${cycleKey}（网页每天0点刷新）。`,
    `地点：西安。天气：${weather.text}，温度：${weather.temp}°C，风向：${weather.windDir}，湿度：${weather.humidity}%。`,
    `今天优先称呼她为“${preferredName}”，也可以自然换用“贺佳妮、老婆、宝宝、小贺儿”，但不要堆在一起。`,
    `男朋友署名或自称可以用“${senderName}”，也可以偶尔用“方小鼠提醒你”“方小维在这边”等自然表达。`,
    `请按“${style}”的感觉来写，并且${scene}。`,
    "请生成下面三类内容：",
    "1. advice：今日专属信笺，45到75个中文字符，结合天气，像男朋友发来的一条真实日常关心。",
    "2. capsule：时光胶囊刮刮乐短句，22到42个中文字符，轻巧一点，可以有想念，但不要肉麻。",
    "3. moods：四个心情按钮的回应文案。happy、sad、angry、tired 各一条，每条30到55个中文字符，分别贴合开心、委屈、生气、好累。",
    "要求：每天表达要多元；多写具体小事，少写宏大承诺；不要重复“照顾好自己”“我一直在”“被偏爱”等套话；不要使用“软乎乎、口袋、手心温度、肌肤、出气筒、小猫”等容易油腻的表达；不要出现英文；不要使用表情符号；不要提到 AI 或接口。",
    "只返回合法 JSON，格式如下：",
    "{\"advice\":\"...\",\"capsule\":\"...\",\"moods\":{\"happy\":\"...\",\"sad\":\"...\",\"angry\":\"...\",\"tired\":\"...\"}}"
  ].join("\n");
}

function parseDailyContent(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isValidDailyContent(content) {
  return Boolean(
    content &&
    typeof content.advice === "string" &&
    typeof content.capsule === "string" &&
    content.moods &&
    ["happy", "sad", "angry", "tired"].every((key) => typeof content.moods[key] === "string")
  );
}

function getFallbackDailyContent(cycleKey, weather) {
  const base = fallbackDailySets[hashString(cycleKey) % fallbackDailySets.length];
  return {
    advice: weather.text === fallbackWeather.text
      ? base.advice
      : `贺佳妮，今天西安是${weather.text}，出门按天气准备一下。方小鼠提醒你：先让自己过得舒服一点。`,
    capsule: base.capsule,
    moods: base.moods
  };
}

function applyDailyContent(content) {
  if (!isValidDailyContent(content)) return;
  $("#aiAdvice").textContent = content.advice;
  moodCopy = content.moods;
  setScratchQuote(content.capsule, true);
}

function initScratchCard() {
  const area = $("#scratchArea");
  const canvas = $("#scratchCanvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let drawing = false;
  let lastPoint = null;
  let checkTimer = 0;

  scratchState = { area, canvas, context };

  const resize = () => {
    resetScratchLayer();
  };

  const getPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event.changedTouches?.[0] || event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top
    };
  };

  const scratch = (point) => {
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(24, area.clientWidth * 0.09);

    context.beginPath();
    if (lastPoint) {
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(point.x, point.y);
    } else {
      context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
    }
    context.stroke();
    context.fill();
    lastPoint = point;

    window.clearTimeout(checkTimer);
    checkTimer = window.setTimeout(() => {
      if (getScratchPercent(canvas, context) > 42) {
        area.classList.add("is-revealed");
      }
    }, 120);
  };

  const start = (event) => {
    drawing = true;
    area.classList.add("is-scratching");
    lastPoint = null;
    scratch(getPoint(event));
  };

  const move = (event) => {
    if (!drawing) return;
    event.preventDefault();
    scratch(getPoint(event));
  };

  const end = () => {
    drawing = false;
    lastPoint = null;
    area.classList.remove("is-scratching");
  };

  const fallback = getFallbackDailyContent(getBeijingDayKey(), fallbackWeather);
  setScratchQuote(fallback.capsule, false);
  resize();

  window.addEventListener("resize", debounce(resize, 180));
  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: true });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
}

function setScratchQuote(text, resetLayer) {
  $("#loveQuote").textContent = text;
  if (resetLayer) resetScratchLayer();
}

function resetScratchLayer() {
  if (!scratchState) return;

  const { area, canvas, context } = scratchState;
  const rect = area.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);

  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  paintScratchLayer(context, rect.width, rect.height);
  area.classList.remove("is-revealed");
}

function paintScratchLayer(context, width, height) {
  context.globalCompositeOperation = "source-over";
  context.clearRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f8eee8");
  gradient.addColorStop(0.48, "#d8c7bd");
  gradient.addColorStop(1, "#fff3e4");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 2.5 + 0.8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(107, 66, 53, 0.38)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 22px sans-serif";
  context.fillText("用手指擦一擦", width / 2, height / 2);
}

function getScratchPercent(canvas, context) {
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let clear = 0;

  for (let i = 3; i < pixels.length; i += 16) {
    if (pixels[i] < 20) clear += 1;
  }

  return (clear / (pixels.length / 16)) * 100;
}

async function initCarousel() {
  const track = $("#slideTrack");
  const frame = $("#photoFrame");
  const dots = $("#photoDots");
  const subtitle = $("#gallerySubtitle");
  let dailyPhotos = PHOTO_FILES;
  let index = 0;
  let timer = 0;
  let startX = 0;
  let deltaX = 0;
  let dragging = false;

  const loadDailyPhotos = async () => {
    const allPhotos = await fetchPhotoManifest();
    dailyPhotos = pickDailyPhotos(allPhotos, getBeijingDayKey(), DAILY_PHOTO_COUNT);
    renderSlides();
    index = 0;
    update(false);
    subtitle.textContent = `这是今天随机挑选的 ${dailyPhotos.length} 张幸运照片。`;
  };

  const renderSlides = () => {
    track.innerHTML = "";
    dots.innerHTML = "";

    dailyPhotos.forEach((file, photoIndex) => {
      const slide = document.createElement("article");
      slide.className = "photo-slide";

      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = `把照片放进 assets/photos 后，这里会自动变成小贺儿的照片。`;

      const image = document.createElement("img");
      image.src = `./assets/photos/${encodeURIComponent(file)}`;
      image.alt = `小贺儿今天的幸运照片第 ${photoIndex + 1} 张`;
      image.loading = photoIndex === 0 ? "eager" : "lazy";
      image.addEventListener("load", () => slide.classList.add("has-photo"));
      image.addEventListener("error", () => image.remove());

      slide.append(placeholder, image);
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.className = "dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `查看今天第 ${photoIndex + 1} 张幸运照片`);
      dot.addEventListener("click", () => goTo(photoIndex));
      dots.appendChild(dot);
    });
  };

  const update = (animate = true) => {
    track.style.transitionDuration = animate ? "550ms" : "0ms";
    track.style.transform = `translate3d(${-index * frame.clientWidth}px, 0, 0)`;
    [...dots.children].forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });
  };

  const goTo = (nextIndex) => {
    index = (nextIndex + dailyPhotos.length) % dailyPhotos.length;
    update(true);
    restart();
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  const restart = () => {
    window.clearInterval(timer);
    timer = window.setInterval(next, 4000);
  };

  await loadDailyPhotos();

  $("#nextPhoto").addEventListener("click", next);
  $("#prevPhoto").addEventListener("click", prev);

  frame.addEventListener("pointerdown", (event) => {
    dragging = true;
    startX = event.clientX;
    deltaX = 0;
    frame.setPointerCapture?.(event.pointerId);
    track.style.transitionDuration = "0ms";
    window.clearInterval(timer);
  });

  frame.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    deltaX = event.clientX - startX;
    track.style.transform = `translate3d(${(-index * frame.clientWidth) + deltaX}px, 0, 0)`;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(deltaX) > Math.min(90, frame.clientWidth * 0.18)) {
      deltaX < 0 ? next() : prev();
    } else {
      update(true);
      restart();
    }
  };

  frame.addEventListener("pointerup", endDrag);
  frame.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", debounce(() => update(false), 160));

  restart();

  window.refreshDailyPhotos = async () => {
    await loadDailyPhotos();
    restart();
  };
}

async function fetchPhotoManifest() {
  try {
    const response = await fetch(`${PHOTO_MANIFEST_URL}?v=${getBeijingDayKey()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Photo manifest unavailable");

    const files = await response.json();
    if (!Array.isArray(files)) throw new Error("Photo manifest invalid");

    const photos = files.filter((file) => typeof file === "string" && /\.(jpe?g|png|webp|gif)$/i.test(file));
    return photos.length ? photos : PHOTO_FILES;
  } catch (error) {
    console.warn("照片清单读取失败，已使用默认前 5 张。", error);
    return PHOTO_FILES;
  }
}

function pickDailyPhotos(files, dayKey, count) {
  const uniqueFiles = [...new Set(files)];
  const cacheKey = `xiaoheer-daily-photos-${dayKey}`;
  const cached = readJson(cacheKey);
  const targetCount = Math.min(count, uniqueFiles.length);

  if (
    Array.isArray(cached) &&
    cached.length === targetCount &&
    cached.every((file) => uniqueFiles.includes(file))
  ) {
    return cached;
  }

  const selected = shuffleRandom(uniqueFiles).slice(0, targetCount);
  writeJson(cacheKey, selected);
  return selected;
}

function shuffleRandom(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function initMoodBoard() {
  const buttons = document.querySelectorAll(".mood-btn");
  const message = $("#moodMessage");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      message.textContent = moodCopy[button.dataset.mood] || moodCopy.happy;
      message.classList.remove("pop");
      void message.offsetWidth;
      message.classList.add("pop");
    });
  });
}

function initMissButton() {
  const button = $("#missButton");
  const label = $("#missCountText");

  missState = {
    key: getMissStorageKey(),
    count: 0,
    label
  };

  missState.count = Number(localStorage.getItem(missState.key) || 0);

  button.addEventListener("click", () => {
    refreshMissCycleIfNeeded();
    missState.count += 1;
    localStorage.setItem(missState.key, String(missState.count));
    renderMissCount();
    createFloatingHeart();
  });

  renderMissCount();
}

function refreshMissCycleIfNeeded() {
  if (!missState) return;
  const latestKey = getMissStorageKey();
  if (latestKey === missState.key) return;

  missState.key = latestKey;
  missState.count = Number(localStorage.getItem(latestKey) || 0);
  renderMissCount();
}

function renderMissCount() {
  if (!missState) return;
  missState.label.textContent = `今天小贺儿想了你 ${missState.count} 次`;
}

function getMissStorageKey() {
  return `xiaoheer-miss-${getBeijingDayKey()}`;
}

function createFloatingHeart() {
  const heart = document.createElement("span");
  heart.className = "floating-heart";
  heart.textContent = Math.random() > 0.5 ? "♥" : "♡";
  heart.style.left = `${Math.random() * 82 + 9}vw`;
  heart.style.top = `${Math.random() * 58 + 20}vh`;
  heart.style.setProperty("--heart-drift", `${Math.random() * 90 - 45}px`);
  heart.style.setProperty("--heart-size", `${Math.random() * 1.2 + 1.4}rem`);
  document.body.appendChild(heart);
  heart.addEventListener("animationend", () => heart.remove(), { once: true });
}

function scheduleMidnightRefresh() {
  const delay = Math.min(getMsUntilNextBeijingMidnight(), 2147483647);

  window.setTimeout(() => {
    renderBeijingDate();
    renderLoveDays();
    refreshMissCycleIfNeeded();
    initWeatherAndDailyCopy({ force: true });
    window.refreshDailyPhotos?.();
    scheduleMidnightRefresh();
  }, delay + 1200);
}

function getBeijingParts(date = new Date()) {
  const beijing = new Date(date.getTime() + BEIJING_OFFSET);
  return {
    year: beijing.getUTCFullYear(),
    month: beijing.getUTCMonth() + 1,
    day: beijing.getUTCDate(),
    hour: beijing.getUTCHours(),
    minute: beijing.getUTCMinutes()
  };
}

function getBeijingDateOnly(date = new Date()) {
  const parts = getBeijingParts(date);
  return new Date(parts.year, parts.month - 1, parts.day);
}

function getBeijingDayKey(date = new Date()) {
  const parts = getBeijingParts(date);
  return formatKey(parts.year, parts.month, parts.day);
}

function getMsUntilNextBeijingMidnight(date = new Date()) {
  const now = date.getTime();
  const parts = getBeijingParts(date);
  const nextMidnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day + 1) - BEIJING_OFFSET;
  return Math.max(1000, nextMidnightUtc - now);
}

function getBeijingCycleLabel() {
  return getBeijingDayKey().replaceAll("-", ".");
}

function getBeijingDateTimeText() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function formatKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable in private modes; the page can still run.
  }
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function debounce(callback, wait) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), wait);
  };
}
