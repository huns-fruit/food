/* app.js — 식자재 주문 화면 로직
   상품 탭 · 검색 · 장바구니 · 최소주문금액 확인 · 주문서 · 주문 완료 */

var CART_KEY = "hoonie_bulk_cart_v1";
var CUST_KEY = "hoonie_bulk_customer_v1";

var state = { cat: "veg", q: "", cart: {}, view: "shop", order: null, biz: null };

/* ────────────────────────────────────────────────
   1. 장바구니 저장 · 계산
   ──────────────────────────────────────────────── */
function loadCart(){
  var raw = null;
  try { raw = JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch (e) { raw = {}; }
  var cart = {};
  if (raw && typeof raw === "object"){
    for (var id in raw){
      var p = byId(id), n = Math.floor(Number(raw[id]));
      if (p && n > 0) cart[id] = Math.min(n, 99);
    }
  }
  state.cart = cart;
}
function saveCart(){
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) {}
}
function cartLines(){
  var out = [];
  for (var id in state.cart){
    var p = byId(id);
    if (p && state.cart[id] > 0) out.push({ p: p, qty: state.cart[id], sum: p.price * state.cart[id] });
  }
  return out;
}
function cartCount(){
  var n = 0;
  for (var id in state.cart) n += state.cart[id];
  return n;
}
function subtotal(){
  var s = 0;
  var lines = cartLines();
  for (var i = 0; i < lines.length; i++) s += lines[i].sum;
  return s;
}
/* 카테고리별로 담은 금액 — 최소주문금액은 채소·과일을 각각 봅니다 (소매몰과 같은 규칙) */
function catTotals(){
  var t = { veg: 0, fruit: 0 };
  var lines = cartLines();
  for (var i = 0; i < lines.length; i++) t[lines[i].p.cat] += lines[i].sum;
  return t;
}
function catRequirements(){
  var t = catTotals(), out = [];
  ["veg", "fruit"].forEach(function(k){
    if (t[k] > 0) out.push({ cat: k, min: CATS[k].min, total: t[k], gap: Math.max(0, CATS[k].min - t[k]) });
  });
  return out;
}
function canOrder(){
  var lines = cartLines();
  if (!lines.length) return false;
  var req = catRequirements();
  for (var i = 0; i < req.length; i++) if (req[i].gap > 0) return false;
  return true;
}
function shortGapText(){
  var req = catRequirements(), parts = [];
  for (var i = 0; i < req.length; i++){
    if (req[i].gap > 0) parts.push(CATS[req[i].cat].label + " " + money(req[i].gap) + "원");
  }
  return parts.length ? parts.join(" · ") + " 더 담아 주세요" : "";
}
function addToCart(id, delta){
  var p = byId(id);
  if (!p) return;
  var n = (state.cart[id] || 0) + (delta == null ? 1 : delta);
  if (n <= 0) delete state.cart[id];
  else state.cart[id] = Math.min(n, 99);
  saveCart();
  renderList();
  if (state.view === "cart") renderCart();
  else if (state.view === "checkout") renderCheckout();
  updateCartbar();
}

/* ────────────────────────────────────────────────
   2. 상품 목록
   ──────────────────────────────────────────────── */
function norm(s){ return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, ""); }
function matches(p, q){
  if (!q) return true;
  var hay = norm(p.name) + "|" + norm(p.unit) + "|" + norm(p.desc || "") + "|" + norm(p.id);
  return hay.indexOf(q) > -1;
}
function thumbHtml(p, cls){
  var inner;
  if (p.img && IMG[p.img]){
    inner = '<img src="' + IMG[p.img] + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" width="96" height="96">';
  } else {
    inner = '<span class="pemo" aria-hidden="true">' + (p.emoji || CATS[p.cat].emoji) + '</span>';
  }
  var badge = "";
  if (!cls && p.badge){
    badge = '<span class="pbadge ' + (p.badge === "인기" ? "hot" : "pick") + '">' + esc(p.badge) + '</span>';
  }
  return '<div class="' + (cls || "pthumb") + '">' + inner + badge + '</div>';
}
/* 받침에 따라 조사를 고릅니다 (예: 식자재 과일 + 을 / 식자재 채소 + 를) */
function josa(word, pair){
  var s = String(word || "");
  var code = s.charCodeAt(s.length - 1);
  var hasJong = (code >= 0xAC00 && code <= 0xD7A3) ? ((code - 0xAC00) % 28) !== 0 : true;
  var parts = pair.split("/");
  return parts[hasJong ? 0 : 1];
}
function stepperHtml(id, qty, cls){
  return '<div class="stp ' + (cls || "") + '" data-pid="' + esc(id) + '">'
    + '<button type="button" data-dec aria-label="수량 빼기">−</button>'
    + '<b>' + qty + '</b>'
    + '<button type="button" data-inc aria-label="수량 더하기">+</button>'
    + '</div>';
}
function prodRowHtml(p){
  var qty = state.cart[p.id] || 0;
  return '<article class="prow" data-pid="' + esc(p.id) + '">'
    + thumbHtml(p)
    + '<div class="pleft">'
    +   '<p class="punit">' + esc(p.unit) + '</p>'
    +   '<h3 class="pname">' + esc(p.name) + '</h3>'
    +   (p.desc ? '<p class="pdesc">' + esc(p.desc) + '</p>' : '')
    +   '<div class="pbottom">'
    +     '<div class="pprice">' + money(p.price) + '<span>원</span></div>'
    +     (qty
        ? stepperHtml(p.id, qty)
        : '<button type="button" class="padd" data-add>담기</button>')
    +   '</div>'
    + '</div>'
    + '</article>';
}
function renderList(){
  var cat = CATS[state.cat];
  var q = norm(state.q);
  var all = PRODUCTS.filter(function(p){ return p.cat === state.cat; });
  var shown = all.filter(function(p){ return matches(p, q); });

  $("#listTitle").textContent = cat.label;
  $("#listCount").textContent = shown.length + "개 품목" + (state.q ? " · ‘" + state.q + "’" : "");

  var box = $("#list"), empty = $("#empty");
  if (!shown.length){
    box.innerHTML = "";
    empty.hidden = false;
    renderEmpty(all, q);
    return;
  }
  empty.hidden = true;
  var h = "";
  for (var i = 0; i < shown.length; i++) h += prodRowHtml(shown[i]);
  box.innerHTML = h;
}
function renderEmpty(all, q){
  var other = state.cat === "veg" ? "fruit" : "veg";
  var otherLabel = CATS[other].label;
  var hits = 0;
  if (q){
    hits = PRODUCTS.filter(function(p){ return p.cat === other && matches(p, q); }).length;
  }
  var h = '<span class="em">🧺</span>'
    + '<b>찾는 품목이 없어요</b>'
    + (state.q ? '‘' + esc(state.q) + '’에 맞는 ' + esc(CATS[state.cat].label) + ' 품목이 없습니다.' : '')
    + '<br><span class="em-sub">다른 이름으로 찾거나 전체 목록을 확인해 보세요.</span>';
  if (hits){
    h += '<div class="em-act"><button type="button" data-switch="' + other + '">'
      + CATS[other].emoji + ' ' + esc(otherLabel) + '에서 ' + hits + '개 찾기</button></div>';
  }
  if (q && !hits){
    h += '<div class="em-act"><button type="button" data-clear-q>검색어 지우고 전체 보기</button></div>';
  }
  $("#empty").innerHTML = h;
}

