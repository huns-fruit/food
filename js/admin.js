/* admin.js — 식자재몰(식당·카페 대용량) 사장님 페이지
   - 로그인(Supabase Auth) 전에는 주문·차단 명단을 하나도 불러오지 않습니다.
   - 테이블은 식자재 전용 bulk_orders · bulk_blocked_biz 만 씁니다(소매몰 retail_* 는 건드리지 않음). */

var ORDERS_PULL_LIMIT = 200;
var POLL_MS = 15000;

var state = {
  orders: [], blocked: [],
  filter: "all", tab: "orders",
  confirm: {}, busy: {}
};

var pollTimer = null, clockTimer = null, syncAt = 0;

/* ── 시간 도우미 (한국 시간 기준) ───────────── */
function pad2(n){ return (n < 10 ? "0" : "") + n; }
function kstParts(iso){
  var d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return null;
  var k = new Date(d.getTime() + 9 * 3600000);
  return { ymd: k.getUTCFullYear() + "-" + pad2(k.getUTCMonth() + 1) + "-" + pad2(k.getUTCDate()),
           hm: pad2(k.getUTCHours()) + ":" + pad2(k.getUTCMinutes()) };
}
function todayYmd(){ return kstParts(null).ymd; }
function orderYmd(o){ var p = kstParts(o && o._created); return p ? p.ymd : ""; }
function orderHm(o){ var p = kstParts(o && o._created); return p ? p.hm : ""; }

/* ── 상태 ───────────────────────────────────── */
function normStatus(st){
  if (st === "preparing") return "delivering";
  if (st === "accepted") return "delivering";
  if (st === "done" || st === "canceled" || st === "delivering") return st;
  return "received";
}
function statusLabel(st){
  if (st === "delivering") return "배달중";
  if (st === "done") return "완료";
  if (st === "canceled") return "취소";
  return "새 주문";
}
function statusOf(o){ return normStatus(o && (o._status || o.status)); }

/* ── 불러오기 ───────────────────────────────── */
function pullOrders(){
  return sbCall(SB_ORDERS + "?select=id,status,data,created_at&order=created_at.desc&limit=" + ORDERS_PULL_LIMIT)
    .then(function(rows){
      var list = [];
      (rows || []).forEach(function(r){
        var d = r.data || {};
        d.no = d.no || r.id;
        d._id = r.id;
        d._created = r.created_at;
        d._status = normStatus(r.status || d.status);
        list.push(d);
      });
      state.orders = list;
      renderOrders();
      renderNums();
      syncAt = Date.now();
      renderSyncTime();
    }).catch(function(){});
}
function pullBlocked(){
  return sbCall(SB_BLOCKED + "?select=biz_no,shop_name,reason,created_at&order=created_at.desc&limit=300")
    .then(function(rows){
      state.blocked = rows || [];
      renderBlocked();
      renderNums();
    }).catch(function(){});
}
function pullAll(){ return Promise.all([pullOrders(), pullBlocked()]); }

function renderSyncTime(){
  var el = $("#syncTime");
  if (!el) return;
  if (!syncAt){ el.textContent = "—"; return; }
  var p = kstParts(new Date(syncAt).toISOString());
  el.textContent = "마지막 확인 " + (p ? p.hm : "—") + " · 15초마다 자동";
}

/* ── 주문 목록 ──────────────────────────────── */
function filterList(){
  var f = state.filter, today = todayYmd();
  return state.orders.filter(function(o){
    if (f === "today") return orderYmd(o) === today;
    if (f === "received" || f === "delivering" || f === "done" || f === "canceled") return statusOf(o) === f;
    return true;
  });
}
function countBy(st){
  return state.orders.filter(function(o){ return statusOf(o) === st; }).length;
}
function countToday(){
  var today = todayYmd();
  return state.orders.filter(function(o){ return orderYmd(o) === today; }).length;
}

