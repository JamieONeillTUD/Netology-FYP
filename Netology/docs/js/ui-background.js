/*
---------------------------------------------------------
Student: C22320301 - Jamie O'Neill
File: ui-background.js
Purpose: Renders decorative topology SVG backgrounds and floating particles on pages that include them.
Notes: Independent UI-only script. Safe to load on pages without matching DOM targets.
---------------------------------------------------------
*/

(() => {
  "use strict";

  const TOPOLOGY_LIBRARY = [
    {
      name: "star",
      nodes: [
        { x: 400, y: 250, r: 16 },
        { x: 200, y: 100, r: 10 },
        { x: 600, y: 100, r: 10 },
        { x: 150, y: 300, r: 10 },
        { x: 650, y: 300, r: 10 },
        { x: 250, y: 420, r: 10 },
        { x: 550, y: 420, r: 10 }
      ],
      links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]]
    },
    {
      name: "ring",
      nodes: [
        { x: 400, y: 80, r: 12 },
        { x: 580, y: 170, r: 12 },
        { x: 600, y: 340, r: 12 },
        { x: 400, y: 430, r: 12 },
        { x: 200, y: 340, r: 12 },
        { x: 220, y: 170, r: 12 }
      ],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]
    },
    {
      name: "mesh",
      nodes: [
        { x: 200, y: 120, r: 11 },
        { x: 400, y: 80, r: 11 },
        { x: 600, y: 120, r: 11 },
        { x: 650, y: 300, r: 11 },
        { x: 500, y: 420, r: 11 },
        { x: 300, y: 420, r: 11 },
        { x: 150, y: 300, r: 11 },
        { x: 400, y: 260, r: 13 }
      ],
      links: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
        [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]
      ]
    },
    {
      name: "bus",
      nodes: [
        { x: 100, y: 250, r: 10 },
        { x: 230, y: 250, r: 10 },
        { x: 360, y: 250, r: 10 },
        { x: 490, y: 250, r: 10 },
        { x: 620, y: 250, r: 10 },
        { x: 230, y: 140, r: 9 },
        { x: 360, y: 140, r: 9 },
        { x: 490, y: 140, r: 9 },
        { x: 230, y: 360, r: 9 },
        { x: 490, y: 360, r: 9 }
      ],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6], [3, 7], [1, 8], [3, 9]]
    },
    {
      name: "tree",
      nodes: [
        { x: 400, y: 70, r: 14 },
        { x: 250, y: 190, r: 12 },
        { x: 550, y: 190, r: 12 },
        { x: 160, y: 310, r: 10 },
        { x: 340, y: 310, r: 10 },
        { x: 460, y: 310, r: 10 },
        { x: 640, y: 310, r: 10 },
        { x: 160, y: 420, r: 9 },
        { x: 340, y: 420, r: 9 },
        { x: 460, y: 420, r: 9 },
        { x: 640, y: 420, r: 9 }
      ],
      links: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10]]
    },
    {
      name: "ireland",
      nodes: [
        { x: 420, y: 60, r: 10 },
        { x: 380, y: 120, r: 10 },
        { x: 350, y: 180, r: 11 },
        { x: 320, y: 240, r: 10 },
        { x: 340, y: 300, r: 12 },
        { x: 370, y: 360, r: 10 },
        { x: 400, y: 410, r: 10 },
        { x: 430, y: 450, r: 10 },
        { x: 450, y: 160, r: 10 },
        { x: 470, y: 220, r: 10 },
        { x: 460, y: 280, r: 11 },
        { x: 440, y: 340, r: 10 },
        { x: 390, y: 250, r: 13 }
      ],
      links: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
        [0, 8], [8, 9], [9, 10], [10, 11], [11, 7],
        [2, 12], [3, 12], [4, 12], [9, 12], [10, 12]
      ]
    },
    {
      name: "enterprise",
      nodes: [
        { x: 400, y: 80, r: 14 },
        { x: 200, y: 200, r: 12 },
        { x: 600, y: 200, r: 12 },
        { x: 120, y: 340, r: 10 },
        { x: 280, y: 340, r: 10 },
        { x: 520, y: 340, r: 10 },
        { x: 680, y: 340, r: 10 },
        { x: 200, y: 440, r: 9 },
        { x: 600, y: 440, r: 9 }
      ],
      links: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 7], [5, 8], [6, 8], [1, 2], [3, 4], [5, 6]]
    }
  ];

  function runWhenDomReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function getElementById(elementId) {
    return document.getElementById(elementId);
  }

  function drawRandomTopology(svgElement) {
    if (!svgElement) return;

    const randomTopology = TOPOLOGY_LIBRARY[Math.floor(Math.random() * TOPOLOGY_LIBRARY.length)];

    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksGroup.setAttribute("class", "net-network-links");

    randomTopology.links.forEach((linkPair, linkIndex) => {
      const startNode = randomTopology.nodes[linkPair[0]];
      const endNode = randomTopology.nodes[linkPair[1]];

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "net-network-link");
      line.setAttribute("x1", startNode.x);
      line.setAttribute("y1", startNode.y);
      line.setAttribute("x2", endNode.x);
      line.setAttribute("y2", endNode.y);
      line.style.animationDelay = `${linkIndex * 0.15}s`;
      linksGroup.appendChild(line);
    });

    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesGroup.setAttribute("class", "net-network-nodes");

    randomTopology.nodes.forEach((node, nodeIndex) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "net-network-node");
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute("r", node.r);
      circle.style.animationDelay = `${nodeIndex * 0.2}s`;
      nodesGroup.appendChild(circle);
    });

    svgElement.innerHTML = "";
    svgElement.append(linksGroup, nodesGroup);
  }

  function spawnFloatingParticles(containerElement, particleCount = 20) {
    if (!containerElement) return;

    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
      const particle = document.createElement("span");
      particle.className = "net-welcome-particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 4}s`;
      particle.style.animationDuration = `${3 + Math.random() * 4}s`;
      containerElement.appendChild(particle);
    }
  }

  function initDecorativeBackgrounds() {
    drawRandomTopology(getElementById("welcomeTopologySvg"));
    drawRandomTopology(getElementById("loginTopologySvg"));
    spawnFloatingParticles(getElementById("welcomeParticles"), 25);
    spawnFloatingParticles(getElementById("loginParticles"), 25);
  }

  runWhenDomReady(() => {
    initDecorativeBackgrounds();
  });
})();
