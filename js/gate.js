/* gate.js — 사업자 전용 입장 게이트 (B2B)
   상호 · 사업자등록번호(국세청 체크섬) · 사업자등록증 사진을 확인한 뒤에만 상품·가격을 엽니다.
   사진은 localStorage 에 넣지 않습니다. 이름·번호 같은 가벼운 정보만 이 기기에 저장합니다.
   BLOCKED_BIZ(core.js)에 있는 번호는 입장도 주문도 막습니다. */

var BIZ_KEY = "hoonie_bulk_biz_v1";
var NTS_W = [1, 3, 7, 1, 3, 7, 1, 3, 5];
var BLOCKED_MSG = "이용이 제한된 사업자입니다. 매장(033-765-1531)으로 문의해 주세요.";

var gateFile = null;

/* ── 사업자등록번호 도우미 ── */
function bizDigits(v){ return String(v == null ? "" : v).replace(/[^0-9]/g, ""); }

function bizFormat(v){
  var d = bizDigits(v).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 5) + "-" + d.slice(5);
}

/* 국세청 사업자등록번호 검증식
   가중치 [1,3,7,1,3,7,1,3,5] 로 앞 9자리를 곱해 더하고, 9번째 자리×5의 십의 자리를 더한 뒤
   (10 - 합계%10)%10 이 마지막 자리와 같아야 합니다. 000-00-00000 같은 번호는 없습니다. */
function bizChecksumOk(v){
  var d = bizDigits(v);
  if (d.length !== 10) return false;
  if (/^0{10}$/.test(d)) return false;
  var sum = 0;
  for (var i = 0; i < 9; i++) sum += Number(d.charAt(i)) * NTS_W[i];
  sum += Math.floor(Number(d.charAt(8)) * 5 / 10);
  var check = (10 - (sum % 10)) % 10;
  return check === Number(d.charAt(9));
}

/* 이용 제한 사업자인지 — 하이픈을 뺀 숫자만으로 비교합니다 */
function bizBlocked(v){
  var d = bizDigits(v);
  if (d.length !== 10) return false;
  if (!BLOCKED_BIZ || !BLOCKED_BIZ.length) return false;
  for (var i = 0; i < BLOCKED_BIZ.length; i++){
    if (bizDigits(BLOCKED_BIZ[i]) === d) return true;
  }
  return false;
}

/* 저장된 확인 기록이 쓸 만한지 (번호 체크섬까지 다시 봅니다) */
function bizRecordOk(rec){
  return !!(rec && typeof rec === "object"
    && String(rec.bizName || "").trim().length > 0
    && rec.bizCertAttached === true
    && String(rec.bizCertName || "").length > 0
    && bizChecksumOk(rec.bizNo));
}
function loadBiz(){
  try { return JSON.parse(localStorage.getItem(BIZ_KEY) || "null"); } catch (e) { return null; }
}
function saveBiz(rec){
  try { localStorage.setItem(BIZ_KEY, JSON.stringify(rec)); } catch (e) {}
}
/* 세션(사업자 확인) 지우기 — 이용 제한 사업자가 되면 즉시 로그아웃합니다 */
function logoutBiz(){
  try { localStorage.removeItem(BIZ_KEY); } catch (e) {}
}

/* ── 게이트 화면 ── */
function gateErr(id, msg){
  var el = $(id);
  if (!el) return;
  if (msg){ el.textContent = msg; el.hidden = false; }
  else { el.textContent = ""; el.hidden = true; }
}
function gateBad(el, on){ if (el) el.classList.toggle("bad", !!on); }

function gateBlocked(msg){
  var box = $("#gateBlocked");
  if (!box) return;
  var p = box.querySelector("p");
  if (p) p.textContent = msg || BLOCKED_MSG;
  box.hidden = false;
}
function gateBlockedOff(){
  var box = $("#gateBlocked");
  if (box) box.hidden = true;
}

