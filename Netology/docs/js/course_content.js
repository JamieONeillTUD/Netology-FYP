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
                xp: 80
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
              "Key benefits: resource sharing, communication, and scalability."
          },
          {
            title: "LAN vs WAN vs Internet",
            learn:
              "LANs are local, WANs connect distant locations, and the Internet connects everything. " +
              "A small business might use a LAN in the office and a WAN link to connect to a remote branch.",
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
                xp: 80
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
              "Endpoints generate and consume data on the network."
          },
          {
            title: "Frames and MAC addresses",
            learn:
              "Ethernet frames include source and destination MAC addresses. " +
              "Switches learn MAC addresses by inspecting incoming frames and building a MAC table.",
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
                xp: 80
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
              "The network ID groups devices into a subnet."
          },
          {
            title: "Subnet masks and gateways",
            learn:
              "The subnet mask tells devices which addresses are local. " +
              "If a destination is not local, traffic goes to the default gateway.",
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
            learn: "Subnetting improves performance and security by limiting broadcasts."
          },
          {
            title: "CIDR and prefix lengths",
            learn: "Prefix length determines how many addresses are in a subnet.",
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
                xp: 90
              }
            ]
          }
        ],
        lessons: [
          {
            title: "VLAN concepts",
            learn: "VLANs separate traffic and improve security and performance."
          },
          {
            title: "802.1Q trunking",
            learn: "Trunk links tag frames so multiple VLANs can share the same link.",
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
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Router-on-a-stick",
            learn: "Subinterfaces on one router port can route between VLANs."
          },
          {
            title: "SVI on Layer 3 switches",
            learn: "Layer 3 switches route between VLANs using SVI interfaces.",
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
            learn: "Reducing the attack surface limits exposure and risk."
          },
          {
            title: "Hardening checklist",
            learn: "Harden devices by removing defaults, patching, and restricting access.",
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
                xp: 90
              }
            ]
          }
        ],
        lessons: [
          {
            title: "Stateless vs stateful",
            learn: "Stateful firewalls allow return traffic automatically and reduce rule complexity."
          },
          {
            title: "ACL design",
            learn: "Order matters. Place specific rules before general ones.",
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
            learn: "Good logs enable faster incident response and better forensic analysis."
          },
          {
            title: "Incident response workflow",
            learn: "Follow a consistent IR process to reduce downtime and impact.",
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