/* ────────────────────────────────────────────────
   3. 장바구니 화면
   ──────────────────────────────────────────────── */
function minBoxHtml(withBar){
  var req = catRequirements();
  if (!req.length) return "";
  var h = '<section class="minsec">';
  h += '<h2 class="sec-t">최소주문금액</h2>';
  req.forEach(function(r){
    var c = CATS[r.cat];
    var pct = Math.min(100, Math.round(r.total / r.min * 100));
    var ok = r.gap === 0;
    h += '<div class="minbox' + (ok ? " ok" : "") + '">'
      +   '<div class="minhead"><b>' + c.emoji + ' ' + esc(c.label) + '</b>'
      +     '<span>' + money(r.total) + ' / ' + money(r.min) + '원</span></div>'
      +   (withBar ? '<div class="bar"><i style="width:' + pct + '%"></i></div>' : "")
      +   '<p class="minnote">' + (ok
            ? "최소주문금액을 채웠어요"
            : money(r.gap) + '원 더 담으면 ' + esc(c.label) + ' 주문이 가능해요')
      +   '</p>'
      + '</div>';
  });
  var t = catTotals();
  var absent = t.veg === 0 ? "veg" : (t.fruit === 0 ? "fruit" : null);
  if (absent){
    h += '<p class="minhint">' + CATS[absent].emoji + ' ' + esc(CATS[absent].label)
      + josa(CATS[absent].label, "을/를") + ' 함께 담으면 '
      + esc(CATS[absent].minText) + ' 이상부터 주문할 수 있어요.</p>';
  }
  h += '</section>';
  return h;
}
function renderCart(){
  var lines = cartLines();
  var body = $("#cartBody");
  var btn = $("#toCheckout");
  if (!lines.length){
    body.innerHTML = '<div class="empty cart-empty"><span class="em">🛒</span><b>장바구니가 비어 있어요</b>'
      + '식자재 채소·과일을 담아 보세요.<br><span class="em-sub">박스·망 단위로 담깁니다.</span>'
      + '<div class="em-act"><button type="button" data-go-shop>상품 보러 가기</button></div></div>';
    btn.disabled = true;
    btn.textContent = "품목을 담아 주세요";
    return;
  }
  var h = '<section class="clines">';
  lines.forEach(function(l){
    h += '<article class="cline" data-pid="' + esc(l.p.id) + '">'
      +   thumbHtml(l.p, "cth")
      +   '<div class="cinfo">'
      +     '<h3>' + esc(l.p.name) + '</h3>'
      +     '<p class="cunit">' + esc(l.p.unit) + '</p>'
      +     '<div class="cbot">'
      +       stepperHtml(l.p.id, l.qty, "sm")
      +       '<b class="csum">' + money(l.sum) + '원</b>'
      +     '</div>'
      +   '</div>'
      +   '<button type="button" class="cdel" data-del aria-label="' + esc(l.p.name) + ' 빼기">✕</button>'
      + '</article>';
  });
  h += '</section>';
  h += '<section class="csum-box"><div class="srow"><span>상품 합계</span><b>' + money(subtotal()) + '원</b></div>'
    + '<div class="srow"><span>배달비</span><b>무료 (원주 시내권)</b></div>'
    + '<div class="srow tot"><span>결제 금액</span><b>' + money(subtotal()) + '원</b></div></section>';
  h += minBoxHtml(true);
  h += '<p class="payhint">🏦 결제는 <b>무통장입금</b>만 받아요. 입금이 확인되면 준비를 시작합니다.</p>';
  body.innerHTML = h;

  var ok = canOrder();
  btn.disabled = !ok;
  btn.textContent = ok ? money(subtotal()) + '원 주문서 작성' : shortGapText() || "최소주문금액을 확인해 주세요";
}