function gateFileSize(n){
  n = Number(n || 0);
  if (n >= 1048576) return (Math.round(n / 1048576 * 10) / 10) + "MB";
  return Math.max(1, Math.round(n / 1024)) + "KB";
}
function gateSetFile(f){
  gateFile = f || null;
  var prev = $("#gPrev"), btn = $("#gFileBtn");
  if (!prev || !btn) return;
  if (!f){
    prev.hidden = true;
    var im = $("#gPrevImg");
    if (im) im.removeAttribute("src");
    $("#gFileName").textContent = "";
    $("#gFileSize").textContent = "";
    btn.hidden = false;
    return;
  }
  $("#gFileName").textContent = f.name || "사업자등록증";
  $("#gFileSize").textContent = gateFileSize(f.size) + " · " + (f.type || "image");
  btn.hidden = true;
  prev.hidden = false;
  if (/^image\//.test(f.type || "") && window.FileReader){
    try {
      var fr = new FileReader();
      fr.onload = function(){ var img = $("#gPrevImg"); if (img) img.src = String(fr.result || ""); };
      fr.readAsDataURL(f);
    } catch (e) {}
  }
  gateErr("#gCertErr", "");
  gateBad(btn, false);
}

/* 게이트를 보여 줍니다. rec 이 있으면 상호·번호를 미리 채웁니다 (사업자 변경). */
function showGate(rec, blockedMsg){
  var gate = $("#viewGate");
  if (!gate) return;
  $("#viewShop").hidden = true;
  $("#viewCart").hidden = true;
  $("#viewCheckout").hidden = true;
  $("#viewDone").hidden = true;
  $("#cartbar").hidden = true;
  var sheet = $("#sheetPolicy");
  if (sheet){ sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); }
  document.body.classList.remove("hasbar");
  document.body.style.overflow = "";
  state.biz = null;

  /* 게이트로 돌아오면 상품·가격 DOM 도 비워 둡니다 (주문 시 차단되는 경우까지) */
  var list = $("#list");
  if (list) list.innerHTML = "";
  var empty = $("#empty");
  if (empty) empty.hidden = true;
  var cb = $("#cartBody");
  if (cb) cb.innerHTML = "";
  var ck = $("#ckLines");
  if (ck) ck.innerHTML = "";
  if ($("#ckSub")) $("#ckSub").textContent = "0원";
  if ($("#ckTotal")) $("#ckTotal").textContent = "0원";
  if ($("#ckBank")) $("#ckBank").innerHTML = "";
  if ($("#ckMin")){ $("#ckMin").innerHTML = ""; $("#ckMin").hidden = true; }
  if ($("#cbBadge")) $("#cbBadge").textContent = "0";
  if ($("#cbAmt")) $("#cbAmt").textContent = "0원";

  gate.hidden = false;

  /* 첨부는 매번 새로 받습니다 (사진은 어디에도 저장하지 않습니다) */
  gateSetFile(null);
  var certEl = $("#gCert");
  if (certEl) certEl.value = "";

  var nameEl = $("#gName"), noEl = $("#gNo");
  if (nameEl) nameEl.value = (rec && rec.bizName) ? String(rec.bizName) : "";
  if (noEl) noEl.value = (rec && rec.bizNo) ? bizFormat(rec.bizNo) : "";
  gateBad(nameEl, false);
  gateBad(noEl, false);
  gateBad($("#gFileBtn"), false);
  gateErr("#gNameErr", "");
  gateErr("#gNoErr", "");
  gateErr("#gCertErr", "");
  if (blockedMsg) gateBlocked(blockedMsg);
  else gateBlockedOff();

  window.scrollTo(0, 0);
}

