/* =====================================================================
   AURELION — interactions
   Vanilla JS. Progressive enhancement: the page is fully usable
   without this file; these features layer on top.
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     CONFIG — edit these before launch
     ------------------------------------------------------------------ */
  var CONFIG = {
    // Public booking link (Calendly / Cal.com / SavvyCal / etc.).
    // Leave empty "" to fall back to the on-page inquiry form + #contact.
    bookingUrl: "",
    // Where the inquiry form should submit. Leave empty to use a mailto:
    // fallback (no backend required). Example: "https://formspree.io/f/XXXX".
    formEndpoint: "",
    // Used by the mailto: fallback when formEndpoint is empty.
    contactEmail: "hello@aurelion.example"
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setYear();
    setupMobileMenu();
    setupBookingLinks();
    setupAccordion();
    setupReveal();
    setupInquiryForm();
  }

  /* ------------------------- dynamic year --------------------------- */
  function setYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ------------------------- mobile menu ---------------------------- */
  function setupMobileMenu() {
    var toggle = document.getElementById("navToggle");
    var menu = document.getElementById("mobileMenu");
    if (!toggle || !menu) return;

    function close() {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
    function open() {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }

    toggle.addEventListener("click", function () {
      if (menu.hidden) open(); else close();
    });

    // Close after choosing a destination
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });

    // Escape closes the menu
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) {
        close();
        toggle.focus();
      }
    });

    // Reset state if resized up to desktop
    window.matchMedia("(min-width: 761px)").addEventListener("change", function (m) {
      if (m.matches) close();
    });
  }

  /* --------------------- booking CTA behaviour ---------------------- */
  // All "Book / Discuss" buttons: if a bookingUrl is configured, send
  // visitors there (new tab). Otherwise smoothly scroll to #book.
  function setupBookingLinks() {
    var cta = document.getElementById("bookingCta");
    // Prefer a data-booking-url attribute on the element, else CONFIG.
    var url = (cta && cta.getAttribute("data-booking-url")) || CONFIG.bookingUrl || "";

    var bookingSelectors = ['a[href="#book"]', "#bookingCta"];
    var links = document.querySelectorAll(bookingSelectors.join(","));

    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        if (url) {
          e.preventDefault();
          window.open(url, "_blank", "noopener");
        }
        // else: default anchor jump to #book (smooth via CSS scroll-behavior)
      });
    });
  }

  /* --------------------------- accordion ---------------------------- */
  // Accessible disclosure pattern with animated height.
  function setupAccordion() {
    var triggers = document.querySelectorAll(".acc-trigger");

    triggers.forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!panel) return;

      trigger.addEventListener("click", function () {
        var isOpen = trigger.getAttribute("aria-expanded") === "true";
        if (isOpen) collapse(trigger, panel);
        else expand(trigger, panel);
      });
    });

    function expand(trigger, panel) {
      trigger.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      if (reduceMotion) return;
      var h = panel.scrollHeight;
      panel.style.height = "0px";
      // force reflow so the transition runs
      void panel.offsetHeight;
      panel.style.height = h + "px";
      panel.addEventListener("transitionend", function done() {
        panel.style.height = "auto";
        panel.removeEventListener("transitionend", done);
      });
    }

    function collapse(trigger, panel) {
      trigger.setAttribute("aria-expanded", "false");
      if (reduceMotion) { panel.hidden = true; return; }
      panel.style.height = panel.scrollHeight + "px";
      void panel.offsetHeight;
      panel.style.height = "0px";
      panel.addEventListener("transitionend", function done() {
        panel.hidden = true;
        panel.style.height = "";
        panel.removeEventListener("transitionend", done);
      });
    }
  }

  /* ----------------------- reveal on scroll ------------------------- */
  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------- inquiry form ------------------------- */
  // No backend is wired by default. If CONFIG.formEndpoint is set we POST
  // to it; otherwise we open a pre-filled mailto: as a graceful fallback.
  function setupInquiryForm() {
    var form = document.getElementById("inquiry");
    var status = document.getElementById("formStatus");
    if (!form) return;

    var nameEl = document.getElementById("f-name");
    var emailEl = document.getElementById("f-email");
    var msgEl = document.getElementById("f-msg");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = nameEl.value.trim();
      var email = emailEl.value.trim();
      var message = msgEl.value.trim();

      if (!name || !isEmail(email)) {
        setStatus("Please add your name and a valid email address.", true);
        if (!name) nameEl.focus();
        else emailEl.focus();
        return;
      }

      if (CONFIG.formEndpoint) {
        submitToEndpoint({ name: name, email: email, message: message });
      } else {
        // Fallback: compose an email the visitor can send from their client.
        var subject = encodeURIComponent("Strategy call inquiry — " + name);
        var body = encodeURIComponent(
          "Name: " + name + "\nEmail: " + email + "\n\n" + (message || "")
        );
        window.location.href =
          "mailto:" + CONFIG.contactEmail + "?subject=" + subject + "&body=" + body;
        setStatus("Opening your email app… (no server backend is connected).", false);
      }
    });

    function submitToEndpoint(data) {
      setStatus("Sending…", false);
      fetch(CONFIG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            setStatus("Thank you — your note is on its way.", false);
          } else {
            setStatus("Something went wrong. Please email " + CONFIG.contactEmail + ".", true);
          }
        })
        .catch(function () {
          setStatus("Network error. Please email " + CONFIG.contactEmail + ".", true);
        });
    }

    function setStatus(msg, isError) {
      if (!status) return;
      status.textContent = msg;
      status.style.color = isError ? "#e4a79a" : "var(--sage)";
    }

    function isEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }
  }
})();