/* ────────────────────────────────────────────────
   4. 받는 날짜 · 시간
   ──────────────────────────────────────────────── */
function kstDate(offsetDays){
  var d = new Date(Date.now() + 9 * 3600000 + (offsetDays || 0) * 86400000);
  return d.toISOString().slice(0, 10);
}
function kstHour(){
  return new Date(Date.now() + 9 * 3600000).getUTCHours();
}
function cutoffPassed(){ return kstHour() >= 12; }
function earliestDate(){ return cutoffPassed() ? kstDate(2) : kstDate(1); }
function dateLabel(ymd){
  var p = String(ymd || "").split("-");
  if (p.length !== 3) return "";
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  var w = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return (d.getMonth() + 1) + "월 " + d.getDate() + "일(" + w + ")";
}
function cutoffLabel(){
  var e = dateLabel(earliestDate());
  return cutoffPassed()
    ? "오늘 낮 12시 주문이 마감됐어요 · 지금 주문하면 " + e + " 오전 배달"
    : "낮 12시 마감 · 지금 주문하면 " + e + " 오전 배달";
}
var TIMES = [
  { v: "06-08", label: "오전 6~8시" },
  { v: "08-10", label: "오전 8~10시" },
  { v: "10-12", label: "오전 10~12시" },
  { v: "12-14", label: "오후 12~2시" },
  { v: "14-16", label: "오후 2~4시" },
  { v: "16-18", label: "오후 4~6시" },
  { v: "call",  label: "시간 협의 (전화로)" }
];
function timeLabel(v){
  for (var i = 0; i < TIMES.length; i++) if (TIMES[i].v === v) return TIMES[i].label;
  return "";
}

/* ────────────────────────────────────────────────
   5. 주문서 화면
   ──────────────────────────────────────────────── */
function renderCheckout(){
  var lines = cartLines();
  var sum = subtotal();

  var h = "";
  lines.forEach(function(l){
    h += '<div class="ckline"><span class="n">' + esc(l.p.name) + ' <i>' + esc(l.p.unit) + '</i> × ' + l.qty + '</span>'
      + '<b>' + money(l.sum) + '원</b></div>';
  });
  $("#ckLines").innerHTML = h;
  $("#ckSub").textContent = money(sum) + "원";
  $("#ckTotal").textContent = money(sum) + "원";
  $("#ckBank").innerHTML = bankBoxHtml(sum);
  $("#ckMin").innerHTML = minBoxHtml(true);
  $("#ckMin").hidden = !catRequirements().length;

  var dIn = $("#fDate");
  var min = earliestDate();
  dIn.min = min;
  if (!dIn.value || dIn.value < min) dIn.value = min;
  $("#fDateHint").textContent = cutoffPassed()
    ? "낮 12시가 지났어요 · " + dateLabel(min) + "부터 받을 수 있어요"
    : "낮 12시 이전 주문은 " + dateLabel(min) + " 오전 배달이에요";

  if (!$("#fTime").value) $("#fTime").value = "08-10";

  var ok = canOrder();
  var btn = $("#payBtn");
  btn.disabled = !ok;
  btn.textContent = ok ? money(sum) + "원 주문하기" : (shortGapText() || "품목을 담아 주세요");
  $("#payWarn").hidden = ok;
  $("#payWarn").textContent = ok ? "" : ("최소주문금액을 채워야 주문할 수 있어요 · " + shortGapText());
}
function renderTimeOptions(){
  var sel = $("#fTime");
  var h = '<option value="">받는 시간을 골라 주세요</option>';
  TIMES.forEach(function(t){ h += '<option value="' + t.v + '">' + t.label + '</option>'; });
  sel.innerHTML = h;
}
function fieldVal(id){ var el = $(id); return el ? String(el.value || "").trim() : ""; }
function bad(el, on){ if (el) el.classList.toggle("bad", !!on); }

