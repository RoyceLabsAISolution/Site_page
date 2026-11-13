// Royce Labs: nav, scroll reveal, FAQ accordion. No dependencies.
(function () {
  "use strict";

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  var nav = document.getElementById("nav");
  var onScroll = function () { if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("mobileMenu");
  if (toggle && menu) {
    var isOpen = function () { return toggle.getAttribute("aria-expanded") === "true"; };
    var setMenu = function (open) {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", function () { setMenu(!isOpen()); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { setMenu(false); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
    var mq = window.matchMedia("(min-width: 1101px)");
    var onMq = function () { if (mq.matches) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else mq.addListener(onMq);
  }

  // Scroll reveal
  var reveals = document.querySelectorAll(".reveal");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var showAll = function () { reveals.forEach(function (el) { el.classList.add("is-visible"); }); };
  if (reduced || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // Safety net: never leave content hidden if the observer misfires.
    window.addEventListener("load", function () { setTimeout(showAll, 2500); });
  }

  // FAQ: one open at a time
  var items = document.querySelectorAll(".faq details");
  items.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
})();
