/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 17/04/2026

index.js - Landing Page Script
---
This file handles the simple visual effects on the landing page.
It fades the feature cards in as they scroll into view.

It is used by Index.html
*/

(function () {
  "use strict";

  // Fade in cards and features as they scroll into view.
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

  // Main entry point for the landing page.
  function initialiseLandingPage() {
    setupScrollFadeAnimations();
  }

  // Wait for the DOM to be ready, then start.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initialiseLandingPage();
    }, { once: true });
  } else {
    initialiseLandingPage();
  }
})();