function readForm(){
  return {
    shop: fieldVal("#fShop"),
    manager: fieldVal("#fManager"),
    phone: fieldVal("#fPhone"),
    addr: fieldVal("#fAddr"),
    date: fieldVal("#fDate"),
    time: fieldVal("#fTime"),
    memo: fieldVal("#fMemo"),
    receiptType: fieldVal("#fReceipt") || "none",
    receiptNo: fieldVal("#fReceiptNo"),
    depositor: fieldVal("#fDepositor"),
    agree: !!( $("#fAgree") && $("#fAgree").checked )
  };
}
function receiptLabel(t){
  if (t === "expense") return "지출증빙(사업자번호)";
  if (t === "income") return "소득공제(휴대폰번호)";
  return "";
}
function validate(f){
  var firstBad = null;
  function mark(id, cond){
    var el = $(id);
    bad(el, !cond);
    if (!cond && !firstBad) firstBad = el;
    return cond;
  }
  var ok = true;
  ok = mark("#fShop", f.shop.length > 0) && ok;
  ok = mark("#fManager", f.manager.length > 0) && ok;
  ok = mark("#fPhone", f.phone.replace(/[^0-9]/g, "").length >= 9) && ok;
  ok = mark("#fAddr", f.addr.length >= 5) && ok;
  ok = mark("#fDate", !!f.date && f.date >= earliestDate()) && ok;
  ok = mark("#fTime", !!f.time) && ok;
  if (f.receiptType !== "none"){
    var digits = String(f.receiptNo || "").replace(/[^0-9]/g, "");
    ok = mark("#fReceiptNo", digits.length >= 10) && ok;
  } else {
    bad($("#fReceiptNo"), false);
  }
  if (!f.agree){ $("#agreeBox").classList.add("bad"); ok = false; }
  else $("#agreeBox").classList.remove("bad");

  if (!ok && firstBad){
    firstBad.focus();
    toast(firstBad === $("#fReceiptNo")
      ? (f.receiptType === "expense" ? "사업자번호 10자리를 확인해 주세요" : "현금영수증 휴대폰번호를 확인해 주세요")
      : "주문 정보를 확인해 주세요");
  }
  return ok;
}
function saveCustomer(f){
  try {
    localStorage.setItem(CUST_KEY, JSON.stringify({
      shop: f.shop, manager: f.manager, phone: f.phone, addr: f.addr,
      receiptType: f.receiptType, receiptNo: f.receiptNo, depositor: f.depositor
    }));
  } catch (e) {}
}
function loadCustomer(){
  var d = null;
  try { d = JSON.parse(localStorage.getItem(CUST_KEY) || "null"); } catch (e) { d = null; }
  if (!d || typeof d !== "object") return;
  if (d.shop) $("#fShop").value = d.shop;
  if (d.manager) $("#fManager").value = d.manager;
  if (d.phone) $("#fPhone").value = d.phone;
  if (d.addr) $("#fAddr").value = d.addr;
  if (d.receiptType) $("#fReceipt").value = d.receiptType;
  if (d.receiptNo) $("#fReceiptNo").value = d.receiptNo;
  if (d.depositor) $("#fDepositor").value = d.depositor;
  toggleReceipt();
}
function toggleReceipt(){
  var t = fieldVal("#fReceipt") || "none";
  var box = $("#receiptNoBox");
  box.hidden = (t === "none");
  if (t === "expense"){
    $("#fReceiptNo").placeholder = "사업자번호 10자리";
    $("#fReceiptNo").inputMode = "numeric";
    /* 확인한 사업자번호를 그대로 채워 둡니다 */
    var rn = $("#fReceiptNo");
    if (rn && state.biz && !String(rn.value || "").trim()) rn.value = bizDigits(state.biz.bizNo);
  } else if (t === "income"){
    $("#fReceiptNo").placeholder = "휴대폰번호 (숫자만)";
    $("#fReceiptNo").inputMode = "numeric";
  }
}
function two(n){ return (n < 10 ? "0" : "") + n; }

function submitOrder(){
  /* 입장 확인이 없거나 이용 제한 사업자가 되었으면 주문을 받지 않습니다 */
  if (!state.biz || bizBlocked(state.biz.bizNo)){
    logoutBiz();
    showGate(null, BLOCKED_MSG);
    return;
  }
  if (!canOrder()){ toast(shortGapText() || "최소주문금액을 확인해 주세요"); return; }
  var f = readForm();
  if (!validate(f)) return;

  /* 사장님이 등록한 차단 명단까지 한 번 더 확인 — 걸리면 주문을 받지 않습니다 */
  var payBtn = $("#payBtn");
  if (payBtn){ payBtn.disabled = true; payBtn.textContent = "확인 중…"; }
  checkBizBlocked(state.biz.bizNo).then(function(blocked){
    if (blocked){
      logoutBiz();
      showGate(null, BLOCKED_MSG);
      return;
    }
    placeOrder(f);
  });
}

function placeOrder(f){
  var now = new Date();
  var ymd = String(now.getFullYear()) + two(now.getMonth() + 1) + two(now.getDate());
  var no = ORDER_PREFIX + ymd + "-" + String(Math.floor(Math.random() * 900000) + 100000);
  var slotLabel = dateLabel(f.date) + " " + timeLabel(f.time);
  var lines = cartLines();
  var sum = subtotal();
  var items = lines.map(function(l){
    return {
      pid: l.p.id, oi: 0, qty: l.qty,
      name: l.p.name, unit: l.p.unit, opt: "",
      price: l.p.price, sum: l.sum
    };
  });

  var ord = {
    no: no, at: now.getTime(),
    time: two(now.getHours()) + ":" + two(now.getMinutes()),
    channel: CHANNEL, channelLabel: "식자재(대용량)",
    mode: "delivery", zone: "city",
    slot: (f.date === kstDate(1) ? "tomorrow_am" : "bulk_" + String(f.date).replace(/-/g, "")),
    slotLabel: slotLabel, eta: slotLabel,
    sub: sum, disc: 0, pay: "무통장입금", total: sum,
    name: f.shop + " (" + f.manager + ")",
    shopName: f.shop, manager: f.manager, phone: f.phone,
    addr: f.addr, memo: f.memo,
    depositor: f.depositor,
    receiptType: f.receiptType,
    receiptNo: (f.receiptType !== "none" ? String(f.receiptNo || "").replace(/[^0-9]/g, "") : ""),
    receiptLabel: receiptLabel(f.receiptType),
    /* 사업자 확인 정보 — 가벼운 값만 넣습니다 (사진 데이터는 보내지 않음) */
    bizNo: state.biz.bizNo,
    bizCertName: state.biz.bizCertName,
    bizCertAttached: true,
    items: items,
    status: "received", statusAt: now.getTime()
  };

  var btn = $("#payBtn");
  btn.disabled = true;
  btn.textContent = "주문 접수 중…";

  state.order = ord;
  var settled = false;
  var guard = setTimeout(function(){ finish(null); }, 12000);
  function finish(saved){
    if (settled) return;
    settled = true;
    clearTimeout(guard);
    renderDone(ord, saved);
    setView("done");
    pushNewOrderAlert(ord);
    saveCustomer(f);
    state.cart = {};
    saveCart();
    updateCartbar();
  }
  pushOrder(ord).then(function(saved){ finish(saved); });
}