function renderSums(){
  var today = todayYmd(), n = 0, sum = 0;
  state.orders.forEach(function(o){
    if (orderYmd(o) !== today) return;
    n++;
    if (statusOf(o) !== "canceled") sum += Number(o.total || 0);
  });
  if ($("#sumToday")) $("#sumToday").textContent = n;
  if ($("#sumSales")) $("#sumSales").textContent = money(sum) + "원";
  if ($("#sumNew")) $("#sumNew").textContent = countBy("received");
}

function renderFilters(){
  var box = $("#filters");
  if (!box) return;
  $$("button", box).forEach(function(b){
    var f = b.getAttribute("data-f");
    var n = f === "all" ? state.orders.length : (f === "today" ? countToday() : countBy(f));
    var em = b.querySelector("em");
    if (em) em.textContent = n;
    b.classList.toggle("on", f === state.filter);
  });
}

function renderNums(){
  if ($("#tabOrderNum")) $("#tabOrderNum").textContent = countBy("received");
  if ($("#tabBlockNum")) $("#tabBlockNum").textContent = state.blocked.length;
  renderSums();
  renderFilters();
}

function rowHtml(k, v, copyLabel, copyValue){
  return '<div class="orow"><span class="k">' + esc(k) + '</span>'
    + '<span class="v">' + v + '</span>'
    + (copyValue ? '<button class="cbtn" type="button" data-copy="' + esc(copyValue) + '" aria-label="' + esc(k) + ' 복사">복사</button>' : '')
    + '</div>';
}

function actsHtml(o){
  var st = statusOf(o), h = "";
  if (st === "received"){
    h += '<button class="pri" type="button" data-act="delivering" data-id="' + esc(o._id) + '">🛵 배달 시작</button>';
    h += '<button class="ok" type="button" data-act="done" data-id="' + esc(o._id) + '">✅ 완료</button>';
  } else if (st === "delivering"){
    h += '<button class="ok" type="button" data-act="done" data-id="' + esc(o._id) + '">✅ 배달 완료</button>';
    h += '<button class="ghost" type="button" data-act="received" data-id="' + esc(o._id) + '">↩ 새 주문으로</button>';
  } else if (st === "done"){
    h += '<button class="ghost" type="button" data-act="delivering" data-id="' + esc(o._id) + '">↩ 배달중으로</button>';
  } else if (st === "canceled"){
    h += '<button class="ghost" type="button" data-act="received" data-id="' + esc(o._id) + '">↩ 새 주문으로</button>';
  }
  if (st !== "canceled" && st !== "done"){
    h += '<button class="warn" type="button" data-act="canceled" data-id="' + esc(o._id) + '">✕ 취소</button>';
  }
  if (o.bizNo) h += '<button class="dang" type="button" data-act="block" data-id="' + esc(o._id) + '">🚫 사업자 차단</button>';
  h += '<button class="dang" type="button" data-act="delete" data-id="' + esc(o._id) + '">🗑 삭제</button>';
  return h;
}

function orderCardHtml(o){
  var st = statusOf(o);
  var h = '<article class="ocard' + (st === "received" ? " new" : "") + '" data-id="' + esc(o._id) + '">';
  h += '<div class="ohead"><span class="badge ' + st + '">' + statusLabel(st) + '</span>'
    + '<span class="onum">' + esc(o.no || "") + '</span>'
    + '<span class="otime">' + esc(orderHm(o)) + ' 접수</span></div>';
  h += '<div class="otop"><b class="oshop">' + esc(o.shopName || o.name || "상호 없음") + '</b>'
    + (o.manager ? '<p class="oman">담당 ' + esc(o.manager) + '</p>' : '') + '</div>';

  h += '<div class="orows">';
  if (o.phone){
    var tel = String(o.phone).replace(/[^0-9+]/g, "");
    h += rowHtml("연락처", '<a class="v" href="tel:' + esc(tel) + '">' + esc(o.phone) + '</a>', o.phone, o.phone);
  }
  if (o.addr) h += rowHtml("배달주소", esc(o.addr), "", o.addr);
  h += rowHtml("받는 날", esc(o.slotLabel || o.eta || "—"), "", "");
  if (o.bizNo) h += rowHtml("사업자", esc(o.bizNo), "", o.bizNo);
  if (o.receiptNo){
    h += rowHtml("현금영수증", esc((o.receiptLabel || o.receiptType || "") + " " + o.receiptNo), "", o.receiptNo);
  }
  if (o.depositor) h += rowHtml("입금자명", esc(o.depositor), "", "");
  h += '</div>';

  if (o.items && o.items.length){
    h += '<div class="oitems">';
    o.items.forEach(function(it){
      h += '<div class="oitem"><span>' + esc(it.name || "") + ' <i>' + esc(it.unit || "") + '</i> × ' + Number(it.qty || 0) + '</span>'
        + '<b>' + money(it.sum || 0) + '원</b></div>';
    });
    h += '</div>';
  }
  h += '<div class="ototal"><span>결제 금액 (무통장입금)</span><b>' + money(o.total || 0) + '원</b></div>';
  if (o.memo) h += '<p class="omemo">📝 ' + esc(o.memo) + '</p>';
  h += '<div class="oacts">' + actsHtml(o) + '</div>';
  h += '</article>';
  return h;
}