function gateSubmit(e){
  if (e) e.preventDefault();
  var nameEl = $("#gName"), noEl = $("#gNo");
  if (!nameEl || !noEl) return;

  var name = String(nameEl.value || "").trim();
  var digits = bizDigits(noEl.value);
  var file = gateFile;

  var okName = name.length > 0;
  var okLen = digits.length === 10;
  var okChk = okLen && bizChecksumOk(digits);

  gateErr("#gNameErr", okName ? "" : "상호(가게 이름)를 적어 주세요.");
  gateBad(nameEl, !okName);

  /* 이용 제한 사업자 — 번호가 10자리로 들어오면 체크섬보다 먼저 막습니다 */
  if (okLen && bizBlocked(digits)){
    gateErr("#gNoErr", "");
    gateBad(noEl, false);
    gateBlocked(BLOCKED_MSG);
    logoutBiz();
    return;
  }

  gateErr("#gNoErr", okChk ? "" : (okLen
    ? "사업자등록번호가 올바르지 않아요. 사업자등록증의 번호를 다시 확인해 주세요."
    : "사업자등록번호 10자리를 적어 주세요."));
  gateBad(noEl, !okChk);
  gateErr("#gCertErr", file ? "" : "사업자등록증 사진을 첨부해 주세요.");
  gateBad($("#gFileBtn"), !file);

  if (!(okName && okChk && file)){
    var first = !okName ? nameEl : (!okChk ? noEl : $("#gCert"));
    if (first && first.focus){ try { first.focus(); } catch (er) {} }
    return;
  }

  gateBlockedOff();

  /* 마지막으로 사장님이 등록한 DB 차단 명단까지 확인하고 입장합니다.
     (이 파일의 BLOCKED_BIZ 는 위에서 이미 즉시 확인했습니다) */
  var btn = $("#gateGo");
  if (btn){ btn.disabled = true; btn.textContent = "확인 중…"; }
  checkBizBlocked(digits).then(function(blocked){
    if (btn){ btn.disabled = false; btn.textContent = "사업자 확인하고 입장하기"; }
    if (blocked){
      gateBlocked(BLOCKED_MSG);
      logoutBiz();
      return;
    }
    var rec = {
      bizName: name,
      bizNo: bizFormat(digits),
      bizCertName: String(file.name || "사업자등록증"),
      bizCertAttached: true,
      verifiedAt: new Date().toISOString()
    };
    saveBiz(rec);
    enterShop(rec, true);
  });
}

/* 번호를 다 적고 다른 칸으로 넘어가면 DB 차단 명단을 미리 확인해 둡니다 */
function gateCheckBlocked(v){
  var d = bizDigits(v);
  if (d.length !== 10) return;
  checkBizBlocked(d).then(function(blocked){
    if (!blocked) return;
    gateBlocked(BLOCKED_MSG);
    logoutBiz();
  });
}

function initGate(){
  var noEl = $("#gNo");
  if (noEl){
    noEl.addEventListener("input", function(){
      var atEnd = noEl.selectionStart === noEl.value.length;
      var f = bizFormat(noEl.value);
      if (f !== noEl.value) noEl.value = f;
      if (atEnd){ try { noEl.setSelectionRange(f.length, f.length); } catch (e) {} }
      noEl.classList.remove("bad");
      gateErr("#gNoErr", "");
    });
    noEl.addEventListener("blur", function(){
      if (noEl.value) noEl.value = bizFormat(noEl.value);
      gateCheckBlocked(noEl.value);
    });
  }
  var nameEl = $("#gName");
  if (nameEl) nameEl.addEventListener("input", function(){
    nameEl.classList.remove("bad");
    gateErr("#gNameErr", "");
  });

  var cert = $("#gCert");
  if (cert) cert.addEventListener("change", function(){
    var f = cert.files && cert.files[0];
    if (!f){ gateSetFile(null); return; }
    if (!/^image\//.test(f.type || "")){
      gateSetFile(null);
      cert.value = "";
      gateErr("#gCertErr", "이미지 파일(jpg · png)만 올릴 수 있어요.");
      gateBad($("#gFileBtn"), true);
      return;
    }
    gateSetFile(f);
  });

  var del = $("#gFileDel");
  if (del) del.addEventListener("click", function(){
    gateSetFile(null);
    if (cert) cert.value = "";
  });

  var form = $("#gateForm");
  if (form) form.addEventListener("submit", gateSubmit);
}
