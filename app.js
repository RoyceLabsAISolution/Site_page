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

  // FAQ: accordion (only one open at a time)
  var items = document.querySelectorAll(".faq__item");
  items.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) {
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });
})();