/* ────────────────────────────────────────────────
   6. 주문 완료 화면
   ──────────────────────────────────────────────── */
function renderDone(ord, saved){
  var h = '<div class="dchk">✓</div>'
    + '<h1>주문이 접수됐어요</h1>'
    + '<p class="sub">가게에서 내용을 확인한 뒤 준비합니다.<br><span>입금이 확인되면 배달을 시작해요.</span></p>';
  if (saved === false){
    h += '<div class="dsave">⚠️ 주문이 가게 화면에 바로 저장되지 않았어요. 가게(' + esc(STORE.tel) + ')로 전화 주시면 바로 확인해 드립니다.</div>';
  } else if (saved === null){
    h += '<div class="dsave">주문 저장을 확인하지 못했어요. 잠시 뒤에도 가게 화면에 주문이 보이지 않으면 가게(' + esc(STORE.tel) + ')로 전화 주세요.</div>';
  }
  h += '<div class="dcard">'
    + '<div class="drow"><span>주문번호</span><b class="dno">' + esc(ord.no) + '</b>'
    +   '<button type="button" class="dcopy" data-copy-order="' + esc(ord.no) + '">복사</button></div>'
    + '<div class="drow"><span>받는 날</span><b>' + esc(ord.slotLabel) + '</b></div>'
    + '<div class="drow"><span>상호</span><b>' + esc(ord.shopName) + ' · ' + esc(ord.manager) + '</b></div>'
    + (ord.bizNo ? '<div class="drow"><span>사업자번호</span><b>' + esc(ord.bizNo) + '</b></div>' : '')
    + '<div class="drow"><span>연락처</span><b>' + esc(ord.phone) + '</b></div>'
    + '<div class="drow"><span>배달 주소</span><b>' + esc(ord.addr) + '</b></div>'
    + (ord.memo ? '<div class="drow"><span>요청사항</span><b>' + esc(ord.memo) + '</b></div>' : '')
    + (ord.receiptNo ? '<div class="drow"><span>현금영수증</span><b>' + esc(ord.receiptLabel) + ' ' + esc(ord.receiptNo) + '</b></div>' : '')
    + '<div class="ditems">';
  ord.items.forEach(function(it){
    h += '<div class="dit"><span>' + esc(it.name) + ' <i>' + esc(it.unit) + '</i> × ' + it.qty + '</span>'
      + '<b>' + money(it.sum) + '원</b></div>';
  });
  h += '</div>'
    + '<div class="dtotal"><span>입금할 금액</span><b>' + money(ord.total) + '원</b></div>'
    + '</div>';
  h += bankBoxHtml(ord.total);
  h += '<div class="dacts">'
    + '<button type="button" class="cta" data-new-order>새 주문 시작</button>'
    + '<a class="ghost" href="tel:0337651531">가게에 전화하기 (033-765-1531)</a>'
    + '</div>'
    + '<p class="dfoot">입금자명을 상호(가게 이름)와 같게 적어 주세요.<br>'
    + '낮 12시 마감 · 원주 시내권 배달 · 문의 ' + esc(STORE.cs) + '</p>';
  $("#doneBody").innerHTML = h;
}

/* ────────────────────────────────────────────────
   7. 약관 · 정책
   ──────────────────────────────────────────────── */
