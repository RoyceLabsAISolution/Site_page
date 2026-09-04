// Royce Labs — interactions
(function () {
  "use strict";

  // Current year
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  // Sticky nav shadow on scroll
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu toggle
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("mobileMenu");
  if (toggle && menu) {
    var isOpen = function () {
      return toggle.getAttribute("aria-expanded") === "true";
    };
    var closeMenu = function () {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    };
    var openMenu = function () {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    };
    toggle.addEventListener("click", function () {
      isOpen() ? closeMenu() : openMenu();
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) closeMenu();
    });
    // Close when clicking/tapping outside the menu + toggle
    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      if (!menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
    // Reset menu state when resizing up to desktop (avoids state desync)
    var mq = window.matchMedia("(min-width: 961px)");
    var handleMq = function () { if (mq.matches) closeMenu(); };
    mq.addEventListener ? mq.addEventListener("change", handleMq) : mq.addListener(handleMq);
  }

  // Scroll-reveal via IntersectionObserver
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  var showAll = function () {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  };
  if (reduced || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // Safety net: if anything is still hidden after load, reveal it.
    window.addEventListener("load", function () {
      setTimeout(function () {
        reveals.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && !el.classList.contains("is-visible")) {
            el.classList.add("is-visible");
          }
        });
      }, 300);
    });
  }

  // Accordion helper: only one <details> open at a time within a group
  var accordion = function (selector) {
    var items = document.querySelectorAll(selector);
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (item.open) {
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        }
      });
    });
  };

  // FAQ + expandable service cards
  accordion(".faq__item");
  accordion("details.card--svc");

  // ===== AI Chat Widget =====
  // Talks directly to the leadqual-worker Cloudflare Worker (hybrid FAQ +
  // structured lead-qualification pipeline: BANT scoring + Slack alerts).
  // Replaces the old /api/chat Pages Function (Workers AI FAQ + Resend email).
  (function initChat() {
    var CHAT_API = "https://leadqual-worker.officialroycelabs-ai.workers.dev/api/chat";

    var root = document.getElementById("chatw");
    var fab = document.getElementById("chatwFab");
    var panel = document.getElementById("chatwPanel");
    var min = document.getElementById("chatwMin");
    var log = document.getElementById("chatwLog");
    var form = document.getElementById("chatwForm");
    var input = document.getElementById("chatwInput");
    var sendBtn = document.getElementById("chatwSend");
    if (!root || !fab || !panel || !form || !input || !log) return;

    // Persistent per-visitor session id, so the Worker can track hybrid
    // FAQ<->qualifying mode and resume an in-progress qualification across
    // page reloads within the same browser.
    var sessionId = (function () {
      try {
        var existing = localStorage.getItem("royceChatSessionId");
        if (existing) return existing;
        var id =
          (window.crypto && window.crypto.randomUUID)
            ? window.crypto.randomUUID()
            : "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2);
        localStorage.setItem("royceChatSessionId", id);
        return id;
      } catch (e) {
        // localStorage unavailable (privacy mode, etc.) - fall back to an
        // in-memory id that still works for the current page view.
        return "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      }
    })();

    var history = []; // {role, content}
    var greeted = false;
    var busy = false;

    function scrollDown() { log.scrollTop = log.scrollHeight; }

    function addMsg(text, kind) {
      var el = document.createElement("div");
      el.className = "chatw__msg chatw__msg--" + kind;
      el.textContent = text;
      log.appendChild(el);
      scrollDown();
      return el;
    }

    function showTyping() {
      var el = document.createElement("div");
      el.className = "chatw__typing";
      el.innerHTML = "<span></span><span></span><span></span>";
      log.appendChild(el);
      scrollDown();
      return el;
    }

    function open() {
      root.classList.add("is-open");
      panel.hidden = false;
      fab.setAttribute("aria-expanded", "true");
      if (!greeted) {
        greeted = true;
        addMsg(
          "Hi! I'm Royce, the AI assistant for Royce Labs. Ask me about our services, how we work, or pricing — or tell me what your business needs and I'll get you set up.",
          "bot"
        );
      }
      setTimeout(function () { input.focus(); }, 50);
    }
    function close() {
      root.classList.remove("is-open");
      panel.hidden = true;
      fab.setAttribute("aria-expanded", "false");
    }
    fab.addEventListener("click", function () {
      root.classList.contains("is-open") ? close() : open();
    });
    if (min) min.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
    });

    function setBusy(state) {
      busy = state;
      sendBtn.disabled = state;
      input.disabled = state;
    }

    async function sendChat(text) {
      history.push({ role: "user", content: text });
      var typing = showTyping();
      try {
        var res = await fetch(CHAT_API, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId, messages: history }),
        });
        var data = await res.json();
        typing.remove();
        var reply = (data && data.reply) || "Sorry, something went wrong. Please try again.";
        history.push({ role: "assistant", content: reply });
        addMsg(reply, "bot");
      } catch (e) {
        typing.remove();
        addMsg("I couldn't reach the server. Please try again, or use the \u201cBook a call\u201d link below.", "bot");
      }
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (busy) return;
      var text = input.value.trim();
      if (!text) return;
      addMsg(text, "user");
      input.value = "";
      setBusy(true);
      await sendChat(text);
      setBusy(false);
      input.focus();
    });
  })();
})();
