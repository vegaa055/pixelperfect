/* ============================================================
   Pixel Perfect — site interactions (vanilla JS, no deps)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Header shrink on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = document.querySelector(".burger");
  var mobileNav = document.querySelector(".mobile-nav");
  function closeMenu() {
    if (!burger || !mobileNav) return;
    burger.classList.remove("open");
    mobileNav.classList.remove("open");
    document.body.style.overflow = "";
  }
  if (burger && mobileNav) {
    burger.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      burger.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Portfolio / gallery filters ---------- */
  var filterBar = document.querySelector(".filters");
  if (filterBar) {
    var items = Array.prototype.slice.call(document.querySelectorAll(".masonry .item"));
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      filterBar.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.getAttribute("data-filter");
      items.forEach(function (it) {
        var show = f === "all" || it.getAttribute("data-cat") === f;
        it.style.display = show ? "" : "none";
      });
      // rebuild lightbox list from visible items
      buildGallery();
    });
  }

  /* ---------- Lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg, lbCap, gallery = [], current = 0;
  if (lb) {
    lbImg = lb.querySelector("img");
    lbCap = lb.querySelector(".lb-caption");
    function buildGalleryInner() {
      gallery = Array.prototype.slice
        .call(document.querySelectorAll("[data-lightbox]"))
        .filter(function (el) { return el.offsetParent !== null; });
    }
    window.buildGallery = buildGalleryInner;
    buildGalleryInner();

    function show(i) {
      if (!gallery.length) return;
      current = (i + gallery.length) % gallery.length;
      var el = gallery[current];
      var full = el.getAttribute("data-full") || el.querySelector("img").src;
      lbImg.src = full;
      lbCap.textContent = el.getAttribute("data-caption") || "";
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function hide() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
    }

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-lightbox]");
      if (trigger && trigger.offsetParent !== null) {
        e.preventDefault();
        buildGalleryInner();
        show(gallery.indexOf(trigger));
      }
    });
    lb.querySelector(".lb-close").addEventListener("click", hide);
    lb.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) hide(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") hide();
      if (e.key === "ArrowRight") show(current + 1);
      if (e.key === "ArrowLeft") show(current - 1);
    });
  }

  /* ---------- Contact form (front-end only) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = form.querySelector(".form-success");
      if (ok) ok.classList.add("show");
      form.reset();
      setTimeout(function () { if (ok) ok.classList.remove("show"); }, 6000);
    });
  }

  /* ---------- Footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
