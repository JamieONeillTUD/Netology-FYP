/*
Student Number: C22320301
Student Name: Jamie O’Neill
Course Code: TU857/4
Date: 10/11/2025

JavaScript
---------------------------------------
course_content.js – Stores course lessons like Khan Academy.

Now includes:
- difficulty label (novice/intermediate/advanced)
- required_level to unlock
- Units with:
  - about text
  - sections with Learn/Practice/Quiz/Challenge items (Khan style)
  - lesson content used by course.js lesson view
*/

const COURSE_CONTENT = {
  // ----------------------------
  // Course 1 (Novice)
  // ----------------------------
  "1": {
    title: "Intro to Networking",
    difficulty: "novice",
    required_level: 1,
    units: [
      {
        title: "Unit 1: Networking foundations",
        about:
          "Learn the building blocks of computer networking. You’ll explore IP addressing, subnet masks, switching and basic LAN setup.",
        sections: [
          {
            title: "Getting started",
            items: [
              { type: "Learn", lesson_index: 1, label: "What is networking?" },
              { type: "Learn", lesson_index: 2, label: "Devices in a LAN" }
            ]
          },
          {
            title: "IP addressing basics",
            items: [
              { type: "Learn", lesson_index: 3, label: "IP addresses and subnet masks" },
              { type: "Practice", lesson_index: 3, label: "Identify valid IP + mask", questions: 4 },
              { type: "Quiz", lesson_index: 3, label: "Quick check: subnet mask" },
              { type: "Challenge", lesson_index: 3, label: "Build: two PCs on same subnet" }
            ]
          },
          {
            title: "Switching basics",
            items: [
              { type: "Learn", lesson_index: 4, label: "Switches and MAC addresses" },
              { type: "Practice", lesson_index: 4, label: "Switching fundamentals", questions: 4 },
              { type: "Quiz", lesson_index: 4, label: "Quick check: switching" },
              { type: "Challenge", lesson_index: 4, label: "Build: small LAN with a switch" }
            ]
          }
        ],

        // lessons used by lesson view (Learn → Quiz → Challenge)
        lessons: [
          {
            title: "What is networking?",
            learn:
              "Computer networking is how devices communicate to share data. A network can be as small as two PCs connected together, or as large as the Internet.",
            quiz: {
              question: "What is the main purpose of a network?",
              options: ["To store files", "To let devices communicate and share data", "To encrypt passwords"],
              answer: 1,
              explain: "Networks connect devices so they can communicate and share information."
            },
            challenge: {
              title: "Connect two devices",
              objectives: ["Add 2 PCs", "Connect them with a link"],
              rules: { requiredTypes: { pc: 2 }, requireConnections: true }
            }
          },
          {
            title: "Devices in a LAN",
            learn:
              "A LAN (Local Area Network) connects devices in a small area like a home or office. Common LAN devices include PCs, switches, and routers.",
            quiz: {
              question: "Which device is commonly used to connect many PCs in a LAN?",
              options: ["Switch", "Monitor", "Keyboard"],
              answer: 0,
              explain: "Switches connect devices together in a LAN."
            },
            challenge: {
              title: "LAN layout",
              objectives: ["Add 1 switch", "Add 2 PCs", "Connect PCs to the switch"],
              rules: { requiredTypes: { pc: 2, switch: 1 }, requireConnections: true }
            }
          },
          {
            title: "IP addresses and subnet masks",
            learn:
              "An IP address identifies a device on a network. A subnet mask tells which part is the network and which part is the host. Example: 192.168.1.10 / 255.255.255.0",
            quiz: {
              question: "What does a subnet mask do?",
              options: ["Encrypts packets", "Splits network vs host bits", "Assigns MAC addresses"],
              answer: 1,
              explain: "Subnet masks define the boundary between network and host bits."
            },
            challenge: {
              title: "Two PCs on the same subnet",
              objectives: ["Add 2 PCs", "Connect them", "Give both PCs IP + mask on the same subnet"],
              rules: {
                requiredTypes: { pc: 2 },
                requireConnections: true,
                requireValidIpAndMask: true,
                requireTwoPcsSameSubnet: true
              }
            }
          },
          {
            title: "Switches and MAC addresses",
            learn:
              "A switch forwards frames inside a LAN. It learns MAC addresses and sends frames only to the correct port when it knows the destination.",
            quiz: {
              question: "What does a switch mainly use to forward traffic?",
              options: ["MAC addresses", "IP addresses", "DNS records"],
              answer: 0,
              explain: "Switches forward frames using MAC address tables."
            },
            challenge: {
              title: "Build a small LAN",
              objectives: ["Add 1 switch + 2 PCs", "Connect both PCs to the switch", "Set valid IP + mask on both PCs"],
              rules: {
                requiredTypes: { pc: 2, switch: 1 },
                requireConnections: true,
                requireValidIpAndMask: true
              }
            }
          }
        ]
      },

      {
        title: "Unit 2: Routing basics",
        about:
          "Learn why routers exist, how subnets differ, and when you need a default gateway.",
        sections: [
          {
            title: "Routers",
            items: [
              { type: "Learn", lesson_index: 5, label: "Routing basics" },
              { type: "Quiz", lesson_index: 5, label: "Quick check: routers" },
              { type: "Challenge", lesson_index: 5, label: "Build: router in the middle" }
            ]
          },
          {
            title: "Default gateway",
            items: [
              { type: "Learn", lesson_index: 6, label: "Default gateway explained" },
              { type: "Practice", lesson_index: 6, label: "Pick the correct gateway", questions: 4 },
              { type: "Challenge", lesson_index: 6, label: "Build: gateway-ready LAN" }
            ]
          }
        ],
        lessons: [
          {
            title: "Routing basics",
            learn:
              "Routers connect different networks. If devices are on different subnets, you normally need a router (and a gateway) so traffic can move between them.",
            quiz: {
              question: "When do you normally need a router?",
              options: ["When devices are on different subnets", "When you want a longer cable", "When you rename PCs"],
              answer: 0,
              explain: "Routers move traffic between different networks/subnets."
            },
            challenge: {
              title: "Router in the middle",
              objectives: ["Add 1 router + 2 PCs", "Connect PCs to router", "Give valid IP + mask to all devices"],
              rules: {
                requiredTypes: { pc: 2, router: 1 },
                requireConnections: true,
                requireValidIpAndMask: true
              }
            }
          },
          {
            title: "Default gateway explained",
            learn:
              "A default gateway is the router address a device uses to reach other networks. If a destination is not local, the device sends traffic to the gateway.",
            quiz: {
              question: "When does a PC use the default gateway?",
              options: ["When sending to same subnet", "When sending to a different subnet", "When requesting DNS"],
              answer: 1,
              explain: "Traffic for other subnets goes to the default gateway."
            },
            challenge: {
              title: "Gateway-ready LAN",
              objectives: ["Add 2 PCs + 1 Router", "Connect both PCs to the router", "Set valid IP + mask on PCs and router LAN"],
              rules: {
                requiredTypes: { pc: 2, router: 1 },
                requireConnections: true,
                requireValidIpAndMask: true
              }
            }
          }
        ]
      }
    ]
  },

  // ----------------------------
  // Course 2 (Intermediate - Locked until level 3)
  // ----------------------------
  "2": {
    title: "Routing Fundamentals",
    difficulty: "intermediate",
    required_level: 3,
    units: [
      {
        title: "Unit 1: Static routing",
        about:
          "Build multi-network topologies and learn how routers know where to send traffic using routes.",
        sections: [
          {
            title: "Routing tables",
            items: [
              { type: "Learn", lesson_index: 1, label: "What is a route?" },
              { type: "Practice", lesson_index: 1, label: "Pick the correct route", questions: 4 }
            ]
          },
          {
            title: "Static routes",
            items: [
              { type: "Learn", lesson_index: 2, label: "Adding a static route" },
              { type: "Quiz", lesson_index: 2, label: "Quick check: static routes" },
              { type: "Challenge", lesson_index: 2, label: "Build: two networks + router routes" }
            ]
          }
        ],
        lessons: [
          {
            title: "What is a route?",
            learn:
              "A route tells a router which next hop or interface to use to reach a destination network. Routers use routing tables to decide where to forward packets.",
            quiz: {
              question: "What does a route describe?",
              options: ["A MAC address", "A path to a destination network", "A DNS server"],
              answer: 1,
              explain: "Routes describe how to reach a destination network."
            },
            challenge: null
          },
          {
            title: "Adding a static route",
            learn:
              "Static routes are manually configured routes. They are useful in small networks and labs where you want predictable routing behavior.",
            quiz: {
              question: "Static routes are…",
              options: ["Automatically learned", "Manually configured by an admin", "Only used by switches"],
              answer: 1,
              explain: "Static routes are configured manually."
            },
            challenge: {
              title: "Two networks with routing",
              objectives: [
                "Create 2 LANs on different subnets",
                "Add 1 router to connect them",
                "Ensure both sides can reach each other"
              ],
              rules: {
                requiredTypes: { pc: 2, router: 1 },
                requireConnections: true,
                requireValidIpAndMask: true
              }
            }
          }
        ]
      }
    ]
  },

  // ----------------------------
  // Course 3 (Advanced - Locked until level 5)
  // ----------------------------
  "3": {
    title: "Subnetting & Address Planning",
    difficulty: "advanced",
    required_level: 5,
    units: [
      {
        title: "Unit 1: Subnetting skills",
        about:
          "Plan efficient address spaces using CIDR and subnetting. Practice calculating networks, hosts, and ranges.",
        sections: [
          {
            title: "CIDR and ranges",
            items: [
              { type: "Learn", lesson_index: 1, label: "CIDR notation" },
              { type: "Practice", lesson_index: 1, label: "Convert CIDR to mask", questions: 4 }
            ]
          },
          {
            title: "Subnet design",
            items: [
              { type: "Learn", lesson_index: 2, label: "Designing subnets for departments" },
              { type: "Quiz", lesson_index: 2, label: "Quick check: subnet design" }
            ]
          }
        ],
        lessons: [
          {
            title: "CIDR notation",
            learn:
              "CIDR uses a /prefix length (like /24). The prefix length indicates how many bits are the network portion. More network bits = fewer hosts.",
            quiz: {
              question: "What does /24 mean?",
              options: ["24 hosts", "24 network bits", "24 routers"],
              answer: 1,
              explain: "/24 means 24 bits are used for the network portion."
            },
            challenge: null
          },
          {
            title: "Designing subnets for departments",
            learn:
              "Subnet design means allocating address ranges for teams or sites. You choose subnets based on required host counts and future growth.",
            quiz: {
              question: "Why subnet a network?",
              options: ["To increase collisions", "To segment networks and manage address space", "To remove routers"],
              answer: 1,
              explain: "Subnetting helps segment networks and manage address allocation."
            },
            challenge: null
          }
        ]
      }
    ]
  }
};
