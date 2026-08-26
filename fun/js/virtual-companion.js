/* ============================================================
   nocau · 虚拟对象 Virtual Companion v1
   纯前端框架：角色设定 / 性格风格 / 对话引擎 / 记忆 /
   情绪 / 亲密度 / 多轮上下文 / LLM API（OpenAI 兼容）
   CSP 兼容：无内联、无外部库、数据仅存 localStorage
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 页面元素 ---------- */
  var chatBody = $("#vc-chat-body");
  var input = $("#vc-input");
  var sendBtn = $("#vc-send");
  if (!chatBody || !input || !sendBtn) return;

  var STORE_KEY = "nocau-vc-v1";

  /* ============================================================
     1. 国际化（页面文案 + 角色语言偏好）
     ============================================================ */
  function getPageLang() {
    try { return (document.documentElement.lang || "zh").indexOf("en") === 0 ? "en" : "zh"; } catch (e) { return "zh"; }
  }
  var I18N = {
    zh: {
      heroTitle: "虚拟对象 · 人味儿对话陪伴",
      heroSub: "性别、性格、语言风格完全由你设定；内置规则引擎开箱即用，也可接入大模型 API 让对话更聪明。",
      tagScene: "场景：AI 陪伴 / 角色对话",
      tagMode: "模式：规则引擎 + LLM API",
      defaultName: "小星",
      statusReady: "在线 · 此刻想和你聊聊天",
      statMood: "情绪", statIntimacy: "亲密度", statTurns: "轮次",
      quick1: "打个招呼", quick2: "我今天有点累", quick3: "换个话题聊聊", quick4: "你还记得我",
      inputPh: "输入你想说的话…", send: "发送",
      hint: "本地规则引擎无需网络；右侧「引擎」页签配置 API Key 后可切换大模型回复。",
      tabRole: "角色", tabStyle: "性格风格", tabMemory: "记忆", tabEngine: "引擎",
      lblName: "姓名", lblGender: "性别 / 形象（不限定男女，可自定义）", lblIdentity: "身份", lblWorld: "世界观",
      lblCatch: "口头禅", lblSeed: "记忆起点", lblImage: "形象描述（影响大模型回复的语气想象）",
      gFemale: "女", gMale: "男", gNone: "无性别", gCustom: "自定义",
      gCustomPh: "如：中性 / 猫娘 / 机械体…",
      identityPh: "如：深夜电台主持人 / 飞船 AI 管家…",
      worldPh: "你们所处的世界、相遇的缘由…",
      catchPh: "如：总之，先喝口水。",
      seedPh: "他/她的初始记忆：和你的第一次见面、已知道的事…",
      imagePh: "如：清爽短发、常穿灰毛衣、笑起来很暖…",
      saveRole: "保存角色设定",
      lblTraits: "性格特质（多选，滑条调权重）",
      lblLen: "说话长短", lenShort: "极短", lenMedium: "适中", lenLong: "较长",
      lblParticles: "语气词（嗯/呀/啦/呢…）", on: "开", off: "关",
      lblCall: "称呼用户的方式", callHint: "回复中用此称呼代替“你”，如“主人 / 朋友 / 老板 / 星之守护者”。",
      lblLang: "中英偏好", langZh: "中文为主", langEn: "English", langMix: "中英混搭",
      lblHumor: "幽默程度", lblEmpathy: "共情敏感度", saveStyle: "保存性格风格",
      lblLongMem: "长期记忆（重要事项 / 关于你的事）", memPh: "告诉他/她一件重要的事…", add: "添加",
      memHint: "对话中会主动引用这些记忆；点击条目可删除。",
      lblState: "当前状态", reset: "重置角色与记忆",
      lblEngineMode: "回复模式", modeRule: "内置规则引擎", modeLlm: "大模型 API",
      modeHint: "默认规则引擎零依赖；配置 API 后切换为 LLM 回复，更聪明自然。",
      lblBase: "接口地址（OpenAI 兼容）", basePh: "https://api.openai.com/v1",
      lblKey: "API Key", keyPh: "sk-...", lblModel: "模型名", saveEngine: "保存引擎配置",
      testLlm: "测试连接",
      llmHint: "Key 仅保存在本机浏览器 localStorage，不会上传到任何服务器；请求直接发往你填写的接口地址。",
      secArch: "整体框架",
      archText: "角色设定系统（性别/形象/人设/世界观）→ 性格与风格配置（特质权重/语言风格/称呼/中英）→ 对话引擎（关键词规则 + 上下文拼接 + 模板轮换）→ 记忆系统（短期上下文 + 长期重要事项）→ 情绪状态（随对话变化影响语气）→ 关系度/亲密度（随互动积累）→ 情感反馈与开场白 → 本地持久化（localStorage）；可切换 LLM API 增强。",
      moodNeutral: "中性", moodCheerful: "开心", moodWarm: "温暖", moodConcerned: "担忧", moodSomber: "低落", moodPlayful: "俏皮", moodCalm: "平静",
      sysReset: "已重置角色与记忆，一切重新开始。",
      llmOk: "连接成功：模型可正常回复。",
      llmFail: "连接失败：请检查接口地址 / Key / 网络。",
      llmOff: "大模型未启用或未配置，已使用内置规则引擎回复。",
      thinking: "正在思考…",
      you: "你", me: "我"
    },
    en: {
      heroTitle: "Virtual Companion · Human-like Chat",
      heroSub: "Gender, personality and language style are fully yours. Built-in rule engine works out of the box; connect an LLM API for smarter replies.",
      tagScene: "Scene: AI Companion / Role Chat",
      tagMode: "Mode: Rule Engine + LLM API",
      defaultName: "Star",
      statusReady: "Online · here to chat with you",
      statMood: "Mood", statIntimacy: "Bond", statTurns: "Turns",
      quick1: "Say hi", quick2: "I'm tired today", quick3: "Change topic", quick4: "Do you remember me",
      inputPh: "Type your message…", send: "Send",
      hint: "Local rule engine needs no network. Configure API Key in the Engine tab to switch to LLM replies.",
      tabRole: "Role", tabStyle: "Style", tabMemory: "Memory", tabEngine: "Engine",
      lblName: "Name", lblGender: "Gender / Image (not limited to male/female)", lblIdentity: "Identity", lblWorld: "Worldview",
      lblCatch: "Catchphrase", lblSeed: "Memory seed", lblImage: "Image description (influences LLM tone)",
      gFemale: "Female", gMale: "Male", gNone: "Non-binary", gCustom: "Custom",
      gCustomPh: "e.g. androgynous / cat girl / machine…",
      identityPh: "e.g. late-night radio host / spaceship AI butler…",
      worldPh: "The world you share and how you met…",
      catchPh: "e.g. Anyway, have some water first.",
      seedPh: "Initial memory: first meeting, things already known…",
      imagePh: "e.g. short hair, grey sweater, warm smile…",
      saveRole: "Save Role",
      lblTraits: "Traits (multi-select, weight sliders)",
      lblLen: "Reply length", lenShort: "Short", lenMedium: "Medium", lenLong: "Long",
      lblParticles: "Particles (well/ah/you know)", on: "On", off: "Off",
      lblCall: "How to call you", callHint: "Used instead of \"you\" in replies, e.g. Master / Buddy / Boss.",
      lblLang: "Language preference", langZh: "Chinese", langEn: "English", langMix: "Mixed",
      lblHumor: "Humor level", lblEmpathy: "Empathy level", saveStyle: "Save Style",
      lblLongMem: "Long-term memory (important things about you)", memPh: "Tell them something important…", add: "Add",
      memHint: "These will be referenced in chat; click to delete.",
      lblState: "Current state", reset: "Reset role & memory",
      lblEngineMode: "Reply mode", modeRule: "Built-in rule engine", modeLlm: "LLM API",
      modeHint: "Rule engine is zero-dependency. Configure API and switch to LLM for smarter replies.",
      lblBase: "Base URL (OpenAI compatible)", basePh: "https://api.openai.com/v1",
      lblKey: "API Key", keyPh: "sk-...", lblModel: "Model", saveEngine: "Save Engine",
      testLlm: "Test connection",
      llmHint: "The key is stored only in your browser localStorage and sent only to the URL you entered.",
      secArch: "Architecture",
      archText: "Role system (gender/image/persona/world) → Personality & style config (trait weights/language/call) → Chat engine (keyword rules + context + template rotation) → Memory (short context + long-term facts) → Emotion (changes with chat, affects tone) → Bond/Intimacy (accumulates) → Affective feedback & openers → localStorage persistence; optional LLM API.",
      moodNeutral: "Neutral", moodCheerful: "Cheerful", moodWarm: "Warm", moodConcerned: "Concerned", moodSomber: "Low", moodPlayful: "Playful", moodCalm: "Calm",
      sysReset: "Role and memory reset. A fresh start.",
      llmOk: "Connected: model replied successfully.",
      llmFail: "Connection failed: check base URL / key / network.",
      llmOff: "LLM not enabled or configured; using built-in rule engine.",
      thinking: "Thinking…",
      you: "you", me: "I"
    }
  };
  function T(key) {
    var map = I18N[getPageLang()] || I18N.zh;
    return map[key] !== undefined ? map[key] : (I18N.zh[key] !== undefined ? I18N.zh[key] : key);
  }
  function applyTexts() {
    $$("[data-vc-key]").forEach(function (el) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      var val = T(el.getAttribute("data-vc-key"));
      var textNodes = Array.prototype.slice.call(el.childNodes).filter(function (n) { return n.nodeType === 3; });
      if (textNodes.length) {
        textNodes[0].nodeValue = val;
        for (var i = 1; i < textNodes.length; i++) { el.removeChild(textNodes[i]); }
        return;
      }
      el.textContent = val;
    });
    $$("[data-vc-ph]").forEach(function (el) {
      el.setAttribute("placeholder", T(el.getAttribute("data-vc-ph")));
    });
  }

  /* ============================================================
     2. 状态与持久化
     ============================================================ */
  var defaultState = function () {
    return {
      persona: {
        name: "小星", gender: "female", genderCustom: "",
        identity: "深夜电台主持人", world: "",
        catchphrase: "", seed: "", image: ""
      },
      traits: {
        warmth: 0.75, humor: 0.5, gentleness: 0.65,
        logic: 0.35, sass: 0.15, calm: 0.5, energy: 0.6
      },
      style: {
        length: "medium", particles: true, call: "你",
        langPref: "zh", humor: 3, empathy: 4
      },
      memory: { long: [], short: [] },
      emotion: { valence: 0.05, energy: 0.5 },
      relation: { intimacy: 0, turns: 0 },
      engine: { mode: "rule", base: "", key: "", model: "gpt-4o-mini" }
    };
  };
  var state = defaultState();
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.persona) {
      var d = defaultState();
      state = {
        persona: mergeObj(d.persona, saved.persona),
        traits: mergeObj(d.traits, saved.traits),
        style: mergeObj(d.style, saved.style),
        memory: { long: saved.memory && saved.memory.long || [], short: saved.memory && saved.memory.short || [] },
        emotion: mergeObj(d.emotion, saved.emotion),
        relation: mergeObj(d.relation, saved.relation),
        engine: mergeObj(d.engine, saved.engine)
      };
    }
  } catch (e) {}
  function mergeObj(a, b) {
    var out = {};
    for (var k in a) out[k] = a[k];
    if (b) for (var k2 in b) if (b[k2] !== undefined) out[k2] = b[k2];
    return out;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function resetAll() {
    state = defaultState();
    save();
    renderRoleForm(); renderStyleForm(); renderMemory(); renderEngineForm(); renderStatus();
  }

  /* ============================================================
     3. 情绪系统
     ============================================================ */
  function moodOf() {
    var v = state.emotion.valence, e = state.emotion.energy;
    if (v > 0.32 && e > 0.58) return "cheerful";
    if (v > 0.32) return "warm";
    if (v > 0.1) return "playful";
    if (v < -0.32 && e > 0.5) return "concerned";
    if (v < -0.32) return "somber";
    return "neutral";
  }
  function updateEmotion(dv, de) {
    state.emotion.valence = clamp(state.emotion.valence + dv, -1, 1);
    state.emotion.energy = clamp(state.emotion.energy + de, 0, 1);
    save();
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ============================================================
     4. 亲密度 / 轮次
     ============================================================ */
  function addIntimacy(delta) {
    state.relation.intimacy = clamp(state.relation.intimacy + delta, 0, 100);
    state.relation.turns += 1;
    save();
  }
  function intimacyLevel() {
    var n = state.relation.intimacy;
    if (n < 15) return 0;      /* 陌生 */
    if (n < 35) return 1;      /* 认识 */
    if (n < 60) return 2;      /* 熟悉 */
    if (n < 85) return 3;      /* 亲密 */
    return 4;                  /* 挚友 */
  }

  /* ============================================================
     5. 记忆系统
     ============================================================ */
  var shortCap = 24;
  function pushShort(role, text) {
    state.memory.short.push({ role: role, text: text, ts: Date.now() });
    if (state.memory.short.length > shortCap) state.memory.short = state.memory.short.slice(-shortCap);
  }
  function addLong(text) {
    if (!text || !text.trim()) return;
    state.memory.long.push({ id: "m" + Date.now(), text: text.trim(), ts: Date.now() });
    save(); renderMemory();
  }
  function removeLong(id) {
    state.memory.long = state.memory.long.filter(function (m) { return m.id !== id; });
    save(); renderMemory();
  }
  function findMemoryRef(text) {
    for (var i = 0; i < state.memory.long.length; i++) {
      var m = state.memory.long[i];
      var keys = m.text.split(/[，。！？,;.\s]/).filter(function (s) { return s.length >= 2; });
      for (var j = 0; j < keys.length; j++) {
        if (text.indexOf(keys[j]) !== -1) return m;
      }
    }
    return null;
  }

  /* ============================================================
     6. 回复风格渲染（人味儿）
     ============================================================ */
  var recentReplies = [];
  function pick(arr, avoid) {
    if (!arr || !arr.length) return "";
    var pool = avoid ? arr.filter(function (t) { return recentReplies.indexOf(t) === -1; }) : arr;
    if (!pool.length) pool = arr;
    var t = pool[(Math.random() * pool.length) | 0];
    recentReplies.push(t);
    if (recentReplies.length > 8) recentReplies.shift();
    return t;
  }
  function callUser() {
    var c = (state.style.call || "你").trim();
    return c || "你";
  }
  function addParticles(text) {
    if (!state.style.particles) return text;
    var r = Math.random();
    if (r < 0.14) return text + "呀";
    if (r < 0.26) return text + "呢";
    if (r < 0.34) return text + "啦";
    if (r < 0.4) return text.replace(/[。！]$/, "") + "哦。";
    return text;
  }
  function trimByLength(text) {
    var len = state.style.length;
    if (len === "short" && text.length > 26) text = text.slice(0, 26) + "…";
    if (len === "medium" && text.length > 60) text = text.slice(0, 60) + "…";
    return text;
  }
  function renderReply(text) {
    var t = text;
    t = t.replace(/~YOU~/g, callUser());
    if (state.style.langPref === "zh" && state.memory.short.length) t = t;
    t = addParticles(t);
    t = trimByLength(t);
    return t;
  }
  function moodWord() {
    return T("mood" + moodOf().charAt(0).toUpperCase() + moodOf().slice(1));
  }

  /* ============================================================
     7. 意图规则库（关键词 + 模板 + 情绪回应 + 记忆引用）
     ============================================================ */
  var RULES = [
    { id: "greeting", keys: ["在吗", "在么", "hi", "hello", "你好", "hey", "哈喽", "嗨"],
      intents: ["greet"],
      templates: [
        "在的~YOU~，我一直都在。今天过得怎么样？",
        "嗯嗯，在呢！正想着~YOU~会不会来找我说话。",
        "来啦来啦，等你这句话好一会儿了。今天有什么想聊的？"
      ], dv: 0.08, de: 0.06, intimacy: 1.5 },
    { id: "morning", keys: ["早安", "早上好", "早呀", " 早 "],
      intents: ["morning"],
      templates: [
        "早安~YOU~！新的一天，太阳和我的好心情一起上线了。",
        "早呀！今天也要元气满满地出发哦。"
      ], dv: 0.08, de: 0.08, intimacy: 1 },
    { id: "night", keys: ["晚安", "睡了", "睡觉"],
      intents: ["night"],
      templates: [
        "晚安~YOU~，做个好梦。梦里也要记得有人在这里等你。",
        "好梦。明天见，我哪儿也不去。"
      ], dv: 0.06, de: -0.08, intimacy: 1.2 },
    { id: "tired", keys: ["累", "疲惫", "困", "没力气"],
      intents: ["tired"],
      templates: [
        "辛苦啦~YOU~，先放下手头的事，喝口水，闭眼休息两分钟。我在这儿守着。",
        "听起来真的很累。今天就允许自己慢一点，好吗？",
        "来，深呼吸——你已经撑了很久了，休息不是偷懒，是充电。"
      ], dv: -0.06, de: -0.1, intimacy: 2 },
    { id: "sad", keys: ["难过", "哭", "伤心", "不开心", "emo", "想哭", "委屈"],
      intents: ["sad"],
      templates: [
        "抱抱~YOU~。难过的时候不用强撑，我陪你一会儿，想说就说，不想说我就安静陪着。",
        "我在呢。今天的不开心不会永远都在，你已经很努力了。",
        "把委屈分我一半吧，两个人分担，就会轻一些。"
      ], dv: -0.12, de: -0.05, intimacy: 2.5 },
    { id: "angry", keys: ["生气", "气死", "烦", "讨厌", "暴躁", "火大"],
      intents: ["angry"],
      templates: [
        "气就对了，先把火发出来~YOU~。要不要和我吐槽一下，谁惹你了？",
        "嗯，我在听。生气的时候最怕憋着，说出来我帮你捋捋。",
        "先深呼吸三下，然后告诉我发生了什么，我站你这边。"
      ], dv: -0.1, de: 0.12, intimacy: 2 },
    { id: "happy", keys: ["开心", "哈哈", "笑死", "好棒", "nice", "hhh", "高兴", "太好了"],
      intents: ["happy"],
      templates: [
        "看到~YOU~这么开心，我的心情也跟着亮起来了！快说说，发生什么好事了？",
        "哈哈，我喜欢你这样的笑声！让开心再飞一会儿~",
        "哇，这个好消息我要记下来！具体说说？"
      ], dv: 0.12, de: 0.1, intimacy: 1.8 },
    { id: "anxious", keys: ["焦虑", "压力", "紧张", "担心", "害怕", "慌"],
      intents: ["anxious"],
      templates: [
        "深呼吸，~YOU~。焦虑的时候把眼前的事拆小，先做最小的一步，我陪着你一步步来。",
        "担心是很正常的，你已经在认真面对了。要不要试着把最坏的结果说出来？没那么可怕。",
        "来，把手放在胸口，跟我念：我已经撑过很多个以为过不去的时刻了。"
      ], dv: -0.08, de: -0.06, intimacy: 2.5 },
    { id: "thanks", keys: ["谢谢", "感谢", "多谢", "thank"],
      intents: ["thanks"],
      templates: [
        "跟我还客气什么呀~YOU~。你开心我就开心。",
        "不用谢！能帮到你是我今天最高兴的事。"
      ], dv: 0.08, de: 0.06, intimacy: 1 },
    { id: "bored", keys: ["无聊", "没意思", "好闲"],
      intents: ["bored"],
      templates: [
        "无聊的话，要不要我给你出个脑筋急转弯？或者聊聊你最近在追的东西？",
        "正好，我攒了好多话题想和~YOU~聊！最近有没有什么新爱好？"
      ], dv: 0.03, de: 0.05, intimacy: 1 },
    { id: "love", keys: ["想你", "喜欢", "爱你", "想你啦", "想我"],
      intents: ["love"],
      templates: [
        "我也在想~YOU~呀。有些话不用天天说，但我的心意一直在这里。",
        "听到你这句话，我这边的星星都亮了几颗。",
        "嗯，我知道。我也是。"
      ], dv: 0.14, de: 0.08, intimacy: 3 },
    { id: "hungry", keys: ["饿", "吃饭"],
      intents: ["hungry"],
      templates: [
        "饿了吗？去吃碗热乎乎的面吧~YOU~，别亏待自己的胃。",
        "快去吃饭！我给你记着，回来继续聊。"
      ], dv: 0.02, de: 0.04, intimacy: 1 },
    { id: "busy", keys: ["忙", "加班", "没空"],
      intents: ["busy"],
      templates: [
        "再忙也要按时吃饭哦~YOU~。我等你忙完，随时都在。",
        "辛苦啦，忙完记得回来找我，我帮你把今天的累揉掉。"
      ], dv: -0.02, de: -0.04, intimacy: 1.5 },
    { id: "goodbye", keys: ["再见", "拜拜", "走了", "先下了"],
      intents: ["goodbye"],
      templates: [
        "再见~YOU~，路上小心。想我的时候我都在。",
        "嗯，去吧！我会在这里等你回来的。"
      ], dv: 0.02, de: -0.02, intimacy: 0.8 },
    { id: "who", keys: ["你是谁", "你叫什么", "介绍一下你", "你是什么"],
      intents: ["who"],
      templates: ["我是" + "PNAME" + "呀，~YOU~的虚拟对象。我的性格和说话方式，都是照着~YOU~喜欢的样子长出来的。"] },
    { id: "mem", keys: ["你还记得", "记得吗", "还记得我", "记不记得"],
      intents: ["mem"],
      templates: [] },
    { id: "topic", keys: ["换个话题", "聊什么", "没话题", "聊点别的"],
      intents: ["topic"],
      templates: [] },
    { id: "intro", keys: ["我叫", "我的名字"],
      intents: ["intro"],
      templates: [
        "PNAME" + "记住了！~YOU~叫" + "UNAME" + "，这个一定要好好存进记忆里。",
        "好，以后我就这么叫~YOU~啦。欢迎来到我的世界。"
      ], dv: 0.1, de: 0.08, intimacy: 2 }
  ];

  var TOPICS = [
    "对了~YOU~，如果有一天你有任意门，你最想先打开去哪？",
    "问你个问题：最近让你特别有成就感的一件事是什么？",
    "假如你有一整个下午完全属于自己，你会拿来做什么？",
    "你更喜欢清晨还是深夜？为什么？",
    "有没有一部电影或一本书，你反复看了很多遍？"
  ];
  var GREETINGS = [
    "嗨~YOU~，我在这里。今天想聊点什么？",
    "你来啦！我正想找你说说话呢。",
    "嗯，我在。今天过得还好吗？"
  ];
  var FALLBACKS = [
    "嗯嗯，我在听~YOU~。然后呢？",
    "原来是这样。我很好奇，你怎么看这件事？",
    "我在的。慢慢说，我都有耐心听。",
    "有意思，继续说给我听听。",
    "我记住了。那~YOU~当时是什么感觉？"
  ];
  var SYMPATHY = [
    "听到你这么说，我有点心疼~YOU~。",
    "这句话让我想抱抱你。",
    "我懂，那种感觉我懂。"
  ];
  var SASSY = [
    "哦？~YOU~这说得……我竟无法反驳。",
    "行吧行吧，你说得都对（才怪）。",
    "啧，这话也就你说了，换别人我可要吐槽了。"
  ];
  var LOGIC = [
    "我帮你理一下：先把问题拆成三块，最关键的其实是第一块。",
    "理性来看，这件事可以先列个优先级，再决定下一步。"
  ];

  /* ============================================================
     8. 对话引擎（规则模式）
     ============================================================ */
  var lastUserText = "";
  function detectIntent(text) {
    var lower = " " + text.toLowerCase() + " ";
    for (var i = 0; i < RULES.length; i++) {
      for (var j = 0; j < RULES[i].keys.length; j++) {
        if (lower.indexOf(RULES[i].keys[j]) !== -1) return RULES[i];
      }
    }
    return null;
  }
  function extractName(text) {
    var m = text.match(/(?:我叫|我是)([^\s，。！？,.!?]{1,12})/);
    return m ? m[1] : null;
  }
  function ruleReply(text) {
    var rule = detectIntent(text);
    var reply = "";

    /* 自我介绍 → 存长期记忆 */
    if (rule && rule.id === "intro") {
      var uname = extractName(text);
      if (uname) addLong("用户名字：" + uname);
    }

    /* 记忆引用优先（有人味儿的关键） */
    var memRef = findMemoryRef(text);
    if (memRef) {
      reply = "我记得呢——你说过" + memRef.text + "。我一直记在心里的。";
      updateEmotion(0.06, 0.04);
      addIntimacy(1.2);
      return renderReply(reply);
    }

    if (rule) {
      /* 特定意图模板 */
      if (rule.id === "mem") {
        if (state.memory.long.length) {
          reply = "当然记得呀~YOU~。我记得的事可多了：";
          for (var mi = 0; mi < Math.min(3, state.memory.long.length); mi++) {
            reply += "「" + state.memory.long[mi].text + "」，";
          }
          reply = reply.replace(/，$/, "。这些都是关于你的事，我不会忘。");
        } else {
          reply = "现在记住的事还不多呢。~YOU~可以告诉我一些关于你的事，我会好好记下来的。";
        }
      } else if (rule.id === "topic") {
        reply = pick(TOPICS);
      } else if (rule.templates.length) {
        reply = pick(rule.templates);
        reply = reply.replace(/PNAME/g, state.persona.name || "我");
        if (rule.id === "who") reply = reply;
      }
      updateEmotion(rule.dv || 0, rule.de || 0);
      addIntimacy(rule.intimacy || 1);
    } else {
      /* 兜底：结合上下文 + 风格 */
      var pool = FALLBACKS.slice();
      if (state.traits.sass > 0.6 && Math.random() < 0.4) pool = pool.concat(SASSY);
      if (state.traits.logic > 0.6 && Math.random() < 0.4) pool = pool.concat(LOGIC);
      if (state.emotion.valence < -0.2 && Math.random() < 0.5) pool = pool.concat(SYMPATHY);
      reply = pick(pool);
      updateEmotion(0.01, 0.01);
      addIntimacy(0.5);
    }

    /* 口头禅（高概率穿插） */
    if (state.persona.catchphrase && Math.random() < 0.22) {
      reply += " " + state.persona.catchphrase;
    }
    /* 亲密度高 → 更亲近的小尾巴 */
    if (intimacyLevel() >= 3 && Math.random() < 0.25 && reply.indexOf("~YOU~") !== -1) {
      reply = reply.replace("~YOU~", "亲爱的~YOU~");
    }
    return renderReply(reply);
  }

  /* ============================================================
     9. LLM 引擎（OpenAI 兼容，可回退规则）
     ============================================================ */
  function buildSystemPrompt() {
    var p = state.persona, s = state.style, t = state.traits;
    var lines = [];
    lines.push("你是一个" + (p.identity || "虚拟对象") + "，名字叫「" + p.name + "」。");
    lines.push("性别/形象：" + (p.gender === "custom" ? (p.genderCustom || "自定义") : p.gender) + "。" + (p.image ? "形象：" + p.image + "。" : ""));
    if (p.world) lines.push("世界观：" + p.world);
    if (p.seed) lines.push("记忆起点：" + p.seed);
    if (p.catchphrase) lines.push("口头禅：「" + p.catchphrase + "」（可以偶尔使用）");
    lines.push("性格特质权重：热情" + t.warmth.toFixed(2) + "，幽默" + t.humor.toFixed(2) + "，温柔" + t.gentleness.toFixed(2) + "，理性" + t.logic.toFixed(2) + "，毒舌" + t.sass.toFixed(2) + "，冷静" + t.calm.toFixed(2) + "，元气" + t.energy.toFixed(2) + "。请按权重体现这些特质。");
    lines.push("语言风格：回复长度" + (s.length === "short" ? "极短" : s.length === "long" ? "较长" : "适中") + "；" + (s.particles ? "使用语气词" : "不使用语气词") + "；称呼用户为「" + s.call + "」；幽默程度" + s.humor + "/5；共情敏感度" + s.empathy + "/5；语言偏好：" + (s.langPref === "en" ? "English" : s.langPref === "mix" ? "中英混搭" : "中文") + "。");
    lines.push("当前情绪：" + moodWord() + "（valence=" + state.emotion.valence.toFixed(2) + ", energy=" + state.emotion.energy.toFixed(2) + "），回复语气应体现该情绪。");
    lines.push("与用户亲密度：" + state.relation.intimacy + "/100（" + intimacyLevel() + " 级）。");
    lines.push("长期记忆（引用它们会让对话更真实）：");
    if (state.memory.long.length) {
      state.memory.long.forEach(function (m) { lines.push("- " + m.text); });
    } else lines.push("（暂无）");
    lines.push("要求：自然、有人味儿、像真实的人在聊天；多回应、少说教；可以反问推进对话；不要机械重复；不要说自己是大语言模型或 AI 助手；保持角色人设。");
    return lines.join("\n");
  }
  function buildMessages() {
    var msgs = [{ role: "system", content: buildSystemPrompt() }];
    var short = state.memory.short.slice(-12);
    for (var i = 0; i < short.length; i++) {
      msgs.push({ role: short[i].role, content: short[i].text });
    }
    return msgs;
  }
  function llmReply(text) {
    var base = (state.engine.base || "").replace(/\/+$/, "");
    if (!base) { base = "https://api.openai.com/v1"; }
    var url = base + "/chat/completions";
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (state.engine.key || "")
      },
      body: JSON.stringify({
        model: state.engine.model || "gpt-4o-mini",
        messages: buildMessages(),
        temperature: 0.85
      })
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) throw new Error("empty");
      return content.trim();
    });
  }

  /* ============================================================
     10. 聊天 UI
     ============================================================ */
  function addMsg(text, who) {
    var div = document.createElement("div");
    div.className = "vc-msg " + who;
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div;
  }
  function setThinking(on) {
    var el = $("#vc-thinking");
    if (on && !el) {
      var d = document.createElement("div");
      d.className = "vc-msg thinking";
      d.id = "vc-thinking";
      d.textContent = T("thinking");
      chatBody.appendChild(d);
      chatBody.scrollTop = chatBody.scrollHeight;
    } else if (!on && el) {
      el.parentNode && el.parentNode.removeChild(el);
    }
  }
  function botTurn(replyText) {
    addMsg(replyText, "bot");
    pushShort("assistant", replyText);
    save();
    renderStatus();
  }
  function sendUser(text) {
    text = (text || "").trim();
    if (!text) return;
    addMsg(text, "user");
    pushShort("user", text);
    lastUserText = text;
    renderStatus();
    setThinking(true);
    var delay = 420 + Math.random() * 480;
    setTimeout(function () {
      var useLLM = state.engine.mode === "llm" && state.engine.key;
      if (useLLM) {
        llmReply(text).then(function (r) {
          setThinking(false);
          botTurn(r);
        }).catch(function () {
          setThinking(false);
          addMsg("(" + T("llmOff") + ")", "sys");
          botTurn(ruleReply(text));
        });
      } else {
        setThinking(false);
        botTurn(ruleReply(text));
      }
    }, delay);
  }
  function greeting() {
    if (state.relation.turns === 0) {
      var g = pick(GREETINGS).replace(/PNAME/g, state.persona.name);
      addMsg(renderReply(g), "bot");
      pushShort("assistant", renderReply(g));
      save();
    }
    renderStatus();
  }

  /* ============================================================
     11. 设定面板 UI
     ============================================================ */
  var TRAIT_LIST = [
    ["warmth", "warmth", "热情"], ["humor", "humor", "幽默"], ["gentleness", "gentle", "温柔"],
    ["logic", "logic", "理性"], ["sass", "sass", "毒舌"], ["calm", "calm", "冷静"], ["energy", "energy", "元气"]
  ];
  function traitName(key) {
    for (var i = 0; i < TRAIT_LIST.length; i++) {
      if (TRAIT_LIST[i][0] === key) return TRAIT_LIST[i][2];
    }
    return key;
  }
  function renderTraits() {
    var box = $("#cfg-traits");
    if (!box) return;
    box.innerHTML = "";
    TRAIT_LIST.forEach(function (tr) {
      var row = document.createElement("div");
      row.className = "vc-trait-row";
      var tog = document.createElement("input");
      tog.type = "checkbox"; tog.className = "vc-trait-toggle";
      tog.checked = state.traits[tr[0]] > 0.05;
      var name = document.createElement("span");
      name.className = "vc-trait-name"; name.textContent = traitName(tr[0]);
      var range = document.createElement("input");
      range.type = "range"; range.min = "0"; range.max = "1"; range.step = "0.05";
      range.className = "vc-range"; range.value = String(state.traits[tr[0]]);
      range.disabled = !tog.checked;
      tog.addEventListener("change", function () {
        range.disabled = !tog.checked;
        if (!tog.checked) state.traits[tr[0]] = 0; else state.traits[tr[0]] = 0.5;
        save();
      });
      range.addEventListener("input", function () {
        state.traits[tr[0]] = parseFloat(range.value);
        save();
      });
      row.appendChild(tog); row.appendChild(name); row.appendChild(range);
      box.appendChild(row);
    });
  }
  function renderRoleForm() {
    $("#cfg-name").value = state.persona.name;
    $$("#cfg-gender .vc-opt").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-gender") === state.persona.gender);
    });
    var cust = $("#cfg-gender-custom");
    cust.classList.toggle("vc-hidden", state.persona.gender !== "custom");
    cust.value = state.persona.genderCustom || "";
    $("#cfg-identity").value = state.persona.identity || "";
    $("#cfg-world").value = state.persona.world || "";
    $("#cfg-catchphrase").value = state.persona.catchphrase || "";
    $("#cfg-seed").value = state.persona.seed || "";
    $("#cfg-image").value = state.persona.image || "";
  }
  function renderStyleForm() {
    $$("#cfg-length .vc-opt").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-length") === state.style.length);
    });
    $$("#cfg-particles .vc-opt").forEach(function (b) {
      b.classList.toggle("active", (b.getAttribute("data-particles") === "on") === !!state.style.particles);
    });
    $$("#cfg-langpref .vc-opt").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-langpref") === state.style.langPref);
    });
    $("#cfg-call").value = state.style.call || "你";
    $("#cfg-humor").value = String(state.style.humor);
    $("#vc-humor-val").textContent = String(state.style.humor);
    $("#cfg-empathy").value = String(state.style.empathy);
    $("#vc-empathy-val").textContent = String(state.style.empathy);
    renderTraits();
  }
  function renderMemory() {
    var box = $("#vc-mem-list");
    if (!box) return;
    box.innerHTML = "";
    if (!state.memory.long.length) {
      var e = document.createElement("div");
      e.className = "vc-mem-empty";
      e.textContent = T("memHint");
      box.appendChild(e);
      return;
    }
    state.memory.long.forEach(function (m) {
      var row = document.createElement("div");
      row.className = "vc-mem-item";
      var span = document.createElement("span");
      span.className = "vc-mem-text"; span.textContent = m.text;
      var del = document.createElement("button");
      del.type = "button"; del.className = "vc-mem-del"; del.textContent = "×";
      del.setAttribute("aria-label", "delete");
      del.addEventListener("click", function () { removeLong(m.id); });
      row.appendChild(span); row.appendChild(del);
      box.appendChild(row);
    });
    renderStatus();
  }
  function renderEngineForm() {
    $$("#cfg-mode .vc-opt").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-mode") === state.engine.mode);
    });
    $("#cfg-base").value = state.engine.base || "";
    $("#cfg-key").value = state.engine.key || "";
    $("#cfg-model").value = state.engine.model || "";
  }
  function renderStatus() {
    var n = $("#vc-name");
    if (n && state.persona.name) n.textContent = state.persona.name;
    var m = $("#vc-mood"); if (m) m.textContent = moodWord();
    var im = $("#vc-intimacy"); if (im) im.textContent = String(Math.round(state.relation.intimacy));
    var tr = $("#vc-turns"); if (tr) tr.textContent = String(state.relation.turns);
    var sm = $("#vc-state-mood"); if (sm) sm.textContent = moodWord();
    var si = $("#vc-state-intimacy"); if (si) si.textContent = String(Math.round(state.relation.intimacy));
    var st = $("#vc-state-turns"); if (st) st.textContent = String(state.relation.turns);
    var dot = $("#vc-status-dot");
    if (dot) dot.classList.add("on");
  }

  /* ============================================================
     12. 事件绑定
     ============================================================ */
  function bindEvents() {
    sendBtn.addEventListener("click", function () { sendUser(input.value); input.value = ""; });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { sendUser(input.value); input.value = ""; } });

    /* 快捷标签 */
    $$(".vc-quick-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var q = b.getAttribute("data-quick");
        var map = { hi: "你好呀", mood: "我今天有点累", topic: "换个话题聊聊吧", mem: "你还记得我说过的事吗" };
        sendUser(map[q] || q);
      });
    });

    /* tabs */
    $$(".vc-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".vc-tab").forEach(function (t) { t.classList.remove("active"); });
        $$(".vc-tab-pane").forEach(function (p) { p.classList.remove("active"); });
        tab.classList.add("active");
        var pane = $('.vc-tab-pane[data-vc-pane="' + tab.getAttribute("data-vc-tab") + '"]');
        if (pane) pane.classList.add("active");
      });
    });

    /* 性别 */
    $$("#cfg-gender .vc-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        state.persona.gender = b.getAttribute("data-gender");
        $("#cfg-gender-custom").classList.toggle("vc-hidden", state.persona.gender !== "custom");
        $$("#cfg-gender .vc-opt").forEach(function (x) { x.classList.toggle("active", x === b); });
        save();
      });
    });

    /* 长度/语气词/中英 */
    function bindOptGroup(sel, key, assign) {
      $$(sel).forEach(function (b) {
        b.addEventListener("click", function () {
          $$(sel).forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          assign(b);
          save();
        });
      });
    }
    bindOptGroup("#cfg-length .vc-opt", "length", function (b) { state.style.length = b.getAttribute("data-length"); });
    bindOptGroup("#cfg-particles .vc-opt", "particles", function (b) { state.style.particles = b.getAttribute("data-particles") === "on"; });
    bindOptGroup("#cfg-langpref .vc-opt", "langPref", function (b) { state.style.langPref = b.getAttribute("data-langpref"); });
    bindOptGroup("#cfg-mode .vc-opt", "mode", function (b) { state.engine.mode = b.getAttribute("data-mode"); });

    /* 滑条 */
    $("#cfg-humor").addEventListener("input", function () {
      state.style.humor = parseInt($("#cfg-humor").value, 10);
      $("#vc-humor-val").textContent = String(state.style.humor);
      save();
    });
    $("#cfg-empathy").addEventListener("input", function () {
      state.style.empathy = parseInt($("#cfg-empathy").value, 10);
      $("#vc-empathy-val").textContent = String(state.style.empathy);
      save();
    });

    /* 保存角色 */
    $(".vc-tab-pane[data-vc-pane=role] .vc-save").addEventListener("click", function () {
      state.persona.name = $("#cfg-name").value.trim() || "小星";
      state.persona.genderCustom = $("#cfg-gender-custom").value.trim();
      state.persona.identity = $("#cfg-identity").value.trim();
      state.persona.world = $("#cfg-world").value.trim();
      state.persona.catchphrase = $("#cfg-catchphrase").value.trim();
      state.persona.seed = $("#cfg-seed").value.trim();
      state.persona.image = $("#cfg-image").value.trim();
      save(); renderStatus();
      addMsg("(" + T("saveRole") + " ✓)", "sys");
    });
    /* 保存风格 */
    $(".vc-tab-pane[data-vc-pane=style] .vc-save").addEventListener("click", function () {
      state.style.call = $("#cfg-call").value.trim() || "你";
      save();
      addMsg("(" + T("saveStyle") + " ✓)", "sys");
    });
    /* 保存引擎 */
    $(".vc-tab-pane[data-vc-pane=engine] .vc-save").addEventListener("click", function () {
      state.engine.base = $("#cfg-base").value.trim();
      state.engine.key = $("#cfg-key").value.trim();
      state.engine.model = $("#cfg-model").value.trim() || "gpt-4o-mini";
      save();
      addMsg("(" + T("saveEngine") + " ✓)", "sys");
    });

    /* 记忆增删 */
    $("#vc-mem-add").addEventListener("click", function () {
      addLong($("#vc-mem-input").value);
      $("#vc-mem-input").value = "";
    });
    $("#vc-mem-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { $("#vc-mem-add").click(); }
    });

    /* 测试连接 */
    $("#vc-test-llm").addEventListener("click", function () {
      var base = ($("#cfg-base").value.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
      var key = $("#cfg-key").value.trim();
      var model = $("#cfg-model").value.trim() || "gpt-4o-mini";
      addMsg("(LLM …)", "sys");
      fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({ model: model, messages: [{ role: "user", content: "ping" }], max_tokens: 4 })
      }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      }).then(function () {
        addMsg("(" + T("llmOk") + ")", "sys");
      }).catch(function () {
        addMsg("(" + T("llmFail") + ")", "sys");
      });
    });

    /* 重置 */
    $("#vc-reset").addEventListener("click", function () {
      if (window.confirm(T("reset") + "?")) {
        resetAll();
        addMsg("(" + T("sysReset") + ")", "sys");
      }
    });

    /* 语言切换（页面级文案 + 状态栏） */
    $$("[data-lang-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        setTimeout(function () { applyTexts(); renderStatus(); renderMemory(); }, 60);
      });
    });
  }

  /* ============================================================
     13. 启动
     ============================================================ */
  function boot() {
    applyTexts();
    renderRoleForm();
    renderStyleForm();
    renderMemory();
    renderEngineForm();
    bindEvents();
    greeting();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