function renderOrders(){
  var box = $("#orderList");
  if (!box) return;
  var list = filterList();
  if (!list.length){
    box.innerHTML = '<div class="oempty"><span>🧺</span><b>주문이 없습니다</b>'
      + '<p>' + (state.filter === "all"
          ? "손님이 식자재 주문 화면에서 주문하면 여기로 들어옵니다."
          : "이 조건에 맞는 주문이 없습니다. 위의 <b>전체</b>를 눌러 보세요.") + '</p></div>';
  } else {
    var h = "";
    list.forEach(function(o){ h += orderCardHtml(o); });
    box.innerHTML = h;
  }
  renderSums();
  renderFilters();
}

/* ── 차단 사업자 목록 ───────────────────────── */
function blockedCardHtml(b){
  var p = kstParts(b.created_at);
  var h = '<article class="bcard" data-biz="' + esc(b.biz_no) + '">'
    + '<div class="binfo"><div class="bno">' + esc(bizFormat(b.biz_no)) + '</div>'
    + '<p class="bmeta">' + (b.shop_name ? '<b>' + esc(b.shop_name) + '</b>' : "상호 없음")
    + (b.reason ? ' · ' + esc(b.reason) : '')
    + (p ? ' · ' + esc(p.ymd) + ' 등록' : '') + '</p></div>'
    + '<button class="bunblock" type="button" data-unblock="' + esc(b.biz_no) + '">해제</button>'
    + '</article>';
  return h;
}
function renderBlocked(){
  var box = $("#blockList");
  if (!box) return;
  if (!state.blocked.length){
    box.innerHTML = '<div class="oempty"><span>🚫</span><b>차단한 사업자가 없습니다</b>'
      + '<p>주문 카드의 <b>🚫 사업자 차단</b>을 누르거나, 위에서 번호를 적어 추가하면<br>그 사업자는 입장 게이트에서 바로 막힙니다.</p></div>';
    return;
  }
  var h = "";
  state.blocked.forEach(function(b){ h += blockedCardHtml(b); });
  box.innerHTML = h;
}

