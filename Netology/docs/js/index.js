// index.js — Landing page smooth scroll and fade-in animations.

(function () {
  "use strict";

  // set up smooth scrolling for anchor links
  function setupSmoothScrollLinks() {
    var anchorLinks = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchorLinks.length; i++) {
      anchorLinks[i].addEventListener("click", handleAnchorLinkClick);
    }
  }

  // handle a click on an anchor link
  function handleAnchorLinkClick(event) {
    var href = this.getAttribute("href");
    var targetId = href ? href.substring(1) : "";
    var targetSection = targetId ? document.getElementById(targetId) : null;
    if (targetSection) {
      event.preventDefault();
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  // fade in cards and features as they scroll into view
  function setupScrollFadeAnimations() {
    var scrollObserver = new IntersectionObserver(function (observedEntries) {
      for (var i = 0; i < observedEntries.length; i++) {
        var entry = observedEntries[i];
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          scrollObserver.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    var animatedElements = document.querySelectorAll(".net-figma-step, .net-figma-feature-item");
    for (var i = 0; i < animatedElements.length; i++) {
      var element = animatedElements[i];
      element.style.opacity = "0";
      element.style.transform = "translateY(20px)";
      element.style.transition = "opacity 600ms ease, transform 600ms ease";
      scrollObserver.observe(element);
    }
  }

  // main entry point for the landing page
  function initialiseLandingPage() {
    setupSmoothScrollLinks();
    setupScrollFadeAnimations();
  }

  // wait for the DOM to be ready, then start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseLandingPage();
    }, { once: true });
  } else {
    initialiseLandingPage();
  }
})();
