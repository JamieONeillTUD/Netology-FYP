// index.js - landing page smooth scroll and fade in animations

(() => {
  "use strict";

  function initLandingPage() {
    // smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchorLink) => {
      anchorLink.addEventListener("click", (event) => {
        const targetSection = document.getElementById(anchorLink.getAttribute("href").substring(1));
        if (targetSection) {
          event.preventDefault();
          targetSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // fade in cards and features as they scroll into view
    const scrollObserver = new IntersectionObserver((observedEntries) => {
      observedEntries.forEach((observedEntry) => {
        if (observedEntry.isIntersecting) {
          observedEntry.target.style.opacity = "1";
          observedEntry.target.style.transform = "translateY(0)";
          scrollObserver.unobserve(observedEntry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".net-figma-step, .net-figma-feature-item").forEach((animatedElement) => {
      animatedElement.style.opacity = "0";
      animatedElement.style.transform = "translateY(20px)";
      animatedElement.style.transition = "opacity 600ms ease, transform 600ms ease";
      scrollObserver.observe(animatedElement);
    });
  }

  // start when the page is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLandingPage);
  } else {
    initLandingPage();
  }
})();