/* ── 상태 변경 · 삭제 ───────────────────────── */
function orderPayload(o, extra){
  var d = {};
  for (var k in o){ if (k.charAt(0) !== "_") d[k] = o[k]; }
  for (var j in (extra || {})) d[j] = extra[j];
  return d;
}
function markBusy(id, on){
  if (on) state.busy[id] = true; else delete state.busy[id];
  $$('.oacts button[data-id="' + String(id).replace(/["\\]/g, "") + '"]').forEach(function(b){ b.disabled = !!on; });
}
function setStatus(o, next){
  if (!o || state.busy[o._id]) return;
  markBusy(o._id, true);
  var data = orderPayload(o, { status: next, statusAt: Date.now() });
  sbCall(SB_ORDERS + "?id=eq." + encodeURIComponent(o._id), {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({ status: next, data: data, updated_at: new Date().toISOString() })
  }).then(function(){
    o._status = next; o.status = next;
    markBusy(o._id, false);
    renderOrders(); renderNums();
    toast(o.no + " · " + statusLabel(next) + "으로 바꿨어요");
  }).catch(function(){
    markBusy(o._id, false);
    toast("상태를 바꾸지 못했어요. 잠시 뒤 다시 눌러 주세요");
  });
}
function deleteOrder(o){
  if (!o || state.busy[o._id]) return;
  if (!confirmTwice("del:" + o._id)){ toast("한 번 더 누르면 목록에서 지웁니다"); return; }
  markBusy(o._id, true);
  sbCall(SB_ORDERS + "?id=eq." + encodeURIComponent(o._id), { method: "DELETE" })
    .then(function(){
      state.orders = state.orders.filter(function(x){ return x._id !== o._id; });
      renderOrders(); renderNums();
      toast("주문을 지웠어요");
    }).catch(function(){
      markBusy(o._id, false);
      toast("지우지 못했어요. 잠시 뒤 다시 눌러 주세요");
    });
}

/* 두 번 눌러 확인 — 브라우저 확인창(confirm)보다 폰에서 누르기 쉽습니다 */
function confirmTwice(key){
  var now = Date.now();
  if (state.confirm[key] && state.confirm[key] > now) { delete state.confirm[key]; return true; }
  state.confirm[key] = now + 4000;
  return false;
}

/* ── 사업자 차단 / 해제 ─────────────────────── */
function bizDigits(v){ return String(v == null ? "" : v).replace(/[^0-9]/g, ""); }
function bizFormat(v){
  var d = bizDigits(v).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 5) + "-" + d.slice(5);
}
function addBlocked(bizNo, shopName, reason){
  var d = bizDigits(bizNo);
  if (d.length !== 10) return Promise.reject(new Error("사업자등록번호 10자리를 적어 주세요"));
  return sbCall(SB_BLOCKED, {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ biz_no: d, shop_name: shopName || null, reason: reason || null }])
  }).then(function(){ return pullBlocked(); });
}
function blockFromOrder(o){
  if (!o) return;
  var d = bizDigits(o.bizNo);
  if (d.length !== 10){ toast("이 주문에는 사업자등록번호가 없어 차단할 수 없어요"); return; }
  if (!confirmTwice("blk:" + d)){ toast("한 번 더 누르면 " + bizFormat(d) + " 사업자를 차단합니다"); return; }
  addBlocked(d, o.shopName || o.name || "", "주문 " + (o.no || "") + "에서 차단")
    .then(function(){ toast(bizFormat(d) + " 사업자를 차단했어요"); })
    .catch(function(err){ toast((err && err.message) || "차단하지 못했어요"); });
}
function unblock(bizNo){
  var d = bizDigits(bizNo);
  if (!confirmTwice("unblk:" + d)){ toast("한 번 더 누르면 차단을 풀어 줍니다"); return; }
  sbCall(SB_BLOCKED + "?biz_no=eq." + encodeURIComponent(bizNo), { method: "DELETE" })
    .then(function(){ return pullBlocked(); })
    .then(function(){ toast(bizFormat(d) + " 차단을 풀었어요"); })
    .catch(function(){ toast("차단을 풀지 못했어요"); });
}

/* ── 탭 ─────────────────────────────────────── */
function setTab(tab){
  state.tab = tab;
  $$("#tabs button").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-tab") === tab); });
  $("#tabOrders").hidden = tab !== "orders";
  $("#tabBlocked").hidden = tab !== "blocked";
  window.scrollTo(0, 0);
}

