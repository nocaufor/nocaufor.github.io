/* ai-guess：20 问猜物（区分度优先提问，CSP 兼容） */
(function () {
  "use strict";
  var qEl = document.getElementById("ag-q");
  var btnEl = document.getElementById("ag-btns");
  var logEl = document.getElementById("ag-log");
  var msgEl = document.querySelector(".ag-msg");
  var restartBtn = document.getElementById("ag-restart");

  // 候选物品 + 属性
  var ITEMS = [
    { name: "冰箱",   props: ["电器", "能制冷", "有门", "放在厨房", "插电使用", "体积较大"] },
    { name: "空调",   props: ["电器", "能制冷", "挂在高处", "插电使用", "遥控操作", "体积较大"] },
    { name: "手机",   props: ["电器", "能上网", "屏幕", "放进口袋", "触屏操作", "随身携带"] },
    { name: "电脑",   props: ["电器", "能上网", "屏幕", "有键盘", "办公使用", "体积较大"] },
    { name: "台灯",   props: ["电器", "能发光", "插电使用", "放在桌上", "手动开关", "体积较小"] },
    { name: "雨伞",   props: ["能挡雨", "可折叠", "出门携带", "布类材质", "手持使用"] },
    { name: "帽子",   props: ["能遮阳", "穿戴身上", "布类材质", "出门携带"] },
    { name: "眼镜",   props: ["戴在脸上", "玻璃镜片", "出门携带", "体积较小"] },
    { name: "牙刷",   props: ["洗漱用品", "放进口袋", "体积较小", "塑料材质", "手动使用"] },
    { name: "水杯",   props: ["装液体", "放在桌上", "出门携带", "杯状容器", "体积较小"] },
    { name: "书包",   props: ["装物品", "背在身上", "出门携带", "布类材质", "体积较大"] },
    { name: "吉他",   props: ["乐器", "能发声", "手持使用", "布类材质", "体积较大"] },
    { name: "篮球",   props: ["运动器材", "圆形球体", "能弹跳", "户外运动", "体积较大"] },
    { name: "伞绳",   props: ["户外用品", "绳状细长", "能承重", "出门携带"] },
    { name: "钥匙",   props: ["金属材质", "放进口袋", "体积较小", "出门携带", "开锁使用"] }
  ];
  var ALL_PROPS = ["电器", "能上网", "能制冷", "能发光", "能挡雨", "能发声", "能弹跳",
    "有屏幕", "有门", "插电使用", "触屏操作", "戴在脸上", "背在身上", "手持使用",
    "放在桌上", "放在厨房", "放进口袋", "出门携带", "体积较小", "体积较大",
    "金属材质", "塑料材质", "布类材质", "玻璃镜片", "圆形球体", "户外运动"];

  var candidates = [];
  var asked = new Set();
  var rounds = 0;
  var started = false;

  function renderButtons(prop) {
    btnEl.innerHTML = "";
    [["yes", "是"], ["no", "否"], ["maybe", "不确定"]].forEach(function (pair) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-primary";
      if (pair[0] === "maybe") b.className = "btn btn-outline";
      b.textContent = pair[1];
      b.addEventListener("click", function () { onAnswer(prop, pair[0]); });
      btnEl.appendChild(b);
    });
  }

  function logLine(cls, text) {
    var d = document.createElement("div");
    d.className = cls;
    d.textContent = text;
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function bestQuestion() {
    var best = null, bestScore = -1;
    ALL_PROPS.forEach(function (prop) {
      if (asked.has(prop)) return;
      var yes = candidates.filter(function (it) { return it.props.indexOf(prop) >= 0; }).length;
      var no = candidates.length - yes;
      var score = -Math.abs(yes - no);
      if (score > bestScore) { bestScore = score; best = prop; }
    });
    return best;
  }

  function ask(prop) {
    rounds += 1;
    if (!prop || rounds > 20) {
      finish(false);
      return;
    }
    asked.add(prop);
    qEl.textContent = "第 " + rounds + " 问：" + prop + "？";
    renderButtons(prop);
  }

  function onAnswer(prop, value) {
    if (!started) return; // 初始“开始游戏”按钮不进入问答逻辑
    logLine("q", "Q" + rounds + " " + prop + " → " + (value === "yes" ? "是" : value === "no" ? "否" : "不确定"));
    candidates = candidates.filter(function (it) {
      if (value === "yes") return it.props.indexOf(prop) >= 0;
      if (value === "no") return it.props.indexOf(prop) < 0;
      return true;
    });
    if (candidates.length === 1) {
      finish(true);
    } else if (candidates.length === 0) {
      finish(false);
    } else {
      ask(bestQuestion());
    }
  }

  function finish(won) {
    started = false;
    btnEl.innerHTML = "";
    if (won) {
      qEl.textContent = "我猜到了：是「" + candidates[0].name + "」！";
      logLine("a", "AI 猜中：" + candidates[0].name);
      msgEl.textContent = "用了 " + rounds + " 问，命中 " + candidates[0].name + "。";
    } else if (candidates.length === 0) {
      qEl.textContent = "没有匹配的候选了，我认输。";
      msgEl.textContent = "这个物品不在我的知识库里，换个试试？";
    } else {
      qEl.textContent = "超过 20 问，我认输。";
      msgEl.textContent = "剩余候选：" + candidates.map(function (c) { return c.name; }).join("、");
    }
    restartBtn.style.display = "inline-block";
  }

  restartBtn.addEventListener("click", function () {
    candidates = ITEMS.slice();
    asked = new Set();
    rounds = 0;
    started = true;
    logEl.innerHTML = "";
    msgEl.textContent = "心里想一个常见物品，我来猜。";
    restartBtn.style.display = "none";
    ask(bestQuestion());
  });

  // 初始展示开始按钮
  qEl.textContent = "准备好了吗？";
  renderButtons("__start");
  btnEl.querySelectorAll(".btn")[0].textContent = "开始游戏";
  btnEl.querySelectorAll(".btn")[0].addEventListener("click", function () {
    restartBtn.click();
  });
  btnEl.querySelectorAll(".btn")[1].style.display = "none";
  btnEl.querySelectorAll(".btn")[2].style.display = "none";
})();
