// Landing page with smooth scroll animations

(() => {
  "use strict";

  function initializeLandingPage() {
    console.log("Landing page loaded");

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href").substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          event.preventDefault();
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // Add subtle fade-in animation to cards on scroll
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all article cards
    document.querySelectorAll(".net-figma-step").forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
      card.style.transition = "opacity 600ms ease, transform 600ms ease";
      observer.observe(card);
    });

    // Observe feature items
    document.querySelectorAll(".net-figma-feature-item").forEach((item) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(20px)";
      item.style.transition = "opacity 600ms ease, transform 600ms ease";
      observer.observe(item);
    });
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLandingPage);
  } else {
    initializeLandingPage();
  }
})();
