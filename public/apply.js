// Royce Labs: pilot application form. Progressive enhancement: works as a normal POST without JS.
(function () {
  "use strict";
  var form = document.getElementById("applyForm");
  if (!form) return;

  var btn = document.getElementById("applyBtn");
  var done = document.getElementById("applyDone");
  var fail = document.getElementById("applyFail");
  var mail = document.getElementById("applyMail");
  var status = document.getElementById("applyStatus");
  var EMAIL = "officialroycelabs.ai@gmail.com";
  var ta = document.documentElement.lang.indexOf("ta") === 0;
  var T = ta
    ? { name: "உங்கள் பெயரை உள்ளிடவும்.", business: "உங்கள் நிறுவனப் பெயரை உள்ளிடவும்.", phone: "10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.", city: "நகரத்தைத் தேர்ந்தெடுக்கவும்.", consent: "நாங்கள் தொடர்புகொள்ள ஒப்புதல் பெட்டியைத் தேர்ந்தெடுக்கவும்.", sending: "அனுப்புகிறது…", send: "என் விண்ணப்பத்தை அனுப்பு", err: "ஏதோ தவறு. கீழே உள்ள புலங்களைச் சரிபார்க்கவும்.", subj: "பைலட் விண்ணப்பம்" }
    : { name: "Please enter your name.", business: "Please enter your business or company name.", phone: "Please enter a 10-digit mobile number.", city: "Please choose a city.", consent: "Please tick the box so we can contact you.", sending: "Sending…", send: "Send my application", err: "Please check the fields below.", subj: "Pilot application" };

  // Preselect city from ?city=
  try {
    var q = new URLSearchParams(location.search);
    var c = q.get("city");
    var sel = document.getElementById("fCity");
    if (c && sel) Array.prototype.forEach.call(sel.options, function (o) { if (o.value === c) sel.value = c; });
    var s = q.get("status");
    if (s === "error" && fail) { fail.hidden = false; }
    if (s === "invalid" && status) { status.hidden = false; status.textContent = T.err; }
    var src = document.getElementById("fSource");
    if (src) src.value = (document.referrer && document.referrer.indexOf(location.host) > -1 ? document.referrer.replace(location.origin, "") : "direct") || "direct";
  } catch (e) { /* older browsers: ignore */ }

  function digits(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return d;
  }
  function setErr(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }
  function validate() {
    var f = form.elements;
    var bad = [];
    var n = f.name.value.trim().length >= 2;
    var b = f.business.value.trim().length >= 2;
    var p = /^[6-9]\d{9}$/.test(digits(f.phone.value));
    var ci = !!f.city.value;
    var co = f.consent.checked;
    setErr("eName", n ? "" : T.name); if (!n) bad.push(f.name);
    setErr("eBusiness", b ? "" : T.business); if (!b) bad.push(f.business);
    setErr("ePhone", p ? "" : T.phone); if (!p) bad.push(f.phone);
    setErr("eCity", ci ? "" : T.city); if (!ci) bad.push(f.city);
    setErr("eConsent", co ? "" : T.consent); if (!co) bad.push(f.consent);
    return bad;
  }

  function mailtoFromForm() {
    var f = form.elements;
    var body = "Name: " + f.name.value + "\r\nBusiness: " + f.business.value + "\r\nPhone: " + f.phone.value +
      "\r\nCity: " + f.city.value + "\r\nEnquiries a week: " + f.volume.value + "\r\nNote: " + f.note.value;
    return "mailto:" + EMAIL + "?subject=" + encodeURIComponent(T.subj + " - " + (f.city.value || "")) + "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("input", function (e) {
    if (e.target && e.target.id) setErr("e" + e.target.id.replace(/^f/, ""), "");
  });

  form.addEventListener("submit", function (e) {
    var bad = validate();
    if (bad.length) { e.preventDefault(); bad[0].focus(); return; }
    if (!window.fetch || !window.FormData) return; // fall back to normal POST + redirect
    e.preventDefault();
    btn.disabled = true; btn.textContent = T.sending;
    if (fail) fail.hidden = true;
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (o) {
        if (o.j && o.j.ok) {
          form.hidden = true; if (status) status.hidden = true;
          done.hidden = false; done.focus(); done.scrollIntoView({ block: "start" });
          return;
        }
        if (o.status === 422 && o.j && o.j.errors) {
          var m = o.j.errors;
          setErr("eName", m.name); setErr("eBusiness", m.business); setErr("ePhone", m.phone); setErr("eCity", m.city); setErr("eConsent", m.consent);
          btn.disabled = false; btn.textContent = T.send; return;
        }
        throw new Error("send_failed");
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = T.send;
        if (mail) mail.href = mailtoFromForm();
        if (fail) { fail.hidden = false; fail.scrollIntoView({ block: "center" }); }
      });
  });
})();
