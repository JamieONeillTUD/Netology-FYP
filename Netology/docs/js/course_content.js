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
  // ============================
  // NOVICE COURSES (Level 1+)
  // ============================
  "1": {
    id: "1",
    title: "Networking Foundations",
    description: "Build core networking knowledge from scratch: devices, Ethernet, and IP basics.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "2.5 hrs",
    xpReward: 500,
    category: "Core",
    units: [
      {
        title: "Unit 1: Network Basics",
        about: "Learn what networks are, why they exist, and the difference between LANs, WANs, and the Internet.",
        sections: [
          {
            title: "Core concepts",
            items: [
              {
                type: "Learn",
                title: "What is a network?",
                content:
                  "A computer network is a group of devices connected so they can share data and resources. " +
                  "Networks enable communication (email, chat), access to services (websites, cloud apps), and resource sharing (printers, storage). " +
                  "Devices follow rules called protocols to send and receive data reliably.",
                duration: "8 min",
                xp: 40
              },
              {
                type: "Learn",
                title: "LAN vs WAN vs Internet",
                content:
                  "LANs connect devices in a small area (home, office). WANs connect LANs across cities or countries. " +
                  "The Internet is the global network of networks. Understanding scope helps you choose the right hardware and addressing.",
                duration: "10 min",
                xp: 45
              },
              {
                type: "Quiz",
                title: "Quick check: network types",
                duration: "6 min",
                xp: 60
              }
            ]
          },
          {
            title: "Hands-on",
            items: [
              {
                type: "Practice",
                title: "Classify network types",
                duration: "10 min",
                xp: 30
              },
              {
                type: "Challenge",
                title: "Map a home network",
                duration: "12 min",
                xp: 80,
                challenge: {
                  rules: {
                    minDevices: 3,
                    minConnections: 2,
                    requiredTypes: { pc: 2, router: 1 }
                  },
                  steps: [
                    "Add 1 router and at least 2 PCs.",
                    "Connect each PC to the router (or via a switch).",
                    "Verify you have at least 2 connections."
                  ],
                  tips: "If you add a switch, connect the router to the switch first."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "What is a network?",
            learn:
              "A network connects devices so they can communicate and share data. " +
              "Common examples include home Wi‑Fi, office LANs, and the Internet. " +
              "Key benefits: resource sharing, communication, and scalability.",
            content: [
              "A network is any group of devices that can exchange data. This includes phones, laptops, servers, printers, and even IoT devices.",
              "Networks exist so devices can share resources (files, printers, internet access) and communicate in real time.",
              "Protocols like Ethernet, Wi‑Fi, and TCP/IP define how data moves so it arrives reliably."
            ],
            objectives: [
              "Define what a network is",
              "Identify common networked devices",
              "Explain why protocols are important"
            ]
          },
          {
            title: "LAN vs WAN vs Internet",
            learn:
              "LANs are local, WANs connect distant locations, and the Internet connects everything. " +
              "A small business might use a LAN in the office and a WAN link to connect to a remote branch.",
            content: [
              "A LAN (Local Area Network) covers a small area like a home or office. Speeds are high and latency is low.",
              "A WAN (Wide Area Network) connects LANs across cities or countries, usually via ISPs or leased lines.",
              "The Internet is the largest WAN — a global network of networks using shared standards."
            ],
            objectives: [
              "Compare LANs and WANs",
              "Recognize why the Internet is a network of networks"
            ],
            quiz: {
              title: "Network types",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "Which network type connects devices within a single building?",
                  options: ["WAN", "LAN", "Internet"],
                  correctAnswer: 1,
                  explanation: "A LAN is a local network covering a small area like a home or office."
                },
                {
                  id: "q2",
                  question: "A company connects two offices in different cities. This is a:",
                  options: ["LAN", "WAN", "PAN"],
                  correctAnswer: 1,
                  explanation: "WANs connect networks across long distances."
                },
                {
                  id: "q3",
                  question: "The Internet is best described as:",
                  options: ["One giant LAN", "A single ISP", "A global network of networks"],
                  correctAnswer: 2,
                  explanation: "The Internet is made of many interconnected networks."
                },
                {
                  id: "q4",
                  question: "Which network type is most likely used inside a single home?",
                  options: ["LAN", "WAN", "MAN"],
                  correctAnswer: 0,
                  explanation: "Home networks are LANs."
                },
                {
                  id: "q5",
                  question: "A WAN usually connects:",
                  options: ["Two routers in one room", "LANs across long distances", "Only wireless devices"],
                  correctAnswer: 1,
                  explanation: "WANs connect networks over long distances."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 2: Devices & Ethernet",
        about: "Understand network devices, Ethernet frames, and MAC addressing.",
        sections: [
          {
            title: "Devices",
            items: [
              {
                type: "Learn",
                title: "Switches, routers, and endpoints",
                content:
                  "Switches connect devices in a LAN and forward frames by MAC address. " +
                  "Routers connect different networks and forward packets by IP address. " +
                  "Endpoints include PCs, phones, printers, and servers.",
                duration: "9 min",
                xp: 45
              }
            ]
          },
          {
            title: "Ethernet",
            items: [
              {
                type: "Learn",
                title: "Frames and MAC addresses",
                content:
                  "Ethernet uses frames at Layer 2. Each network card has a unique MAC address. " +
                  "Switches build MAC tables to forward frames efficiently.",
                duration: "10 min",
                xp: 45
              },
              {
                type: "Quiz",
                title: "Ethernet basics",
                duration: "6 min",
                xp: 60
              },
              {
                type: "Practice",
                title: "Label devices in a LAN",
                duration: "10 min",
                xp: 30
              },
              {
                type: "Challenge",
                title: "Build a small LAN",
                duration: "12 min",
                xp: 80,
                challenge: {
                  rules: {
                    minDevices: 3,
                    minConnections: 2,
                    requiredTypes: { pc: 2, switch: 1 }
                  },
                  steps: [
                    "Add 1 switch and at least 2 PCs.",
                    "Connect each PC to the switch.",
                    "Make sure the LAN has at least 2 links."
                  ],
                  tips: "Any PC icon works for endpoints."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Switches, routers, and endpoints",
            learn:
              "Switches operate at Layer 2 and forward frames by MAC address. " +
              "Routers operate at Layer 3 and forward packets between networks. " +
              "Endpoints generate and consume data on the network.",
            content: [
              "Switches keep traffic inside a LAN by forwarding frames only to the correct port.",
              "Routers connect different networks and choose the best path for packets using IP routing.",
              "Endpoints (PCs, phones, servers) are the devices that actually create or consume data."
            ],
            objectives: [
              "Identify the role of switches and routers",
              "Explain what an endpoint is",
              "Differentiate Layer 2 vs Layer 3 devices"
            ]
          },
          {
            title: "Frames and MAC addresses",
            learn:
              "Ethernet frames include source and destination MAC addresses. " +
              "Switches learn MAC addresses by inspecting incoming frames and building a MAC table.",
            content: [
              "A MAC address is a unique hardware identifier assigned to a network interface.",
              "Ethernet frames carry data within a LAN and include source/destination MACs.",
              "Switches learn MAC addresses by watching incoming frames and storing them in a MAC table."
            ],
            objectives: [
              "Define MAC address and frame",
              "Describe how a switch builds a MAC table"
            ],
            quiz: {
              title: "Ethernet basics",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "Which device forwards traffic based on MAC address?",
                  options: ["Router", "Switch", "Firewall"],
                  correctAnswer: 1,
                  explanation: "Switches forward frames using MAC addresses."
                },
                {
                  id: "q2",
                  question: "What is the purpose of a MAC address?",
                  options: ["Identify a network globally", "Identify a device on a LAN", "Encrypt packets"],
                  correctAnswer: 1,
                  explanation: "MAC addresses uniquely identify devices at Layer 2."
                },
                {
                  id: "q3",
                  question: "Which layer does Ethernet operate on?",
                  options: ["Layer 1 only", "Layer 2", "Layer 3"],
                  correctAnswer: 1,
                  explanation: "Ethernet is a Layer 2 technology."
                },
                {
                  id: "q4",
                  question: "A switch learns MAC addresses by:",
                  options: ["Broadcasting to all ports", "Inspecting source MACs", "Querying DNS"],
                  correctAnswer: 1,
                  explanation: "Switches learn MAC addresses from incoming frames."
                }
              ]
            }
          }
        ]
      },
      {
        title: "Unit 3: IP Basics",
        about: "Learn IPv4 addressing, subnet masks, and default gateways.",
        sections: [
          {
            title: "Addressing",
            items: [
              {
                type: "Learn",
                title: "IPv4 addresses",
                content:
                  "IPv4 addresses are 32-bit numbers written in dotted decimal. " +
                  "They identify devices on a network. Each network has a network ID and host range.",
                duration: "10 min",
                xp: 45
              },
              {
                type: "Learn",
                title: "Subnet masks and gateways",
                content:
                  "Subnet masks define the network portion of an IP address. " +
                  "A default gateway is the router that forwards traffic to other networks.",
                duration: "11 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "IP basics",
                duration: "6 min",
                xp: 60
              }
            ]
          },
          {
            title: "Practice",
            items: [
              {
                type: "Practice",
                title: "Assign IPs to devices",
                duration: "12 min",
                xp: 30
              },
              {
                type: "Challenge",
                title: "Design a simple IP plan",
                duration: "14 min",
                xp: 80,
                challenge: {
                  rules: {
                    minDevices: 3,
                    minConnections: 2,
                    requiredTypes: { pc: 2, router: 1 }
                  },
                  steps: [
                    "Add 1 router and 2 PCs.",
                    "Connect both PCs to the router.",
                    "Assign IPs in the same subnet (e.g., 192.168.1.0/24)."
                  ],
                  tips: "Use the device config panel to set IP addresses."
                }
              }
            ]
          }
        ],
        lessons: [
          {
            title: "IPv4 addresses",
            learn:
              "IPv4 uses 32 bits to identify devices. " +
              "Addresses are written as four octets (e.g., 192.168.1.10). " +
              "The network ID groups devices into a subnet.",
            content: [
              "IPv4 addresses are 32-bit values split into four 8-bit octets.",
              "Devices in the same subnet share a network ID and can communicate directly.",
              "Public IPs are routable on the Internet; private IPs are used inside networks."
            ],
            objectives: [
              "Read an IPv4 address",
              "Identify network vs host portions",
              "Recognize private vs public ranges"
            ]
          },
          {
            title: "Subnet masks and gateways",
            learn:
              "The subnet mask tells devices which addresses are local. " +
              "If a destination is not local, traffic goes to the default gateway.",
            content: [
              "A subnet mask defines how many bits are network bits vs host bits (e.g., 255.255.255.0 = /24).",
              "Devices check the destination IP; if it's not in the local subnet, they send traffic to the default gateway.",
              "The default gateway is usually a router interface on that subnet."
            ],
            objectives: [
              "Explain what a subnet mask does",
              "Describe the role of a default gateway"
            ],
            quiz: {
              title: "IP basics",
              xp: 60,
              questions: [
                {
                  id: "q1",
                  question: "What does a subnet mask do?",
                  options: ["Encrypt packets", "Define network vs host bits", "Assign MAC addresses"],
                  correctAnswer: 1,
                  explanation: "Subnet masks separate network and host portions of an IP address."
                },
                {
                  id: "q2",
                  question: "What is the default gateway?",
                  options: ["The DNS server", "The router for other networks", "The local switch"],
                  correctAnswer: 1,
                  explanation: "The gateway routes traffic outside the local network."
                },
                {
                  id: "q3",
                  question: "How many bits are in an IPv4 address?",
                  options: ["16", "32", "64"],
                  correctAnswer: 1,
                  explanation: "IPv4 addresses use 32 bits."
                },
                {
                  id: "q4",
                  question: "Which address is a private IP?",
                  options: ["172.16.5.10", "8.8.8.8", "1.1.1.1"],
                  correctAnswer: 0,
                  explanation: "172.16.0.0/12 is private."
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
                xp: 25
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Switch vs hub",
            learn: "Switches build MAC tables and forward frames only where needed. Hubs repeat to all ports."
          },
          {
            title: "Spanning Tree basics",
            learn: "STP calculates a loop-free topology by blocking some redundant links.",
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
            learn: "Classful addressing is historical, but private ranges still map to A/B/C blocks."
          },
          {
            title: "Private vs public IPs",
            learn: "Private IPs (10/8, 172.16/12, 192.168/16) are not routed on the Internet.",
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

  // ============================
  // INTERMEDIATE COURSES (Level 3+)
  // ============================
  "4": {
    id: "4",
    title: "Subnetting & VLANs",
    description: "Design efficient subnets, segment networks with VLANs, and connect them securely.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "3 hrs",
    xpReward: 650,
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
                content: "Subnetting reduces broadcast domains and makes IP allocation more efficient.",
                duration: "9 min",
                xp: 45
              },
              {
                type: "Learn",
                title: "CIDR and prefix lengths",
                content: "CIDR uses prefixes (like /24) to define network size and range.",
                duration: "11 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "Subnetting quick check",
                duration: "6 min",
                xp: 70
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Why subnet?",
            learn: "Subnetting improves performance and security by limiting broadcasts.",
            content: [
              "Subnetting splits a large network into smaller broadcast domains.",
              "Smaller networks reduce broadcast traffic and simplify troubleshooting.",
              "It also helps enforce security boundaries between departments or services."
            ],
            objectives: [
              "Explain why subnetting is used",
              "Describe how broadcasts are reduced"
            ]
          },
          {
            title: "CIDR and prefix lengths",
            learn: "Prefix length determines how many addresses are in a subnet.",
            content: [
              "CIDR uses prefix notation (like /24) to define network size.",
              "The shorter the prefix, the larger the subnet (more hosts).",
              "Prefix length controls how many addresses are available per subnet."
            ],
            objectives: [
              "Read a CIDR prefix",
              "Relate prefix length to subnet size"
            ],
            quiz: {
              title: "Subnetting quick check",
              xp: 70,
              questions: [
                {
                  id: "q1",
                  question: "A /24 subnet contains how many addresses?",
                  options: ["256", "128", "64"],
                  correctAnswer: 0,
                  explanation: "A /24 has 256 addresses (254 usable)."
                },
                {
                  id: "q2",
                  question: "Subnetting helps by:",
                  options: ["Increasing broadcast traffic", "Reducing broadcast domains", "Eliminating routers"],
                  correctAnswer: 1,
                  explanation: "Subnetting reduces broadcast domains."
                },
                {
                  id: "q3",
                  question: "A /26 subnet has how many usable hosts?",
                  options: ["62", "126", "254"],
                  correctAnswer: 0,
                  explanation: "A /26 has 64 addresses, 62 usable."
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
                duration: "10 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "802.1Q trunking",
                content: "Trunks carry multiple VLANs between switches using tags.",
                duration: "10 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "VLANs quick check",
                duration: "6 min",
                xp: 70
              },
              {
                type: "Practice",
                title: "Assign VLANs to ports",
                duration: "12 min",
                xp: 35
              },
              {
                type: "Challenge",
                title: "Build a VLAN campus",
                duration: "15 min",
                xp: 90,
                challenge: {
                  rules: {
                    minDevices: 5,
                    minConnections: 4,
                    requiredTypes: { switch: 2, pc: 3 }
                  },
                  steps: [
                    "Add 2 switches and at least 3 PCs.",
                    "Connect PCs to switches and link the switches together.",
                    "Label VLANs conceptually (VLAN 10/20) in your notes."
                  ],
                  tips: "Use two groups of PCs to represent two VLANs."
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
              "VLANs reduce broadcast scope and improve security."
            ],
            objectives: [
              "Define a VLAN",
              "Explain why VLANs improve segmentation"
            ]
          },
          {
            title: "802.1Q trunking",
            learn: "Trunk links tag frames so multiple VLANs can share the same link.",
            content: [
              "802.1Q adds a VLAN tag to Ethernet frames.",
              "Trunks carry traffic for multiple VLANs between switches or to routers.",
              "Access ports carry a single VLAN and do not tag frames."
            ],
            objectives: [
              "Describe what trunking does",
              "Identify access vs trunk ports"
            ],
            quiz: {
              title: "VLANs quick check",
              xp: 70,
              questions: [
                {
                  id: "q1",
                  question: "What does a trunk link carry?",
                  options: ["One VLAN", "Multiple VLANs", "Only management traffic"],
                  correctAnswer: 1,
                  explanation: "Trunks carry multiple VLANs via tagging."
                },
                {
                  id: "q2",
                  question: "VLANs are used to:",
                  options: ["Increase broadcasts", "Segment networks", "Remove IP addressing"],
                  correctAnswer: 1,
                  explanation: "VLANs segment a network into smaller broadcast domains."
                },
                {
                  id: "q3",
                  question: "Which port type carries multiple VLANs?",
                  options: ["Access port", "Trunk port", "Console port"],
                  correctAnswer: 1,
                  explanation: "Trunk ports carry multiple VLANs."
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
                duration: "10 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "SVI on Layer 3 switches",
                content: "SVIs provide gateway interfaces for VLANs on a multilayer switch.",
                duration: "10 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "Inter-VLAN quick check",
                duration: "6 min",
                xp: 70
              },
              {
                type: "Practice",
                title: "Configure inter-VLAN routing",
                duration: "14 min",
                xp: 40
              },
              {
                type: "Challenge",
                title: "Route between two VLANs",
                duration: "15 min",
                xp: 90,
                challenge: {
                  rules: {
                    minDevices: 4,
                    minConnections: 3,
                    requiredTypes: { router: 1, switch: 1, pc: 2 }
                  },
                  steps: [
                    "Add a switch, a router, and two PCs.",
                    "Connect PCs to the switch and the switch to the router.",
                    "Treat each PC as a different VLAN in your design."
                  ],
                  tips: "You’re modeling the topology here; VLAN configs are conceptual."
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
              "Each subinterface is assigned to a VLAN and acts as that VLAN’s gateway.",
              "This is common in smaller networks without L3 switches."
            ],
            objectives: [
              "Explain router-on-a-stick",
              "Identify when it’s used"
            ]
          },
          {
            title: "SVI on Layer 3 switches",
            learn: "Layer 3 switches route between VLANs using SVI interfaces.",
            content: [
              "An SVI (Switch Virtual Interface) provides a Layer 3 interface for a VLAN.",
              "SVIs allow a multilayer switch to route internally without a router.",
              "This improves performance in larger campus networks."
            ],
            objectives: [
              "Define an SVI",
              "Compare SVIs to router-on-a-stick"
            ],
            quiz: {
              title: "Inter-VLAN quick check",
              xp: 70,
              questions: [
                {
                  id: "q1",
                  question: "An SVI is used on a:",
                  options: ["Layer 2 hub", "Layer 3 switch", "Wireless AP"],
                  correctAnswer: 1,
                  explanation: "SVIs are used on multilayer (Layer 3) switches."
                },
                {
                  id: "q2",
                  question: "Inter‑VLAN routing is required because:",
                  options: ["VLANs are already routed", "VLANs are separate broadcast domains", "Switches block all traffic"],
                  correctAnswer: 1,
                  explanation: "Different VLANs need routing to communicate."
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
            learn: "Static routes are simple but manual; dynamic routing scales better."
          },
          {
            title: "OSPF overview",
            learn: "OSPF builds a link-state database and computes shortest paths.",
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
            learn: "Wireless standards define performance and compatibility for Wi‑Fi networks."
          },
          {
            title: "DHCP & DNS basics",
            learn: "DHCP automates IP assignment; DNS resolves domain names.",
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

  // ============================
  // ADVANCED COURSES (Level 5+)
  // ============================
  "7": {
    id: "7",
    title: "Network Security & Hardening",
    description: "Secure networks with hardening, firewalls, ACLs, and monitoring best practices.",
    difficulty: "advanced",
    required_level: 5,
    estimatedTime: "3.5 hrs",
    xpReward: 800,
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
                duration: "10 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Hardening checklist",
                content: "Disable unused services, use strong auth, patch often, and log everything.",
                duration: "11 min",
                xp: 55
              },
              {
                type: "Quiz",
                title: "Security quick check",
                duration: "6 min",
                xp: 80
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
              "Focus on least privilege, minimal services, and strong identity controls."
            ],
            objectives: [
              "Define attack surface",
              "List common exposure points",
              "Explain why reduction matters"
            ]
          },
          {
            title: "Hardening checklist",
            learn: "Harden devices by removing defaults, patching, and restricting access.",
            content: [
              "Disable unused services, close unused ports, and remove default credentials.",
              "Patch operating systems and network devices regularly.",
              "Enforce strong authentication and log important events."
            ],
            objectives: [
              "Describe key hardening actions",
              "Explain why patching is critical"
            ],
            quiz: {
              title: "Security quick check",
              xp: 80,
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
                  options: ["Everyone has admin access", "Access is only what’s needed", "No authentication required"],
                  correctAnswer: 1,
                  explanation: "Least privilege limits access to only what is required."
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
                duration: "10 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "ACL design",
                content: "Use least privilege and document every rule.",
                duration: "10 min",
                xp: 55
              },
              {
                type: "Quiz",
                title: "ACL quick check",
                duration: "6 min",
                xp: 80
              },
              {
                type: "Challenge",
                title: "Build an ACL policy",
                duration: "14 min",
                xp: 90,
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
                  tips: "You’re validating topology and segmentation awareness."
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
              "Stateful rules are typically simpler and safer for most networks."
            ],
            objectives: [
              "Compare stateless vs stateful behavior",
              "Explain why statefulness reduces rule count"
            ]
          },
          {
            title: "ACL design",
            learn: "Order matters. Place specific rules before general ones.",
            content: [
              "ACLs are evaluated top‑down: the first match wins.",
              "Put specific allow/deny rules before general rules.",
              "Always include a default deny at the end when appropriate."
            ],
            objectives: [
              "Explain ACL order of operations",
              "Apply least privilege to rule design"
            ],
            quiz: {
              title: "ACL quick check",
              xp: 80,
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
                  options: ["Bottom‑up", "Top‑down", "Randomly"],
                  correctAnswer: 1,
                  explanation: "ACLs are processed from top to bottom."
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
                duration: "10 min",
                xp: 55
              },
              {
                type: "Learn",
                title: "Incident response workflow",
                content: "Prepare, detect, contain, eradicate, and recover.",
                duration: "10 min",
                xp: 55
              },
              {
                type: "Quiz",
                title: "Monitoring quick check",
                duration: "6 min",
                xp: 80
              },
              {
                type: "Practice",
                title: "Analyze a log snippet",
                duration: "12 min",
                xp: 35
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
              "Good logs improve forensic analysis after an incident."
            ],
            objectives: [
              "Define SIEM at a high level",
              "Explain why log centralization matters"
            ]
          },
          {
            title: "Incident response workflow",
            learn: "Follow a consistent IR process to reduce downtime and impact.",
            content: [
              "IR phases: Prepare → Detect → Contain → Eradicate → Recover.",
              "Preparation and detection reduce mean time to respond.",
              "Document everything to improve future defenses."
            ],
            objectives: [
              "List the IR phases",
              "Explain why documentation matters"
            ],
            quiz: {
              title: "Monitoring quick check",
              xp: 80,
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
            learn: "WAN links connect sites using carrier services or encrypted tunnels."
          },
          {
            title: "BGP basics",
            learn: "BGP uses path attributes to choose the best route between ASes.",
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
            learn: "Automation improves reliability and speed by reusing tested workflows."
          },
          {
            title: "Monitoring & SNMP",
            learn: "Monitoring tools use SNMP and logs to detect issues early.",
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