/* ── 화면 연결 ──────────────────────────────── */
function bindApp(){
  $$("#tabs button").forEach(function(b){
    b.addEventListener("click", function(){ setTab(b.getAttribute("data-tab")); });
  });

  $("#filters").addEventListener("click", function(e){
    var b = e.target.closest ? e.target.closest("button[data-f]") : null;
    if (!b) return;
    state.filter = b.getAttribute("data-f");
    renderOrders();
  });

  $("#orderList").addEventListener("click", function(e){
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t) return;
    var copy = t.getAttribute("data-copy");
    if (copy){ copyText(copy, "복사했어요"); return; }
    var act = t.getAttribute("data-act"), id = t.getAttribute("data-id");
    if (!act || !id) return;
    var o = null;
    for (var i = 0; i < state.orders.length; i++) if (state.orders[i]._id === id){ o = state.orders[i]; break; }
    if (!o) return;
    if (act === "block"){ blockFromOrder(o); return; }
    if (act === "delete"){ deleteOrder(o); return; }
    setStatus(o, act);
  });

  $("#blockList").addEventListener("click", function(e){
    var t = e.target.closest ? e.target.closest("button[data-unblock]") : null;
    if (!t) return;
    unblock(t.getAttribute("data-unblock"));
  });

  $("#blkAdd").addEventListener("click", function(){
    var noEl = $("#blkNo"), err = $("#blkErr"), btn = $("#blkAdd");
    var d = bizDigits(noEl.value);
    if (d.length !== 10){
      noEl.classList.add("bad");
      err.textContent = "사업자등록번호 10자리를 적어 주세요.";
      err.hidden = false;
      noEl.focus();
      return;
    }
    noEl.classList.remove("bad"); err.hidden = true;
    btn.disabled = true; btn.textContent = "추가 중…";
    addBlocked(d, $("#blkName").value.trim(), $("#blkReason").value.trim())
      .then(function(){
        btn.disabled = false; btn.textContent = "차단 목록에 추가";
        noEl.value = ""; $("#blkName").value = ""; $("#blkReason").value = "";
        toast(bizFormat(d) + " 사업자를 차단했어요");
      }).catch(function(err2){
        btn.disabled = false; btn.textContent = "차단 목록에 추가";
        err.textContent = (err2 && err2.message) || "추가하지 못했어요";
        err.hidden = false;
      });
  });
  $("#blkNo").addEventListener("input", function(){
    this.classList.remove("bad");
    $("#blkErr").hidden = true;
  });

  $("#ntfyCopy").addEventListener("click", function(){
    copyText(NTFY_TOPIC, "알림 주제를 복사했어요 · ntfy 앱에 붙여 넣으세요");
  });

  $("#refreshBtn").addEventListener("click", function(){
    var b = $("#refreshBtn");
    b.disabled = true; b.textContent = "불러오는 중…";
    pullAll().then(function(){
      b.disabled = false; b.textContent = "🔄 새로고침";
      toast("최신 주문을 받아 왔어요");
    });
  });

  var logout = $("#logoutBtn");
  if (logout) logout.addEventListener("click", function(){ endAuth("로그아웃했어요."); });
}

/* ── 시계 ───────────────────────────────────── */
function tickClock(){
  var p = kstParts(null);
  if (!p) return;
  var parts = p.ymd.split("-");
  /* 요일은 그 날짜의 달력 요일 — UTC 로 만들어 뽑아야 시간대에 흔들리지 않습니다 */
  var wd = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))).getUTCDay();
  var w = ["일", "월", "화", "수", "목", "금", "토"][wd];
  if ($("#today")) $("#today").textContent = Number(parts[1]) + "월 " + Number(parts[2]) + "일(" + w + ")";
  if ($("#clock")) $("#clock").textContent = p.hm;
}

/* ── 로그인 게이트 ────────────────────────────
   로그인 전에는 아무 데이터도 부르지 않습니다. */
var booted = false, authTimer = null, authBusy = false;