var POLICIES = {
  terms: {
    title: "이용약관",
    body: '<p class="polmeta">시행일 2026년 11월 26일 · 훈이네과일야채 단구점 식자재 주문</p>'
      + '<h4>제1조 (목적)</h4><p>이 약관은 훈이네과일야채 단구점(이하 “가게”)이 운영하는 식자재 주문 화면(이하 “사이트”)에서 식당·카페 등 사업자가 채소·과일을 대용량으로 주문하고 받는 데 필요한 조건과 절차를 정합니다.</p>'
      + '<h4>제2조 (상품과 가격)</h4><ul><li>표시 가격은 원화이며 부가세를 포함합니다.</li><li>신선식품은 입고 시세에 따라 가격이 바뀔 수 있고, 주문한 시점의 가격이 적용됩니다.</li><li>품목·규격·수량은 입고 사정에 따라 달라질 수 있으며, 이때는 고객센터로 먼저 연락드리고 금액을 조정하거나 환불해 드립니다.</li></ul>'
      + '<h4>제3조 (주문과 계약 성립)</h4><ul><li>주문서를 보내면 가게가 내용을 확인한 뒤 접수하며, 그때 계약이 성립합니다.</li><li>배달은 원주 시내권만 가능하며, 낮 12시까지 접수된 주문은 다음날 오전 배달을 원칙으로 합니다. 낮 12시 이후 주문은 그 다음날 오전으로 접수됩니다.</li><li>주문 내용과 다르거나 연락이 닿지 않으면 가게가 주문을 취소할 수 있습니다.</li></ul>'
      + '<h4>제4조 (최소주문금액)</h4><p>배달 주문은 식자재 채소 50,000원 이상, 식자재 과일 100,000원 이상부터 가능합니다. 두 품목을 함께 주문할 때는 각각의 금액 기준을 모두 채워야 합니다.</p>'
      + '<h4>제5조 (결제)</h4><ul><li>현재는 무통장입금(계좌입금)만 이용할 수 있습니다. 입금이 확인된 뒤 상품 준비와 배달이 시작됩니다.</li><li>가게는 카드번호 등 결제 정보를 저장하지 않습니다.</li></ul>'
      + '<h4>제6조 (배달과 수령)</h4><p>배달 권역·최소주문금액·배달 시간은 <b>배송 및 교환·환불 정책</b>에 따릅니다. 주문서에 적어 주신 담당자 연락처로 배달 전에 연락드릴 수 있습니다.</p>'
      + '<h4>제7조 (취소·교환·환불)</h4><p>주문 취소, 교환, 환불은 <b>배송 및 교환·환불 정책</b>에서 정한 기준과 절차에 따릅니다.</p>'
      + '<h4>제8조 (신선식품의 특성)</h4><p>과일·채소는 자연 상태 그대로라 크기·색·당도에 차이가 있을 수 있습니다. 규격은 박스·망 단위의 대용량 기준이며, 사진은 상품 이해를 돕기 위한 예시입니다.</p>'
      + '<h4>제9조 (이용자의 의무)</h4><p>주문자는 상호·담당자 이름·연락처·배달 주소를 정확히 적어 주시고, 받으실 수 있는 날짜와 시간을 골라 주세요. 잘못된 정보로 배달이 되지 않아 생긴 문제는 가게가 책임지지 않습니다.</p>'
      + '<h4>제10조 (가게의 책임)</h4><p>천재지변, 도로·기상 상황, 주문 폭주 등 가게가 통제하기 어려운 사유로 배달이 늦어지거나 어려울 때는 먼저 연락드리고 일정을 다시 잡거나 결제 금액을 환불해 드립니다.</p>'
      + '<h4>제11조 (개인정보)</h4><p>주문 과정에서 받은 개인정보는 <b>개인정보처리방침</b>에 따라 처리합니다.</p>'
      + '<h4>제12조 (분쟁 해결)</h4><p>이 약관은 대한민국 법률에 따르며, 분쟁이 생기면 가게 소재지(강원특별자치도 원주시)를 관할하는 법원에 제기할 수 있습니다.</p>'
      + '<p class="pv">문의: 고객센터 010-9142-1531 · hhh3350@naver.com</p>'
  },
  privacy: {
    title: "개인정보처리방침",
    body: '<p class="polmeta">시행일 2026년 11월 26일 · 훈이네과일야채 단구점 식자재 주문</p>'
      + '<p>훈이네과일야채 단구점(이하 “가게”)은 식자재 주문·배달과 문의 응대에 꼭 필요한 정보만 받고 아래와 같이 처리합니다.</p>'
      + '<h4>1. 받는 정보</h4><ul><li><b>주문 시(필수)</b> 상호(가게 이름), 담당자 이름, 휴대폰번호, 배달 주소, 받는 날짜·시간, 주문 품목·수량·금액, 요청사항</li><li><b>선택</b> 입금자명, 현금영수증 발급용 사업자번호 또는 휴대폰번호</li><li>광고·추적을 위한 쿠키나 위치정보는 받지 않습니다. 로그인 없이 주문할 수 있습니다.</li></ul>'
      + '<h4>2. 쓰는 목적</h4><ul><li>주문 접수·준비·배달 안내</li><li>주문 상태 안내와 문의 응대</li><li>현금영수증 발급과 거래 기록 보관(법령이 요구하는 범위)</li></ul><p>받은 정보를 위 목적 밖으로 쓰거나 광고 발송에 이용하지 않습니다.</p>'
      + '<h4>3. 보관과 파기</h4><ul><li>목적을 다한 정보는 지체 없이 파기합니다.</li><li>다만 전자상거래법에 따라 계약·청약철회 기록 5년, 대금결제·공급 기록 5년, 소비자 불만·분쟁 처리 기록 3년은 보관합니다.</li><li>전자 파일은 복구할 수 없게 삭제하고, 종이 문서는 분쇄합니다.</li></ul>'
      + '<h4>4. 다른 사람에게 주는 경우</h4><ul><li>원칙적으로 본인 동의 없이 제3자에게 제공하지 않습니다.</li><li>배달 담당 기사에게 상호·연락처·주소를 배달에 필요한 만큼만 알려 드립니다.</li><li>법령에 따라 수사기관 등이 적법하게 요청하는 경우에는 제공할 수 있습니다.</li></ul>'
      + '<h4>5. 처리를 맡기는 곳(위탁)</h4><p>주문 기록 보관을 클라우드 서버(Supabase Inc., 미국)에 위탁합니다. 정보는 암호화된 통신(HTTPS)으로 전송되어 저장되며, 보관 기간은 위 3항과 같습니다.</p>'
      + '<h4>6. 정보주체의 권리</h4><p>본인 정보의 열람·정정·삭제·처리정지를 언제든 요청하실 수 있습니다. 고객센터로 말씀해 주시면 본인 확인 후 지체 없이 처리합니다.</p>'
      + '<h4>7. 안전하게 관리하는 방법</h4><p>주문 정보는 암호화된 통신(HTTPS)으로 주고받고, 가게 관계자만 확인할 수 있도록 접근을 제한합니다.</p>'
      + '<h4>8. 아이의 정보</h4><p>만 14세 미만 아이의 개인정보는 받지 않습니다.</p>'
      + '<h4>9. 바뀔 때</h4><p>이 방침이 바뀌면 시행 7일 전에 이 화면에서 알려 드립니다.</p>'
      + '<p class="pv">개인정보 보호책임자: 황관훈 (대표)<br>문의: 010-9142-1531 · hhh3350@naver.com</p>'
  },
  shipping: {
    title: "배송 및 교환·환불 정책",
    body: '<p class="polmeta">시행일 2026년 11월 26일 · 훈이네과일야채 단구점 식자재 주문</p>'
      + '<h4>1. 배달 권역</h4><ul><li>배달은 <b>원주 시내권만</b> 가능합니다. 시외·기업도시 등은 전화(033-765-1531)로 문의해 주세요.</li><li>배달비는 무료이며 최소주문금액만 확인합니다.</li></ul>'
      + '<h4>2. 최소주문금액</h4><ul><li><b>식자재 채소</b> 50,000원 이상</li><li><b>식자재 과일</b> 100,000원 이상</li><li>두 품목을 함께 주문할 때는 각각의 금액 기준을 모두 채워야 합니다. 최소주문금액에 못 미치면 주문 버튼이 잠깁니다.</li></ul>'
      + '<h4>3. 마감과 배달 시간</h4><ul><li><b>낮 12시 마감</b>입니다. 낮 12시 이전 주문은 다음날 오전 배달을 원칙으로 합니다.</li><li>낮 12시 이후 주문은 그 다음날 오전으로 접수됩니다.</li><li>주문서에서 받는 날짜와 시간(오전·오후)을 고를 수 있으며, 가게 사정에 따라 전화로 조정할 수 있습니다.</li><li>비·눈이나 도로 사정으로 늦어지면 먼저 연락드립니다.</li></ul>'
      + '<h4>4. 신선식품 교환·환불</h4><p>과일·채소는 신선식품이라 받으신 날 상태를 확인해 주세요. 아래 경우에는 받은 날 고객센터로 알려 주시면 확인 후 <b>교환 또는 부분환불</b>로 보상해 드립니다.</p><ul><li>받은 날 상한·무른·곰팡이·파손 등 이상이 있는 경우</li><li>주문한 품목과 다르거나 수량이 모자란 경우</li><li>표시된 규격과 현저히 다른 경우</li></ul>'
      + '<h4>5. 교환·환불이 어려운 경우</h4><ul><li>수령한 다음 날 이후에 알려 주신 경우(다만 보관 중 이상이 생긴 것이 확인되면 상담해 드립니다)</li><li>이미 조리하셨거나 손질·보관을 잘못하신 경우</li><li>단순 변심으로 받으신 날 이후에 요청하신 경우</li></ul>'
      + '<h4>6. 환불 방법과 기한</h4><ul><li>무통장입금: 환불 계좌를 받아 3영업일 안에 보내 드립니다.</li><li>부분 환불은 실제 입금하신 금액을 기준으로 계산합니다.</li></ul>'
      + '<h4>7. 주문 취소</h4><p>준비를 시작하기 전(접수 단계)까지는 전화로 취소하실 수 있습니다. 준비가 시작된 신선식품은 취소가 어려울 수 있으니 빠르게 연락 주세요.</p>'
      + '<p class="pv">문의: 고객센터 010-9142-1531 · hhh3350@naver.com</p>'
  }
};
function openPolicy(key){
  var p = POLICIES[key];
  if (!p) return;
  $("#polTitle").textContent = p.title;
  $("#polBody").innerHTML = p.body;
  var el = $("#sheetPolicy");
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closePolicy(){
  var el = $("#sheetPolicy");
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* ────────────────────────────────────────────────
   8. 화면 전환 · 공용
   ──────────────────────────────────────────────── */
var VIEWS = { shop: "#viewShop", cart: "#viewCart", checkout: "#viewCheckout", done: "#viewDone" };
function setView(v){
  if (!state.biz){ showGate(loadBiz(), false); return; }
  state.view = v;
  for (var k in VIEWS) $(VIEWS[k]).hidden = (k !== v);
  if (v === "cart") renderCart();
  else if (v === "checkout") renderCheckout();
  updateCartbar();
  window.scrollTo(0, 0);
}
function updateCartbar(){
  var n = cartCount(), sum = subtotal();
  var bar = $("#cartbar");
  bar.hidden = !(state.biz && state.view === "shop" && n > 0);
  document.body.classList.toggle("hasbar", !!(state.biz && state.view === "shop" && n > 0));
  $("#cbBadge").textContent = n;
  $("#cbAmt").textContent = money(sum) + "원";
}
function switchCat(key){
  if (!CATS[key]) return;
  state.cat = key;
  $$("#tabs button").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-cat") === key); });
  renderList();
}
function setQuery(v){
  state.q = v;
  $("#qClear").hidden = !v;
  renderList();
}

/* ────────────────────────────────────────────────
   9. 시작 — 사업자 확인을 통과해야만 상품·가격을 그립니다
   (확인 전에는 목록·가격·검색·장바구니 바를 DOM에 만들지 않습니다)
   ──────────────────────────────────────────────── */
function applyBizToForm(biz){
  if (!biz) return;
  var shop = $("#fShop");
  if (shop && biz.bizName) shop.value = biz.bizName;
  var bno = $("#fBizNo");
  if (bno) bno.value = biz.bizNo || "";
  if (fieldVal("#fReceipt") === "expense"){
    var rn = $("#fReceiptNo");
    if (rn && !String(rn.value || "").trim()) rn.value = bizDigits(biz.bizNo);
  }
}

function enterShop(biz, fresh){
  state.biz = biz || null;
  $("#viewGate").hidden = true;
  loadCustomer();
  renderTimeOptions();
  renderList();
  renderCart();
  renderCheckout();
  $("#cutoffNote").textContent = cutoffLabel();
  $("#cutoffNote").classList.toggle("late", cutoffPassed());
  $("#hdBizName").textContent = (biz && biz.bizName) ? biz.bizName : "사업자";
  applyBizToForm(biz);
  setView("shop");
  updateCartbar();
  if (fresh) toast("사업자 확인 완료 · 가격이 열렸어요");
}

function init(){
  initGate();
  wireShop();
  loadCart();

  var biz = loadBiz();
  if (biz && biz.bizNo && bizBlocked(biz.bizNo)){
    /* 저장된 사업자가 이용 제한 명단에 있으면 즉시 로그아웃하고 게이트로 보냅니다 */
    logoutBiz();
    showGate(null, BLOCKED_MSG);
  } else if (bizRecordOk(biz)){
    enterShop(biz, false);
    /* 사장님이 나중에 등록한 차단 명단까지 확인 — 걸리면 곧바로 게이트로 돌려보냅니다 */
    checkBizBlocked(biz.bizNo).then(function(blocked){
      if (!blocked) return;
      logoutBiz();
      showGate(null, BLOCKED_MSG);
    });
  } else {
    showGate(biz, false);
  }
}

function wireShop(){
  /* 상품 탭 */
  $$("#tabs button").forEach(function(b){
    b.addEventListener("click", function(){ switchCat(b.getAttribute("data-cat")); });
  });

  /* 검색 */
  var q = $("#q");
  q.addEventListener("input", function(){
    state.q = q.value;
    $("#qClear").hidden = !q.value;
    renderList();
  });
  $("#qClear").addEventListener("click", function(){
    q.value = "";
    setQuery("");
    q.focus();
  });

  /* 화면 이동 */
  $("#cartbar").addEventListener("click", function(){ setView("cart"); });
  $("#bizChange").addEventListener("click", function(){
    var biz = state.biz || loadBiz();
    gateSetFile(null);
    var cert = $("#gCert");
    if (cert) cert.value = "";
    showGate(biz, false);
  });
  $("#cartBack").addEventListener("click", function(){ setView("shop"); });
  $("#toCheckout").addEventListener("click", function(){
    if (!canOrder()){ toast(shortGapText() || "최소주문금액을 확인해 주세요"); return; }
    renderCheckout();
    setView("checkout");
  });
  $("#ckBack").addEventListener("click", function(){ renderCart(); setView("cart"); });
  $("#payBtn").addEventListener("click", submitOrder);

  /* 주문서 입력 */
  $("#fReceipt").addEventListener("change", toggleReceipt);
  ["#fShop", "#fManager", "#fPhone", "#fAddr"].forEach(function(id){
    var el = $(id);
    el.addEventListener("input", function(){ el.classList.remove("bad"); });
  });
  $("#fDate").addEventListener("change", function(){ $("#fDate").classList.remove("bad"); });
  $("#fTime").addEventListener("change", function(){ $("#fTime").classList.remove("bad"); });
  $("#fAgree").addEventListener("change", function(){ $("#agreeBox").classList.remove("bad"); });

  /* 문서 전체에서 위임 처리 — 목록·장바구니가 다시 그려져도 그대로 동작 */
  document.addEventListener("click", function(e){
    var t = e.target;
    var hit = t.closest ? t.closest("[data-add],[data-inc],[data-dec],[data-del],[data-switch],[data-clear-q],[data-go-shop],[data-new-order],[data-copy-account],[data-copy-order],[data-policy],[data-close-policy]") : null;
    if (!hit) return;

    if (hit.hasAttribute("data-policy")){ openPolicy(hit.getAttribute("data-policy")); return; }
    if (hit.hasAttribute("data-close-policy")){ closePolicy(); return; }
    if (hit.hasAttribute("data-copy-account")){ copyText(BANK.no, "계좌번호 " + BANK.no + " 복사했어요"); return; }
    if (hit.hasAttribute("data-copy-order")){ copyText(hit.getAttribute("data-copy-order"), "주문번호를 복사했어요"); return; }
    if (hit.hasAttribute("data-go-shop")){ setView("shop"); return; }
    if (hit.hasAttribute("data-new-order")){
      state.order = null;
      renderList(); renderCart(); renderCheckout(); loadCustomer(); applyBizToForm(state.biz);
      setView("shop");
      return;
    }
    if (hit.hasAttribute("data-switch")){ switchCat(hit.getAttribute("data-switch")); return; }
    if (hit.hasAttribute("data-clear-q")){ $("#q").value = ""; setQuery(""); return; }

    var row = hit.closest("[data-pid]");
    var pid = row ? row.getAttribute("data-pid") : "";
    if (!pid) return;
    if (hit.hasAttribute("data-add")) addToCart(pid, 1);
    else if (hit.hasAttribute("data-inc")) addToCart(pid, 1);
    else if (hit.hasAttribute("data-dec")) addToCart(pid, -1);
    else if (hit.hasAttribute("data-del")) addToCart(pid, -99);
  });

  /* 정책 시트 배경 누르면 닫기 */
  var sheet = $("#sheetPolicy");
  if (sheet){
    sheet.addEventListener("click", function(e){
      if (e.target === sheet || (e.target.classList && e.target.classList.contains("dim"))) closePolicy();
    });
  }
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") closePolicy();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
