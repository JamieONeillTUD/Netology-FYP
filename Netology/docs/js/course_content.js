/*
Student Number: C22320301
Student Name: Jamie O'Neill
Course Code: TU857/4
Date: 09/02/2026

JavaScript
---------------------------------------
course_content.js – Stores course lessons like Khan Academy.

Now includes:
- 9 courses (3 novice, 3 intermediate, 3 advanced)
- Full depth content for one course in each difficulty
- Quizzes + sandbox practice/challenges integrated
*/

const COURSE_CONTENT = {
  // Data shape (high-level):
  // COURSE_CONTENT[courseId] = {
  //   title, description, difficulty, required_level, estimatedTime, xpReward, category,
  //   units: [
  //     {
  //       title, about,
  //       sections: [{ title, items: [{ type, title, content, duration, xp, challenge? }] }],
  //       lessons: [{ title, learn, content, objectives, quiz? }]
  //     }
  //   ]
  // }
  // AI Prompt: Explain the NOVICE COURSES (Level 1+) section in clear, simple terms.
  // ============================
  // NOVICE COURSES (Level 1+)
  // ============================
  "1": {
    id: "1",
    title: "Networking Foundations",
    description: "Build core networking knowledge from scratch: devices, Ethernet, IP basics, and how networks actually move data.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "5.5 hrs",
    xpReward: 800,
    category: "Core",
    units: [
      {
        title: "Unit 1: Network Basics",
        about: "Learn what networks are, why they exist, and how traffic moves across LANs, WANs, and the Internet.",
        sections: [
          {
            title: "Core concepts",
            items: [
              {
                type: "Learn",
                title: "What is a network?",
                content: "A network is a set of devices that communicate using shared rules (protocols).",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "LAN vs WAN vs Internet",
                content: "LANs are local, WANs connect sites over distance, and the Internet is the global network of networks.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Network roles and services",
                content: "Clients, servers, and shared services like DHCP and DNS make networks usable.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Topologies and traffic flow",
                content: "Understand common topologies (star, mesh, tree) and how traffic moves between devices.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Quiz",
                title: "Network basics quiz",
                duration: "8 min",
                xp: 90
              }
            ]
          },
          {
            title: "Hands-on",
            items: [
              {
                type: "Practice",
                title: "Classify network types",
                duration: "12 min",
                xp: 35,
                steps: [
                  {
                    text: "Add a router to the canvas.",
                    checks: [{ type: "device", deviceType: "router", count: 1 }]
                  },
                  {
                    text: "Add a switch to the canvas.",
                    checks: [{ type: "device", deviceType: "switch", count: 1 }]
                  },
                  {
                    text: "Add two PCs.",
                    checks: [{ type: "device", deviceType: "pc", count: 2 }]
                  },
                  {
                    text: "Connect each PC to the switch.",
                    checks: [{ type: "connection", from: "pc", to: "switch", count: 2 }]
                  },
                  {
                    text: "Connect the switch to the router.",
                    checks: [{ type: "connection", from: "switch", to: "router", count: 1 }]
                  },
                  {
                    text: "Add an Internet cloud.",
                    checks: [{ type: "device", deviceType: "cloud", count: 1 }]
                  },
                  {
                    text: "Connect the router to the Internet cloud.",
                    checks: [{ type: "connection", from: "router", to: "cloud", count: 1 }]
                  },
                  {
                    text: "Rename the router to include \"Gateway\" (example: Office Gateway).",
                    checks: [{ type: "name_contains", deviceType: "router", contains: "Gateway", count: 1 }],
                    hint: "Select the router and edit its name in the Properties panel."
                  }
                ],
                tips: "LAN is the local group behind the switch; the router is the gateway to the WAN/Internet."
              },
              {
                type: "Challenge",
                title: "Design a small office network",
                duration: "16 min",
                xp: 100,
                challenge: {
                  rules: {
                    minDevices: 5,
                    minConnections: 4,
                    requiredTypes: { router: 1, switch: 1, pc: 3 }
                  },
                  steps: [
                    "Add 1 router, 1 switch, and at least 3 PCs.",
                    "Connect all PCs to the switch, then connect the switch to the router.",
                    "Explain which devices are in the LAN and which device is the gateway."
                  ],
                  tips: "Think of the router as the path to the Internet and the switch as the local meeting point."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "What is a network?",
            learn: "A network connects devices so they can communicate, share data, and access services.",
            blocks: [
              {
                type: "text",
                text: [
                  "A network is any group of devices that exchange data using shared rules (protocols).",
                  "Devices include laptops, phones, printers, servers, cameras, and cloud services.",
                  "Networks are built from endpoints (users and servers) and infrastructure (switches, routers, Wi‑Fi).",
                  "At home, your Wi‑Fi router connects devices and shares one Internet connection.",
                  "At work, switches keep local traffic inside the office, while routers connect to other sites.",
                  "Networks exist to share resources like files, printers, storage, and applications.",
                  "Performance depends on bandwidth (capacity), latency (delay), and loss (reliability).",
                  "Security is critical because shared access creates risk; allow the right traffic and block the wrong traffic.",
                  "Real-world example: a hospital separates medical devices from guest Wi‑Fi to protect patient systems.",
                  "If you can describe the devices, links, and rules, you can explain how data moves end to end."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why protocols matter",
                content: [
                  "Protocols are the rules that make communication possible.",
                  "If devices did not agree on formats and timing, data would arrive unreadable.",
                  "Think of protocols as a shared language for networks—TCP/IP is the global standard."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which example is a network?",
                options: [
                  "A single laptop working offline",
                  "Two laptops sharing files over Wi‑Fi",
                  "A printer with no power"
                ],
                correctIndex: 1,
                explanation: "A network requires two or more devices communicating over a shared medium."
              },
              {
                type: "activity",
                title: "Mini activity: Match device roles",
                mode: "drag",
                prompt: "Drag each item to the correct role.",
                targets: [
                  { id: "endpoint", label: "Endpoint" },
                  { id: "network", label: "Network device" },
                  { id: "service", label: "Service" }
                ],
                items: [
                  { id: "laptop", label: "Laptop", targetId: "endpoint" },
                  { id: "switch", label: "Switch", targetId: "network" },
                  { id: "dns", label: "DNS Server", targetId: "service" }
                ]
              }
            ],
            content: [
              "A network is any group of devices that exchange data using shared rules (protocols).",
              "Devices include laptops, phones, printers, servers, cameras, and cloud services.",
              "Networks are built from endpoints (users and servers) and infrastructure (switches, routers, Wi‑Fi).",
              "At home, your Wi‑Fi router connects devices and shares one Internet connection.",
              "At work, switches keep local traffic inside the office, while routers connect to other sites.",
              "Networks exist to share resources like files, printers, storage, and applications.",
              "Performance depends on bandwidth (capacity), latency (delay), and loss (reliability).",
              "Security is critical because shared access creates risk; allow the right traffic and block the wrong traffic.",
              "Real-world example: a hospital separates medical devices from guest Wi‑Fi to protect patient systems.",
              "If you can describe the devices, links, and rules, you can explain how data moves end to end."
            ],
            objectives: [
              "Define what a network is",
              "Identify common networked devices",
              "Explain why protocols are important",
              "Describe why networks exist"
            ],
            summary: "A network connects devices and services through shared rules, making communication and resource sharing possible."
          },
          {
            title: "LAN vs WAN vs Internet",
            learn: "LANs are local, WANs connect distant locations, and the Internet connects everything.",
            blocks: [
              {
                type: "text",
                text: [
                  "A LAN (Local Area Network) covers a small area like a home, office, or school building.",
                  "A WAN (Wide Area Network) connects multiple LANs over long distances using service providers.",
                  "The Internet is a global network of networks that agree to use TCP/IP standards.",
                  "Example: a company has a LAN in Dublin and a LAN in London; a WAN link connects them.",
                  "LANs are usually faster and more predictable; WANs have higher latency and depend on carriers.",
                  "Ownership differs: you manage the LAN, but the WAN is shared with an ISP or carrier.",
                  "VPNs and SD‑WAN secure traffic across a WAN or the Internet.",
                  "Knowing the scope helps you choose hardware, IP ranges, and troubleshooting steps."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why WANs feel slower",
                content: [
                  "WAN traffic travels farther and crosses provider networks.",
                  "Each hop adds delay and reduces control over performance.",
                  "That is why troubleshooting WANs starts with latency and carrier status."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "A connection between two offices in different cities is a:",
                options: ["LAN", "WAN", "Personal Area Network"],
                correctIndex: 1,
                explanation: "WANs connect LANs over long distances."
              },
              {
                type: "activity",
                title: "Mini activity: Match the scope",
                mode: "drag",
                prompt: "Drag each scenario to the correct scope.",
                targets: [
                  { id: "lan", label: "LAN" },
                  { id: "wan", label: "WAN" },
                  { id: "internet", label: "Internet" }
                ],
                items: [
                  { id: "school", label: "School computer lab", targetId: "lan" },
                  { id: "hq-branch", label: "HQ linked to a branch office", targetId: "wan" },
                  { id: "public", label: "Public websites and cloud apps", targetId: "internet" }
                ]
              }
            ],
            content: [
              "A LAN (Local Area Network) covers a small area like a home, office, or school building.",
              "A WAN (Wide Area Network) connects multiple LANs over long distances using service providers.",
              "The Internet is a global network of networks that agree to use TCP/IP standards.",
              "Example: a company has a LAN in Dublin and a LAN in London; a WAN link connects them.",
              "LANs are usually faster and more predictable; WANs have higher latency and depend on carriers.",
              "Ownership differs: you manage the LAN, but the WAN is shared with an ISP or carrier.",
              "VPNs and SD‑WAN secure traffic across a WAN or the Internet.",
              "Knowing the scope helps you choose hardware, IP ranges, and troubleshooting steps."
            ],
            objectives: [
              "Compare LANs and WANs",
              "Recognize why the Internet is a network of networks",
              "Explain how LANs connect to WANs"
            ],
            summary: "LANs are local, WANs connect distant LANs, and the Internet is the largest WAN."
          },
          {
            title: "Network roles and services",
            learn: "Clients, servers, and shared services keep networks organized and reliable.",
            blocks: [
              {
                type: "text",
                text: [
                  "Networks are built around roles: clients request services, servers provide them, and peers share.",
                  "Common services include DHCP for IP addresses, DNS for names, file and print services, and authentication.",
                  "Central services make networks consistent so new devices can join without manual setup.",
                  "Example: a coffee shop uses DHCP for guests, while a school uses DNS to reach learning portals.",
                  "Directory services and AAA control who can access which resources and reduce admin overhead.",
                  "Redundancy matters: two DNS servers prevent one failure from breaking name resolution.",
                  "Understanding roles helps you troubleshoot quickly when a service fails even if the network is up.",
                  "Benefit: clear roles improve reliability, security, and the overall user experience."
                ]
              },
              {
                type: "explain",
                title: "Explain: What happens when DNS fails",
                content: [
                  "If DNS is down, devices can still reach services by IP address but not by name.",
                  "That is why users say “the Internet is down” when only DNS is broken.",
                  "A simple test is to ping an IP directly or use a known address like 8.8.8.8."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which service assigns IP addresses automatically?",
                options: ["DNS", "DHCP", "NTP"],
                correctIndex: 1,
                explanation: "DHCP hands out IP addresses, subnet masks, and gateways."
              },
              {
                type: "activity",
                title: "Mini activity: Pick the right service",
                mode: "select",
                prompt: "A new laptop joins the Wi‑Fi and needs an IP address. Which service should handle this?",
                options: ["DNS", "DHCP", "File Server"],
                correctIndex: 1,
                explanation: "DHCP is responsible for automatic IP configuration."
              }
            ],
            content: [
              "Networks are built around roles: clients request services, servers provide them, and peers share.",
              "Common services include DHCP for IP addresses, DNS for names, file and print services, and authentication.",
              "Central services make networks consistent so new devices can join without manual setup.",
              "Example: a coffee shop uses DHCP for guests, while a school uses DNS to reach learning portals.",
              "Directory services and AAA control who can access which resources and reduce admin overhead.",
              "Redundancy matters: two DNS servers prevent one failure from breaking name resolution.",
              "Understanding roles helps you troubleshoot quickly when a service fails even if the network is up.",
              "Benefit: clear roles improve reliability, security, and the overall user experience."
            ],
            objectives: [
              "Identify client and server roles",
              "Describe common network services",
              "Explain why redundancy improves uptime"
            ],
            summary: "Network roles and shared services make access consistent, secure, and dependable."
          },
          {
            title: "Topologies and traffic flow",
            learn: "Topology describes how devices are arranged and how traffic moves between them.",
            blocks: [
              {
                type: "text",
                text: [
                  "Topology describes how devices are arranged: star, tree, mesh, ring, or bus.",
                  "Most modern LANs use a star topology with a switch at the center.",
                  "Mesh designs add redundancy by giving multiple paths, but cost and complexity increase.",
                  "Traffic types include unicast (one‑to‑one), broadcast (one‑to‑all), and multicast (one‑to‑many).",
                  "Switches learn MAC addresses and forward unicast traffic only where it needs to go.",
                  "Broadcasts are useful for discovery like ARP, but too many can slow a network.",
                  "Example: a live video stream to many viewers can use multicast to save bandwidth.",
                  "Knowing the topology helps you plan growth and isolate failures when a link goes down."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why broadcasts are limited",
                content: [
                  "Broadcasts go to every device in a LAN, so too many can overwhelm slow devices.",
                  "Subnetting and VLANs keep broadcasts smaller and easier to manage.",
                  "That is why large networks are segmented into smaller broadcast domains."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which traffic type reaches every device on the LAN?",
                options: ["Unicast", "Broadcast", "Multicast"],
                correctIndex: 1,
                explanation: "Broadcasts are sent to all devices in the broadcast domain."
              },
              {
                type: "activity",
                title: "Mini activity: Match traffic types",
                mode: "drag",
                prompt: "Match each traffic type to the correct description.",
                targets: [
                  { id: "unicast", label: "Unicast" },
                  { id: "broadcast", label: "Broadcast" },
                  { id: "multicast", label: "Multicast" }
                ],
                items: [
                  { id: "one", label: "One sender to one receiver", targetId: "unicast" },
                  { id: "all", label: "One sender to everyone", targetId: "broadcast" },
                  { id: "group", label: "One sender to a group", targetId: "multicast" }
                ]
              }
            ],
            content: [
              "Topology describes how devices are arranged: star, tree, mesh, ring, or bus.",
              "Most modern LANs use a star topology with a switch at the center.",
              "Mesh designs add redundancy by giving multiple paths, but cost and complexity increase.",
              "Traffic types include unicast (one‑to‑one), broadcast (one‑to‑all), and multicast (one‑to‑many).",
              "Switches learn MAC addresses and forward unicast traffic only where it needs to go.",
              "Broadcasts are useful for discovery like ARP, but too many can slow a network.",
              "Example: a live video stream to many viewers can use multicast to save bandwidth.",
              "Knowing the topology helps you plan growth and isolate failures when a link goes down."
            ],
            objectives: [
              "Identify common topologies",
              "Describe unicast vs broadcast traffic",
              "Explain how switches direct traffic"
            ],
            summary: "Topology and traffic patterns shape performance, reliability, and troubleshooting.",
            quiz: {
              title: "Network basics quiz",
              xp: 90,
              questions: [
                {
                  id: "q1",
                  question: "Fill in the blank: A network that spans a single building is a ___.",
                  options: ["LAN", "WAN", "MAN"],
                  correctAnswer: 0,
                  explanation: "LANs are local networks within a building or campus."
                },
                {
                  id: "q2",
                  question: "The Internet is best described as a:",
                  options: ["Single LAN", "Network of networks", "Single ISP"],
                  correctAnswer: 1,
                  explanation: "The Internet connects many independent networks."
                },
                {
                  id: "q3",
                  question: "Which topology uses a central switch or hub?",
                  options: ["Star", "Ring", "Bus"],
                  correctAnswer: 0,
                  explanation: "Star topologies connect devices to a central point."
                },
                {
                  id: "q4",
                  question: "Broadcast traffic is sent to:",
                  options: ["One device", "All devices in the LAN", "Only routers"],
                  correctAnswer: 1,
                  explanation: "Broadcasts reach all devices in the broadcast domain."
                },
                {
                  id: "q5",
                  question: "A WAN typically connects:",
                  options: ["Devices in one room", "LANs across long distances", "Only wireless devices"],
                  correctAnswer: 1,
                  explanation: "WANs connect LANs over long distances."
                },
                {
                  id: "q6",
                  question: "Fill in the blank: Protocols are the ___ of communication.",
                  options: ["rules", "cables", "ports"],
                  correctAnswer: 0,
                  explanation: "Protocols define how devices communicate."
                },
                {
                  id: "q7",
                  question: "Which is an example of an endpoint?",
                  options: ["Router", "Switch", "Laptop"],
                  correctAnswer: 2,
                  explanation: "Endpoints are devices that generate or consume data."
                },
                {
                  id: "q8",
                  question: "In a star topology, if a single cable to a PC fails, the rest of the network is usually:",
                  options: ["Down", "Still working", "Forced into a ring"],
                  correctAnswer: 1,
                  explanation: "Only that one device is impacted in a star topology."
                },
                {
                  id: "q9",
                  question: "A device that provides files or services to others is called a:",
                  options: ["Client", "Server", "Repeater"],
                  correctAnswer: 1,
                  explanation: "Servers provide services that clients request."
                },
                {
                  id: "q10",
                  question: "Why use redundant services like two DNS servers?",
                  options: ["It doubles Internet speed", "It improves availability if one fails", "It encrypts all traffic"],
                  correctAnswer: 1,
                  explanation: "Redundancy keeps critical services available during outages."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 2: Switching and Frames",
        about: "Explore how switches forward frames, how MAC addresses work, and why broadcasts matter.",
        sections: [
          {
            title: "Core concepts",
            items: [
              {
                type: "Learn",
                title: "Switches, routers, and endpoints",
                content: "Switches forward frames on a LAN, routers forward packets between LANs.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "Ethernet frames and MAC addresses",
                content: "Frames are the Layer 2 envelope; MAC addresses identify devices on a LAN.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "ARP and broadcast domains",
                content: "ARP resolves IPs to MACs; broadcasts stay inside a single LAN.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "Switching loops and STP basics",
                content: "Redundant links can cause loops; STP keeps Layer 2 stable.",
                duration: "10 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "Ethernet and switching quiz",
                duration: "8 min",
                xp: 80
              }
            ]
          },
          {
            title: "Hands-on",
            items: [
              {
                type: "Practice",
                title: "Trace a frame on a LAN",
                duration: "12 min",
                xp: 35,
                steps: [
                  {
                    text: "Add one switch to the canvas.",
                    checks: [{ type: "device", deviceType: "switch", count: 1 }]
                  },
                  {
                    text: "Add two PCs.",
                    checks: [{ type: "device", deviceType: "pc", count: 2 }]
                  },
                  {
                    text: "Connect each PC to the switch with Ethernet.",
                    checks: [{ type: "connection", from: "pc", to: "switch", count: 2 }]
                  },
                  {
                    text: "Add a third PC to create an unknown destination.",
                    checks: [{ type: "device", deviceType: "pc", count: 3 }]
                  },
                  {
                    text: "Explain how the switch learns the source MAC address.",
                    hint: "Switches learn the source MAC from incoming frames.",
                  },
                  {
                    text: "Explain why unknown destinations are flooded to all ports.",
                    hint: "Switches flood until they learn where a MAC lives."
                  }
                ],
                tips: "Switches learn MACs from source addresses and flood unknown destinations."
              },
              {
                type: "Challenge",
                title: "Build a two-switch LAN",
                duration: "18 min",
                xp: 110,
                challenge: {
                  rules: {
                    minDevices: 6,
                    minConnections: 5,
                    requiredTypes: { switch: 2, pc: 4 }
                  },
                  steps: [
                    "Add two switches and connect them with an uplink.",
                    "Connect at least two PCs to each switch.",
                    "Explain how a switch learns MAC addresses as frames move."
                  ],
                  tips: "Switches learn by reading source MACs; unknown destinations are flooded."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Switches, routers, and endpoints",
            learn: "Switches move frames inside a LAN; routers move packets between networks.",
            blocks: [
              {
                type: "text",
                text: [
                  "Switches operate at Layer 2, forwarding frames based on MAC addresses.",
                  "Routers operate at Layer 3, forwarding packets based on IP addresses and routing tables.",
                  "Endpoints are devices like laptops, servers, and phones that generate or consume data.",
                  "In a small office, a switch connects endpoints while a router connects the LAN to the Internet.",
                  "Switches keep traffic local when possible; routers act as the boundary between networks.",
                  "The default gateway is the router address that sends traffic off the local subnet.",
                  "Example: two PCs on the same switch communicate directly without the router.",
                  "If local traffic works but Internet access fails, the gateway or router path is the likely issue."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why routers are boundaries",
                content: [
                  "Routers decide where packets go next using IP networks and routing tables.",
                  "They separate broadcast domains and connect different subnets.",
                  "That is why the default gateway matters for off‑subnet traffic."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which device connects different networks together?",
                options: ["Switch", "Router", "Access Point"],
                correctIndex: 1,
                explanation: "Routers forward packets between networks."
              },
              {
                type: "activity",
                title: "Mini activity: Choose the path",
                mode: "select",
                prompt: "A PC needs to reach a website outside the LAN. Which device does it send traffic to first?",
                options: ["Local switch", "Default gateway", "DNS server"],
                correctIndex: 1,
                explanation: "Off‑subnet traffic must go to the default gateway (router)."
              }
            ],
            content: [
              "Switches operate at Layer 2, forwarding frames based on MAC addresses.",
              "Routers operate at Layer 3, forwarding packets based on IP addresses and routing tables.",
              "Endpoints are devices like laptops, servers, and phones that generate or consume data.",
              "In a small office, a switch connects endpoints while a router connects the LAN to the Internet.",
              "Switches keep traffic local when possible; routers act as the boundary between networks.",
              "The default gateway is the router address that sends traffic off the local subnet.",
              "Example: two PCs on the same switch communicate directly without the router.",
              "If local traffic works but Internet access fails, the gateway or router path is the likely issue."
            ],
            objectives: [
              "Distinguish switches from routers",
              "Identify endpoints",
              "Explain where the default gateway fits"
            ],
            summary: "Switches handle local frames, routers handle inter-network traffic, and endpoints create the data."
          },
          {
            title: "Ethernet frames and MAC addresses",
            learn: "Ethernet frames carry data on a LAN and use MAC addresses for delivery.",
            blocks: [
              {
                type: "text",
                text: [
                  "An Ethernet frame includes destination MAC, source MAC, a type field, a payload, and an FCS.",
                  "MAC addresses are 48‑bit identifiers, typically written like 00:1A:2B:3C:4D:5E.",
                  "The first half (OUI) identifies the vendor; the second half is device‑specific.",
                  "Switches learn MAC addresses by reading the source MAC of incoming frames.",
                  "If the switch does not know the destination MAC, it floods the frame to all ports.",
                  "MAC tables age out, which lets the network adapt when devices move ports.",
                  "Example: when a laptop moves desks, the switch learns its new port automatically.",
                  "Understanding frame fields helps you debug why traffic is or is not flowing."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why MAC addresses stay local",
                content: [
                  "MAC addresses are used inside a LAN to deliver frames to the right port.",
                  "Routers strip the old frame and create a new one for the next hop.",
                  "That is why MAC addresses do not travel across the Internet."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which field identifies who sent the frame?",
                options: ["Destination MAC", "Source MAC", "FCS"],
                correctIndex: 1,
                explanation: "The source MAC identifies the sender."
              },
              {
                type: "activity",
                title: "Mini activity: Match frame fields",
                mode: "drag",
                prompt: "Match each frame field to its purpose.",
                targets: [
                  { id: "dest", label: "Destination MAC" },
                  { id: "src", label: "Source MAC" },
                  { id: "fcs", label: "FCS" }
                ],
                items: [
                  { id: "where", label: "Where the frame should go", targetId: "dest" },
                  { id: "who", label: "Who sent the frame", targetId: "src" },
                  { id: "error", label: "Error detection", targetId: "fcs" }
                ]
              }
            ],
            content: [
              "An Ethernet frame includes destination MAC, source MAC, a type field, a payload, and an FCS.",
              "MAC addresses are 48‑bit identifiers, typically written like 00:1A:2B:3C:4D:5E.",
              "The first half (OUI) identifies the vendor; the second half is device‑specific.",
              "Switches learn MAC addresses by reading the source MAC of incoming frames.",
              "If the switch does not know the destination MAC, it floods the frame to all ports.",
              "MAC tables age out, which lets the network adapt when devices move ports.",
              "Example: when a laptop moves desks, the switch learns its new port automatically.",
              "Understanding frame fields helps you debug why traffic is or is not flowing."
            ],
            objectives: [
              "Describe the parts of an Ethernet frame",
              "Explain how MAC addresses are used",
              "Understand why switches flood unknown destinations"
            ],
            summary: "Frames are the LAN envelope, and MAC addresses tell switches where to send them."
          },
          {
            title: "ARP and broadcast domains",
            learn: "ARP discovers MAC addresses for known IPs using broadcast messages.",
            blocks: [
              {
                type: "text",
                text: [
                  "ARP (Address Resolution Protocol) maps an IP address to a MAC address on the LAN.",
                  "When a device needs a MAC, it sends an ARP request as a broadcast.",
                  "Only the device with that IP responds with its MAC address, and the sender caches it.",
                  "ARP caches reduce repeated broadcasts but must be refreshed over time.",
                  "Broadcasts stay within a broadcast domain, which is typically a single LAN or VLAN.",
                  "Routers do not forward broadcast traffic, so they separate broadcast domains.",
                  "Example: a PC ARPs for the gateway before sending traffic to the Internet.",
                  "If ARP fails, devices can have the right IP but still fail to communicate."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why routers block broadcasts",
                content: [
                  "Broadcast traffic should stay local to reduce noise.",
                  "Routers separate networks, so they block broadcasts by default.",
                  "This keeps large networks stable and improves performance."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "An ARP request is sent as:",
                options: ["Unicast", "Broadcast", "Multicast"],
                correctIndex: 1,
                explanation: "ARP requests are broadcast so all devices can hear them."
              },
              {
                type: "activity",
                title: "Mini activity: Choose the first step",
                mode: "select",
                prompt: "You know the IP but not the MAC. What should the device send first?",
                options: ["ARP request", "DNS query", "ICMP echo reply"],
                correctIndex: 0,
                explanation: "ARP discovers the MAC address for a known IP on the LAN."
              }
            ],
            content: [
              "ARP (Address Resolution Protocol) maps an IP address to a MAC address on the LAN.",
              "When a device needs a MAC, it sends an ARP request as a broadcast.",
              "Only the device with that IP responds with its MAC address, and the sender caches it.",
              "ARP caches reduce repeated broadcasts but must be refreshed over time.",
              "Broadcasts stay within a broadcast domain, which is typically a single LAN or VLAN.",
              "Routers do not forward broadcast traffic, so they separate broadcast domains.",
              "Example: a PC ARPs for the gateway before sending traffic to the Internet.",
              "If ARP fails, devices can have the right IP but still fail to communicate."
            ],
            objectives: [
              "Explain how ARP works",
              "Define a broadcast domain",
              "Describe why routers block broadcasts"
            ],
            summary: "ARP uses broadcasts to map IPs to MACs, and routers limit broadcasts to protect networks."
          },
          {
            title: "Switching loops and STP basics",
            learn: "Redundant links can create loops; STP keeps Layer 2 stable.",
            blocks: [
              {
                type: "text",
                text: [
                  "Redundant links improve resilience, but unmanaged loops can break a LAN.",
                  "Loops cause broadcast storms and MAC table flapping, which can overwhelm switches.",
                  "Spanning Tree Protocol (STP) builds a loop‑free topology by blocking some links.",
                  "STP elects a root switch and chooses the best paths to it.",
                  "If a primary link fails, STP can reconverge and open a blocked path.",
                  "Example: two switches with two links will have one link blocked to prevent loops.",
                  "Using STP keeps redundancy without causing instability.",
                  "Tip: enable PortFast on end‑device ports to reduce startup delays."
                ]
              },
              {
                type: "explain",
                title: "Explain: What happens during reconvergence",
                content: [
                  "When a link fails, STP recalculates the best path to the root bridge.",
                  "A previously blocked port can transition to forwarding.",
                  "This restores connectivity without creating loops."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "STP primarily prevents:",
                options: ["Layer 2 loops", "IP conflicts", "DHCP failures"],
                correctIndex: 0,
                explanation: "STP prevents Layer 2 loops and broadcast storms."
              },
              {
                type: "activity",
                title: "Mini activity: Match STP terms",
                mode: "drag",
                prompt: "Match the STP term to the description.",
                targets: [
                  { id: "root", label: "Root Bridge" },
                  { id: "block", label: "Blocking Port" },
                  { id: "portfast", label: "PortFast" }
                ],
                items: [
                  { id: "rootdef", label: "Main switch for path decisions", targetId: "root" },
                  { id: "blockdef", label: "Stops loops by not forwarding", targetId: "block" },
                  { id: "pfdef", label: "Speeds up access ports", targetId: "portfast" }
                ]
              }
            ],
            content: [
              "Redundant links improve resilience, but unmanaged loops can break a LAN.",
              "Loops cause broadcast storms and MAC table flapping, which can overwhelm switches.",
              "Spanning Tree Protocol (STP) builds a loop‑free topology by blocking some links.",
              "STP elects a root switch and chooses the best paths to it.",
              "If a primary link fails, STP can reconverge and open a blocked path.",
              "Example: two switches with two links will have one link blocked to prevent loops.",
              "Using STP keeps redundancy without causing instability.",
              "Tip: enable PortFast on end‑device ports to reduce startup delays."
            ],
            objectives: [
              "Explain why loops are harmful",
              "Describe what STP does",
              "Identify why redundancy still matters"
            ],
            summary: "STP prevents loops while preserving backup paths for reliability.",
            quiz: {
              title: "Ethernet and switching quiz",
              xp: 80,
              questions: [
                {
                  id: "q1",
                  question: "Fill in the blank: A switch forwards frames based on ___ addresses.",
                  options: ["MAC", "IP", "DNS"],
                  correctAnswer: 0,
                  explanation: "Switches use MAC addresses to forward frames."
                },
                {
                  id: "q2",
                  question: "Routers primarily operate at which OSI layer?",
                  options: ["Layer 3", "Layer 2", "Layer 1"],
                  correctAnswer: 0,
                  explanation: "Routers forward packets at Layer 3."
                },
                {
                  id: "q3",
                  question: "ARP is used to map:",
                  options: ["IP to MAC", "MAC to IP", "DNS to IP"],
                  correctAnswer: 0,
                  explanation: "ARP resolves IP addresses to MAC addresses."
                },
                {
                  id: "q4",
                  question: "A broadcast domain is typically bounded by a:",
                  options: ["Router", "Switch", "Hub"],
                  correctAnswer: 0,
                  explanation: "Routers stop broadcasts and separate domains."
                },
                {
                  id: "q5",
                  question: "Ethernet frames include a ___ for error detection.",
                  options: ["FCS", "TTL", "DHCP"],
                  correctAnswer: 0,
                  explanation: "The FCS/CRC is used to detect errors."
                },
                {
                  id: "q6",
                  question: "If a switch does not know a destination MAC, it will:",
                  options: ["Flood the frame", "Drop the frame", "Route the frame"],
                  correctAnswer: 0,
                  explanation: "Unknown unicast frames are flooded."
                },
                {
                  id: "q7",
                  question: "Fill in the blank: Endpoints are devices that ___ data.",
                  options: ["generate or consume", "only forward", "only encrypt"],
                  correctAnswer: 0,
                  explanation: "Endpoints are the sources and destinations of data."
                },
                {
                  id: "q8",
                  question: "STP is primarily used to prevent:",
                  options: ["Routing loops", "Layer 2 loops", "IP conflicts"],
                  correctAnswer: 1,
                  explanation: "Spanning Tree prevents Layer 2 loops and broadcast storms."
                },
                {
                  id: "q9",
                  question: "PortFast should be enabled on:",
                  options: ["Access ports to end devices", "Trunk links between switches", "Router uplinks only"],
                  correctAnswer: 0,
                  explanation: "PortFast speeds up access ports connected to end devices."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 3: IPv4 and Core Services",
        about: "Learn how IP addresses work, why subnets exist, and how DNS/DHCP keep networks usable.",
        sections: [
          {
            title: "Core concepts",
            items: [
              {
                type: "Learn",
                title: "IPv4 addresses",
                content: "IPv4 addresses identify devices at Layer 3 using dotted decimal notation.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "Subnet masks and gateways",
                content: "Subnet masks define local vs remote traffic; gateways forward off-subnet packets.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "IP planning and common mistakes",
                content: "Simple planning prevents conflicts, overlaps, and hard-to-debug outages.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "DHCP and DNS essentials",
                content: "DHCP hands out addresses; DNS turns names into IPs.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "IP basics quiz",
                duration: "8 min",
                xp: 80
              }
            ]
          },
          {
            title: "Hands-on",
            items: [
              {
                type: "Practice",
                title: "Assign IP details",
                duration: "12 min",
                xp: 35,
                steps: [
                  {
                    text: "Add a router to the canvas.",
                    checks: [{ type: "device", deviceType: "router", count: 1 }]
                  },
                  {
                    text: "Add a switch.",
                    checks: [{ type: "device", deviceType: "switch", count: 1 }]
                  },
                  {
                    text: "Add two PCs.",
                    checks: [{ type: "device", deviceType: "pc", count: 2 }]
                  },
                  {
                    text: "Connect both PCs to the switch.",
                    checks: [{ type: "connection", from: "pc", to: "switch", count: 2 }]
                  },
                  {
                    text: "Connect the switch to the router.",
                    checks: [{ type: "connection", from: "switch", to: "router", count: 1 }]
                  },
                  {
                    text: "Set IP addresses on both PCs in the same /24 (example: 192.168.10.10 and 192.168.10.11).",
                    checks: [{ type: "ip", deviceType: "pc", count: 2 }],
                    hint: "Select a PC, open Properties, and enter the IP address."
                  },
                  {
                    text: "Set the default gateway on both PCs (example: 192.168.10.1).",
                    checks: [{ type: "gateway", deviceType: "pc", count: 2 }],
                    hint: "The gateway should match the router’s LAN interface."
                  }
                ],
                tips: "Devices in the same /24 talk directly; the gateway is used for off-subnet traffic."
              },
              {
                type: "Challenge",
                title: "Subnet a small office",
                duration: "18 min",
                xp: 110,
                challenge: {
                  rules: {
                    minDevices: 5,
                    minConnections: 4,
                    requiredTypes: { router: 1, switch: 1, pc: 3 }
                  },
                  steps: [
                    "Create a LAN with a router, a switch, and three PCs.",
                    "Assign IP addresses in the same /24 and pick a default gateway.",
                    "Explain how DHCP and DNS would be added to improve usability."
                  ],
                  tips: "Keep hosts in the same subnet and use the router as the gateway."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "IPv4 addresses",
            learn: "IPv4 addresses uniquely identify devices so routers can deliver packets.",
            blocks: [
              {
                type: "text",
                text: [
                  "An IPv4 address is a 32‑bit value written in dotted decimal, like 192.168.1.20.",
                  "The address is split into a network portion and a host portion using the subnet mask.",
                  "Devices on the same network portion can communicate directly without a router.",
                  "Public IPs are reachable on the Internet; private IPs are used inside local networks.",
                  "Private ranges include 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.",
                  "Most home networks use private IPs with NAT to share one public address.",
                  "Address conflicts cause intermittent issues that look like random outages.",
                  "Knowing IP basics is the foundation for routing and troubleshooting."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why private IPs exist",
                content: [
                  "Private IPs allow organizations to reuse address space safely.",
                  "NAT translates private IPs to a public IP at the network edge.",
                  "This makes the Internet scalable while keeping internal networks flexible."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which range is private?",
                options: ["10.0.0.0/8", "8.8.8.0/24", "1.1.1.0/24"],
                correctIndex: 0,
                explanation: "10.0.0.0/8 is a private IPv4 range."
              },
              {
                type: "activity",
                title: "Mini activity: Match address types",
                mode: "drag",
                prompt: "Drag each address to the correct type.",
                targets: [
                  { id: "private", label: "Private" },
                  { id: "public", label: "Public" }
                ],
                items: [
                  { id: "addr1", label: "192.168.1.20", targetId: "private" },
                  { id: "addr2", label: "8.8.8.8", targetId: "public" },
                  { id: "addr3", label: "10.20.5.10", targetId: "private" }
                ]
              }
            ],
            content: [
              "An IPv4 address is a 32‑bit value written in dotted decimal, like 192.168.1.20.",
              "The address is split into a network portion and a host portion using the subnet mask.",
              "Devices on the same network portion can communicate directly without a router.",
              "Public IPs are reachable on the Internet; private IPs are used inside local networks.",
              "Private ranges include 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.",
              "Most home networks use private IPs with NAT to share one public address.",
              "Address conflicts cause intermittent issues that look like random outages.",
              "Knowing IP basics is the foundation for routing and troubleshooting."
            ],
            objectives: [
              "Describe IPv4 addressing",
              "Recognize private address ranges",
              "Explain why IP accuracy matters"
            ],
            summary: "IPv4 addresses label devices so packets can be routed across networks."
          },
          {
            title: "Subnet masks and gateways",
            learn: "Subnet masks identify the local network; gateways forward off‑subnet traffic.",
            blocks: [
              {
                type: "text",
                text: [
                  "A subnet mask tells a device which portion of an IP address is the network.",
                  "A common mask is 255.255.255.0, also written as /24.",
                  "If the destination IP is in the same subnet, traffic stays on the LAN.",
                  "If the destination is outside the subnet, the device sends traffic to the default gateway.",
                  "The default gateway is typically the router interface on that LAN.",
                  "Wrong masks or gateways are one of the most common causes of connectivity issues.",
                  "Example: a PC can reach printers but not the Internet because the gateway is wrong.",
                  "Subnets keep broadcast traffic smaller and make large networks easier to manage."
                ]
              },
              {
                type: "explain",
                title: "Explain: Symptoms of a wrong mask",
                content: [
                  "A wrong mask makes the PC think distant hosts are local (or vice versa).",
                  "This causes failed connections even if the IP looks correct.",
                  "Always verify IP, mask, and gateway together."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which value tells a host what is local?",
                options: ["Subnet mask", "DNS server", "MAC address"],
                correctIndex: 0,
                explanation: "The subnet mask defines which addresses are local."
              },
              {
                type: "activity",
                title: "Mini activity: Local or gateway?",
                mode: "select",
                prompt: "A host has 192.168.10.5/24 and wants 192.168.10.77. How should it send the traffic?",
                options: ["Directly on the LAN", "To the default gateway", "To DNS"],
                correctIndex: 0,
                explanation: "Same /24 means the traffic is local."
              }
            ],
            content: [
              "A subnet mask tells a device which portion of an IP address is the network.",
              "A common mask is 255.255.255.0, also written as /24.",
              "If the destination IP is in the same subnet, traffic stays on the LAN.",
              "If the destination is outside the subnet, the device sends traffic to the default gateway.",
              "The default gateway is typically the router interface on that LAN.",
              "Wrong masks or gateways are one of the most common causes of connectivity issues.",
              "Example: a PC can reach printers but not the Internet because the gateway is wrong.",
              "Subnets keep broadcast traffic smaller and make large networks easier to manage."
            ],
            objectives: [
              "Interpret subnet masks",
              "Explain the role of the default gateway",
              "Identify common addressing mistakes"
            ],
            summary: "Subnet masks define local traffic, while gateways handle traffic to other networks."
          },
          {
            title: "IP planning and common mistakes",
            learn: "A simple IP plan prevents overlaps, conflicts, and hard‑to‑debug outages.",
            blocks: [
              {
                type: "text",
                text: [
                  "Start with a simple plan that separates users, servers, printers, and guests.",
                  "Reserve small blocks for infrastructure like routers, switches, and access points.",
                  "Avoid overlapping ranges when multiple sites connect or when VLANs are added later.",
                  "Use a consistent pattern, such as 10.10.x.0/24 for staff and 10.20.x.0/24 for guests.",
                  "Document address assignments and keep track of static IPs to prevent conflicts.",
                  "Remember that .0 is the network address and .255 is the broadcast address in a /24.",
                  "Example: a printer with a static IP prevents users from losing access after DHCP changes.",
                  "Good IP planning makes growth easy and reduces downtime."
                ]
              },
              {
                type: "explain",
                title: "Explain: Overlapping subnets",
                content: [
                  "Overlapping subnets cause ambiguous routing and broken connectivity.",
                  "If two sites use the same range, VPNs and WAN links will drop traffic.",
                  "Planning ahead prevents painful renumbering later."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Why should you document static IPs?",
                options: ["To increase bandwidth", "To avoid address conflicts", "To speed up DNS"],
                correctIndex: 1,
                explanation: "Tracking static IPs prevents two devices from using the same address."
              },
              {
                type: "activity",
                title: "Mini activity: Match practice to benefit",
                mode: "drag",
                prompt: "Match each planning practice to its main benefit.",
                targets: [
                  { id: "conflict", label: "Avoid conflicts" },
                  { id: "security", label: "Improve security" },
                  { id: "clarity", label: "Improve clarity" }
                ],
                items: [
                  { id: "static", label: "Document static IPs", targetId: "conflict" },
                  { id: "guest", label: "Separate guest network", targetId: "security" },
                  { id: "pattern", label: "Consistent subnet pattern", targetId: "clarity" }
                ]
              }
            ],
            content: [
              "Start with a simple plan that separates users, servers, printers, and guests.",
              "Reserve small blocks for infrastructure like routers, switches, and access points.",
              "Avoid overlapping ranges when multiple sites connect or when VLANs are added later.",
              "Use a consistent pattern, such as 10.10.x.0/24 for staff and 10.20.x.0/24 for guests.",
              "Document address assignments and keep track of static IPs to prevent conflicts.",
              "Remember that .0 is the network address and .255 is the broadcast address in a /24.",
              "Example: a printer with a static IP prevents users from losing access after DHCP changes.",
              "Good IP planning makes growth easy and reduces downtime."
            ],
            objectives: [
              "Explain why IP planning matters",
              "List common addressing mistakes",
              "Describe a simple planning approach"
            ],
            summary: "Clear IP planning reduces conflicts and keeps networks easier to scale."
          },
          {
            title: "DHCP and DNS essentials",
            learn: "DHCP automates IP configuration and DNS translates names into addresses.",
            blocks: [
              {
                type: "text",
                text: [
                  "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to hosts.",
                  "The DHCP process follows DORA: Discover, Offer, Request, Acknowledge.",
                  "DHCP also distributes options like subnet mask, gateway, and DNS server.",
                  "Reservations allow specific devices to always receive the same IP.",
                  "DNS (Domain Name System) translates human‑friendly names like example.com into IP addresses.",
                  "DNS caching speeds up lookups and reduces traffic to authoritative servers.",
                  "If DNS is misconfigured, services may be up but unreachable by name.",
                  "DHCP and DNS reduce manual configuration and improve consistency across devices."
                ]
              },
              {
                type: "explain",
                title: "Explain: Symptoms when DHCP fails",
                content: [
                  "Devices may assign themselves a fallback IP (like 169.254.x.x).",
                  "Users report “Wi‑Fi connected, but no Internet.”",
                  "Checking the IP, mask, and gateway quickly confirms the issue."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "In DHCP, the client sends a ___ first.",
                options: ["Discover", "Offer", "Acknowledge"],
                correctIndex: 0,
                explanation: "The client starts the process with a Discover message."
              },
              {
                type: "activity",
                title: "Mini activity: Diagnose the issue",
                mode: "select",
                prompt: "Users can reach 8.8.8.8 but not example.com. Which service is likely the issue?",
                options: ["DNS", "DHCP", "Switching"],
                correctIndex: 0,
                explanation: "If IP works but names fail, DNS is the culprit."
              }
            ],
            content: [
              "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to hosts.",
              "The DHCP process follows DORA: Discover, Offer, Request, Acknowledge.",
              "DHCP also distributes options like subnet mask, gateway, and DNS server.",
              "Reservations allow specific devices to always receive the same IP.",
              "DNS (Domain Name System) translates human‑friendly names like example.com into IP addresses.",
              "DNS caching speeds up lookups and reduces traffic to authoritative servers.",
              "If DNS is misconfigured, services may be up but unreachable by name.",
              "DHCP and DNS reduce manual configuration and improve consistency across devices."
            ],
            objectives: [
              "Explain the DHCP DORA process",
              "Describe what DNS does",
              "Identify symptoms of DNS or DHCP issues"
            ],
            summary: "DHCP assigns network settings automatically and DNS makes services easy to find.",
            quiz: {
              title: "IP basics quiz",
              xp: 80,
              questions: [
                {
                  id: "q1",
                  question: "Fill in the blank: An IPv4 address has ___ bits.",
                  options: ["32", "48", "64"],
                  correctAnswer: 0,
                  explanation: "IPv4 uses 32-bit addresses."
                },
                {
                  id: "q2",
                  question: "A subnet mask of 255.255.255.0 is written as:",
                  options: ["/24", "/16", "/30"],
                  correctAnswer: 0,
                  explanation: "/24 means 24 network bits."
                },
                {
                  id: "q3",
                  question: "The default gateway is used when traffic is:",
                  options: ["Destined outside the local subnet", "Staying within the subnet", "Broadcast-only"],
                  correctAnswer: 0,
                  explanation: "Gateways are for off-subnet traffic."
                },
                {
                  id: "q4",
                  question: "DHCP stands for:",
                  options: ["Dynamic Host Configuration Protocol", "Domain Host Control Protocol", "Distributed Host Cache Protocol"],
                  correctAnswer: 0,
                  explanation: "DHCP automates IP configuration."
                },
                {
                  id: "q5",
                  question: "DNS translates:",
                  options: ["Names to IPs", "IPs to MACs", "MACs to names"],
                  correctAnswer: 0,
                  explanation: "DNS resolves names to IP addresses."
                },
                {
                  id: "q6",
                  question: "Which of the following is a private IPv4 range?",
                  options: ["10.0.0.0/8", "8.8.8.0/24", "1.1.1.0/24"],
                  correctAnswer: 0,
                  explanation: "10.0.0.0/8 is private."
                },
                {
                  id: "q7",
                  question: "If a host can reach local devices but not the Internet, check the:",
                  options: ["Default gateway", "Switch port speed", "MAC address table"],
                  correctAnswer: 0,
                  explanation: "A wrong gateway blocks off-subnet traffic."
                },
                {
                  id: "q8",
                  question: "In DHCP, the first message a client sends is:",
                  options: ["Discover", "Offer", "Request"],
                  correctAnswer: 0,
                  explanation: "The client starts with a Discover message."
                },
                {
                  id: "q9",
                  question: "Which practice helps prevent IP conflicts?",
                  options: ["Documenting static IPs and reservations", "Using random IPs", "Disabling DHCP"],
                  correctAnswer: 0,
                  explanation: "Tracking static IPs and reservations prevents overlaps."
                },
                {
                  id: "q10",
                  question: "Overlapping subnets between sites usually cause:",
                  options: ["Faster routing", "Routing and reachability problems", "Better security"],
                  correctAnswer: 1,
                  explanation: "Overlaps create ambiguous routes and broken connectivity."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  "2": {
    id: "2",
    title: "Ethernet & Switching Basics",
    description: "Learn switching behavior and build your first switched network.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "1.2 hrs",
    xpReward: 350,
    category: "Switching",
    units: [
      {
        title: "Unit 1: Switching 101",
        about: "Understand how switches learn and forward frames.",
        sections: [
          {
            title: "Switching",
            items: [
              {
                type: "Learn",
                title: "Switch vs hub",
                content: "Switches forward frames intelligently using MAC tables; hubs flood everything.",
                duration: "8 min",
                xp: 35
              },
              {
                type: "Learn",
                title: "Spanning Tree basics",
                content: "STP prevents loops by blocking redundant paths in Layer 2 networks.",
                duration: "9 min",
                xp: 35
              },
              {
                type: "Quiz",
                title: "Switching quick check",
                duration: "5 min",
                xp: 50
              },
              {
                type: "Practice",
                title: "Inspect MAC tables",
                duration: "8 min",
                xp: 25,
                steps: [
                  "Add a switch and two PCs.",
                  "Connect both PCs to the switch.",
                  "Open the switch config panel and note the MAC table section.",
                  "Explain how traffic from each PC would populate the table."
                ],
                tips: "MAC tables map source MAC addresses to the port they were learned on."
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Switch vs hub",
            learn: "Switches build MAC tables and forward frames only where needed. Hubs repeat to all ports.",
            blocks: [
              {
                type: "text",
                text: [
                  "A hub is a simple device that repeats every incoming frame out every port.",
                  "A switch is smarter — it learns which MAC address lives on which port by reading the source address of every incoming frame.",
                  "When a switch knows the destination MAC, it sends the frame only to the correct port (unicast forwarding).",
                  "If the destination is unknown, the switch floods the frame to all ports except the source — just like a hub would.",
                  "Over time the MAC address table fills in and almost all traffic is forwarded efficiently.",
                  "Hubs create one big collision domain; switches give each port its own collision domain.",
                  "This means switches handle much higher throughput and support full-duplex on every port."
                ]
              },
              {
                type: "explain",
                title: "Explain: MAC address learning",
                content: [
                  "Every frame has a source MAC. The switch records that MAC and the port it arrived on.",
                  "This entry stays in the MAC table for a set time (typically 300 seconds).",
                  "If no more frames arrive from that MAC, the entry ages out and is removed."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What does a switch do when it does not know the destination MAC?",
                options: ["Drops the frame", "Floods to all ports except the source", "Sends it to the router"],
                correctIndex: 1,
                explanation: "Unknown unicast frames are flooded until the switch learns the destination."
              },
              {
                type: "activity",
                title: "Match device behaviour",
                mode: "drag",
                prompt: "Match each behaviour to the correct device.",
                targets: [
                  { id: "hub", label: "Hub" },
                  { id: "switch", label: "Switch" }
                ],
                items: [
                  { id: "flood", label: "Repeats every frame to all ports", targetId: "hub" },
                  { id: "learn", label: "Builds a MAC address table", targetId: "switch" },
                  { id: "collision", label: "One shared collision domain", targetId: "hub" },
                  { id: "unicast", label: "Forwards known unicast to one port", targetId: "switch" }
                ]
              }
            ],
            content: [
              "A hub repeats every incoming frame out every port, creating unnecessary traffic.",
              "A switch learns which MAC address lives on which port by reading the source address.",
              "When the destination MAC is known, the switch forwards the frame only to the correct port.",
              "Unknown destinations are flooded to all ports except the source.",
              "Switches give each port its own collision domain, enabling full-duplex and higher throughput.",
              "MAC table entries age out after a timeout, typically 300 seconds.",
              "Modern networks use switches almost exclusively; hubs are legacy devices."
            ],
            objectives: [
              "Compare how hubs and switches forward frames",
              "Explain MAC address learning",
              "Describe why switches are preferred over hubs"
            ],
            summary: "Switches forward frames intelligently using MAC tables while hubs repeat everything."
          },
          {
            title: "Spanning Tree basics",
            learn: "STP calculates a loop-free topology by blocking some redundant links.",
            blocks: [
              {
                type: "text",
                text: [
                  "Redundant links between switches improve availability but create a risk of switching loops.",
                  "A loop causes frames to circle endlessly, flooding the network and crashing it within seconds.",
                  "Spanning Tree Protocol (STP) prevents loops by electing a Root Bridge and blocking redundant paths.",
                  "The Root Bridge is the switch with the lowest Bridge ID — all traffic paths are calculated from it.",
                  "Each non-root switch finds its shortest path to the root; ports on redundant links are placed in blocking state.",
                  "If an active link fails, STP recalculates and unblocks a previously blocked port to restore connectivity.",
                  "Modern variants like RSTP converge much faster than the original 802.1D standard."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why loops are dangerous",
                content: [
                  "Without STP, a single broadcast frame would be copied endlessly between switches.",
                  "This broadcast storm consumes all bandwidth and CPU on every switch.",
                  "STP stops this by ensuring only one active path exists between any two switches."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What role does the Root Bridge play in STP?",
                options: ["It blocks all traffic", "It is the reference point for path calculations", "It assigns IP addresses"],
                correctIndex: 1,
                explanation: "All STP path costs are calculated relative to the Root Bridge."
              },
              {
                type: "activity",
                title: "Order the STP process",
                mode: "drag",
                prompt: "Match each STP concept to the correct description.",
                targets: [
                  { id: "root", label: "Root Bridge" },
                  { id: "blocking", label: "Blocking state" },
                  { id: "convergence", label: "Convergence" }
                ],
                items: [
                  { id: "lowest", label: "Switch with the lowest Bridge ID", targetId: "root" },
                  { id: "noforward", label: "Port that does not forward frames", targetId: "blocking" },
                  { id: "recalc", label: "Recalculating paths after a failure", targetId: "convergence" }
                ]
              }
            ],
            content: [
              "Redundant links between switches improve availability but create a risk of switching loops.",
              "Spanning Tree Protocol prevents loops by electing a Root Bridge and blocking redundant paths.",
              "The Root Bridge is the switch with the lowest Bridge ID.",
              "Each non-root switch finds its shortest path to the root.",
              "Ports on redundant links are placed in blocking state to prevent loops.",
              "If an active link fails, STP recalculates and unblocks a previously blocked port.",
              "RSTP converges much faster than the original 802.1D standard."
            ],
            objectives: [
              "Explain why switching loops are dangerous",
              "Describe how STP elects a Root Bridge",
              "Explain how STP prevents loops"
            ],
            summary: "STP prevents dangerous switching loops by electing a Root Bridge and blocking redundant paths.",
            quiz: {
              title: "Switching quick check",
              xp: 50,
              questions: [
                {
                  id: "q1",
                  question: "Why is STP used?",
                  options: ["To encrypt frames", "To prevent loops", "To assign IPs"],
                  correctAnswer: 1,
                  explanation: "STP prevents Layer 2 loops."
                },
                {
                  id: "q2",
                  question: "A hub forwards frames to:",
                  options: ["A single port", "All ports", "Only the destination"],
                  correctAnswer: 1,
                  explanation: "Hubs flood traffic."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  "3": {
    id: "3",
    title: "IP Addressing Essentials",
    description: "Understand private vs public IPs and basic subnetting concepts.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "1.4 hrs",
    xpReward: 360,
    category: "IP",
    units: [
      {
        title: "Unit 1: IPv4 Essentials",
        about: "Explore addressing ranges and private IP spaces.",
        sections: [
          {
            title: "Addressing",
            items: [
              {
                type: "Learn",
                title: "IPv4 address classes",
                content: "Classes A, B, and C are legacy ranges that influenced private IP blocks.",
                duration: "8 min",
                xp: 35
              },
              {
                type: "Learn",
                title: "Private vs public IPs",
                content: "Private IPs are used inside networks; public IPs are globally routable.",
                duration: "9 min",
                xp: 35
              },
              {
                type: "Quiz",
                title: "Addressing quick check",
                duration: "5 min",
                xp: 50
              }
            ]
          }
        ],
        lessons: [
          {
            title: "IPv4 address classes",
            learn: "Classful addressing is historical, but private ranges still map to A/B/C blocks.",
            blocks: [
              {
                type: "text",
                text: [
                  "IPv4 addresses are 32 bits long, written as four octets separated by dots (e.g. 192.168.1.1).",
                  "Historically, addresses were divided into classes: A (1–126), B (128–191), and C (192–223).",
                  "Class A gives huge networks with millions of hosts; Class C gives small networks with 254 hosts.",
                  "Classful addressing wasted addresses — a company needing 500 hosts had to take a full Class B.",
                  "Modern networking uses CIDR to size networks precisely, but private ranges still follow the class boundaries.",
                  "Private ranges: 10.0.0.0/8 (Class A), 172.16.0.0/12 (Class B), 192.168.0.0/16 (Class C)."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why classful addressing is obsolete",
                content: [
                  "Class-based allocation was too rigid and wasted huge blocks of addresses.",
                  "CIDR replaced classes with variable-length prefixes for flexible sizing.",
                  "However, private IP ranges are still defined by the old class boundaries."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which class of IPv4 address starts with 192?",
                options: ["Class A", "Class B", "Class C"],
                correctIndex: 2,
                explanation: "Class C addresses range from 192 to 223 in the first octet."
              },
              {
                type: "activity",
                title: "Match IP ranges",
                mode: "drag",
                prompt: "Match each private range to the correct class.",
                targets: [
                  { id: "a", label: "Class A" },
                  { id: "b", label: "Class B" },
                  { id: "c", label: "Class C" }
                ],
                items: [
                  { id: "ten", label: "10.0.0.0/8", targetId: "a" },
                  { id: "oneseventwo", label: "172.16.0.0/12", targetId: "b" },
                  { id: "oneninety", label: "192.168.0.0/16", targetId: "c" }
                ]
              }
            ],
            content: [
              "IPv4 addresses are 32 bits long, written as four octets separated by dots.",
              "Classes A, B, and C defined network sizes based on the first octet.",
              "Classful addressing wasted addresses; CIDR replaced it with variable prefixes.",
              "Private ranges still follow class boundaries: 10/8, 172.16/12, 192.168/16.",
              "Class A supports millions of hosts; Class C supports 254 hosts.",
              "Understanding classes helps you recognise private IP ranges quickly."
            ],
            objectives: [
              "Identify IPv4 address classes",
              "List the three private IP ranges",
              "Explain why CIDR replaced classful addressing"
            ],
            summary: "IPv4 classes are historical but private ranges still map to Class A, B, and C blocks."
          },
          {
            title: "Private vs public IPs",
            learn: "Private IPs (10/8, 172.16/12, 192.168/16) are not routed on the Internet.",
            blocks: [
              {
                type: "text",
                text: [
                  "Public IP addresses are globally unique and routable on the Internet.",
                  "Private IP addresses are reserved for internal use and cannot be routed publicly.",
                  "NAT (Network Address Translation) allows private IPs to share a single public IP for Internet access.",
                  "The three private ranges are: 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.",
                  "Using private IPs conserves the limited IPv4 address space.",
                  "Most home and office networks use private IPs internally with NAT at the router."
                ]
              },
              {
                type: "explain",
                title: "Explain: How NAT works",
                content: [
                  "NAT translates private source IPs to a public IP when traffic leaves the network.",
                  "Return traffic is mapped back to the original private IP using a translation table.",
                  "PAT (Port Address Translation) allows many devices to share one public IP by tracking port numbers."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What allows private IPs to access the Internet?",
                options: ["DNS", "NAT", "DHCP"],
                correctIndex: 1,
                explanation: "NAT translates private IPs to public IPs for Internet access."
              }
            ],
            content: [
              "Public IPs are globally unique and routable on the Internet.",
              "Private IPs are reserved for internal use and not routed publicly.",
              "NAT translates private IPs to public IPs at the network boundary.",
              "The three private ranges are 10/8, 172.16/12, and 192.168/16.",
              "Using private IPs conserves the limited IPv4 address space.",
              "Most networks use private IPs internally with NAT at the router."
            ],
            objectives: [
              "Distinguish private from public IP addresses",
              "Explain how NAT enables Internet access",
              "List the three private IP ranges"
            ],
            summary: "Private IPs are used internally and NAT translates them to public IPs for Internet access.",
            quiz: {
              title: "Addressing quick check",
              xp: 50,
              questions: [
                {
                  id: "q1",
                  question: "Which is a private IP range?",
                  options: ["8.8.8.0/24", "10.0.0.0/8", "1.1.1.0/24"],
                  correctAnswer: 1,
                  explanation: "10.0.0.0/8 is private."
                },
                {
                  id: "q2",
                  question: "Public IPs are:",
                  options: ["Only used inside LANs", "Globally routable", "Only for servers"],
                  correctAnswer: 1,
                  explanation: "Public IPs are globally routable."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // AI Prompt: Explain the INTERMEDIATE COURSES (Level 3+) section in clear, simple terms.
  // ============================
  // INTERMEDIATE COURSES (Level 3+)
  // ============================
  "4": {
    id: "4",
    title: "Subnetting & VLANs",
    description: "Design efficient subnets, segment networks with VLANs, and connect them securely with inter-VLAN routing.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "6 hrs",
    xpReward: 950,
    category: "Routing",
    units: [
      {
        title: "Unit 1: Subnetting Fundamentals",
        about: "Learn why subnetting matters and how CIDR works.",
        sections: [
          {
            title: "Subnetting",
            items: [
              {
                type: "Learn",
                title: "Why subnet?",
                content: "Subnetting reduces broadcast domains, improves performance, and keeps IP plans organized.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "CIDR and prefix lengths",
                content: "CIDR uses prefixes (like /24) to define network size and range.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "VLSM and subnet strategy",
                content: "Variable-length subnets let you match address space to real needs.",
                duration: "14 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Subnetting by hand",
                content: "Use block sizes to calculate network ranges and usable host counts.",
                duration: "14 min",
                xp: 60
              },
              {
                type: "Quiz",
                title: "Subnetting fundamentals quiz",
                duration: "8 min",
                xp: 90
              },
              {
                type: "Practice",
                title: "Calculate subnet ranges",
                duration: "14 min",
                xp: 40,
                steps: [
                  "Add a router, a switch, and four PCs.",
                  "Connect all PCs to the switch and the switch to the router.",
                  "Assign two PCs to 192.168.10.0/26 (example: .10 and .20).",
                  "Assign two PCs to 192.168.10.64/26 (example: .70 and .80)."
                ],
                tips: "A /26 has 64 addresses; the network IDs here are .0 and .64."
              },
              {
                type: "Challenge",
                title: "Design two subnets for a small business",
                duration: "18 min",
                xp: 110,
                challenge: {
                  rules: {
                    minDevices: 6,
                    minConnections: 5,
                    requiredTypes: { router: 1, switch: 1, pc: 4 }
                  },
                  steps: [
                    "Add 1 router, 1 switch, and at least 4 PCs.",
                    "Connect all PCs to the switch and connect the switch to the router.",
                    "Plan two subnets (e.g., Staff and Guest) and document the gateway for each."
                  ],
                  tips: "Use two groups of PCs to represent two different subnets."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Why subnet?",
            learn: "Subnetting improves performance, security, and manageability by limiting broadcasts.",
            blocks: [
              {
                type: "text",
                text: [
                  "Subnetting splits a large network into smaller networks, each with its own broadcast domain.",
                  "Smaller broadcast domains reduce unnecessary traffic and make troubleshooting easier.",
                  "Subnetting also helps enforce security boundaries between departments or services.",
                  "Example: HR, Finance, and Engineering can each have their own subnet with firewall rules between them.",
                  "Good subnetting reduces wasted addresses and prevents one noisy segment from impacting everyone.",
                  "Subnetting makes IP planning realistic; you assign only as many addresses as each group needs.",
                  "Security improves: broadcast-dependent attacks are confined to one subnet.",
                  "Performance improves: multicast and broadcast storm are limited to one subnet only."
                ]
              },
              {
                type: "explain",
                title: "Explain: Broadcast domains and subnets",
                content: [
                  "Each subnet is its own broadcast domain.",
                  "Broadcast frames stay inside one subnet; routers never forward broadcasts.",
                  "This is why splitting a large network into subnets reduces broadcast traffic and improves performance."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What limits broadcasts to just one subnet?",
                options: ["Switches", "Routers", "Gateways"],
                correctIndex: 1,
                explanation: "Routers separate broadcast domains; broadcasts never cross a router."
              }
            ],
            content: [
              "Subnetting splits a large network into smaller networks, each with its own broadcast domain.",
              "Smaller broadcast domains reduce unnecessary traffic and make troubleshooting easier.",
              "Subnetting also helps enforce security boundaries between departments or services.",
              "Example: HR, Finance, and Engineering can each have their own subnet with routing and firewall rules between them.",
              "Subnetting makes IP planning realistic; you can assign only as many addresses as each group needs.",
              "Good subnetting reduces wasted addresses and prevents one noisy segment from impacting everyone.",
              "Example: splitting a /23 into two /24s keeps guest Wi-Fi separate while still leaving room for growth.",
              "The end result is a cleaner, more secure network that scales predictably."
            ],
            objectives: [
              "Explain why subnetting is used",
              "Describe how broadcasts are reduced",
              "Explain how subnetting improves security"
            ],
            summary: "Subnetting creates smaller, safer, and more efficient networks."
          },
          {
            title: "CIDR and prefix lengths",
            learn: "Prefix length determines how many addresses are in a subnet.",
            blocks: [
              {
                type: "text",
                text: [
                  "CIDR uses prefix notation (like /24) to define network size and range.",
                  "The shorter the prefix, the larger the subnet (more hosts).",
                  "The longer the prefix, the smaller the subnet (fewer hosts).",
                  "A /24 gives 256 total addresses (254 usable). A /26 gives 64 total (62 usable).",
                  "Prefix length directly controls the block size and the step between subnets.",
                  "Knowing the prefix lets you calculate network, broadcast, and host ranges quickly.",
                  "Example: a /28 gives 16 total addresses (14 usable), perfect for a small printer or IoT VLAN.",
                  "The math: block size = 256 / (2^(32-prefix)) and each subnet starts at the next block boundary."
                ]
              },
              {
                type: "explain",
                title: "Explain: Block size formula",
                content: [
                  "Block size determines the step between network IDs.",
                  "For a /26: block size = 256 / 4 = 64, so networks are .0, .64, .128, .192.",
                  "For a /28: block size = 256 / 16 = 16, so networks are .0, .16, .32, .48, .64..."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is the block size for a /25?",
                options: ["64", "128", "256"],
                correctIndex: 1,
                explanation: "A /25 gives 128 addresses per subnet; networks start at .0, .128."
              }
            ],
            content: [
              "CIDR uses prefix notation (like /24) to define network size and range.",
              "The shorter the prefix, the larger the subnet (more hosts).",
              "The longer the prefix, the smaller the subnet (fewer hosts).",
              "A /24 gives 256 total addresses (254 usable). A /26 gives 64 total (62 usable).",
              "Prefix length directly controls the block size and the step between subnets.",
              "Knowing the prefix lets you calculate network, broadcast, and host ranges quickly.",
              "Example: a /28 gives 16 total addresses (14 usable), perfect for a small printer or IoT VLAN.",
              "CIDR makes subnet sizing predictable and easier to document."
            ],
            objectives: [
              "Read a CIDR prefix",
              "Relate prefix length to subnet size",
              "Calculate total vs usable addresses"
            ],
            summary: "CIDR prefixes describe subnet size and usable host counts."
          },
          {
            title: "VLSM and subnet strategy",
            learn: "VLSM lets you mix subnet sizes to match real workloads.",
            content: [
              "VLSM (Variable Length Subnet Masking) allows different subnet sizes inside the same address block.",
              "Start by listing your requirements from largest to smallest to avoid running out of space.",
              "Large departments might need a /24, while a server segment might only need a /28.",
              "Example: one /22 can be split into one /23 for users, two /25s for labs, and several /28s for devices.",
              "VLSM reduces wasted addresses and keeps growth options open.",
              "Document the plan so teams do not accidentally overlap ranges later.",
              "Tip: leave buffer space between critical subnets for future expansion.",
              "A good VLSM plan makes scaling easier and avoids costly renumbering."
            ],
            objectives: [
              "Explain what VLSM is",
              "Plan subnets of different sizes",
              "Describe why ordering matters"
            ],
            summary: "VLSM matches address space to real needs while keeping future growth flexible."
          },
          {
            title: "Subnetting by hand",
            learn: "You can calculate network ranges using block sizes and binary boundaries.",
            content: [
              "Subnetting by hand starts with the block size: 256 minus the mask in the interesting octet.",
              "Example: /26 has mask 255.255.255.192, so block size is 256 - 192 = 64.",
              "That means subnets start at .0, .64, .128, and .192.",
              "Each subnet has a network address, usable host range, and broadcast address.",
              "Knowing these ranges helps you avoid overlapping subnets and misconfigurations.",
              "You can always verify by counting: total addresses = block size, usable = total - 2.",
              "Example: 10.0.5.64/26 has usable hosts .65 to .126 with broadcast .127.",
              "With practice, manual subnetting becomes quick and reliable."
            ],
            objectives: [
              "Calculate block sizes",
              "Find network and broadcast addresses",
              "Avoid overlapping subnets"
            ],
            summary: "Block sizes make subnet ranges predictable and easy to plan.",
            quiz: {
              title: "Subnetting fundamentals quiz",
              xp: 90,
              questions: [
                {
                  id: "q1",
                  question: "Fill in the blank: A /24 has ___ total addresses.",
                  options: ["256", "128", "64"],
                  correctAnswer: 0,
                  explanation: "A /24 has 256 total addresses."
                },
                {
                  id: "q2",
                  question: "A /26 subnet has how many usable hosts?",
                  options: ["62", "126", "254"],
                  correctAnswer: 0,
                  explanation: "A /26 has 64 total, 62 usable."
                },
                {
                  id: "q3",
                  question: "Subnetting helps by:",
                  options: ["Increasing broadcast traffic", "Reducing broadcast domains", "Eliminating routers"],
                  correctAnswer: 1,
                  explanation: "Subnetting reduces broadcast domains."
                },
                {
                  id: "q4",
                  question: "CIDR /30 is commonly used for:",
                  options: ["Point-to-point links", "Large LANs", "Wireless only"],
                  correctAnswer: 0,
                  explanation: "A /30 is common for point-to-point links."
                },
                {
                  id: "q5",
                  question: "Fill in the blank: The shorter the prefix, the ___ the subnet.",
                  options: ["larger", "smaller", "safer"],
                  correctAnswer: 0,
                  explanation: "Shorter prefixes mean larger subnets."
                },
                {
                  id: "q6",
                  question: "Which mask matches /27?",
                  options: ["255.255.255.224", "255.255.255.0", "255.255.255.248"],
                  correctAnswer: 0,
                  explanation: "/27 corresponds to 255.255.255.224."
                },
                {
                  id: "q7",
                  question: "Network address of 192.168.10.64/26 is:",
                  options: ["192.168.10.64", "192.168.10.65", "192.168.10.1"],
                  correctAnswer: 0,
                  explanation: "The network address is the first address in the block."
                },
                {
                  id: "q8",
                  question: "Broadcast address of 192.168.10.64/26 is:",
                  options: ["192.168.10.127", "192.168.10.95", "192.168.10.63"],
                  correctAnswer: 0,
                  explanation: "The broadcast is the last address in the block."
                },
                {
                  id: "q9",
                  question: "VLSM allows you to:",
                  options: ["Use multiple subnet sizes in one address block", "Avoid subnetting entirely", "Eliminate routing"],
                  correctAnswer: 0,
                  explanation: "VLSM supports different subnet sizes in the same block."
                },
                {
                  id: "q10",
                  question: "When planning VLSM, you should allocate subnets in what order?",
                  options: ["Largest to smallest", "Smallest to largest", "Randomly"],
                  correctAnswer: 0,
                  explanation: "Starting with the largest prevents running out of space."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 2: VLANs & Trunks",
        about: "Segment Layer 2 networks and carry VLANs over trunk links.",
        sections: [
          {
            title: "VLANs",
            items: [
              {
                type: "Learn",
                title: "VLAN concepts",
                content: "VLANs create separate broadcast domains on the same switch.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "VLAN planning and naming",
                content: "Clear VLAN numbering and naming keeps large environments manageable.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "802.1Q trunking",
                content: "Trunks carry multiple VLANs between switches using tags.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Access vs trunk ports",
                content: "Access ports carry a single VLAN; trunk ports carry many, with a native VLAN untagged.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Quiz",
                title: "VLANs quiz",
                duration: "8 min",
                xp: 90
              },
              {
                type: "Practice",
                title: "Assign VLANs to ports",
                duration: "14 min",
                xp: 40,
                steps: [
                  "Add two switches and four PCs.",
                  "Connect two PCs to Switch A and two PCs to Switch B.",
                  "Link the two switches together with one uplink.",
                  "Rename two PCs with VLAN10 and two PCs with VLAN20 to model segmentation."
                ],
                tips: "VLANs are logical; use naming to keep groups clear while you design."
              },
              {
                type: "Challenge",
                title: "Build a VLAN campus",
                duration: "18 min",
                xp: 110,
                challenge: {
                  rules: {
                    minDevices: 6,
                    minConnections: 5,
                    requiredTypes: { switch: 2, pc: 4 }
                  },
                  steps: [
                    "Add 2 switches and at least 4 PCs.",
                    "Connect PCs to the switches and link the switches together.",
                    "Treat two PCs as VLAN 10 and two PCs as VLAN 20 in your notes."
                  ],
                  tips: "Imagine the trunk between switches carrying VLAN 10 and VLAN 20."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "VLAN concepts",
            learn: "VLANs separate traffic and improve security and performance.",
            content: [
              "VLANs create logical segments on the same physical switch.",
              "Devices in different VLANs cannot communicate without routing.",
              "VLANs reduce broadcast scope and improve security.",
              "Example: a school keeps student devices in one VLAN and staff devices in another.",
              "VLANs make it easier to apply policy and troubleshooting boundaries.",
              "You can think of VLANs like virtual switches: the same hardware, but separate logical networks.",
              "Common use cases include voice VLANs for IP phones and guest VLANs for visitors.",
              "Segmentation also helps performance when many devices share the same switch."
            ],
            objectives: [
              "Define a VLAN",
              "Explain why VLANs improve segmentation"
            ],
            summary: "VLANs separate traffic on shared switches and reduce broadcast noise."
          },
          {
            title: "VLAN planning and naming",
            learn: "Consistent VLAN design makes growth and troubleshooting much easier.",
            content: [
              "A good VLAN plan maps business functions to clear segments.",
              "Use consistent numbering, like 10 for staff, 20 for guests, 30 for voice, and 40 for printers.",
              "Names should match the function so the intent is obvious in logs and configs.",
              "Example: VLAN 20-GUEST in every site makes cross-site troubleshooting faster.",
              "Document which subnets belong to each VLAN and who owns them.",
              "Reserve VLAN ranges for future projects to avoid renumbering later.",
              "Keep management VLANs separate and tightly controlled for security.",
              "Good documentation is a visible benefit when networks scale."
            ],
            objectives: [
              "Create a simple VLAN naming scheme",
              "Explain why documentation matters",
              "Describe how VLAN plans scale"
            ],
            summary: "Clear VLAN names and numbers reduce confusion and speed up troubleshooting."
          },
          {
            title: "802.1Q trunking",
            learn: "Trunk links tag frames so multiple VLANs can share the same link.",
            content: [
              "802.1Q adds a VLAN tag to Ethernet frames.",
              "Trunks carry traffic for multiple VLANs between switches or to routers.",
              "Access ports carry a single VLAN and do not tag frames.",
              "The native VLAN on a trunk is sent untagged, so keep native VLANs consistent end to end.",
              "Allowed VLAN lists limit which VLANs are permitted across a trunk for safety and clarity.",
              "Example: a trunk between two switches might carry VLAN 10 and VLAN 20 for two departments.",
              "If VLANs or the native VLAN mismatch, users see intermittent or one-way connectivity.",
              "Trunk documentation prevents accidental VLAN leaks between areas."
            ],
            objectives: [
              "Describe what trunking does",
              "Identify access vs trunk ports"
            ],
            summary: "Trunks carry multiple VLANs by tagging frames with 802.1Q."
          },
          {
            title: "Access vs trunk ports",
            learn: "Access ports carry one VLAN; trunks carry many and use a native VLAN.",
            content: [
              "Access ports are for end devices and carry a single VLAN without tags.",
              "Trunk ports are used between switches or between a switch and a router.",
              "The native VLAN on a trunk is sent untagged by default.",
              "Misconfigured trunks are a common cause of VLAN connectivity problems.",
              "Always document which VLANs are allowed on a trunk to reduce surprises.",
              "Example: if a PC is plugged into a trunk port, it may receive tagged frames and fail DHCP.",
              "Best practice: place unused access ports in an unused VLAN and shut them down.",
              "Clear port roles keep segmentation working as designed."
            ],
            objectives: [
              "Describe access vs trunk ports",
              "Explain the native VLAN",
              "Identify common trunk misconfigurations"
            ],
            summary: "Trunks carry many VLANs; access ports carry one.",
            quiz: {
              title: "VLANs quiz",
              xp: 90,
              questions: [
                {
                  id: "q1",
                  question: "VLANs create separate ___ domains.",
                  options: ["Broadcast", "Collision", "Routing"],
                  correctAnswer: 0,
                  explanation: "VLANs separate broadcast domains."
                },
                {
                  id: "q2",
                  question: "802.1Q does what?",
                  options: ["Tags frames", "Encrypts traffic", "Assigns IPs"],
                  correctAnswer: 0,
                  explanation: "802.1Q adds VLAN tags to frames."
                },
                {
                  id: "q3",
                  question: "An access port carries:",
                  options: ["One VLAN", "Multiple VLANs", "All VLANs"],
                  correctAnswer: 0,
                  explanation: "Access ports carry a single VLAN."
                },
                {
                  id: "q4",
                  question: "The native VLAN on a trunk is:",
                  options: ["Untagged", "Tagged", "Dropped"],
                  correctAnswer: 0,
                  explanation: "Native VLAN traffic is untagged by default."
                },
                {
                  id: "q5",
                  question: "Fill in the blank: Devices in different VLANs require ___ to communicate.",
                  options: ["Routing", "Bridging", "Repeating"],
                  correctAnswer: 0,
                  explanation: "Routing is required between VLANs."
                },
                {
                  id: "q6",
                  question: "Which device typically performs inter-VLAN routing?",
                  options: ["Layer 3 device", "Hub", "Repeater"],
                  correctAnswer: 0,
                  explanation: "Routers or Layer 3 switches perform inter-VLAN routing."
                },
                {
                  id: "q7",
                  question: "Trunk links are commonly used between:",
                  options: ["Switches", "PCs", "Printers"],
                  correctAnswer: 0,
                  explanation: "Trunks connect switches or switch-to-router links."
                },
                {
                  id: "q8",
                  question: "A trunk link typically carries:",
                  options: ["Multiple VLANs", "One VLAN only", "Only management traffic"],
                  correctAnswer: 0,
                  explanation: "Trunks are designed to carry multiple VLANs."
                },
                {
                  id: "q9",
                  question: "Which concept limits which VLANs can traverse a trunk?",
                  options: ["Allowed VLAN list", "Default gateway", "ARP cache"],
                  correctAnswer: 0,
                  explanation: "Allowed VLAN lists control what traffic crosses a trunk."
                },
                {
                  id: "q10",
                  question: "A voice VLAN is typically used for:",
                  options: ["IP phones", "File servers", "Printers only"],
                  correctAnswer: 0,
                  explanation: "Voice VLANs separate and prioritize IP phone traffic."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 3: Inter-VLAN Routing",
        about: "Connect VLANs using router-on-a-stick or Layer 3 switches.",
        sections: [
          {
            title: "Routing between VLANs",
            items: [
              {
                type: "Learn",
                title: "Router-on-a-stick",
                content: "A single router interface can route multiple VLANs using subinterfaces.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "SVI on Layer 3 switches",
                content: "SVIs provide gateway interfaces for VLANs on a multilayer switch.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Inter-VLAN design patterns",
                content: "Choose between router-on-a-stick, multilayer switches, or routed access designs.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Troubleshooting inter-VLAN routing",
                content: "Verify gateways, VLAN tagging, and allowed VLANs on trunks.",
                duration: "12 min",
                xp: 55
              },
              {
                type: "Quiz",
                title: "Inter-VLAN routing quiz",
                duration: "8 min",
                xp: 90
              },
              {
                type: "Practice",
                title: "Configure inter-VLAN routing",
                duration: "14 min",
                xp: 45,
                steps: [
                  "Add a router, a switch, and three PCs.",
                  "Connect all PCs to the switch and connect the switch to the router.",
                  "Name one PC VLAN10 and two PCs VLAN20 to model two groups.",
                  "Assign gateway IPs on the router (one per VLAN) in your notes."
                ],
                tips: "Router-on-a-stick uses subinterfaces; each VLAN needs its own gateway IP."
              },
              {
                type: "Challenge",
                title: "Route between two VLANs",
                duration: "18 min",
                xp: 110,
                challenge: {
                  rules: {
                    minDevices: 5,
                    minConnections: 4,
                    requiredTypes: { router: 1, switch: 1, pc: 3 }
                  },
                  steps: [
                    "Add a switch, a router, and at least three PCs.",
                    "Connect PCs to the switch and the switch to the router.",
                    "Treat one PC as VLAN 10 and two PCs as VLAN 20 in your design."
                  ],
                  tips: "You are modeling the topology; VLAN configurations are conceptual."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Router-on-a-stick",
            learn: "Subinterfaces on one router port can route between VLANs.",
            content: [
              "Router-on-a-stick uses a single router interface with multiple subinterfaces.",
              "Each subinterface is assigned to a VLAN and acts as that VLAN's gateway.",
              "This is common in smaller networks without Layer 3 switches.",
              "The switch port connected to the router must be a trunk carrying all required VLANs.",
              "If tagging is wrong, traffic will not reach the correct subinterface.",
              "Example: Gi0/0.10 can be VLAN 10 with IP 192.168.10.1/24, and Gi0/0.20 can be VLAN 20.",
              "Because all VLANs share one physical link, that link can become a bottleneck.",
              "It is cost-effective but less scalable for high-traffic environments."
            ],
            objectives: [
              "Explain router-on-a-stick",
              "Identify when it's used"
            ],
            summary: "Router-on-a-stick is a simple way to route between VLANs with one router link."
          },
          {
            title: "SVI on Layer 3 switches",
            learn: "Layer 3 switches route between VLANs using SVI interfaces.",
            content: [
              "An SVI (Switch Virtual Interface) provides a Layer 3 interface for a VLAN.",
              "SVIs allow a multilayer switch to route internally without a router.",
              "This improves performance in larger campus networks.",
              "Each VLAN has a unique SVI IP that serves as its default gateway.",
              "Inter-VLAN routing happens inside the switch, which is fast and scalable.",
              "Example: VLAN 10 can use 10.10.10.1 and VLAN 20 can use 10.10.20.1 as gateways.",
              "Remember to enable IP routing on the switch, or SVIs will not route traffic.",
              "SVIs are the common choice for modern enterprise access layers."
            ],
            objectives: [
              "Define an SVI",
              "Compare SVIs to router-on-a-stick"
            ],
            summary: "SVIs give each VLAN a gateway interface on a Layer 3 switch."
          },
          {
            title: "Inter-VLAN design patterns",
            learn: "Design choices depend on size, cost, and performance needs.",
            content: [
              "Small sites often use router-on-a-stick to save cost.",
              "Medium and large sites typically use Layer 3 switches for higher throughput.",
              "Routed access designs remove Layer 2 trunks and route at the edge to reduce loops.",
              "Example: a campus core might use Layer 3 switches while branch offices use router-on-a-stick.",
              "Consider where you want policy enforcement: at the router, core, or distribution layer.",
              "Plan gateway placement so troubleshooting remains simple for support teams.",
              "Document VLAN-to-subnet mappings so traffic flows are predictable.",
              "The right pattern balances simplicity, performance, and security."
            ],
            objectives: [
              "Compare inter-VLAN design options",
              "Explain trade-offs between patterns",
              "Describe where gateways should live"
            ],
            summary: "Inter-VLAN routing can be designed in multiple ways depending on scale and budget."
          },
          {
            title: "Troubleshooting inter-VLAN routing",
            learn: "Most inter-VLAN issues come from gateway or trunk problems.",
            content: [
              "Verify that each VLAN has a correct gateway IP address.",
              "Check that the switch-to-router (or switch-to-switch) link is a trunk.",
              "Confirm the correct VLANs are allowed on the trunk.",
              "Ensure hosts are in the right VLAN and use the correct gateway.",
              "A quick test: can hosts reach their own gateway IP?",
              "If local gateway fails, focus on VLAN membership and IP configuration.",
              "Check ARP and MAC tables to confirm the gateway and host are learned on the expected ports.",
              "Use logs and interface counters to spot drops or mismatched VLAN tags."
            ],
            objectives: [
              "Identify common inter-VLAN failures",
              "Describe a basic troubleshooting sequence"
            ],
            summary: "Start troubleshooting with gateway IPs and trunk configuration.",
            quiz: {
              title: "Inter-VLAN routing quiz",
              xp: 90,
              questions: [
                {
                  id: "q1",
                  question: "Router-on-a-stick uses ___ to route multiple VLANs.",
                  options: ["Subinterfaces", "Access ports", "DNS"],
                  correctAnswer: 0,
                  explanation: "Subinterfaces map VLANs to a single router interface."
                },
                {
                  id: "q2",
                  question: "SVI stands for:",
                  options: ["Switch Virtual Interface", "Secure VLAN Interface", "Static Virtual Interface"],
                  correctAnswer: 0,
                  explanation: "SVI is Switch Virtual Interface."
                },
                {
                  id: "q3",
                  question: "Fill in the blank: Each VLAN should have a ___ IP used as a default gateway.",
                  options: ["unique", "shared", "random"],
                  correctAnswer: 0,
                  explanation: "Each VLAN needs its own gateway IP."
                },
                {
                  id: "q4",
                  question: "If hosts in VLAN 10 cannot reach VLAN 20, check ___ first.",
                  options: ["Gateway IPs and trunking", "DNS", "Cable length"],
                  correctAnswer: 0,
                  explanation: "Gateway and trunk configuration are common issues."
                },
                {
                  id: "q5",
                  question: "A multilayer switch routes at Layer:",
                  options: ["3", "1", "2"],
                  correctAnswer: 0,
                  explanation: "Layer 3 switches route between VLANs."
                },
                {
                  id: "q6",
                  question: "Inter-VLAN routing is required because VLANs are separate ___ domains.",
                  options: ["broadcast", "collision", "physical"],
                  correctAnswer: 0,
                  explanation: "VLANs are separate broadcast domains."
                },
                {
                  id: "q7",
                  question: "Router-on-a-stick is common in:",
                  options: ["Small networks", "Very large networks", "Wireless-only networks"],
                  correctAnswer: 0,
                  explanation: "It is common in smaller environments."
                },
                {
                  id: "q8",
                  question: "Router-on-a-stick requires the switch port to be a:",
                  options: ["Trunk", "Access", "Monitor"],
                  correctAnswer: 0,
                  explanation: "The router must receive tagged VLAN traffic on a trunk."
                },
                {
                  id: "q9",
                  question: "Layer 3 switches route between VLANs using:",
                  options: ["SVIs", "Hubs", "Repeaters"],
                  correctAnswer: 0,
                  explanation: "SVIs are the gateway interfaces for VLANs on L3 switches."
                },
                {
                  id: "q10",
                  question: "Best first test when VLANs can’t talk:",
                  options: ["Ping the default gateway", "Change DNS", "Replace the ISP link"],
                  correctAnswer: 0,
                  explanation: "If the gateway fails, routing between VLANs won’t work."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  "5": {
    id: "5",
    title: "Routing Fundamentals",
    description: "Learn how routers move traffic between networks and how routing protocols work.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "1.6 hrs",
    xpReward: 420,
    category: "Routing",
    units: [
      {
        title: "Unit 1: Routing Essentials",
        about: "Compare static and dynamic routing and explore OSPF basics.",
        sections: [
          {
            title: "Routing",
            items: [
              {
                type: "Learn",
                title: "Static vs dynamic routing",
                content: "Static routes are manual; dynamic routes adapt to changes using protocols.",
                duration: "9 min",
                xp: 40
              },
              {
                type: "Learn",
                title: "OSPF overview",
                content: "OSPF is a link-state protocol that calculates shortest paths.",
                duration: "10 min",
                xp: 40
              },
              {
                type: "Quiz",
                title: "Routing quick check",
                duration: "6 min",
                xp: 60
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Static vs dynamic routing",
            learn: "Static routes are simple but manual; dynamic routing scales better.",
            blocks: [
              {
                type: "text",
                text: [
                  "A static route is a manually configured path: you tell the router exactly where to send traffic for a given network.",
                  "Static routes are predictable and do not use CPU or bandwidth for updates.",
                  "However, if a link fails, a static route will not adjust unless you change it manually.",
                  "Dynamic routing protocols (like OSPF, EIGRP, or BGP) discover neighbours and exchange route information automatically.",
                  "When a link fails, dynamic protocols recalculate and find a new path without human intervention.",
                  "Static routes work best for small networks or default routes; dynamic routing is essential for larger environments."
                ]
              },
              {
                type: "explain",
                title: "Explain: When to use static routes",
                content: [
                  "Static routes are ideal for stub networks with only one exit path.",
                  "A default static route (0.0.0.0/0) sends all unknown traffic to a gateway of last resort.",
                  "Use dynamic routing when the network has multiple paths and redundancy."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is the main disadvantage of static routes?",
                options: ["They use too much bandwidth", "They do not adapt to link failures", "They require special hardware"],
                correctIndex: 1,
                explanation: "Static routes must be manually updated if the network changes."
              },
              {
                type: "activity",
                title: "Match routing types",
                mode: "drag",
                prompt: "Match each trait to the correct routing type.",
                targets: [
                  { id: "static", label: "Static" },
                  { id: "dynamic", label: "Dynamic" }
                ],
                items: [
                  { id: "manual", label: "Configured manually", targetId: "static" },
                  { id: "auto", label: "Discovers routes automatically", targetId: "dynamic" },
                  { id: "failover", label: "Adjusts to link failures", targetId: "dynamic" },
                  { id: "stub", label: "Best for single-exit networks", targetId: "static" }
                ]
              }
            ],
            content: [
              "A static route is a manually configured path telling the router where to send traffic.",
              "Static routes are predictable but do not adapt to link failures.",
              "Dynamic protocols discover neighbours and exchange route information automatically.",
              "When a link fails, dynamic protocols recalculate and find a new path.",
              "Static routes work best for small networks or default routes.",
              "Dynamic routing is essential for larger environments with multiple paths."
            ],
            objectives: [
              "Compare static and dynamic routing",
              "Explain when to use static routes",
              "Describe the advantage of dynamic protocols"
            ],
            summary: "Static routes are manual and simple while dynamic routing adapts automatically to changes."
          },
          {
            title: "OSPF overview",
            learn: "OSPF builds a link-state database and computes shortest paths.",
            blocks: [
              {
                type: "text",
                text: [
                  "OSPF (Open Shortest Path First) is a link-state routing protocol used inside organisations.",
                  "Every OSPF router builds a complete map of the network (the link-state database).",
                  "Dijkstra's SPF algorithm calculates the shortest path to every destination.",
                  "OSPF routers form neighbour relationships by exchanging Hello packets.",
                  "Changes are advertised immediately as LSAs (Link-State Advertisements).",
                  "OSPF converges quickly and uses cost (based on bandwidth) as its metric."
                ]
              },
              {
                type: "explain",
                title: "Explain: OSPF areas",
                content: [
                  "Large OSPF networks are divided into areas to reduce the size of the link-state database.",
                  "Area 0 is the backbone; all other areas must connect to it.",
                  "This hierarchy keeps convergence fast even in very large networks."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What algorithm does OSPF use to calculate shortest paths?",
                options: ["Bellman-Ford", "Dijkstra SPF", "Round-robin"],
                correctIndex: 1,
                explanation: "OSPF uses Dijkstra's Shortest Path First algorithm."
              }
            ],
            content: [
              "OSPF is a link-state routing protocol used inside organisations.",
              "Every router builds a complete map of the network topology.",
              "Dijkstra's algorithm calculates the shortest path to every destination.",
              "OSPF routers form neighbour relationships by exchanging Hello packets.",
              "Changes are advertised immediately as Link-State Advertisements.",
              "OSPF uses cost based on bandwidth as its metric."
            ],
            objectives: [
              "Describe how OSPF works",
              "Explain the role of the link-state database",
              "Identify the OSPF metric"
            ],
            summary: "OSPF builds a link-state database and uses Dijkstra to find shortest paths.",
            quiz: {
              title: "Routing quick check",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "OSPF is a:",
                  options: ["Distance-vector", "Link-state", "Hybrid"],
                  correctAnswer: 1,
                  explanation: "OSPF is a link-state routing protocol."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  "6": {
    id: "6",
    title: "Wireless & Network Services",
    description: "Understand Wi‑Fi standards and essential services like DHCP and DNS.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "1.8 hrs",
    xpReward: 450,
    category: "Services",
    units: [
      {
        title: "Unit 1: Wireless and Services",
        about: "Explore Wi‑Fi basics and core network services.",
        sections: [
          {
            title: "Wireless + Services",
            items: [
              {
                type: "Learn",
                title: "Wi‑Fi standards",
                content: "802.11 standards define speeds and frequency bands for wireless networks.",
                duration: "9 min",
                xp: 40
              },
              {
                type: "Learn",
                title: "DHCP & DNS basics",
                content: "DHCP assigns IPs automatically; DNS translates names to IP addresses.",
                duration: "10 min",
                xp: 40
              },
              {
                type: "Quiz",
                title: "Services quick check",
                duration: "6 min",
                xp: 60
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Wi‑Fi standards",
            learn: "Wireless standards define performance and compatibility for Wi‑Fi networks.",
            blocks: [
              {
                type: "text",
                text: [
                  "Wi‑Fi is defined by the IEEE 802.11 family of standards.",
                  "802.11n (Wi‑Fi 4) introduced MIMO and operates on 2.4 GHz and 5 GHz bands.",
                  "802.11ac (Wi‑Fi 5) added wider channels and beamforming for faster 5 GHz speeds.",
                  "802.11ax (Wi‑Fi 6) improved efficiency in crowded areas using OFDMA and BSS colouring.",
                  "The 2.4 GHz band has longer range but more interference; 5 GHz is faster but shorter range.",
                  "Choosing the right standard and band depends on coverage needs and device density."
                ]
              },
              {
                type: "explain",
                title: "Explain: 2.4 GHz vs 5 GHz",
                content: [
                  "2.4 GHz has three non-overlapping channels and better wall penetration.",
                  "5 GHz has many more channels and less interference but shorter range.",
                  "Modern access points support both bands simultaneously (dual-band)."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which Wi‑Fi standard introduced OFDMA for better efficiency?",
                options: ["Wi‑Fi 4 (802.11n)", "Wi‑Fi 5 (802.11ac)", "Wi‑Fi 6 (802.11ax)"],
                correctIndex: 2,
                explanation: "Wi‑Fi 6 (802.11ax) introduced OFDMA for more efficient airtime usage."
              },
              {
                type: "activity",
                title: "Match the standards",
                mode: "drag",
                prompt: "Match each feature to the correct Wi‑Fi generation.",
                targets: [
                  { id: "wifi4", label: "Wi‑Fi 4" },
                  { id: "wifi5", label: "Wi‑Fi 5" },
                  { id: "wifi6", label: "Wi‑Fi 6" }
                ],
                items: [
                  { id: "mimo", label: "Introduced MIMO", targetId: "wifi4" },
                  { id: "beam", label: "Beamforming on 5 GHz", targetId: "wifi5" },
                  { id: "ofdma", label: "OFDMA for dense environments", targetId: "wifi6" }
                ]
              }
            ],
            content: [
              "Wi‑Fi is defined by the IEEE 802.11 family of standards.",
              "Wi‑Fi 4 introduced MIMO on 2.4 GHz and 5 GHz bands.",
              "Wi‑Fi 5 added wider channels and beamforming on 5 GHz.",
              "Wi‑Fi 6 improved efficiency with OFDMA and BSS colouring.",
              "2.4 GHz has longer range but more interference.",
              "5 GHz is faster but shorter range."
            ],
            objectives: [
              "Compare major Wi‑Fi standards",
              "Explain the difference between 2.4 GHz and 5 GHz",
              "Describe key features of Wi‑Fi 6"
            ],
            summary: "Wi‑Fi standards define speed and efficiency for wireless networks across different bands."
          },
          {
            title: "DHCP & DNS basics",
            learn: "DHCP automates IP assignment; DNS resolves domain names.",
            blocks: [
              {
                type: "text",
                text: [
                  "DHCP (Dynamic Host Configuration Protocol) assigns IP addresses, subnet masks, gateways, and DNS servers automatically.",
                  "Without DHCP, every device would need a manually configured IP — impractical at scale.",
                  "The DHCP process follows four steps: Discover, Offer, Request, Acknowledge (DORA).",
                  "DNS (Domain Name System) translates human-friendly names like google.com into IP addresses.",
                  "DNS uses a hierarchy: root servers, TLD servers, and authoritative servers for each domain.",
                  "If DNS fails, users cannot reach websites by name even though the network is functioning."
                ]
              },
              {
                type: "explain",
                title: "Explain: The DORA process",
                content: [
                  "1. Discover — the client broadcasts a request for an IP address.",
                  "2. Offer — the DHCP server offers an available IP.",
                  "3. Request — the client accepts the offer.",
                  "4. Acknowledge — the server confirms the lease."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What does the D in DORA stand for?",
                options: ["Deliver", "Discover", "Deny"],
                correctIndex: 1,
                explanation: "The first step of DHCP is Discover — the client broadcasts looking for a server."
              },
              {
                type: "activity",
                title: "Match the services",
                mode: "drag",
                prompt: "Match each function to the correct service.",
                targets: [
                  { id: "dhcp", label: "DHCP" },
                  { id: "dns", label: "DNS" }
                ],
                items: [
                  { id: "ip", label: "Assigns IP addresses automatically", targetId: "dhcp" },
                  { id: "name", label: "Translates names to IP addresses", targetId: "dns" },
                  { id: "dora", label: "Uses Discover, Offer, Request, Acknowledge", targetId: "dhcp" },
                  { id: "hierarchy", label: "Uses root, TLD, and authoritative servers", targetId: "dns" }
                ]
              }
            ],
            content: [
              "DHCP assigns IP addresses, subnet masks, gateways, and DNS servers automatically.",
              "The DHCP process uses four steps: Discover, Offer, Request, Acknowledge.",
              "DNS translates human-friendly names into IP addresses.",
              "DNS uses a hierarchy of root, TLD, and authoritative servers.",
              "Without DHCP, every device would need manual IP configuration.",
              "If DNS fails, users cannot reach websites by name."
            ],
            objectives: [
              "Describe how DHCP works",
              "Explain the DORA process",
              "Describe the DNS hierarchy"
            ],
            summary: "DHCP automates IP assignment and DNS resolves domain names to IP addresses.",
            quiz: {
              title: "Services quick check",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "DNS is used to:",
                  options: ["Encrypt traffic", "Resolve domain names", "Assign MACs"],
                  correctAnswer: 1,
                  explanation: "DNS maps names to IP addresses."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // AI Prompt: Explain the ADVANCED COURSES (Level 5+) section in clear, simple terms.
  // ============================
  // ADVANCED COURSES (Level 5+)
  // ============================
  "7": {
    id: "7",
    title: "Network Security & Hardening",
    description: "Secure networks with hardening, firewalls, ACLs, and monitoring best practices.",
    difficulty: "advanced",
    required_level: 5,
    estimatedTime: "6.5 hrs",
    xpReward: 1050,
    category: "Security",
    units: [
      {
        title: "Unit 1: Threats & Hardening",
        about: "Identify common threats and apply hardening techniques.",
        sections: [
          {
            title: "Security basics",
            items: [
              {
                type: "Learn",
                title: "Attack surface",
                content: "Every open port, service, and configuration adds to your attack surface.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Threat modeling and risk",
                content: "Prioritize controls by likelihood, impact, and asset value.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Hardening checklist",
                content: "Disable unused services, use strong auth, patch often, and log everything.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Authentication and AAA",
                content: "Centralize authentication and apply least privilege with AAA (Authentication, Authorization, Accounting).",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Quiz",
                title: "Hardening fundamentals quiz",
                duration: "8 min",
                xp: 100
              },
              {
                type: "Practice",
                title: "Spot hardening gaps",
                duration: "12 min",
                xp: 40,
                steps: [
                  "Add a router, firewall, switch, two PCs, and a server.",
                  "Connect PCs and server to the switch, then switch to firewall, firewall to router.",
                  "List three services you would disable on the server if unused.",
                  "Identify one logging source you would always keep enabled."
                ],
                tips: "Least privilege and minimal services reduce exposure and simplify monitoring."
              },
              {
                type: "Challenge",
                title: "Harden a branch network",
                duration: "18 min",
                xp: 120,
                challenge: {
                  rules: {
                    minDevices: 6,
                    minConnections: 5,
                    requiredTypes: { router: 1, switch: 1, pc: 4 }
                  },
                  steps: [
                    "Build a small branch network with a router, switch, and four PCs.",
                    "Designate one PC as admin and the rest as users in your notes.",
                    "Describe which services should be disabled and which logs should be enabled."
                  ],
                  tips: "Focus on least privilege and reducing exposed services."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Attack surface",
            learn: "Reducing the attack surface limits exposure and risk.",
            content: [
              "Every open service, port, and misconfiguration is part of the attack surface.",
              "Reducing exposure lowers the chance of compromise and limits blast radius.",
              "Focus on least privilege, minimal services, and strong identity controls.",
              "Example: disabling unused remote access services closes entire categories of attacks.",
              "Documenting network assets helps you find and reduce unnecessary exposure.",
              "Examples of high-risk exposure include default SNMP communities and legacy management interfaces.",
              "Regular scans and configuration reviews keep the attack surface from creeping back over time.",
              "A smaller attack surface improves both security and operational clarity."
            ],
            objectives: [
              "Define attack surface",
              "List common exposure points",
              "Explain why reduction matters"
            ],
            summary: "Smaller attack surfaces reduce risk and make defenses easier."
          },
          {
            title: "Threat modeling and risk",
            learn: "Threat modeling helps prioritize defenses based on what matters most.",
            content: [
              "Threat modeling starts with your most valuable assets and how they could be harmed.",
              "Consider likelihood and impact to focus on the highest-risk scenarios first.",
              "Example: protecting payment systems has higher priority than public marketing sites.",
              "Map data flows so you know where sensitive information travels and where to add controls.",
              "Use simple categories like spoofing, tampering, and data loss to guide discussions.",
              "Translate risks into concrete actions such as MFA, network segmentation, or logging.",
              "Revisit the model after major changes, new vendors, or new regulatory requirements.",
              "This approach keeps security aligned with business goals and limited budgets."
            ],
            objectives: [
              "Explain why threat modeling matters",
              "Prioritize risks by likelihood and impact",
              "Identify where to place controls"
            ],
            summary: "Threat modeling turns abstract risk into practical, prioritized defenses."
          },
          {
            title: "Hardening checklist",
            learn: "Harden devices by removing defaults, patching, and restricting access.",
            content: [
              "Disable unused services, close unused ports, and remove default credentials.",
              "Patch operating systems and network devices regularly.",
              "Enforce strong authentication and log important events.",
              "Use configuration backups and version control to recover quickly after incidents.",
              "Apply secure management: restrict admin access to known subnets or jump hosts.",
              "Example: replace Telnet with SSH and prefer key-based authentication where possible.",
              "Harden the management plane with a separate management VLAN and strict access rules.",
              "Routine hardening reduces both risk and emergency change work later."
            ],
            objectives: [
              "Describe key hardening actions",
              "Explain why patching is critical"
            ],
            summary: "Hardening removes defaults, reduces exposure, and keeps systems up to date."
          },
          {
            title: "Authentication and AAA",
            learn: "AAA centralizes identity and enforces least privilege across devices.",
            content: [
              "Authentication verifies identity; authorization defines what a user can do; accounting logs actions.",
              "Centralized AAA (like RADIUS or TACACS+) simplifies management and auditing.",
              "Least privilege ensures users only get the access they need to do their job.",
              "Multi-factor authentication adds a second layer of protection for administrative access.",
              "Audit logs are essential for investigations and compliance.",
              "Role-based access helps: admins can change configs while helpdesk can only view status.",
              "Central AAA makes offboarding fast and enforces consistent password policies.",
              "Strong identity controls reduce the chance of lateral movement after a breach."
            ],
            objectives: [
              "Define AAA",
              "Explain least privilege",
              "Describe why MFA improves security"
            ],
            summary: "AAA centralizes access control and makes auditing possible.",
            quiz: {
              title: "Hardening fundamentals quiz",
              xp: 100,
              questions: [
                {
                  id: "q1",
                  question: "Which action reduces attack surface?",
                  options: ["Enable unused services", "Disable unused services", "Use default passwords"],
                  correctAnswer: 1,
                  explanation: "Disable unused services to reduce exposure."
                },
                {
                  id: "q2",
                  question: "Which is a strong hardening practice?",
                  options: ["Use default admin accounts", "Patch regularly", "Open all ports"],
                  correctAnswer: 1,
                  explanation: "Patching removes known vulnerabilities."
                },
                {
                  id: "q3",
                  question: "Least privilege means:",
                  options: ["Everyone has admin access", "Access is only what's needed", "No authentication required"],
                  correctAnswer: 1,
                  explanation: "Least privilege limits access to only what is required."
                },
                {
                  id: "q4",
                  question: "AAA stands for:",
                  options: ["Access, Address, Audit", "Authentication, Authorization, Accounting", "Application, API, Admin"],
                  correctAnswer: 1,
                  explanation: "AAA is Authentication, Authorization, Accounting."
                },
                {
                  id: "q5",
                  question: "Fill in the blank: MFA adds a second ___ to authentication.",
                  options: ["factor", "router", "subnet"],
                  correctAnswer: 0,
                  explanation: "MFA adds a second factor."
                },
                {
                  id: "q6",
                  question: "Why are audit logs important?",
                  options: ["They block all attacks", "They show who did what", "They replace backups"],
                  correctAnswer: 1,
                  explanation: "Audit logs provide accountability and investigation data."
                },
                {
                  id: "q7",
                  question: "Centralized AAA helps because it:",
                  options: ["Requires more passwords", "Simplifies access management", "Stops routing"],
                  correctAnswer: 1,
                  explanation: "Centralized AAA simplifies control and auditing."
                },
                {
                  id: "q8",
                  question: "Which control limits lateral movement?",
                  options: ["Network segmentation", "Disable backups", "Open admin ports"],
                  correctAnswer: 0,
                  explanation: "Segmentation limits how far an attacker can move."
                },
                {
                  id: "q9",
                  question: "Hardening the management plane often includes:",
                  options: ["Management VLAN and restricted access", "Guest Wi-Fi on the same VLAN", "Public admin interfaces"],
                  correctAnswer: 0,
                  explanation: "Separate management access reduces risk."
                },
                {
                  id: "q10",
                  question: "Least privilege helps because it:",
                  options: ["Reduces blast radius", "Increases attack surface", "Eliminates logging"],
                  correctAnswer: 0,
                  explanation: "Smaller permissions reduce the impact of compromise."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 2: Firewalls & ACLs",
        about: "Control traffic with ACLs and firewall policy.",
        sections: [
          {
            title: "Traffic control",
            items: [
              {
                type: "Learn",
                title: "Stateless vs stateful",
                content: "Stateful firewalls track connections; stateless filters evaluate each packet.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "ACL design",
                content: "Use least privilege and document every rule.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Firewall policy lifecycle",
                content: "Policies need review, change control, and clean-up over time.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Rule ordering and implicit deny",
                content: "ACLs are evaluated top-down and often end with an implicit deny.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Quiz",
                title: "Firewall and ACL quiz",
                duration: "8 min",
                xp: 100
              },
              {
                type: "Challenge",
                title: "Build an ACL policy",
                duration: "18 min",
                xp: 120,
                challenge: {
                  rules: {
                    minDevices: 4,
                    minConnections: 3,
                    requiredTypes: { router: 1, switch: 1, pc: 2 }
                  },
                  steps: [
                    "Add a router, a switch, and two PCs.",
                    "Connect PCs to the switch, then connect the switch to the router.",
                    "Imagine the router enforcing ACL rules between the PCs."
                  ],
                  tips: "You're validating topology and segmentation awareness."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Stateless vs stateful",
            learn: "Stateful firewalls allow return traffic automatically and reduce rule complexity.",
            content: [
              "Stateless firewalls filter each packet in isolation.",
              "Stateful firewalls track connection state and allow return traffic automatically.",
              "Stateful rules are typically simpler and safer for most networks.",
              "Stateful inspection reduces the need for separate inbound allow rules for established sessions.",
              "Stateless filtering can be faster but requires more careful rule design.",
              "Example: web browsing needs return traffic; stateless ACLs require explicit inbound allows.",
              "State tables consume memory, so tune timeouts for long-lived connections.",
              "Choose stateful inspection when usability and safety are priorities."
            ],
            objectives: [
              "Compare stateless vs stateful behavior",
              "Explain why statefulness reduces rule count"
            ],
            summary: "Stateful inspection simplifies rules and improves safety."
          },
          {
            title: "ACL design",
            learn: "Order matters. Place specific rules before general ones.",
            content: [
              "ACLs are evaluated top-down: the first match wins.",
              "Put specific allow or deny rules before general rules.",
              "Always include a default deny at the end when appropriate.",
              "Document each rule so future changes do not break intent.",
              "Use least privilege: allow only what is required, deny everything else.",
              "Group rules by zones (user VLAN to server VLAN) so intent is obvious.",
              "Object groups and naming conventions make large ACLs easier to maintain.",
              "Well-structured ACLs are easier to audit and safer to change."
            ],
            objectives: [
              "Explain ACL order of operations",
              "Apply least privilege to rule design"
            ],
            summary: "Specific rules first, least privilege, and clear documentation."
          },
          {
            title: "Firewall policy lifecycle",
            learn: "Policies need regular review so they stay secure and relevant.",
            content: [
              "Firewall rules often outlive their original purpose unless they are reviewed.",
              "A good policy lifecycle includes request, review, approval, and implementation.",
              "Add owners and expiration dates so temporary rules do not become permanent.",
              "Example: open a port for a migration with a planned removal date.",
              "Log usage and review counters to identify rules that never match.",
              "Clean up unused rules to reduce risk and improve performance.",
              "Change control reduces accidental outages and keeps security aligned with business needs.",
              "A healthy policy set is small, documented, and easy to explain."
            ],
            objectives: [
              "Describe a firewall policy lifecycle",
              "Explain why rule cleanup matters",
              "Identify ways to control change risk"
            ],
            summary: "Active policy management keeps rule sets safe, small, and understandable."
          },
          {
            title: "Rule ordering and implicit deny",
            learn: "The order of rules is just as important as the rules themselves.",
            content: [
              "ACLs are evaluated top-down, so the first match wins.",
              "An early broad rule can override later detailed rules.",
              "Many platforms apply an implicit deny at the end of the list.",
              "Always test rules in a safe environment before deploying to production.",
              "Logging helps you validate which rules are being matched.",
              "Watch for shadowed rules that never match because an earlier rule already applies.",
              "Use counters or logs to clean up unused rules over time.",
              "Careful ordering prevents accidental outages and security gaps."
            ],
            objectives: [
              "Explain rule ordering",
              "Identify common ACL mistakes"
            ],
            summary: "Ordering is critical: the first match wins.",
            quiz: {
              title: "Firewall and ACL quiz",
              xp: 100,
              questions: [
                {
                  id: "q1",
                  question: "Which is a best practice for ACLs?",
                  options: ["Permit all by default", "Least privilege", "Random ordering"],
                  correctAnswer: 1,
                  explanation: "Least privilege reduces risk."
                },
                {
                  id: "q2",
                  question: "ACLs are evaluated:",
                  options: ["Bottom-up", "Top-down", "Randomly"],
                  correctAnswer: 1,
                  explanation: "ACLs are processed from top to bottom."
                },
                {
                  id: "q3",
                  question: "Fill in the blank: Most ACLs end with an implicit ___.",
                  options: ["allow", "deny", "route"],
                  correctAnswer: 1,
                  explanation: "Implicit deny blocks traffic not explicitly allowed."
                },
                {
                  id: "q4",
                  question: "Stateful firewalls are different because they:",
                  options: ["Track connections", "Ignore ports", "Disable routing"],
                  correctAnswer: 0,
                  explanation: "Stateful firewalls track connection state."
                },
                {
                  id: "q5",
                  question: "A common mistake is to place a ___ rule before a specific rule.",
                  options: ["deny all", "specific allow", "log only"],
                  correctAnswer: 0,
                  explanation: "A deny all early will block everything else."
                },
                {
                  id: "q6",
                  question: "Which aligns with least privilege?",
                  options: ["Allow everything then block later", "Allow only required traffic", "Disable logging"],
                  correctAnswer: 1,
                  explanation: "Least privilege allows only what is needed."
                },
                {
                  id: "q7",
                  question: "Stateful firewalls allow return traffic because they keep a:",
                  options: ["State table", "MAC table", "Routing table only"],
                  correctAnswer: 0,
                  explanation: "State tables track active connections."
                },
                {
                  id: "q8",
                  question: "Best rule order for ACLs is:",
                  options: ["Specific rules first, then general rules", "General rules first", "Random ordering"],
                  correctAnswer: 0,
                  explanation: "Specific rules should appear before broad rules."
                },
                {
                  id: "q9",
                  question: "Why review firewall rules periodically?",
                  options: ["Remove unused rules and reduce risk", "Make them longer", "Disable logging"],
                  correctAnswer: 0,
                  explanation: "Unused rules increase risk and complexity."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 3: Monitoring & Incident Response",
        about: "Detect issues early and respond effectively.",
        sections: [
          {
            title: "Operations",
            items: [
              {
                type: "Learn",
                title: "Logging and SIEM basics",
                content: "Centralized logging helps detect anomalies and build timelines.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Incident response workflow",
                content: "Prepare, detect, contain, eradicate, and recover.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Playbooks and tabletop exercises",
                content: "Practice response steps before incidents happen.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Learn",
                title: "Detection baselines and alerting",
                content: "Baselines help you spot anomalies and tune alerts.",
                duration: "12 min",
                xp: 60
              },
              {
                type: "Quiz",
                title: "Monitoring and IR quiz",
                duration: "8 min",
                xp: 100
              },
              {
                type: "Practice",
                title: "Analyze a log snippet",
                duration: "12 min",
                xp: 40,
                steps: [
                  "Add a firewall and a server to the canvas.",
                  "Connect the server to the firewall, then connect the firewall to the Internet cloud.",
                  "In your notes, list two signals that would make a log entry suspicious.",
                  "Explain how a SIEM would correlate repeated failures from one IP."
                ],
                tips: "Look for repeated failures, impossible travel, or unusual ports for quick wins."
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Logging and SIEM basics",
            learn: "Good logs enable faster incident response and better forensic analysis.",
            content: [
              "Centralized logging aggregates events from firewalls, routers, and servers.",
              "SIEM tools correlate events to detect suspicious behavior faster.",
              "Good logs improve forensic analysis after an incident.",
              "Make sure logs include timestamps, usernames, source IPs, and action results.",
              "Noise reduction is important: collect what you need and keep it consistent.",
              "Example: repeated failed logins plus a sudden admin login from a new IP is higher risk when correlated.",
              "Time sync (NTP) and log retention policies are critical for usable timelines.",
              "Well-structured logs reduce investigation time and false positives."
            ],
            objectives: [
              "Define SIEM at a high level",
              "Explain why log centralization matters"
            ],
            summary: "Centralized logs power detection, response, and investigations."
          },
          {
            title: "Incident response workflow",
            learn: "Follow a consistent IR process to reduce downtime and impact.",
            content: [
              "IR phases: Prepare, Detect, Contain, Eradicate, and Recover.",
              "Preparation and detection reduce mean time to respond.",
              "Document everything to improve future defenses.",
              "Containment limits damage; eradication removes root cause.",
              "Recovery restores services safely and validates that the threat is gone.",
              "Define roles, contacts, and communication channels before incidents happen.",
              "A post-incident review turns lessons learned into better controls.",
              "Clear escalation paths prevent confusion during high-stress events."
            ],
            objectives: [
              "List the IR phases",
              "Explain why documentation matters"
            ],
            summary: "A consistent IR process reduces downtime and long-term risk."
          },
          {
            title: "Playbooks and tabletop exercises",
            learn: "Practicing response steps builds speed and confidence.",
            content: [
              "Playbooks are step-by-step guides for common incidents like phishing or ransomware.",
              "They define who does what, which systems to isolate, and how to communicate.",
              "Tabletop exercises simulate incidents without breaking production systems.",
              "Example: run a tabletop where a VPN account is compromised and test your containment plan.",
              "Practicing reveals gaps in tooling, access, and decision-making.",
              "Update playbooks after each exercise so they stay accurate.",
              "Well-practiced teams respond faster and reduce business impact.",
              "Playbooks also help onboard new team members quickly."
            ],
            objectives: [
              "Explain what a playbook is",
              "Describe the value of tabletop exercises",
              "Identify gaps through practice"
            ],
            summary: "Practice makes response faster, clearer, and more reliable."
          },
          {
            title: "Detection baselines and alerting",
            learn: "Baselines help you spot anomalies and tune alerts.",
            content: [
              "A baseline is the normal behavior of your network and systems.",
              "Without a baseline, alerts will be noisy and hard to trust.",
              "Start with simple metrics: login failures, unusual traffic, and service health.",
              "Tune alerts so they are actionable and not overwhelming.",
              "Good alerting reduces fatigue and improves response time.",
              "Example: a baseline for DNS queries per host helps spot malware or misbehaving clients.",
              "Baselines shift after major changes or seasonal peaks, so revisit them regularly.",
              "Alert quality is a measurable sign of a mature security program."
            ],
            objectives: [
              "Explain what a baseline is",
              "Describe how to tune alerts"
            ],
            summary: "Baselines turn raw logs into useful, actionable alerts.",
            quiz: {
              title: "Monitoring and IR quiz",
              xp: 100,
              questions: [
                {
                  id: "q1",
                  question: "Which comes first in IR?",
                  options: ["Contain", "Prepare", "Recover"],
                  correctAnswer: 1,
                  explanation: "Preparation ensures your team and tools are ready."
                },
                {
                  id: "q2",
                  question: "A SIEM is used to:",
                  options: ["Block all traffic", "Correlate and analyze logs", "Assign IP addresses"],
                  correctAnswer: 1,
                  explanation: "SIEM systems aggregate and analyze logs for security insights."
                },
                {
                  id: "q3",
                  question: "Fill in the blank: A baseline describes ___ behavior.",
                  options: ["normal", "unknown", "hostile"],
                  correctAnswer: 0,
                  explanation: "Baselines describe normal behavior."
                },
                {
                  id: "q4",
                  question: "Why tune alerts?",
                  options: ["To increase noise", "To make alerts actionable", "To disable logging"],
                  correctAnswer: 1,
                  explanation: "Tuned alerts reduce noise and improve response."
                },
                {
                  id: "q5",
                  question: "Containment is used to:",
                  options: ["Spread the incident", "Limit damage", "Erase evidence"],
                  correctAnswer: 1,
                  explanation: "Containment limits impact."
                },
                {
                  id: "q6",
                  question: "Good logs should include:",
                  options: ["Timestamps and user actions", "Only usernames", "Only IP addresses"],
                  correctAnswer: 0,
                  explanation: "Timestamps and actions are critical for investigations."
                },
                {
                  id: "q7",
                  question: "Which phase comes after containment?",
                  options: ["Eradicate", "Prepare", "Detect"],
                  correctAnswer: 0,
                  explanation: "After containment, remove root cause during eradication."
                },
                {
                  id: "q8",
                  question: "Tabletop exercises help teams:",
                  options: ["Practice response without production impact", "Encrypt traffic", "Assign IPs"],
                  correctAnswer: 0,
                  explanation: "Tabletops test process and communication safely."
                },
                {
                  id: "q9",
                  question: "A good alert should be:",
                  options: ["Actionable and low-noise", "As loud as possible", "Hidden by default"],
                  correctAnswer: 0,
                  explanation: "Actionable alerts reduce fatigue and speed response."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  "8": {
    id: "8",
    title: "WAN & BGP Design",
    description: "Explore WAN technologies and the basics of BGP routing.",
    difficulty: "advanced",
    required_level: 5,
    estimatedTime: "1.9 hrs",
    xpReward: 520,
    category: "WAN",
    units: [
      {
        title: "Unit 1: WAN and BGP",
        about: "Learn WAN connectivity and BGP fundamentals.",
        sections: [
          {
            title: "WAN",
            items: [
              {
                type: "Learn",
                title: "WAN technologies",
                content: "MPLS, SD‑WAN, and VPNs connect sites over long distances.",
                duration: "9 min",
                xp: 40
              },
              {
                type: "Learn",
                title: "BGP basics",
                content: "BGP is the Internet routing protocol that exchanges routes between ASes.",
                duration: "10 min",
                xp: 40
              },
              {
                type: "Quiz",
                title: "WAN quick check",
                duration: "6 min",
                xp: 60
              }
            ]
          }
        ],
        lessons: [
          {
            title: "WAN technologies",
            learn: "WAN links connect sites using carrier services or encrypted tunnels.",
            blocks: [
              {
                type: "text",
                text: [
                  "WAN (Wide Area Network) technologies connect offices, data centres, and cloud services over long distances.",
                  "MPLS provides private, low-latency paths through a service provider's network.",
                  "SD-WAN uses software-defined policies to route traffic over multiple links including broadband and LTE.",
                  "IPsec VPNs encrypt traffic end-to-end across the public Internet for secure remote access.",
                  "Each technology has trade-offs: MPLS is reliable but expensive; SD-WAN is flexible but depends on underlay quality.",
                  "Modern enterprises often combine MPLS for critical traffic with SD-WAN for cost savings and redundancy."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why SD-WAN is growing",
                content: [
                  "SD-WAN can use cheap Internet links instead of expensive MPLS circuits.",
                  "It provides centralised policy management for all branches.",
                  "Application-aware routing ensures the best path for each traffic type."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which WAN technology provides application-aware routing over multiple links?",
                options: ["MPLS", "SD-WAN", "Leased line"],
                correctIndex: 1,
                explanation: "SD-WAN uses software-defined policies for intelligent path selection."
              },
              {
                type: "activity",
                title: "Match WAN technologies",
                mode: "drag",
                prompt: "Match each trait to the correct WAN technology.",
                targets: [
                  { id: "mpls", label: "MPLS" },
                  { id: "sdwan", label: "SD-WAN" },
                  { id: "vpn", label: "IPsec VPN" }
                ],
                items: [
                  { id: "private", label: "Private paths through a provider", targetId: "mpls" },
                  { id: "policy", label: "Software-defined policy routing", targetId: "sdwan" },
                  { id: "encrypt", label: "Encrypts traffic over the Internet", targetId: "vpn" }
                ]
              }
            ],
            content: [
              "WAN technologies connect offices and cloud services over long distances.",
              "MPLS provides private low-latency paths through a service provider network.",
              "SD-WAN routes traffic over multiple links using software-defined policies.",
              "IPsec VPNs encrypt traffic across the public Internet.",
              "MPLS is reliable but expensive; SD-WAN is flexible and cost-effective.",
              "Modern networks combine multiple WAN technologies for optimal performance."
            ],
            objectives: [
              "Compare MPLS, SD-WAN, and VPN technologies",
              "Explain why SD-WAN is growing",
              "Describe trade-offs between WAN options"
            ],
            summary: "WAN technologies like MPLS, SD-WAN, and VPNs connect sites securely over distance."
          },
          {
            title: "BGP basics",
            learn: "BGP uses path attributes to choose the best route between ASes.",
            blocks: [
              {
                type: "text",
                text: [
                  "BGP (Border Gateway Protocol) is the routing protocol that glues the Internet together.",
                  "It exchanges routing information between Autonomous Systems (ASes) — each an independent network.",
                  "BGP uses path attributes like AS-PATH and LOCAL_PREF to choose the best route.",
                  "Unlike OSPF, BGP is a path-vector protocol that makes policy-based routing decisions.",
                  "eBGP runs between ASes; iBGP runs within a single AS to distribute external routes.",
                  "BGP is deliberately conservative: it converges slowly to prioritise stability over speed."
                ]
              },
              {
                type: "explain",
                title: "Explain: AS-PATH attribute",
                content: [
                  "AS-PATH lists every AS a route has traversed.",
                  "Shorter AS-PATHs are preferred because they represent fewer network hops.",
                  "Prepending extra AS numbers to the path is a common way to influence inbound traffic."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What does BGP use to select the best route?",
                options: ["Bandwidth cost", "Path attributes like AS-PATH", "Hop count only"],
                correctIndex: 1,
                explanation: "BGP uses multiple path attributes including AS-PATH and LOCAL_PREF."
              }
            ],
            content: [
              "BGP is the routing protocol that connects Autonomous Systems on the Internet.",
              "It uses path attributes like AS-PATH and LOCAL_PREF for route selection.",
              "eBGP runs between ASes; iBGP distributes routes within one AS.",
              "BGP is a path-vector protocol focused on policy-based decisions.",
              "Shorter AS-PATHs are generally preferred.",
              "BGP converges slowly to prioritise stability."
            ],
            objectives: [
              "Explain what BGP does",
              "Describe key BGP path attributes",
              "Compare eBGP and iBGP"
            ],
            summary: "BGP exchanges routes between Autonomous Systems using path attributes for policy-based decisions.",
            quiz: {
              title: "WAN quick check",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "BGP is used for:",
                  options: ["LAN switching", "Internet routing", "Wi‑Fi encryption"],
                  correctAnswer: 1,
                  explanation: "BGP is the routing protocol of the Internet."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  "9": {
    id: "9",
    title: "Automation & Monitoring",
    description: "Automate routine tasks and monitor networks at scale.",
    difficulty: "advanced",
    required_level: 5,
    estimatedTime: "2.1 hrs",
    xpReward: 560,
    category: "Automation",
    units: [
      {
        title: "Unit 1: Automation and Observability",
        about: "Learn why automation matters and how monitoring works.",
        sections: [
          {
            title: "Automation",
            items: [
              {
                type: "Learn",
                title: "Network automation overview",
                content: "Automation reduces errors by standardizing changes and validations.",
                duration: "9 min",
                xp: 40
              },
              {
                type: "Learn",
                title: "Monitoring & SNMP",
                content: "SNMP exposes device metrics so you can track performance and uptime.",
                duration: "10 min",
                xp: 40
              },
              {
                type: "Quiz",
                title: "Automation quick check",
                duration: "6 min",
                xp: 60
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Network automation overview",
            learn: "Automation improves reliability and speed by reusing tested workflows.",
            blocks: [
              {
                type: "text",
                text: [
                  "Network automation replaces manual, error-prone tasks with repeatable, tested workflows.",
                  "Common tools include Ansible, Python scripts, and vendor APIs (REST, NETCONF).",
                  "Automation starts with simple tasks: backing up configs, checking compliance, and pushing changes.",
                  "Infrastructure as Code (IaC) means defining network state in version-controlled files.",
                  "Benefits include faster deployments, fewer human errors, and consistent configuration across devices.",
                  "Start small — automate one task well before expanding to a full pipeline."
                ]
              },
              {
                type: "explain",
                title: "Explain: Infrastructure as Code",
                content: [
                  "IaC stores the desired state of your network in config files (YAML, JSON, or templates).",
                  "Changes are reviewed, approved, and deployed just like software code.",
                  "This makes rollbacks easy and ensures every change is documented."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is the main benefit of network automation?",
                options: ["It eliminates all hardware", "It reduces manual errors and speeds up changes", "It replaces all security tools"],
                correctIndex: 1,
                explanation: "Automation reduces errors and makes changes faster and more consistent."
              },
              {
                type: "activity",
                title: "Match automation concepts",
                mode: "drag",
                prompt: "Match each concept to its description.",
                targets: [
                  { id: "iac", label: "Infrastructure as Code" },
                  { id: "ansible", label: "Ansible" },
                  { id: "api", label: "REST API" }
                ],
                items: [
                  { id: "version", label: "Network state in version-controlled files", targetId: "iac" },
                  { id: "playbook", label: "Agentless tool using YAML playbooks", targetId: "ansible" },
                  { id: "http", label: "HTTP-based interface for device config", targetId: "api" }
                ]
              }
            ],
            content: [
              "Network automation replaces manual tasks with repeatable tested workflows.",
              "Common tools include Ansible, Python scripts, and vendor REST APIs.",
              "Infrastructure as Code stores network state in version-controlled files.",
              "Benefits include faster deployments and fewer human errors.",
              "Start small by automating one task before expanding.",
              "Automation makes configuration consistent across all devices."
            ],
            objectives: [
              "Explain why network automation matters",
              "Describe Infrastructure as Code",
              "Identify common automation tools"
            ],
            summary: "Automation reduces errors and speeds up network changes through repeatable workflows."
          },
          {
            title: "Monitoring & SNMP",
            learn: "Monitoring tools use SNMP and logs to detect issues early.",
            blocks: [
              {
                type: "text",
                text: [
                  "SNMP (Simple Network Management Protocol) exposes device metrics: CPU, memory, interface utilisation, and errors.",
                  "A monitoring server (NMS) polls devices using SNMP GET requests at regular intervals.",
                  "Devices can also send unsolicited alerts called SNMP traps when thresholds are exceeded.",
                  "Syslog collects log messages from devices for centralised analysis and correlation.",
                  "Dashboards visualise trends so you can spot degradation before users notice.",
                  "Good monitoring combines SNMP metrics, syslog events, and synthetic tests for full visibility."
                ]
              },
              {
                type: "explain",
                title: "Explain: SNMP versions",
                content: [
                  "SNMPv1 and v2c use community strings (basically passwords in plain text).",
                  "SNMPv3 adds authentication and encryption for secure monitoring.",
                  "Always use SNMPv3 in production to protect credentials and data."
                ]
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is an SNMP trap?",
                options: ["A scheduled poll from the server", "An unsolicited alert sent by a device", "A type of firewall rule"],
                correctIndex: 1,
                explanation: "SNMP traps are alerts sent proactively by devices when something changes."
              },
              {
                type: "activity",
                title: "Match monitoring concepts",
                mode: "drag",
                prompt: "Match each concept to the correct protocol or tool.",
                targets: [
                  { id: "snmp", label: "SNMP" },
                  { id: "syslog", label: "Syslog" }
                ],
                items: [
                  { id: "metrics", label: "Polls device metrics like CPU and bandwidth", targetId: "snmp" },
                  { id: "logs", label: "Collects log messages centrally", targetId: "syslog" },
                  { id: "trap", label: "Sends unsolicited alerts", targetId: "snmp" },
                  { id: "events", label: "Records events with severity levels", targetId: "syslog" }
                ]
              }
            ],
            content: [
              "SNMP exposes device metrics like CPU, memory, and interface utilisation.",
              "The monitoring server polls devices using SNMP GET requests.",
              "Devices send unsolicited SNMP traps when thresholds are exceeded.",
              "Syslog collects log messages for centralised analysis.",
              "SNMPv3 adds authentication and encryption for secure monitoring.",
              "Good monitoring combines SNMP, syslog, and synthetic tests."
            ],
            objectives: [
              "Describe how SNMP works",
              "Compare SNMP polling and traps",
              "Explain why SNMPv3 is preferred"
            ],
            summary: "SNMP and syslog provide the metrics and logs needed for proactive network monitoring.",
            quiz: {
              title: "Automation quick check",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "SNMP is commonly used for:",
                  options: ["Routing", "Monitoring", "Encryption"],
                  correctAnswer: 1,
                  explanation: "SNMP is a monitoring protocol."
                }
              ]
            }
          }
        ]
      }
    ]
  }
};

if (typeof window !== "undefined") {
  window.COURSE_CONTENT = COURSE_CONTENT;
}