function setLoginMsg(msg){
  var el = $("#loginMsg");
  if (!el) return;
  el.textContent = msg || "";
  el.hidden = !msg;
}
function lockLogin(msg){
  document.body.classList.add("locked");
  var g = $("#loginGate");
  if (g) g.hidden = false;
  setLoginMsg(msg || "");
  var em = $("#loginEmail");
  if (em) setTimeout(function(){ try { em.focus(); } catch(e){} }, 150);
}
function unlockApp(){
  document.body.classList.remove("locked");
  var g = $("#loginGate");
  if (g) g.hidden = true;
}
function startAuthTimer(){
  if (authTimer) clearInterval(authTimer);
  authTimer = setInterval(function(){
    var s = authReadSession();
    if (s && authExpired(s)) renewAuth().catch(function(){});
  }, 60000);
}
function renewAuth(){
  var s = authReadSession();
  if (!s || !s.refresh_token) return Promise.reject(new Error("no session"));
  return authRefresh(s.refresh_token).then(function(d){
    var ns = authPack(d);
    if (!ns.email) ns.email = s.email;
    authSaveSession(ns, authIsKept());
    sbSetToken(ns.access_token);
    return ns;
  });
}
function onAuthFail(){
  if (authBusy) return;
  authBusy = true;
  renewAuth().then(function(){
    authBusy = false;
    if (booted) pullAll();
  }).catch(function(){
    authBusy = false;
    endAuth("로그인이 만료됐어요. 다시 로그인해 주세요.");
  });
}
function endAuth(msg){
  var s = authReadSession();
  var tok = s && s.access_token;
  if (authTimer){ clearInterval(authTimer); authTimer = null; }
  if (pollTimer){ clearInterval(pollTimer); pollTimer = null; }
  authClearSession();
  sbSetToken(null); sbAuthFail = null;
  try { if (msg) sessionStorage.setItem(AUTH_MSG_KEY, msg); } catch(e){}
  var done = tok ? authLogoutCall(tok).catch(function(){}) : Promise.resolve();
  Promise.race([done, new Promise(function(r){ setTimeout(r, 1200); })]).then(function(){ location.reload(); });
}
function doLogin(){
  var em = $("#loginEmail"), pw = $("#loginPassword"), keep = $("#loginKeep"), btn = $("#loginBtn");
  var email = ((em && em.value) || "").trim();
  var pass = (pw && pw.value) || "";
  if (!email || !pass){ setLoginMsg("아이디(이메일)와 비밀번호를 넣어 주세요"); return; }
  setLoginMsg("");
  if (btn){ btn.disabled = true; btn.textContent = "로그인 중…"; }
  authLogin(email, pass).then(function(d){
    var s = authPack(d);
    authSaveSession(s, !!(keep && keep.checked));
    sbSetToken(s.access_token);
    sbAuthFail = onAuthFail;
    if (pw) pw.value = "";
    if (btn){ btn.disabled = false; btn.textContent = "로그인"; }
    startAuthTimer();
    bootAdmin();
    toast("로그인했어요");
  }).catch(function(err){
    if (btn){ btn.disabled = false; btn.textContent = "로그인"; }
    setLoginMsg((err && err.message) ? err.message : "로그인하지 못했어요");
  });
}

function bootAdmin(){
  if (booted) return;
  booted = true;
  unlockApp();
  bindApp();
  tickClock();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tickClock, 20000);
  pullAll();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(function(){
    if (document.hidden) return;
    pullOrders();
  }, POLL_MS);
}

function authStart(){
  var f = $("#loginForm");
  if (f) f.addEventListener("submit", function(e){ e.preventDefault(); doLogin(); });

  var notice = "";
  try { notice = sessionStorage.getItem(AUTH_MSG_KEY) || ""; sessionStorage.removeItem(AUTH_MSG_KEY); } catch(e){}
  var s = authReadSession();
  if (!s){ lockLogin(notice); return; }
  sbSetToken(s.access_token);
  sbAuthFail = onAuthFail;
  if (!authExpired(s)){ bootAdmin(); startAuthTimer(); return; }
  renewAuth().then(function(){
    bootAdmin(); startAuthTimer();
  }).catch(function(){
    authClearSession(); sbSetToken(null); sbAuthFail = null;
    lockLogin("로그인 시간이 만료됐어요. 다시 로그인해 주세요.");
  });
}

authStart();
