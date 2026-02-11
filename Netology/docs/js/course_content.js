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
    description: "Build core networking knowledge from scratch: devices, Ethernet, IP basics, and how networks actually move data.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "4 hrs",
    xpReward: 650,
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
                xp: 50
              },
              {
                type: "Learn",
                title: "LAN vs WAN vs Internet",
                content: "LANs are local, WANs are wide-area, and the Internet is the global network of networks.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Learn",
                title: "Topologies and traffic flow",
                content: "Understand common topologies (star, mesh, tree) and how traffic moves between devices.",
                duration: "12 min",
                xp: 50
              },
              {
                type: "Quiz",
                title: "Network basics quiz",
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
                title: "Classify network types",
                duration: "12 min",
                xp: 35
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
            content: [
              "A network is any group of devices that can exchange data. This includes phones, laptops, servers, printers, and even IoT devices like cameras or smart thermostats.",
              "At home, your Wi-Fi router connects your phone, laptop, and TV to the same local network so they can share the Internet connection.",
              "In an office, switches connect desktops and printers, while a router connects the office LAN to other networks or the Internet.",
              "Networks exist so devices can share resources: files, printers, storage, and access to applications or cloud services.",
              "Protocols are the rules for communication. Ethernet defines how frames move on a LAN, and TCP/IP defines how data moves between networks.",
              "Good networks balance speed (bandwidth), responsiveness (latency), and reliability (packet loss).",
              "Security matters too: networks should allow the right traffic and block the wrong traffic.",
              "By the end of this course, you will be able to sketch a network and explain how data moves through it."
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
            content: [
              "A LAN (Local Area Network) covers a small area like a home, office, or school. It is fast and controlled by a single organization.",
              "A WAN (Wide Area Network) connects multiple LANs across cities or countries using service providers.",
              "The Internet is a global network of networks that all agree on shared standards like TCP/IP.",
              "If a company has offices in two cities, each office has its own LAN and the two LANs are linked by a WAN.",
              "Knowing the scope helps you choose the right equipment and addressing strategy.",
              "LANs focus on local speed and low latency; WANs focus on long-distance reliability."
            ],
            objectives: [
              "Compare LANs and WANs",
              "Recognize why the Internet is a network of networks",
              "Explain how LANs connect to WANs"
            ],
            summary: "LANs are local, WANs connect distant LANs, and the Internet is the largest WAN."
          },
          {
            title: "Topologies and traffic flow",
            learn: "Topology describes how devices are arranged and how traffic moves between them.",
            content: [
              "Topology is the shape of a network: star, bus, ring, mesh, or tree.",
              "Most modern LANs use a star topology: devices connect to a central switch.",
              "Mesh designs add redundancy by giving devices multiple paths.",
              "Traffic types include unicast (one-to-one), broadcast (one-to-all), and multicast (one-to-many).",
              "Switches forward unicast traffic to a specific port, while broadcasts go to all ports in the same LAN.",
              "Too many broadcasts can slow a network, which is why segmentation matters later.",
              "Example: if PC A needs a printer, the switch uses the printer's MAC address to send frames only to that port.",
              "Understanding topology helps you troubleshoot and plan expansions."
            ],
            objectives: [
              "Identify common topologies",
              "Describe unicast vs broadcast traffic",
              "Explain how switches direct traffic"
            ],
            summary: "Topology and traffic patterns shape performance, reliability, and troubleshooting.",
            quiz: {
              title: "Network basics quiz",
              xp: 80,
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
                xp: 35
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
            content: [
              "Switches operate at Layer 2, forwarding frames based on MAC addresses.",
              "Routers operate at Layer 3, forwarding packets based on IP addresses and routing tables.",
              "Endpoints are devices like laptops, servers, and phones that generate or consume data.",
              "In a small office, a switch connects endpoints while a router connects the LAN to the Internet.",
              "Switches keep traffic local when possible; routers are the boundary between networks.",
              "Understanding which device does what makes troubleshooting much faster.",
              "If two PCs are on the same LAN, they can talk without the router.",
              "If a PC needs a remote network, it sends traffic to the default gateway (the router)."
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
            content: [
              "An Ethernet frame includes destination MAC, source MAC, and a payload.",
              "MAC addresses are 48-bit identifiers, typically written like 00:1A:2B:3C:4D:5E.",
              "Switches learn MAC addresses by reading the source MAC of incoming frames.",
              "If the switch does not know the destination MAC, it floods the frame to all ports.",
              "Frames also include a Frame Check Sequence (FCS) for error detection.",
              "Because MACs are local, they are only meaningful inside a LAN.",
              "IP addresses ride inside Ethernet frames when moving across a LAN.",
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
            content: [
              "ARP (Address Resolution Protocol) maps an IP address to a MAC address on the LAN.",
              "When a device needs a MAC, it sends an ARP request as a broadcast.",
              "Only the device with that IP responds with its MAC address.",
              "Broadcasts stay within a broadcast domain, which is typically a single LAN or VLAN.",
              "Routers do not forward broadcast traffic, so they separate broadcast domains.",
              "Too many broadcasts can degrade performance, which is why networks are segmented.",
              "If ARP fails, devices can have the right IP but still fail to communicate.",
              "Learning ARP explains why local communication happens before routing occurs."
            ],
            objectives: [
              "Explain how ARP works",
              "Define a broadcast domain",
              "Describe why routers block broadcasts"
            ],
            summary: "ARP uses broadcasts to map IPs to MACs, and routers limit broadcasts to protect networks.",
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
                xp: 35
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
            content: [
              "An IPv4 address is a 32-bit value written in dotted decimal, like 192.168.1.20.",
              "The address is split into a network portion and a host portion.",
              "Devices on the same network portion can communicate directly without a router.",
              "Public IPs are reachable on the Internet; private IPs are used inside local networks.",
              "Private ranges include 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.",
              "Routers use IP addresses to forward packets toward their destinations.",
              "If an IP is wrong, communication fails even if the cable is correct.",
              "Understanding IPs is the foundation for routing and troubleshooting."
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
            learn: "Subnet masks identify the local network; gateways forward off-subnet traffic.",
            content: [
              "A subnet mask tells a device which portion of an IP address is the network.",
              "A common mask is 255.255.255.0, also written as /24.",
              "If the destination IP is in the same subnet, traffic stays on the LAN.",
              "If the destination is outside the subnet, the device sends traffic to the default gateway.",
              "The default gateway is typically the router interface on that LAN.",
              "Wrong masks or gateways are one of the most common causes of connectivity issues.",
              "Subnets are used to control broadcast size and organize large networks."
            ],
            objectives: [
              "Interpret subnet masks",
              "Explain the role of the default gateway",
              "Identify common addressing mistakes"
            ],
            summary: "Subnet masks define local traffic, while gateways handle traffic to other networks."
          },
          {
            title: "DHCP and DNS essentials",
            learn: "DHCP automates IP configuration and DNS translates names into addresses.",
            content: [
              "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to hosts.",
              "The DHCP process follows DORA: Discover, Offer, Request, Acknowledge.",
              "DHCP also distributes options like subnet mask, gateway, and DNS server.",
              "DNS (Domain Name System) translates human-friendly names like example.com into IP addresses.",
              "Without DNS, users would need to memorize IP addresses for every service.",
              "If DNS is misconfigured, services may be up but unreachable by name.",
              "DHCP and DNS reduce manual configuration and improve consistency."
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
    description: "Design efficient subnets, segment networks with VLANs, and connect them securely with inter-VLAN routing.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "4.5 hrs",
    xpReward: 800,
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
                xp: 40
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
            content: [
              "Subnetting splits a large network into smaller networks, each with its own broadcast domain.",
              "Smaller broadcast domains reduce unnecessary traffic and make troubleshooting easier.",
              "Subnetting also helps enforce security boundaries between departments or services.",
              "Example: HR, Finance, and Engineering can each have their own subnet, with routing and firewall rules between them.",
              "Subnetting makes IP planning realistic; you can assign only as many addresses as each group needs.",
              "Good subnetting reduces wasted addresses and prevents one noisy segment from impacting everyone.",
              "Example: splitting a /23 into two /24s keeps guest Wi‑Fi separate while still leaving room for growth."
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
            content: [
              "CIDR uses prefix notation (like /24) to define network size.",
              "The shorter the prefix, the larger the subnet (more hosts).",
              "The longer the prefix, the smaller the subnet (fewer hosts).",
              "A /24 gives 256 total addresses (254 usable). A /26 gives 64 total (62 usable).",
              "Prefix length directly controls the block size and the step between subnets.",
              "Learning CIDR quickly makes subnetting predictable.",
              "Example: a /28 gives 16 total addresses (14 usable), perfect for a small printer or IoT VLAN."
            ],
            objectives: [
              "Read a CIDR prefix",
              "Relate prefix length to subnet size",
              "Calculate total vs usable addresses"
            ],
            summary: "CIDR prefixes describe subnet size and usable host counts."
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
              "Example: 10.0.5.64/26 has usable hosts .65–.126 with broadcast .127."
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
                xp: 40
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
              "Example: a school can keep student devices in one VLAN and staff devices in another.",
              "VLANs make it easier to apply policy and troubleshooting boundaries.",
              "You can think of VLANs like virtual switches: the same hardware, but separate logical networks.",
              "Common use cases include voice VLANs for IP phones and guest VLANs for visitors."
            ],
            objectives: [
              "Define a VLAN",
              "Explain why VLANs improve segmentation"
            ],
            summary: "VLANs separate traffic on shared switches and reduce broadcast noise."
          },
          {
            title: "802.1Q trunking",
            learn: "Trunk links tag frames so multiple VLANs can share the same link.",
            content: [
              "802.1Q adds a VLAN tag to Ethernet frames.",
              "Trunks carry traffic for multiple VLANs between switches or to routers.",
              "Access ports carry a single VLAN and do not tag frames.",
              "The native VLAN on a trunk is sent untagged, so keep native VLANs consistent end‑to‑end.",
              "Allowed VLAN lists limit which VLANs are permitted across a trunk for safety and clarity.",
              "Example: a trunk between two switches might carry VLAN 10 and VLAN 20 for two departments.",
              "If VLANs or the native VLAN mismatch, users see intermittent or one‑way connectivity."
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
              "Best practice: place unused access ports in an unused VLAN and shut them down."
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
                xp: 45
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
              "Each subinterface is assigned to a VLAN and acts as that VLAN’s gateway.",
              "This is common in smaller networks without Layer 3 switches.",
              "The switch port connected to the router must be a trunk carrying all required VLANs.",
              "If tagging is wrong, traffic will not reach the correct subinterface.",
              "Example: Gi0/0.10 can be VLAN 10 with IP 192.168.10.1/24, and Gi0/0.20 can be VLAN 20.",
              "Because all VLANs share one physical link, that link can become a bottleneck."
            ],
            objectives: [
              "Explain router-on-a-stick",
              "Identify when it’s used"
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
              "Remember to enable IP routing on the switch, or SVIs will not route traffic."
            ],
            objectives: [
              "Define an SVI",
              "Compare SVIs to router-on-a-stick"
            ],
            summary: "SVIs give each VLAN a gateway interface on a Layer 3 switch."
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
              "Check ARP and MAC tables to confirm the gateway and host are learned on the expected ports."
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
    estimatedTime: "5 hrs",
    xpReward: 900,
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
                xp: 40
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
              "Examples of high‑risk exposure include default SNMP communities and legacy management interfaces.",
              "Regular scans and configuration reviews keep the attack surface from creeping back over time."
            ],
            objectives: [
              "Define attack surface",
              "List common exposure points",
              "Explain why reduction matters"
            ],
            summary: "Smaller attack surfaces reduce risk and make defenses easier."
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
              "Harden the management plane with a separate management VLAN and strict access rules."
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
              "Central AAA makes offboarding fast and enforces consistent password policies."
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
                  options: ["Everyone has admin access", "Access is only what’s needed", "No authentication required"],
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
              "Stateful rules are typically simpler and safer for most networks.",
              "Stateful inspection reduces the need for separate inbound allow rules for established sessions.",
              "Stateless filtering can be faster but requires more careful rule design.",
              "Example: web browsing needs return traffic; stateless ACLs require explicit inbound allows.",
              "State tables consume memory, so tune timeouts for long‑lived connections."
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
              "ACLs are evaluated top‑down: the first match wins.",
              "Put specific allow/deny rules before general rules.",
              "Always include a default deny at the end when appropriate.",
              "Document each rule so future changes do not break intent.",
              "Use least privilege: allow only what is required, deny everything else.",
              "Group rules by zones (user VLAN to server VLAN) so intent is obvious.",
              "Object groups and naming conventions make large ACLs easier to maintain."
            ],
            objectives: [
              "Explain ACL order of operations",
              "Apply least privilege to rule design"
            ],
            summary: "Specific rules first, least privilege, and clear documentation."
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
              "Use counters or logs to clean up unused rules over time."
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
                xp: 40
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
              "Time sync (NTP) and log retention policies are critical for usable timelines."
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
              "IR phases: Prepare → Detect → Contain → Eradicate → Recover.",
              "Preparation and detection reduce mean time to respond.",
              "Document everything to improve future defenses.",
              "Containment limits damage; eradication removes root cause.",
              "Recovery restores services safely and validates that the threat is gone.",
              "Define roles, contacts, and communication channels before incidents happen.",
              "A post‑incident review turns lessons learned into better controls."
            ],
            objectives: [
              "List the IR phases",
              "Explain why documentation matters"
            ],
            summary: "A consistent IR process reduces downtime and long-term risk."
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
              "Baselines shift after major changes or seasonal peaks, so revisit them regularly."
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
