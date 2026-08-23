/* 随机名言 */
(function () {
  "use strict";
  var text = document.getElementById("quote-text");
  var author = document.getElementById("quote-author");
  if (!text) return;
  var quotes = [
    { t: "愿你遍历山河，仍觉人间值得。", a: "佚名" },
    { t: "世界上只有一种真正的英雄主义，就是认清生活的真相后依然热爱生活。", a: "罗曼·罗兰" },
    { t: "你生而有翼，为何竟愿一生匍匐前进。", a: "鲁米" },
    { t: "山有顶峰，湖有彼岸，在人生漫漫长途中，万物皆有回转。", a: "佚名" },
    { t: "生活明朗，万物可爱，人间值得，未来可期。", a: "佚名" },
    { t: "慢慢来，比较快。", a: "佚名" },
    { t: "凡是过往，皆为序章。", a: "莎士比亚" },
    { t: "心之所向，素履以往；生如逆旅，一苇以航。", a: "七堇年" },
    { t: "天空黑暗到一定程度，星辰就会熠熠生辉。", a: "查尔斯·比亚德" },
    { t: "热爱可抵岁月漫长。", a: "佚名" },
    { t: "Do what you can, with what you have, where you are. ", a: "Theodore Roosevelt" },
    { t: "Stay hungry, stay foolish.", a: "Steve Jobs" }
  ];
  var last = -1;
  function show() {
    var i;
    do { i = (Math.random() * quotes.length) | 0; } while (i === last && quotes.length > 1);
    last = i;
    text.textContent = quotes[i].t;
    author.textContent = "—— " + quotes[i].a;
  }
  text.style.cssText = "font-size:1.25rem;line-height:2;color:var(--text);max-width:480px;margin:0 auto;font-weight:600;letter-spacing:0.02em";
  author.style.cssText = "margin-top:18px;font-size:0.85rem;color:var(--text-soft);letter-spacing:0.14em";
  show();
  var btn = document.getElementById("quote-next");
  if (btn) btn.addEventListener("click", show);
})();
