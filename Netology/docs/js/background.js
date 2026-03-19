// background.js — Draws decorative SVG topology backgrounds and floating particles.

(() => {
  "use strict";

  // Each topology has named nodes (x, y, radius) and links between them.
  const TOPOLOGIES = [
    {
      name: "star",
      nodes: [
        { x: 400, y: 250, r: 16 }, { x: 200, y: 100, r: 10 },
        { x: 600, y: 100, r: 10 }, { x: 150, y: 300, r: 10 },
        { x: 650, y: 300, r: 10 }, { x: 250, y: 420, r: 10 },
        { x: 550, y: 420, r: 10 }
      ],
      links: [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]]
    },
    {
      name: "ring",
      nodes: [
        { x: 400, y: 80, r: 12 }, { x: 580, y: 170, r: 12 },
        { x: 600, y: 340, r: 12 }, { x: 400, y: 430, r: 12 },
        { x: 200, y: 340, r: 12 }, { x: 220, y: 170, r: 12 }
      ],
      links: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]
    },
    {
      name: "mesh",
      nodes: [
        { x: 200, y: 120, r: 11 }, { x: 400, y: 80, r: 11 },
        { x: 600, y: 120, r: 11 }, { x: 650, y: 300, r: 11 },
        { x: 500, y: 420, r: 11 }, { x: 300, y: 420, r: 11 },
        { x: 150, y: 300, r: 11 }, { x: 400, y: 260, r: 13 }
      ],
      links: [
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],
        [0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]
      ]
    },
    {
      name: "bus",
      nodes: [
        { x: 100, y: 250, r: 10 }, { x: 230, y: 250, r: 10 },
        { x: 360, y: 250, r: 10 }, { x: 490, y: 250, r: 10 },
        { x: 620, y: 250, r: 10 }, { x: 230, y: 140, r: 9 },
        { x: 360, y: 140, r: 9 }, { x: 490, y: 140, r: 9 },
        { x: 230, y: 360, r: 9 }, { x: 490, y: 360, r: 9 }
      ],
      links: [[0,1],[1,2],[2,3],[3,4],[1,5],[2,6],[3,7],[1,8],[3,9]]
    },
    {
      name: "tree",
      nodes: [
        { x: 400, y: 70, r: 14 }, { x: 250, y: 190, r: 12 },
        { x: 550, y: 190, r: 12 }, { x: 160, y: 310, r: 10 },
        { x: 340, y: 310, r: 10 }, { x: 460, y: 310, r: 10 },
        { x: 640, y: 310, r: 10 }, { x: 160, y: 420, r: 9 },
        { x: 340, y: 420, r: 9 }, { x: 460, y: 420, r: 9 },
        { x: 640, y: 420, r: 9 }
      ],
      links: [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[4,8],[5,9],[6,10]]
    },
    {
      name: "ireland",
      nodes: [
        { x: 420, y: 60, r: 10 }, { x: 380, y: 120, r: 10 },
        { x: 350, y: 180, r: 11 }, { x: 320, y: 240, r: 10 },
        { x: 340, y: 300, r: 12 }, { x: 370, y: 360, r: 10 },
        { x: 400, y: 410, r: 10 }, { x: 430, y: 450, r: 10 },
        { x: 450, y: 160, r: 10 }, { x: 470, y: 220, r: 10 },
        { x: 460, y: 280, r: 11 }, { x: 440, y: 340, r: 10 },
        { x: 390, y: 250, r: 13 }
      ],
      links: [
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],
        [0,8],[8,9],[9,10],[10,11],[11,7],
        [2,12],[3,12],[4,12],[9,12],[10,12]
      ]
    },
    {
      name: "enterprise",
      nodes: [
        { x: 400, y: 80, r: 14 }, { x: 200, y: 200, r: 12 },
        { x: 600, y: 200, r: 12 }, { x: 120, y: 340, r: 10 },
        { x: 280, y: 340, r: 10 }, { x: 520, y: 340, r: 10 },
        { x: 680, y: 340, r: 10 }, { x: 200, y: 440, r: 9 },
        { x: 600, y: 440, r: 9 }
      ],
      links: [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[4,7],[5,8],[6,8],[1,2],[3,4],[5,6]]
    }
  ];

  // Draws a random topology into an SVG element.
  function drawTopology(svg) {
    if (!svg) return;
    const topo = TOPOLOGIES[Math.floor(Math.random() * TOPOLOGIES.length)];

    const lines = document.createElementNS("http://www.w3.org/2000/svg", "g");
    lines.setAttribute("class", "net-network-links");
    topo.links.forEach((pair, i) => {
      const a = topo.nodes[pair[0]];
      const b = topo.nodes[pair[1]];
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "net-network-link");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.style.animationDelay = `${i * 0.15}s`;
      lines.appendChild(line);
    });

    const circles = document.createElementNS("http://www.w3.org/2000/svg", "g");
    circles.setAttribute("class", "net-network-nodes");
    topo.nodes.forEach((node, i) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("class", "net-network-node");
      c.setAttribute("cx", node.x);
      c.setAttribute("cy", node.y);
      c.setAttribute("r", node.r);
      c.style.animationDelay = `${i * 0.2}s`;
      circles.appendChild(c);
    });

    svg.innerHTML = "";
    svg.append(lines, circles);
  }

  // Adds floating particle elements to a container.
  function addParticles(container, count) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "net-welcome-particle";
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.animationDelay = `${Math.random() * 4}s`;
      dot.style.animationDuration = `${3 + Math.random() * 4}s`;
      container.appendChild(dot);
    }
  }

  // Draws backgrounds on the welcome and login pages.
  function init() {
    drawTopology(document.getElementById("welcomeTopologySvg"));
    drawTopology(document.getElementById("loginTopologySvg"));
    addParticles(document.getElementById("welcomeParticles"), 25);
    addParticles(document.getElementById("loginParticles"), 25);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
