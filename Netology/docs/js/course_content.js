// ============================================================
// course_content.js — Netology Course Data
// One source of truth for all course curriculum.
//
// Structure per course:
//   COURSE_CONTENT["1"] = {
//     id, title, description, difficulty, required_level,
//     estimatedTime, xpReward, category,
//     units: [
//       {
//         title, about,
//         lessons:   [ { title, blocks, objectives } ],
//         quiz:      { title, xp, questions }  | undefined,
//         sandbox:   { title, xp, steps, tips } | undefined,
//         challenge: { title, xp, rules, steps, tips } | undefined
//       }
//     ]
//   }
// ============================================================

const COURSE_CONTENT = {
  "1": {
    id: "1",
    title: "Networking Foundations",
    description: "Build core networking knowledge from scratch: devices, Ethernet, IP basics, and how networks actually move data.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "5.5 hrs",
    xpReward: 840,
    category: "Core",
    units: [
      {
        title: "Unit 1: Network Basics",
        about: "Learn what networks are, why they exist, and how traffic moves across LANs, WANs, and the Internet.",
        lessons: [
          {
            title: "What is a network?",
            blocks: [
              {
                type: "text",
                text: [
                  "A network is any group of devices that exchange data using shared rules called protocols.",
                  "Devices include laptops, phones, printers, servers, cameras, and cloud services.",
                  "Networks are built from endpoints (users and servers) and infrastructure (switches, routers, Wi-Fi).",
                  "At home, your Wi-Fi router connects devices and shares one Internet connection.",
                  "At work, switches keep local traffic inside the office while routers connect to other sites.",
                  "Networks exist to share resources like files, printers, storage, and applications.",
                  "Network quality depends on three things: bandwidth (how much data can travel at once), latency (how long a journey takes), and packet loss (how often data must be re-sent).",
                  "Security is critical because shared access creates risk; allow the right traffic and block the wrong traffic.",
                  "Real-world example: a hospital separates medical devices from guest Wi-Fi to protect patient systems.",
                  "If you can describe the devices, links, and rules, you can explain how data moves end to end."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why protocols matter"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which example is a network?",
                options: [
                  "A single laptop working offline",
                  "Two laptops sharing files over Wi-Fi",
                  "A printer with no power"
                ],
                correctIndex: 1,
                explanation: "A network requires two or more devices communicating over a shared medium."
              }
            ],
            objectives: [
              "Define what a network is",
              "Identify common networked devices",
              "Explain why protocols are important",
              "Describe why networks exist"
            ],
            xp: 20
          },
          {
            title: "LAN vs WAN vs Internet",
            blocks: [
              {
                type: "text",
                text: [
                  "A LAN (Local Area Network) covers a small area like a home, office, or school building.",
                  "A WAN (Wide Area Network) connects multiple LANs over long distances using service providers.",
                  "The Internet is a global network of networks that all agree to use TCP/IP standards.",
                  "Example: a company has a LAN in Dublin and a LAN in London; a WAN link connects them.",
                  "LANs are usually faster and more predictable; WANs have higher latency and depend on carriers.",
                  "Ownership differs: you manage the LAN, but the WAN is shared with an Internet Service Provider or carrier.",
                  "Virtual Private Networks (VPNs) encrypt traffic across the Internet to keep WAN connections secure.",
                  "Knowing the scope helps you choose hardware, IP ranges, and troubleshooting steps."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why WANs feel slower"
              },
              {
                type: "check",
                title: "Quick check",
                question: "A connection between two offices in different cities is a:",
                options: [
                  "LAN",
                  "WAN",
                  "Personal Area Network"
                ],
                correctIndex: 1,
                explanation: "WANs connect LANs over long distances."
              }
            ],
            objectives: [
              "Compare LANs and WANs",
              "Recognize why the Internet is a network of networks",
              "Explain how LANs connect to WANs"
            ],
            xp: 20
          },
          {
            title: "Network roles and services",
            blocks: [
              {
                type: "text",
                text: [
                  "Networks are built around roles: clients request services, servers provide them, and peers share.",
                  "Common services include DHCP for IP addresses, DNS for names, file and print services, and authentication.",
                  "Central services make networks consistent so new devices can join without manual setup.",
                  "Example: a coffee shop uses DHCP for guests, while a school uses DNS to reach learning portals.",
                  "Authentication services control who can log in and which resources they can access.",
                  "Redundancy matters: two DNS servers prevent one failure from breaking name resolution.",
                  "Understanding roles helps you troubleshoot quickly when a service fails even if the network is up.",
                  "Benefit: clear roles improve reliability, security, and the overall user experience."
                ]
              },
              {
                type: "explain",
                title: "Explain: What happens when DNS fails"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which service assigns IP addresses automatically?",
                options: [
                  "DNS",
                  "DHCP",
                  "NTP"
                ],
                correctIndex: 1,
                explanation: "DHCP hands out IP addresses, subnet masks, and gateways."
              },
              {
                type: "activity",
                title: "Mini activity: Pick the right service",
                mode: "select",
                prompt: "A new laptop joins the Wi-Fi and needs an IP address. Which service should handle this?",
                options: [
                  "DNS",
                  "DHCP",
                  "File Server"
                ],
                correctIndex: 1,
                explanation: "DHCP is responsible for automatic IP configuration."
              }
            ],
            objectives: [
              "Identify client and server roles",
              "Describe common network services",
              "Explain why redundancy improves uptime"
            ],
            xp: 20
          },
          {
            title: "Topologies and traffic flow",
            blocks: [
              {
                type: "text",
                text: [
                  "Topology describes how devices are arranged: star, tree, mesh, ring, or bus.",
                  "Most modern LANs use a star topology with a switch at the center.",
                  "Mesh designs add redundancy by giving multiple paths, but cost and complexity increase.",
                  "Traffic types include unicast (one device to one device), broadcast (one device to all), and multicast (one device to a group).",
                  "Switches learn MAC addresses and forward unicast traffic only where it needs to go.",
                  "Broadcasts are useful for discovery like ARP, but too many can slow a network.",
                  "Example: a live video stream to many viewers can use multicast to save bandwidth.",
                  "Knowing the topology helps you plan growth and isolate failures when a link goes down."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why broadcasts are limited"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which traffic type reaches every device on the LAN?",
                options: [
                  "Unicast",
                  "Broadcast",
                  "Multicast"
                ],
                correctIndex: 1,
                explanation: "Broadcasts are sent to all devices in the broadcast domain."
              }
            ],
            objectives: [
              "Identify common topologies",
              "Describe unicast vs broadcast traffic",
              "Explain how switches direct traffic"
            ],
            xp: 20
          }
        ],
        quiz: {
          title: "Network basics quiz",
          xp: 80,
          questions: [
            {
              id: "q1",
              question: "Fill in the blank: A network that spans a single building is a ___.",
              options: [
                "LAN",
                "WAN",
                "MAN"
              ],
              correctAnswer: 0,
              explanation: "LANs are local networks within a building or campus."
            },
            {
              id: "q2",
              question: "The Internet is best described as a:",
              options: [
                "Single LAN",
                "Network of networks",
                "Single ISP"
              ],
              correctAnswer: 1,
              explanation: "The Internet connects many independent networks."
            },
            {
              id: "q3",
              question: "Which topology uses a central switch or hub?",
              options: [
                "Star",
                "Ring",
                "Bus"
              ],
              correctAnswer: 0,
              explanation: "Star topologies connect devices to a central point."
            },
            {
              id: "q4",
              question: "Broadcast traffic is sent to:",
              options: [
                "One device",
                "All devices in the LAN",
                "Only routers"
              ],
              correctAnswer: 1,
              explanation: "Broadcasts reach all devices in the broadcast domain."
            },
            {
              id: "q5",
              question: "A WAN typically connects:",
              options: [
                "Devices in one room",
                "LANs across long distances",
                "Only wireless devices"
              ],
              correctAnswer: 1,
              explanation: "WANs connect LANs over long distances."
            },
            {
              id: "q6",
              question: "Fill in the blank: Protocols are the ___ of communication.",
              options: [
                "rules",
                "cables",
                "ports"
              ],
              correctAnswer: 0,
              explanation: "Protocols define how devices communicate."
            },
            {
              id: "q7",
              question: "Which is an example of an endpoint?",
              options: [
                "Router",
                "Switch",
                "Laptop"
              ],
              correctAnswer: 2,
              explanation: "Endpoints are devices that generate or consume data."
            },
            {
              id: "q8",
              question: "In a star topology, if a single cable to a PC fails, the rest of the network is usually:",
              options: [
                "Down",
                "Still working",
                "Forced into a ring"
              ],
              correctAnswer: 1,
              explanation: "Only that one device is impacted in a star topology."
            },
            {
              id: "q9",
              question: "A device that provides files or services to others is called a:",
              options: [
                "Client",
                "Server",
                "Repeater"
              ],
              correctAnswer: 1,
              explanation: "Servers provide services that clients request."
            },
            {
              id: "q10",
              question: "Why use redundant services like two DNS servers?",
              options: [
                "It doubles Internet speed",
                "It improves availability if one fails",
                "It encrypts all traffic"
              ],
              correctAnswer: 1,
              explanation: "Redundancy keeps critical services available during outages."
            }
          ]
        },
        sandbox: {
          title: "Classify network types",
          xp: 40,
          steps: [
            {
              text: "Add a router to the canvas.",
              checks: [
                {
                  type: "device",
                  deviceType: "router",
                  count: 1
                }
              ]
            },
            {
              text: "Add a switch to the canvas.",
              checks: [
                {
                  type: "device",
                  deviceType: "switch",
                  count: 1
                }
              ]
            },
            {
              text: "Add two PCs.",
              checks: [
                {
                  type: "device",
                  deviceType: "pc",
                  count: 2
                }
              ]
            },
            {
              text: "Connect each PC to the switch.",
              checks: [
                {
                  type: "connection",
                  from: "pc",
                  to: "switch",
                  count: 2
                }
              ]
            },
            {
              text: "Connect the switch to the router.",
              checks: [
                {
                  type: "connection",
                  from: "switch",
                  to: "router",
                  count: 1
                }
              ]
            },
            {
              text: "Add an Internet cloud.",
              checks: [
                {
                  type: "device",
                  deviceType: "cloud",
                  count: 1
                }
              ]
            },
            {
              text: "Connect the router to the Internet cloud.",
              checks: [
                {
                  type: "connection",
                  from: "router",
                  to: "cloud",
                  count: 1
                }
              ]
            },
            {
              text: "Rename the router to include \"Gateway\" (example: Office Gateway).",
              checks: [
                {
                  type: "name_contains",
                  deviceType: "router",
                  contains: "Gateway",
                  count: 1
                }
              ],
              hint: "Select the router and edit its name in the Properties panel."
            }
          ],
          tips: "LAN is the local group behind the switch; the router is the gateway to the WAN/Internet."
        },
        challenge: {
          title: "Design a small office network",
          xp: 80,
          rules: {
            minDevices: 5,
            minConnections: 4,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 3
            }
          },
          steps: [
            "Add 1 router, 1 switch, and at least 3 PCs.",
            "Connect all PCs to the switch, then connect the switch to the router.",
            "Explain which devices are in the LAN and which device is the gateway."
          ],
          tips: "Think of the router as the path to the Internet and the switch as the local meeting point."
        }
      },
      {
        title: "Unit 2: Switching and Frames",
        about: "Explore how switches forward frames, how MAC addresses work, and why broadcasts matter.",
        lessons: [
          {
            title: "Switches, routers, and endpoints",
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
                  "Example: two PCs on the same switch communicate directly without involving the router.",
                  "If local traffic works but Internet access fails, the gateway or router path is the likely issue."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why routers are boundaries"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which device connects different networks together?",
                options: [
                  "Switch",
                  "Router",
                  "Access Point"
                ],
                correctIndex: 1,
                explanation: "Routers forward packets between networks."
              },
              {
                type: "activity",
                title: "Mini activity: Choose the path",
                mode: "select",
                prompt: "A PC needs to reach a website outside the LAN. Which device does it send traffic to first?",
                options: [
                  "Local switch",
                  "Default gateway",
                  "DNS server"
                ],
                correctIndex: 1,
                explanation: "Off-subnet traffic must go to the default gateway (router)."
              }
            ],
            objectives: [
              "Distinguish switches from routers",
              "Identify endpoints",
              "Explain where the default gateway fits"
            ],
            xp: 20
          },
          {
            title: "Ethernet frames and MAC addresses",
            blocks: [
              {
                type: "text",
                text: [
                  "An Ethernet frame includes destination MAC, source MAC, a type field, a payload, and an FCS (Frame Check Sequence) for error detection.",
                  "MAC addresses are 48-bit identifiers, typically written like 00:1A:2B:3C:4D:5E.",
                  "The first three groups of a MAC address identify the manufacturer; the last three groups are unique to the device.",
                  "Switches learn MAC addresses by reading the source MAC of incoming frames.",
                  "If the switch does not know the destination MAC, it floods the frame to all ports.",
                  "MAC tables age out over time, which lets the network adapt when devices move ports.",
                  "Example: when a laptop moves desks, the switch learns its new port automatically.",
                  "Understanding frame fields helps you debug why traffic is or is not flowing."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why MAC addresses stay local"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which field identifies who sent the frame?",
                options: [
                  "Destination MAC",
                  "Source MAC",
                  "FCS"
                ],
                correctIndex: 1,
                explanation: "The source MAC identifies the sender."
              }
            ],
            objectives: [
              "Describe the parts of an Ethernet frame",
              "Explain how MAC addresses are used",
              "Understand why switches flood unknown destinations"
            ],
            xp: 20
          },
          {
            title: "ARP and broadcast domains",
            blocks: [
              {
                type: "text",
                text: [
                  "ARP (Address Resolution Protocol) maps an IP address to a MAC address on the LAN.",
                  "When a device needs a MAC, it sends an ARP request as a broadcast — like shouting 'Who has this IP address?'",
                  "Only the device with that IP responds with its MAC address, and the sender caches it.",
                  "ARP caches reduce repeated broadcasts but must be refreshed over time.",
                  "Broadcasts stay within a broadcast domain, which is typically a single LAN or VLAN.",
                  "Routers do not forward broadcast traffic, so they naturally separate broadcast domains.",
                  "Example: a PC sends an ARP request for the gateway before sending traffic to the Internet.",
                  "If ARP fails, devices can have the right IP but still fail to communicate."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why routers block broadcasts"
              },
              {
                type: "check",
                title: "Quick check",
                question: "An ARP request is sent as:",
                options: [
                  "Unicast",
                  "Broadcast",
                  "Multicast"
                ],
                correctIndex: 1,
                explanation: "ARP requests are broadcast so all devices can hear them."
              },
              {
                type: "activity",
                title: "Mini activity: Choose the first step",
                mode: "select",
                prompt: "You know the IP but not the MAC. What should the device send first?",
                options: [
                  "ARP request",
                  "DNS query",
                  "ICMP echo reply"
                ],
                correctIndex: 0,
                explanation: "ARP discovers the MAC address for a known IP on the LAN."
              }
            ],
            objectives: [
              "Explain how ARP works",
              "Define a broadcast domain",
              "Describe why routers block broadcasts"
            ],
            xp: 20
          },
          {
            title: "Switching loops and STP basics",
            blocks: [
              {
                type: "text",
                text: [
                  "Redundant links improve resilience, but unmanaged loops can bring down a LAN in seconds.",
                  "Loops cause broadcast storms and confuse switches into constantly updating their address tables.",
                  "Spanning Tree Protocol (STP) builds a loop-free topology by blocking some redundant links.",
                  "STP elects a root bridge — the switch that all other switches use as their reference point for path calculations.",
                  "If a primary link fails, STP can reconverge and open a previously blocked path.",
                  "Example: two switches with two uplinks will have one link blocked to prevent loops.",
                  "Using STP keeps redundancy without causing instability.",
                  "Tip: PortFast skips the slow startup stages of STP on access ports, so end devices like PCs connect immediately."
                ]
              },
              {
                type: "explain",
                title: "Explain: What happens during reconvergence"
              },
              {
                type: "check",
                title: "Quick check",
                question: "STP primarily prevents:",
                options: [
                  "Layer 2 loops",
                  "IP conflicts",
                  "DHCP failures"
                ],
                correctIndex: 0,
                explanation: "STP prevents Layer 2 loops and broadcast storms."
              }
            ],
            objectives: [
              "Explain why loops are harmful",
              "Describe what STP does",
              "Identify why redundancy still matters"
            ],
            xp: 20
          }
        ],
        quiz: {
          title: "Ethernet and switching quiz",
          xp: 80,
          questions: [
            {
              id: "q1",
              question: "Fill in the blank: A switch forwards frames based on ___ addresses.",
              options: [
                "MAC",
                "IP",
                "DNS"
              ],
              correctAnswer: 0,
              explanation: "Switches use MAC addresses to forward frames."
            },
            {
              id: "q2",
              question: "Routers primarily operate at which OSI layer?",
              options: [
                "Layer 3",
                "Layer 2",
                "Layer 1"
              ],
              correctAnswer: 0,
              explanation: "Routers forward packets at Layer 3."
            },
            {
              id: "q3",
              question: "ARP is used to map:",
              options: [
                "IP to MAC",
                "MAC to IP",
                "DNS to IP"
              ],
              correctAnswer: 0,
              explanation: "ARP resolves IP addresses to MAC addresses."
            },
            {
              id: "q4",
              question: "A broadcast domain is typically bounded by a:",
              options: [
                "Router",
                "Switch",
                "Hub"
              ],
              correctAnswer: 0,
              explanation: "Routers stop broadcasts and separate domains."
            },
            {
              id: "q5",
              question: "Ethernet frames include a ___ for error detection.",
              options: [
                "FCS",
                "TTL",
                "DHCP"
              ],
              correctAnswer: 0,
              explanation: "The FCS (Frame Check Sequence) is used to detect errors."
            },
            {
              id: "q6",
              question: "If a switch does not know a destination MAC, it will:",
              options: [
                "Flood the frame",
                "Drop the frame",
                "Route the frame"
              ],
              correctAnswer: 0,
              explanation: "Unknown unicast frames are flooded."
            },
            {
              id: "q7",
              question: "Fill in the blank: Endpoints are devices that ___ data.",
              options: [
                "generate or consume",
                "only forward",
                "only encrypt"
              ],
              correctAnswer: 0,
              explanation: "Endpoints are the sources and destinations of data."
            },
            {
              id: "q8",
              question: "STP is primarily used to prevent:",
              options: [
                "Routing loops",
                "Layer 2 loops",
                "IP conflicts"
              ],
              correctAnswer: 1,
              explanation: "Spanning Tree prevents Layer 2 loops and broadcast storms."
            },
            {
              id: "q9",
              question: "PortFast should be enabled on:",
              options: [
                "Access ports to end devices",
                "Trunk links between switches",
                "Router uplinks only"
              ],
              correctAnswer: 0,
              explanation: "PortFast skips STP startup stages on access ports so end devices connect immediately."
            }
          ]
        },
        sandbox: {
          title: "Trace a frame on a LAN",
          xp: 40,
          steps: [
            {
              text: "Add one switch to the canvas.",
              checks: [
                {
                  type: "device",
                  deviceType: "switch",
                  count: 1
                }
              ]
            },
            {
              text: "Add two PCs.",
              checks: [
                {
                  type: "device",
                  deviceType: "pc",
                  count: 2
                }
              ]
            },
            {
              text: "Connect each PC to the switch with Ethernet.",
              checks: [
                {
                  type: "connection",
                  from: "pc",
                  to: "switch",
                  count: 2
                }
              ]
            },
            {
              text: "Add a third PC to create an unknown destination.",
              checks: [
                {
                  type: "device",
                  deviceType: "pc",
                  count: 3
                }
              ]
            },
            {
              text: "Explain how the switch learns the source MAC address.",
              hint: "Switches learn the source MAC from incoming frames."
            },
            {
              text: "Explain why unknown destinations are flooded to all ports.",
              hint: "Switches flood until they learn where a MAC lives."
            }
          ],
          tips: "Switches learn MACs from source addresses and flood unknown destinations."
        },
        challenge: {
          title: "Build a two-switch LAN",
          xp: 80,
          rules: {
            minDevices: 6,
            minConnections: 5,
            requiredTypes: {
              switch: 2,
              pc: 4
            }
          },
          steps: [
            "Add two switches and connect them with an uplink.",
            "Connect at least two PCs to each switch.",
            "Explain how a switch learns MAC addresses as frames move."
          ],
          tips: "Switches learn by reading source MACs; unknown destinations are flooded."
        }
      },
      {
        title: "Unit 3: IPv4 and Core Services",
        about: "Learn how IP addresses work, why subnets exist, and how DNS/DHCP keep networks usable.",
        lessons: [
          {
            title: "IPv4 addresses",
            blocks: [
              {
                type: "text",
                text: [
                  "An IPv4 address is a 32-bit value written in dotted decimal, like 192.168.1.20.",
                  "Think of it like a postal address: it tells routers exactly where to deliver each packet.",
                  "The address is split into a network portion and a host portion using the subnet mask.",
                  "Devices on the same network portion can communicate directly without a router.",
                  "Public IPs are reachable on the Internet; private IPs are used inside local networks.",
                  "Private ranges include 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.",
                  "Most home networks use private IPs with NAT (Network Address Translation) to share one public address.",
                  "Address conflicts cause intermittent issues that look like random outages."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why private IPs exist"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which range is private?",
                options: [
                  "10.0.0.0/8",
                  "8.8.8.0/24",
                  "1.1.1.0/24"
                ],
                correctIndex: 0,
                explanation: "10.0.0.0/8 is a private IPv4 range."
              }
            ],
            objectives: [
              "Describe IPv4 addressing",
              "Recognize private address ranges",
              "Explain why IP accuracy matters"
            ],
            xp: 20
          },
          {
            title: "Subnet masks and gateways",
            blocks: [
              {
                type: "text",
                text: [
                  "A subnet mask tells a device which portion of an IP address is the network.",
                  "A common mask is 255.255.255.0, also written as /24 — meaning the first 24 bits identify the network.",
                  "If the destination IP is in the same subnet, traffic stays on the LAN and no router is needed.",
                  "If the destination is outside the subnet, the device sends traffic to the default gateway.",
                  "The default gateway is typically the router's interface on that LAN.",
                  "Wrong masks or gateways are one of the most common causes of connectivity issues.",
                  "Example: a PC can reach printers but not the Internet because the gateway is missing or wrong.",
                  "Subnets also keep broadcast traffic smaller, which makes large networks easier to manage."
                ]
              },
              {
                type: "explain",
                title: "Explain: Symptoms of a wrong mask"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which value tells a host what is local?",
                options: [
                  "Subnet mask",
                  "DNS server",
                  "MAC address"
                ],
                correctIndex: 0,
                explanation: "The subnet mask defines which addresses are local."
              },
              {
                type: "activity",
                title: "Mini activity: Local or gateway?",
                mode: "select",
                prompt: "A host has 192.168.10.5/24 and wants to reach 192.168.10.77. How should it send the traffic?",
                options: [
                  "Directly on the LAN",
                  "To the default gateway",
                  "To DNS"
                ],
                correctIndex: 0,
                explanation: "Same /24 means the traffic is local."
              }
            ],
            objectives: [
              "Interpret subnet masks",
              "Explain the role of the default gateway",
              "Identify common addressing mistakes"
            ],
            xp: 20
          },
          {
            title: "IP planning and common mistakes",
            blocks: [
              {
                type: "text",
                text: [
                  "Start with a simple plan that separates users, servers, printers, and guests into different subnets.",
                  "Reserve small blocks for infrastructure devices like routers, switches, and access points.",
                  "Avoid overlapping ranges when multiple sites connect or when VLANs are added later.",
                  "Use a consistent pattern, such as 10.10.1.0/24 for staff and 10.10.2.0/24 for guests.",
                  "Document address assignments and keep track of static IPs to prevent conflicts.",
                  "Remember that the .0 address is the network address and .255 is the broadcast address in a /24 — neither can be assigned to a host.",
                  "Example: a printer with a static IP ensures users never lose access after DHCP changes.",
                  "Good IP planning makes growth easy and reduces downtime when things go wrong."
                ]
              },
              {
                type: "explain",
                title: "Explain: Overlapping subnets"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Why should you document static IPs?",
                options: [
                  "To increase bandwidth",
                  "To avoid address conflicts",
                  "To speed up DNS"
                ],
                correctIndex: 1,
                explanation: "Tracking static IPs prevents two devices from using the same address."
              }
            ],
            objectives: [
              "Explain why IP planning matters",
              "List common addressing mistakes",
              "Describe a simple planning approach"
            ],
            xp: 20
          },
          {
            title: "DHCP and DNS essentials",
            blocks: [
              {
                type: "text",
                text: [
                  "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses to hosts so you do not have to configure each device by hand.",
                  "The DHCP process follows four steps known as DORA: Discover, Offer, Request, Acknowledge.",
                  "DHCP also distributes the subnet mask, default gateway, and DNS server address.",
                  "Reservations allow a specific device to always receive the same IP based on its MAC address.",
                  "DNS (Domain Name System) translates human-friendly names like example.com into IP addresses.",
                  "Without DNS, you would need to remember the IP address of every website and service.",
                  "DNS caching speeds up lookups and reduces traffic to authoritative servers.",
                  "If DNS is misconfigured, services may be running but unreachable by name."
                ]
              },
              {
                type: "explain",
                title: "Explain: Symptoms when DHCP fails"
              },
              {
                type: "check",
                title: "Quick check",
                question: "In DHCP, the client sends a ___ first.",
                options: [
                  "Discover",
                  "Offer",
                  "Acknowledge"
                ],
                correctIndex: 0,
                explanation: "The client starts the process with a Discover message."
              },
              {
                type: "activity",
                title: "Mini activity: Diagnose the issue",
                mode: "select",
                prompt: "Users can reach 8.8.8.8 by IP but not example.com by name. Which service is likely the issue?",
                options: [
                  "DNS",
                  "DHCP",
                  "Switching"
                ],
                correctIndex: 0,
                explanation: "If IP works but names fail, DNS is the culprit."
              }
            ],
            objectives: [
              "Explain the DHCP DORA process",
              "Describe what DNS does",
              "Identify symptoms of DNS or DHCP issues"
            ],
            xp: 20
          }
        ],
        quiz: {
          title: "IP basics quiz",
          xp: 80,
          questions: [
            {
              id: "q1",
              question: "Fill in the blank: An IPv4 address has ___ bits.",
              options: [
                "32",
                "48",
                "64"
              ],
              correctAnswer: 0,
              explanation: "IPv4 uses 32-bit addresses."
            },
            {
              id: "q2",
              question: "A subnet mask of 255.255.255.0 is written as:",
              options: [
                "/24",
                "/16",
                "/30"
              ],
              correctAnswer: 0,
              explanation: "/24 means 24 network bits."
            },
            {
              id: "q3",
              question: "The default gateway is used when traffic is:",
              options: [
                "Destined outside the local subnet",
                "Staying within the subnet",
                "Broadcast-only"
              ],
              correctAnswer: 0,
              explanation: "Gateways are for off-subnet traffic."
            },
            {
              id: "q4",
              question: "DHCP stands for:",
              options: [
                "Dynamic Host Configuration Protocol",
                "Domain Host Control Protocol",
                "Distributed Host Cache Protocol"
              ],
              correctAnswer: 0,
              explanation: "DHCP automates IP configuration."
            },
            {
              id: "q5",
              question: "DNS translates:",
              options: [
                "Names to IPs",
                "IPs to MACs",
                "MACs to names"
              ],
              correctAnswer: 0,
              explanation: "DNS resolves names to IP addresses."
            },
            {
              id: "q6",
              question: "Which of the following is a private IPv4 range?",
              options: [
                "10.0.0.0/8",
                "8.8.8.0/24",
                "1.1.1.0/24"
              ],
              correctAnswer: 0,
              explanation: "10.0.0.0/8 is private."
            },
            {
              id: "q7",
              question: "If a host can reach local devices but not the Internet, check the:",
              options: [
                "Default gateway",
                "Switch port speed",
                "MAC address table"
              ],
              correctAnswer: 0,
              explanation: "A wrong gateway blocks off-subnet traffic."
            },
            {
              id: "q8",
              question: "In DHCP, the first message a client sends is:",
              options: [
                "Discover",
                "Offer",
                "Request"
              ],
              correctAnswer: 0,
              explanation: "The client starts with a Discover message."
            },
            {
              id: "q9",
              question: "Which practice helps prevent IP conflicts?",
              options: [
                "Documenting static IPs and reservations",
                "Using random IPs",
                "Disabling DHCP"
              ],
              correctAnswer: 0,
              explanation: "Tracking static IPs and reservations prevents overlaps."
            },
            {
              id: "q10",
              question: "Overlapping subnets between sites usually cause:",
              options: [
                "Faster routing",
                "Routing and reachability problems",
                "Better security"
              ],
              correctAnswer: 1,
              explanation: "Overlaps create ambiguous routes and broken connectivity."
            }
          ]
        },
        sandbox: {
          title: "Assign IP details",
          xp: 40,
          steps: [
            {
              text: "Add a router to the canvas.",
              checks: [
                {
                  type: "device",
                  deviceType: "router",
                  count: 1
                }
              ]
            },
            {
              text: "Add a switch.",
              checks: [
                {
                  type: "device",
                  deviceType: "switch",
                  count: 1
                }
              ]
            },
            {
              text: "Add two PCs.",
              checks: [
                {
                  type: "device",
                  deviceType: "pc",
                  count: 2
                }
              ]
            },
            {
              text: "Connect both PCs to the switch.",
              checks: [
                {
                  type: "connection",
                  from: "pc",
                  to: "switch",
                  count: 2
                }
              ]
            },
            {
              text: "Connect the switch to the router.",
              checks: [
                {
                  type: "connection",
                  from: "switch",
                  to: "router",
                  count: 1
                }
              ]
            },
            {
              text: "Set IP addresses on both PCs in the same /24 (example: 192.168.10.10 and 192.168.10.11).",
              checks: [
                {
                  type: "ip",
                  deviceType: "pc",
                  count: 2
                }
              ],
              hint: "Select a PC, open Properties, and enter the IP address."
            },
            {
              text: "Set the default gateway on both PCs (example: 192.168.10.1).",
              checks: [
                {
                  type: "gateway",
                  deviceType: "pc",
                  count: 2
                }
              ],
              hint: "The gateway should match the router's LAN interface."
            }
          ],
          tips: "Devices in the same /24 talk directly; the gateway is used for off-subnet traffic."
        },
        challenge: {
          title: "Subnet a small office",
          xp: 80,
          rules: {
            minDevices: 5,
            minConnections: 4,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 3
            }
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
  },
  "2": {
    id: "2",
    title: "Ethernet & Switching Basics",
    description: "Go deeper into how switches work, explore VLAN concepts, and practise building switched networks from scratch.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "1.2 hrs",
    xpReward: 240,
    category: "Switching",
    units: [
      {
        title: "Unit 1: Switching 101",
        about: "Understand how switches learn and forward frames, and how to prevent dangerous loops.",
        lessons: [
          {
            title: "Switch vs hub",
            blocks: [
              {
                type: "text",
                text: [
                  "A hub is a simple device that repeats every incoming frame out every port — every device sees every frame, whether it was meant for them or not.",
                  "A switch is smarter: it learns which MAC address lives on which port by reading the source address of every incoming frame.",
                  "When a switch knows the destination MAC, it sends the frame only to the correct port — this is called unicast forwarding.",
                  "If the destination is unknown, the switch floods the frame to all ports except the source — just like a hub would, but only until it learns.",
                  "Over time the MAC address table fills in and almost all traffic is forwarded efficiently.",
                  "Hubs create one shared collision domain; switches give each port its own collision domain.",
                  "This means switches handle much higher throughput and support full-duplex on every port, so devices can send and receive simultaneously."
                ]
              },
              {
                type: "explain",
                title: "Explain: MAC address learning in detail"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What does a switch do when it does not know the destination MAC?",
                options: [
                  "Drops the frame",
                  "Floods to all ports except the source",
                  "Sends it to the router"
                ],
                correctIndex: 1,
                explanation: "Unknown unicast frames are flooded until the switch learns the destination."
              }
            ],
            objectives: [
              "Compare how hubs and switches forward frames",
              "Explain MAC address learning and ageing",
              "Describe why switches are preferred over hubs"
            ],
            xp: 20
          },
          {
            title: "Spanning Tree basics",
            blocks: [
              {
                type: "text",
                text: [
                  "Redundant links between switches improve availability — if one cable fails, another takes over.",
                  "However, without any control, redundant links create switching loops: frames circle endlessly and the network crashes within seconds.",
                  "Spanning Tree Protocol (STP) solves this by electing a root bridge and blocking redundant paths.",
                  "The root bridge is the switch with the lowest Bridge ID — all path costs in the network are calculated relative to it.",
                  "Each non-root switch finds its shortest path to the root bridge; ports on other paths are placed in blocking state.",
                  "If an active link fails, STP detects the change, recalculates, and unblocks a previously blocked port.",
                  "Modern variants like Rapid STP (RSTP) converge much faster than the original 802.1D standard, reducing downtime after a failure."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why loops are dangerous"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What role does the root bridge play in STP?",
                options: [
                  "It blocks all traffic",
                  "It is the reference point for path calculations",
                  "It assigns IP addresses"
                ],
                correctIndex: 1,
                explanation: "All STP path costs are calculated relative to the root bridge."
              }
            ],
            objectives: [
              "Explain why switching loops are dangerous",
              "Describe how STP elects a root bridge",
              "Explain how STP prevents loops while keeping backup paths available"
            ],
            xp: 20
          }
        ],
        quiz: {
          title: "Switching quick check",
          xp: 80,
          questions: [
            {
              id: "q1",
              question: "Why is STP used?",
              options: [
                "To encrypt frames",
                "To prevent Layer 2 loops",
                "To assign IPs"
              ],
              correctAnswer: 1,
              explanation: "STP prevents Layer 2 loops that would cause broadcast storms."
            },
            {
              id: "q2",
              question: "A hub forwards frames to:",
              options: [
                "A single port only",
                "All ports",
                "Only the destination MAC"
              ],
              correctAnswer: 1,
              explanation: "Hubs flood all traffic to every port."
            },
            {
              id: "q3",
              question: "If two switches have redundant links and STP is disabled, what is the biggest risk?",
              options: [
                "Broadcast storms and unstable MAC learning",
                "Improved throughput with no downside",
                "Automatic VLAN creation"
              ],
              correctAnswer: 0,
              explanation: "Without STP, loops can create broadcast storms and MAC table flapping."
            },
            {
              id: "q4",
              question: "What does convergence mean in STP?",
              options: [
                "The network recalculates and settles on a stable forwarding topology",
                "Every port forwards at once",
                "Routers advertise BGP routes"
              ],
              correctAnswer: 0,
              explanation: "Convergence is the process of recalculating and stabilising the loop-free topology."
            }
          ]
        },
        sandbox: {
          title: "Inspect MAC tables",
          xp: 40,
          steps: [
            {
              text: "Add a switch and two PCs.",
              checks: [
                {
                  type: "device",
                  deviceType: "switch",
                  count: 1
                },
                {
                  type: "device",
                  deviceType: "pc",
                  count: 2
                }
              ]
            },
            {
              text: "Connect both PCs to the switch.",
              checks: [
                {
                  type: "connection",
                  from: "pc",
                  to: "switch",
                  count: 2
                }
              ]
            },
            {
              text: "Open the switch config panel and note the MAC table section.",
              hint: "Select the switch and look for the MAC address table in Properties."
            },
            {
              text: "Explain how traffic from each PC would populate the table.",
              hint: "Each incoming frame teaches the switch which port that MAC address is on."
            }
          ],
          tips: "MAC tables map source MAC addresses to the port they were learned on."
        },
        challenge: {
          title: "Design a resilient switched LAN",
          xp: 80,
          rules: {
            minDevices: 6,
            minConnections: 5,
            requiredTypes: {
              switch: 2,
              pc: 4
            }
          },
          steps: [
            "Build a LAN with two switches and at least four PCs.",
            "Connect at least two PCs to each switch and create one inter-switch uplink.",
            "Document how the switches will learn MAC addresses and why STP is important if you add redundancy."
          ],
          tips: "Keep the design simple first, then explain how STP protects the network when redundant links are present."
        }
      }
    ]
  },
  "3": {
    id: "3",
    title: "IP Addressing Essentials",
    description: "Understand private vs public IPs, how NAT works, and why address planning matters in real networks.",
    difficulty: "novice",
    required_level: 1,
    estimatedTime: "1.4 hrs",
    xpReward: 240,
    category: "IP",
    units: [
      {
        title: "Unit 1: IPv4 Essentials",
        about: "Explore how IPv4 addresses are structured, where private ranges come from, and how NAT lets private networks reach the Internet.",
        lessons: [
          {
            title: "IPv4 address classes",
            blocks: [
              {
                type: "text",
                text: [
                  "IPv4 addresses are 32 bits long, written as four numbers separated by dots (for example, 192.168.1.1).",
                  "Historically, addresses were divided into classes based on the first number: Class A (1-126), Class B (128-191), and Class C (192-223).",
                  "Class A gave huge organisations millions of host addresses; Class C gave small organisations up to 254 hosts.",
                  "Classful addressing was wasteful — a company needing 500 hosts had to take a full Class B block with over 65,000 addresses.",
                  "Modern networking uses CIDR (Classless Inter-Domain Routing) to size networks precisely, fitting the number of addresses to the actual need.",
                  "Even though classes are obsolete, the three private IP ranges still follow the old class boundaries: 10.0.0.0/8 (Class A), 172.16.0.0/12 (Class B), and 192.168.0.0/16 (Class C)."
                ]
              },
              {
                type: "explain",
                title: "Explain: Why classful addressing is obsolete"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which class of IPv4 address starts with 192?",
                options: [
                  "Class A",
                  "Class B",
                  "Class C"
                ],
                correctIndex: 2,
                explanation: "Class C addresses range from 192 to 223 in the first octet."
              }
            ],
            objectives: [
              "Identify IPv4 address classes by their first octet",
              "List the three private IP ranges",
              "Explain why CIDR replaced classful addressing"
            ],
            xp: 20
          },
          {
            title: "Private vs public IPs",
            blocks: [
              {
                type: "text",
                text: [
                  "Public IP addresses are globally unique and routable anywhere on the Internet — like a building's street address.",
                  "Private IP addresses are reserved for use inside organisations and cannot be routed publicly — they are like internal room numbers.",
                  "The three private ranges are: 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16.",
                  "NAT (Network Address Translation) is what lets devices with private IPs reach the Internet: the router replaces the private source IP with its public IP before sending traffic out.",
                  "Return traffic comes back to the public IP, and the router uses its translation table to forward it to the correct private device.",
                  "Using private IPs conserves the limited pool of IPv4 addresses and adds a layer of obscurity for internal devices."
                ]
              },
              {
                type: "explain",
                title: "Explain: How NAT works step by step"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What allows private IPs to access the Internet?",
                options: [
                  "DNS",
                  "NAT",
                  "DHCP"
                ],
                correctIndex: 1,
                explanation: "NAT (Network Address Translation) translates private IPs to a public IP for Internet access."
              }
            ],
            objectives: [
              "Distinguish private from public IP addresses",
              "Explain how NAT enables Internet access for private devices",
              "List the three private IP ranges"
            ],
            xp: 20
          }
        ],
        quiz: {
          title: "Addressing quick check",
          xp: 80,
          questions: [
            {
              id: "q1",
              question: "Which is a private IP range?",
              options: [
                "8.8.8.0/24",
                "10.0.0.0/8",
                "1.1.1.0/24"
              ],
              correctAnswer: 1,
              explanation: "10.0.0.0/8 is one of the three private IPv4 ranges."
            },
            {
              id: "q2",
              question: "Public IPs are:",
              options: [
                "Only used inside LANs",
                "Globally routable on the Internet",
                "Only for servers"
              ],
              correctAnswer: 1,
              explanation: "Public IPs are globally routable and reachable from anywhere on the Internet."
            },
            {
              id: "q3",
              question: "What does NAT do at the network edge?",
              options: [
                "Translates private source IPs to a public IP",
                "Encrypts all traffic end-to-end",
                "Assigns hostnames to PCs"
              ],
              correctAnswer: 0,
              explanation: "NAT changes the source IP from private to public so internal hosts can communicate externally."
            },
            {
              id: "q4",
              question: "Which address is private?",
              options: [
                "192.168.10.25",
                "203.0.113.8",
                "8.8.8.8"
              ],
              correctAnswer: 0,
              explanation: "192.168.0.0/16 is private; the others are public examples."
            }
          ]
        },
        sandbox: {
          title: "Configure a private LAN",
          xp: 40,
          steps: [
            {
              text: "Add one router, one switch, and two PCs.",
              checks: [
                {
                  type: "device",
                  deviceType: "router",
                  count: 1
                },
                {
                  type: "device",
                  deviceType: "switch",
                  count: 1
                },
                {
                  type: "device",
                  deviceType: "pc",
                  count: 2
                }
              ]
            },
            {
              text: "Connect both PCs to the switch, and connect the switch to the router.",
              checks: [
                {
                  type: "connection",
                  from: "pc",
                  to: "switch",
                  count: 2
                },
                {
                  type: "connection",
                  from: "switch",
                  to: "router",
                  count: 1
                }
              ]
            },
            {
              text: "Assign a private IPv4 address to each PC (for example 192.168.50.10 and 192.168.50.11).",
              checks: [
                {
                  type: "ip",
                  deviceType: "pc",
                  count: 2
                }
              ],
              hint: "Use the device properties panel to set each PC IP address."
            },
            {
              text: "Set the default gateway on both PCs (for example 192.168.50.1).",
              checks: [
                {
                  type: "gateway",
                  deviceType: "pc",
                  count: 2
                }
              ],
              hint: "Use the router LAN IP as the gateway for both hosts."
            }
          ],
          tips: "Keep both hosts in the same subnet and use the router as the gateway for off-subnet traffic."
        },
        challenge: {
          title: "Plan an office IP layout",
          xp: 80,
          rules: {
            minDevices: 5,
            minConnections: 4,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 3
            }
          },
          steps: [
            "Create a network with one router, one switch, and at least three PCs.",
            "Connect all PCs to the switch and connect the switch to the router.",
            "Use a private IPv4 range and document which address should be the default gateway.",
            "Explain how NAT would let these private hosts access public Internet services."
          ],
          tips: "Focus on clean address planning first, then describe where NAT is applied (on the router edge)."
        }
      }
    ]
  },
  "4": {
    id: "4",
    title: "Subnetting & VLANs",
    description: "Design efficient subnets, segment networks with VLANs, and connect them securely with inter-VLAN routing.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "6 hrs",
    xpReward: 1050,
    category: "Routing",
    units: [
      {
        title: "Unit 1: Subnetting Fundamentals",
        about: "Learn why subnetting matters and how CIDR works.",
        lessons: [
          {
            title: "Why subnet?",
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
                title: "Explain: Broadcast domains and subnets"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What limits broadcasts to just one subnet?",
                options: [
                  "Switches",
                  "Routers",
                  "Gateways"
                ],
                correctIndex: 1,
                explanation: "Routers separate broadcast domains; broadcasts never cross a router."
              }
            ],
            objectives: [
              "Explain why subnetting is used",
              "Describe how broadcasts are reduced",
              "Explain how subnetting improves security"
            ],
            xp: 25
          },
          {
            title: "CIDR and prefix lengths",
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
                title: "Explain: Block size formula"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is the block size for a /25?",
                options: [
                  "64",
                  "128",
                  "256"
                ],
                correctIndex: 1,
                explanation: "A /25 gives 128 addresses per subnet; networks start at .0, .128."
              }
            ],
            objectives: [
              "Read a CIDR prefix",
              "Relate prefix length to subnet size",
              "Calculate total vs usable addresses"
            ],
            xp: 25
          },
          {
            title: "VLSM and subnet strategy",
            blocks: [
              {
                type: "text",
                text: [
                  "VLSM (Variable Length Subnet Masking) allows different subnet sizes inside the same address block.",
                  "Start by listing your requirements from largest to smallest to avoid running out of space.",
                  "Large departments might need a /24, while a server segment might only need a /28.",
                  "Example: one /22 can be split into one /23 for users, two /25s for labs, and several /28s for devices.",
                  "VLSM reduces wasted addresses and keeps growth options open.",
                  "Document the plan so teams do not accidentally overlap ranges later.",
                  "Tip: leave buffer space between critical subnets for future expansion.",
                  "A good VLSM plan makes scaling easier and avoids costly renumbering."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Why ordering matters"
              },
              {
                type: "check",
                question: "VLSM allows you to:",
                options: [
                  "Use only one subnet size",
                  "Mix different subnet sizes in one block",
                  "Avoid using subnet masks"
                ],
                correctIndex: 1,
                explanation: "VLSM supports different subnet sizes in the same address block."
              }
            ],
            objectives: [
              "Explain what VLSM is",
              "Plan subnets of different sizes",
              "Describe why ordering matters"
            ],
            xp: 25
          },
          {
            title: "Subnetting by hand",
            blocks: [
              {
                type: "text",
                text: [
                  "Subnetting by hand starts with the block size: 256 minus the mask in the interesting octet.",
                  "Example: /26 has mask 255.255.255.192, so block size is 256 - 192 = 64.",
                  "That means subnets start at .0, .64, .128, and .192.",
                  "Each subnet has a network address, usable host range, and broadcast address.",
                  "Knowing these ranges helps you avoid overlapping subnets and misconfigurations.",
                  "You can always verify by counting: total addresses = block size, usable = total - 2.",
                  "Example: 10.0.5.64/26 has usable hosts .65 to .126 with broadcast .127.",
                  "With practice, manual subnetting becomes quick and reliable."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Usable addresses"
              },
              {
                type: "check",
                question: "A /26 subnet has how many usable hosts?",
                options: [
                  "62",
                  "126",
                  "254"
                ],
                correctIndex: 0,
                explanation: "A /26 has 64 total addresses, 62 usable."
              }
            ],
            objectives: [
              "Calculate block sizes",
              "Find network and broadcast addresses",
              "Avoid overlapping subnets"
            ],
            xp: 25
          }
        ],
        quiz: {
          title: "Subnetting fundamentals quiz",
          xp: 100,
          questions: [
            {
              id: "q1",
              question: "Fill in the blank: A /24 has ___ total addresses.",
              options: [
                "256",
                "128",
                "64"
              ],
              correctAnswer: 0,
              explanation: "A /24 has 256 total addresses."
            },
            {
              id: "q2",
              question: "A /26 subnet has how many usable hosts?",
              options: [
                "62",
                "126",
                "254"
              ],
              correctAnswer: 0,
              explanation: "A /26 has 64 total, 62 usable."
            },
            {
              id: "q3",
              question: "Subnetting helps by:",
              options: [
                "Increasing broadcast traffic",
                "Reducing broadcast domains",
                "Eliminating routers"
              ],
              correctAnswer: 1,
              explanation: "Subnetting reduces broadcast domains."
            },
            {
              id: "q4",
              question: "CIDR /30 is commonly used for:",
              options: [
                "Point-to-point links",
                "Large LANs",
                "Wireless only"
              ],
              correctAnswer: 0,
              explanation: "A /30 is common for point-to-point links."
            },
            {
              id: "q5",
              question: "Fill in the blank: The shorter the prefix, the ___ the subnet.",
              options: [
                "larger",
                "smaller",
                "safer"
              ],
              correctAnswer: 0,
              explanation: "Shorter prefixes mean larger subnets."
            },
            {
              id: "q6",
              question: "Which mask matches /27?",
              options: [
                "255.255.255.224",
                "255.255.255.0",
                "255.255.255.248"
              ],
              correctAnswer: 0,
              explanation: "/27 corresponds to 255.255.255.224."
            },
            {
              id: "q7",
              question: "Network address of 192.168.10.64/26 is:",
              options: [
                "192.168.10.64",
                "192.168.10.65",
                "192.168.10.1"
              ],
              correctAnswer: 0,
              explanation: "The network address is the first address in the block."
            },
            {
              id: "q8",
              question: "Broadcast address of 192.168.10.64/26 is:",
              options: [
                "192.168.10.127",
                "192.168.10.95",
                "192.168.10.63"
              ],
              correctAnswer: 0,
              explanation: "The broadcast is the last address in the block."
            },
            {
              id: "q9",
              question: "VLSM allows you to:",
              options: [
                "Use multiple subnet sizes in one address block",
                "Avoid subnetting entirely",
                "Eliminate routing"
              ],
              correctAnswer: 0,
              explanation: "VLSM supports different subnet sizes in the same block."
            },
            {
              id: "q10",
              question: "When planning VLSM, you should allocate subnets in what order?",
              options: [
                "Largest to smallest",
                "Smallest to largest",
                "Randomly"
              ],
              correctAnswer: 0,
              explanation: "Starting with the largest prevents running out of space."
            }
          ]
        },
        sandbox: {
          title: "Calculate subnet ranges",
          xp: 50,
          steps: [
            "Add a router, a switch, and four PCs.",
            "Connect all PCs to the switch and the switch to the router.",
            "Assign two PCs to 192.168.10.0/26 (example: .10 and .20).",
            "Assign two PCs to 192.168.10.64/26 (example: .70 and .80)."
          ],
          tips: "A /26 has 64 addresses; the network IDs here are .0 and .64."
        },
        challenge: {
          title: "Design two subnets for a small business",
          xp: 100,
          rules: {
            minDevices: 6,
            minConnections: 5,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 4
            }
          },
          steps: [
            "Add 1 router, 1 switch, and at least 4 PCs.",
            "Connect all PCs to the switch and connect the switch to the router.",
            "Plan two subnets (e.g., Staff and Guest) and document the gateway for each."
          ],
          tips: "Use two groups of PCs to represent two different subnets."
        }
      },
      {
        title: "Unit 2: VLANs & Trunks",
        about: "Segment Layer 2 networks and carry VLANs over trunk links.",
        lessons: [
          {
            title: "VLAN concepts",
            blocks: [
              {
                type: "text",
                text: [
                  "VLANs create logical segments on the same physical switch.",
                  "Devices in different VLANs cannot communicate without routing.",
                  "VLANs reduce broadcast scope and improve security.",
                  "Example: a school keeps student devices in one VLAN and staff devices in another.",
                  "VLANs make it easier to apply policy and troubleshooting boundaries.",
                  "You can think of VLANs like virtual switches: the same hardware, but separate logical networks.",
                  "Common use cases include voice VLANs for IP phones and guest VLANs for visitors.",
                  "Segmentation also helps performance when many devices share the same switch."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: VLANs as virtual switches"
              },
              {
                type: "check",
                question: "VLANs create separate ___ domains.",
                options: [
                  "Broadcast",
                  "Collision",
                  "Routing"
                ],
                correctIndex: 0,
                explanation: "VLANs separate broadcast domains."
              }
            ],
            objectives: [
              "Define a VLAN",
              "Explain why VLANs improve segmentation"
            ],
            xp: 25
          },
          {
            title: "VLAN planning and naming",
            blocks: [
              {
                type: "text",
                text: [
                  "A good VLAN plan maps business functions to clear segments.",
                  "Use consistent numbering, like 10 for staff, 20 for guests, 30 for voice, and 40 for printers.",
                  "Names should match the function so the intent is obvious in logs and configs.",
                  "Example: VLAN 20-GUEST in every site makes cross-site troubleshooting faster.",
                  "Document which subnets belong to each VLAN and who owns them.",
                  "Reserve VLAN ranges for future projects to avoid renumbering later.",
                  "Keep management VLANs separate and tightly controlled for security.",
                  "Good documentation is a visible benefit when networks scale."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Management VLANs"
              },
              {
                type: "check",
                question: "Why should VLAN names match their function?",
                options: [
                  "To make logs and configs easier to read",
                  "To increase broadcast traffic",
                  "To avoid using numbers"
                ],
                correctIndex: 0,
                explanation: "Clear names make intent obvious in logs and during troubleshooting."
              }
            ],
            objectives: [
              "Create a simple VLAN naming scheme",
              "Explain why documentation matters",
              "Describe how VLAN plans scale"
            ],
            xp: 25
          },
          {
            title: "802.1Q trunking",
            blocks: [
              {
                type: "text",
                text: [
                  "802.1Q adds a VLAN tag to Ethernet frames.",
                  "Trunks carry traffic for multiple VLANs between switches or to routers.",
                  "Access ports carry a single VLAN and do not tag frames.",
                  "The native VLAN on a trunk is sent untagged, so keep native VLANs consistent end to end.",
                  "Allowed VLAN lists limit which VLANs are permitted across a trunk for safety and clarity.",
                  "Example: a trunk between two switches might carry VLAN 10 and VLAN 20 for two departments.",
                  "If VLANs or the native VLAN mismatch, users see intermittent or one-way connectivity.",
                  "Trunk documentation prevents accidental VLAN leaks between areas."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Allowed VLAN lists"
              },
              {
                type: "check",
                question: "802.1Q does what?",
                options: [
                  "Tags frames with VLAN identifiers",
                  "Encrypts traffic",
                  "Assigns IP addresses"
                ],
                correctIndex: 0,
                explanation: "802.1Q adds VLAN tags to Ethernet frames."
              }
            ],
            objectives: [
              "Describe what trunking does",
              "Identify access vs trunk ports"
            ],
            xp: 25
          },
          {
            title: "Access vs trunk ports",
            blocks: [
              {
                type: "text",
                text: [
                  "Access ports are for end devices and carry a single VLAN without tags.",
                  "Trunk ports are used between switches or between a switch and a router.",
                  "The native VLAN on a trunk is sent untagged by default.",
                  "Misconfigured trunks are a common cause of VLAN connectivity problems.",
                  "Always document which VLANs are allowed on a trunk to reduce surprises.",
                  "Example: if a PC is plugged into a trunk port, it may receive tagged frames and fail DHCP.",
                  "Best practice: place unused access ports in an unused VLAN and shut them down.",
                  "Clear port roles keep segmentation working as designed."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Common mistakes"
              },
              {
                type: "check",
                question: "An access port carries:",
                options: [
                  "One VLAN, untagged",
                  "Multiple VLANs",
                  "All VLANs by default"
                ],
                correctIndex: 0,
                explanation: "Access ports carry a single VLAN and do not tag frames."
              }
            ],
            objectives: [
              "Describe access vs trunk ports",
              "Explain the native VLAN",
              "Identify common trunk misconfigurations"
            ],
            xp: 25
          }
        ],
        quiz: {
          title: "VLANs quiz",
          xp: 100,
          questions: [
            {
              id: "q1",
              question: "VLANs create separate ___ domains.",
              options: [
                "Broadcast",
                "Collision",
                "Routing"
              ],
              correctAnswer: 0,
              explanation: "VLANs separate broadcast domains."
            },
            {
              id: "q2",
              question: "802.1Q does what?",
              options: [
                "Tags frames",
                "Encrypts traffic",
                "Assigns IPs"
              ],
              correctAnswer: 0,
              explanation: "802.1Q adds VLAN tags to frames."
            },
            {
              id: "q3",
              question: "An access port carries:",
              options: [
                "One VLAN",
                "Multiple VLANs",
                "All VLANs"
              ],
              correctAnswer: 0,
              explanation: "Access ports carry a single VLAN."
            },
            {
              id: "q4",
              question: "The native VLAN on a trunk is:",
              options: [
                "Untagged",
                "Tagged",
                "Dropped"
              ],
              correctAnswer: 0,
              explanation: "Native VLAN traffic is untagged by default."
            },
            {
              id: "q5",
              question: "Fill in the blank: Devices in different VLANs require ___ to communicate.",
              options: [
                "Routing",
                "Bridging",
                "Repeating"
              ],
              correctAnswer: 0,
              explanation: "Routing is required between VLANs."
            },
            {
              id: "q6",
              question: "Which device typically performs inter-VLAN routing?",
              options: [
                "Layer 3 device",
                "Hub",
                "Repeater"
              ],
              correctAnswer: 0,
              explanation: "Routers or Layer 3 switches perform inter-VLAN routing."
            },
            {
              id: "q7",
              question: "Trunk links are commonly used between:",
              options: [
                "Switches",
                "PCs",
                "Printers"
              ],
              correctAnswer: 0,
              explanation: "Trunks connect switches or switch-to-router links."
            },
            {
              id: "q8",
              question: "A trunk link typically carries:",
              options: [
                "Multiple VLANs",
                "One VLAN only",
                "Only management traffic"
              ],
              correctAnswer: 0,
              explanation: "Trunks are designed to carry multiple VLANs."
            },
            {
              id: "q9",
              question: "Which concept limits which VLANs can traverse a trunk?",
              options: [
                "Allowed VLAN list",
                "Default gateway",
                "ARP cache"
              ],
              correctAnswer: 0,
              explanation: "Allowed VLAN lists control what traffic crosses a trunk."
            },
            {
              id: "q10",
              question: "A voice VLAN is typically used for:",
              options: [
                "IP phones",
                "File servers",
                "Printers only"
              ],
              correctAnswer: 0,
              explanation: "Voice VLANs separate and prioritize IP phone traffic."
            }
          ]
        },
        sandbox: {
          title: "Assign VLANs to ports",
          xp: 50,
          steps: [
            "Add two switches and four PCs.",
            "Connect two PCs to Switch A and two PCs to Switch B.",
            "Link the two switches together with one uplink.",
            "Rename two PCs with VLAN10 and two PCs with VLAN20 to model segmentation."
          ],
          tips: "VLANs are logical; use naming to keep groups clear while you design."
        },
        challenge: {
          title: "Build a VLAN campus",
          xp: 100,
          rules: {
            minDevices: 6,
            minConnections: 5,
            requiredTypes: {
              switch: 2,
              pc: 4
            }
          },
          steps: [
            "Add 2 switches and at least 4 PCs.",
            "Connect PCs to the switches and link the switches together.",
            "Treat two PCs as VLAN 10 and two PCs as VLAN 20 in your notes."
          ],
          tips: "Imagine the trunk between switches carrying VLAN 10 and VLAN 20."
        }
      },
      {
        title: "Unit 3: Inter-VLAN Routing",
        about: "Connect VLANs using router-on-a-stick or Layer 3 switches.",
        lessons: [
          {
            title: "Router-on-a-stick",
            blocks: [
              {
                type: "text",
                text: [
                  "Router-on-a-stick uses a single router interface with multiple subinterfaces.",
                  "Each subinterface is assigned to a VLAN and acts as that VLAN's gateway.",
                  "This is common in smaller networks without Layer 3 switches.",
                  "The switch port connected to the router must be a trunk carrying all required VLANs.",
                  "If tagging is wrong, traffic will not reach the correct subinterface.",
                  "Example: Gi0/0.10 can be VLAN 10 with IP 192.168.10.1/24, and Gi0/0.20 can be VLAN 20.",
                  "Because all VLANs share one physical link, that link can become a bottleneck.",
                  "It is cost-effective but less scalable for high-traffic environments."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Bottleneck risk"
              },
              {
                type: "check",
                question: "Router-on-a-stick routes between VLANs using:",
                options: [
                  "Subinterfaces",
                  "Access ports",
                  "DNS"
                ],
                correctIndex: 0,
                explanation: "Subinterfaces map each VLAN to one router interface."
              }
            ],
            objectives: [
              "Explain router-on-a-stick",
              "Identify when it's used"
            ],
            xp: 25
          },
          {
            title: "SVI on Layer 3 switches",
            blocks: [
              {
                type: "text",
                text: [
                  "An SVI (Switch Virtual Interface) provides a Layer 3 interface for a VLAN.",
                  "SVIs allow a multilayer switch to route internally without a router.",
                  "This improves performance in larger campus networks.",
                  "Each VLAN has a unique SVI IP that serves as its default gateway.",
                  "Inter-VLAN routing happens inside the switch, which is fast and scalable.",
                  "Example: VLAN 10 can use 10.10.10.1 and VLAN 20 can use 10.10.20.1 as gateways.",
                  "Remember to enable IP routing on the switch, or SVIs will not route traffic.",
                  "SVIs are the common choice for modern enterprise access layers."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Enabling IP routing"
              },
              {
                type: "check",
                question: "SVI stands for:",
                options: [
                  "Switch Virtual Interface",
                  "Secure VLAN Interface",
                  "Static Virtual Interface"
                ],
                correctIndex: 0,
                explanation: "SVI is Switch Virtual Interface — it provides a Layer 3 gateway for a VLAN."
              }
            ],
            objectives: [
              "Define an SVI",
              "Compare SVIs to router-on-a-stick"
            ],
            xp: 25
          },
          {
            title: "Inter-VLAN design patterns",
            blocks: [
              {
                type: "text",
                text: [
                  "Small sites often use router-on-a-stick to save cost.",
                  "Medium and large sites typically use Layer 3 switches for higher throughput.",
                  "Routed access designs remove Layer 2 trunks and route at the edge to reduce loops.",
                  "Example: a campus core might use Layer 3 switches while branch offices use router-on-a-stick.",
                  "Consider where you want policy enforcement: at the router, core, or distribution layer.",
                  "Plan gateway placement so troubleshooting remains simple for support teams.",
                  "Document VLAN-to-subnet mappings so traffic flows are predictable.",
                  "The right pattern balances simplicity, performance, and security."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Choosing the right pattern"
              },
              {
                type: "check",
                question: "Which inter-VLAN design is most common in small networks?",
                options: [
                  "Router-on-a-stick",
                  "Full mesh Layer 3 switching",
                  "Routed access only"
                ],
                correctIndex: 0,
                explanation: "Router-on-a-stick is cost-effective and common in smaller environments."
              }
            ],
            objectives: [
              "Compare inter-VLAN design options",
              "Explain trade-offs between patterns",
              "Describe where gateways should live"
            ],
            xp: 25
          },
          {
            title: "Troubleshooting inter-VLAN routing",
            blocks: [
              {
                type: "text",
                text: [
                  "Verify that each VLAN has a correct gateway IP address.",
                  "Check that the switch-to-router (or switch-to-switch) link is a trunk.",
                  "Confirm the correct VLANs are allowed on the trunk.",
                  "Ensure hosts are in the right VLAN and use the correct gateway.",
                  "A quick test: can hosts reach their own gateway IP?",
                  "If local gateway fails, focus on VLAN membership and IP configuration.",
                  "Check ARP and MAC tables to confirm the gateway and host are learned on the expected ports.",
                  "Use logs and interface counters to spot drops or mismatched VLAN tags."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: First test"
              },
              {
                type: "check",
                question: "Best first test when VLANs cannot talk to each other:",
                options: [
                  "Ping the default gateway",
                  "Change DNS settings",
                  "Replace the ISP link"
                ],
                correctIndex: 0,
                explanation: "If the gateway fails, routing between VLANs will not work."
              }
            ],
            objectives: [
              "Identify common inter-VLAN failures",
              "Describe a basic troubleshooting sequence"
            ],
            xp: 25
          }
        ],
        quiz: {
          title: "Inter-VLAN routing quiz",
          xp: 100,
          questions: [
            {
              id: "q1",
              question: "Router-on-a-stick uses ___ to route multiple VLANs.",
              options: [
                "Subinterfaces",
                "Access ports",
                "DNS"
              ],
              correctAnswer: 0,
              explanation: "Subinterfaces map VLANs to a single router interface."
            },
            {
              id: "q2",
              question: "SVI stands for:",
              options: [
                "Switch Virtual Interface",
                "Secure VLAN Interface",
                "Static Virtual Interface"
              ],
              correctAnswer: 0,
              explanation: "SVI is Switch Virtual Interface."
            },
            {
              id: "q3",
              question: "Fill in the blank: Each VLAN should have a ___ IP used as a default gateway.",
              options: [
                "unique",
                "shared",
                "random"
              ],
              correctAnswer: 0,
              explanation: "Each VLAN needs its own gateway IP."
            },
            {
              id: "q4",
              question: "If hosts in VLAN 10 cannot reach VLAN 20, check ___ first.",
              options: [
                "Gateway IPs and trunking",
                "DNS",
                "Cable length"
              ],
              correctAnswer: 0,
              explanation: "Gateway and trunk configuration are common issues."
            },
            {
              id: "q5",
              question: "A multilayer switch routes at Layer:",
              options: [
                "3",
                "1",
                "2"
              ],
              correctAnswer: 0,
              explanation: "Layer 3 switches route between VLANs."
            },
            {
              id: "q6",
              question: "Inter-VLAN routing is required because VLANs are separate ___ domains.",
              options: [
                "broadcast",
                "collision",
                "physical"
              ],
              correctAnswer: 0,
              explanation: "VLANs are separate broadcast domains."
            },
            {
              id: "q7",
              question: "Router-on-a-stick is common in:",
              options: [
                "Small networks",
                "Very large networks",
                "Wireless-only networks"
              ],
              correctAnswer: 0,
              explanation: "It is common in smaller environments."
            },
            {
              id: "q8",
              question: "Router-on-a-stick requires the switch port to be a:",
              options: [
                "Trunk",
                "Access",
                "Monitor"
              ],
              correctAnswer: 0,
              explanation: "The router must receive tagged VLAN traffic on a trunk."
            },
            {
              id: "q9",
              question: "Layer 3 switches route between VLANs using:",
              options: [
                "SVIs",
                "Hubs",
                "Repeaters"
              ],
              correctAnswer: 0,
              explanation: "SVIs are the gateway interfaces for VLANs on L3 switches."
            },
            {
              id: "q10",
              question: "Best first test when VLANs can’t talk:",
              options: [
                "Ping the default gateway",
                "Change DNS",
                "Replace the ISP link"
              ],
              correctAnswer: 0,
              explanation: "If the gateway fails, routing between VLANs won’t work."
            }
          ]
        },
        sandbox: {
          title: "Configure inter-VLAN routing",
          xp: 50,
          steps: [
            "Add a router, a switch, and three PCs.",
            "Connect all PCs to the switch and connect the switch to the router.",
            "Name one PC VLAN10 and two PCs VLAN20 to model two groups.",
            "Assign gateway IPs on the router (one per VLAN) in your notes."
          ],
          tips: "Router-on-a-stick uses subinterfaces; each VLAN needs its own gateway IP."
        },
        challenge: {
          title: "Route between two VLANs",
          xp: 100,
          rules: {
            minDevices: 5,
            minConnections: 4,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 3
            }
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
  },
  "5": {
    id: "5",
    title: "Routing Fundamentals",
    description: "Learn how routers move traffic between networks and how routing protocols work.",
    difficulty: "intermediate",
    required_level: 3,
    estimatedTime: "1.6 hrs",
    xpReward: 300,
    category: "Routing",
    units: [
      {
        title: "Unit 1: Routing Essentials",
        about: "Compare static and dynamic routing and explore OSPF basics.",
        lessons: [
          {
            title: "Static vs dynamic routing",
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
                title: "Explain: When to use static routes"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is the main disadvantage of static routes?",
                options: [
                  "They use too much bandwidth",
                  "They do not adapt to link failures",
                  "They require special hardware"
                ],
                correctIndex: 1,
                explanation: "Static routes must be manually updated if the network changes."
              }
            ],
            objectives: [
              "Compare static and dynamic routing",
              "Explain when to use static routes",
              "Describe the advantage of dynamic protocols"
            ],
            xp: 25
          },
          {
            title: "OSPF overview",
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
                title: "Explain: OSPF areas"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What algorithm does OSPF use to calculate shortest paths?",
                options: [
                  "Bellman-Ford",
                  "Dijkstra SPF",
                  "Round-robin"
                ],
                correctIndex: 1,
                explanation: "OSPF uses Dijkstra's Shortest Path First algorithm."
              }
            ],
            objectives: [
              "Describe how OSPF works",
              "Explain the role of the link-state database",
              "Identify the OSPF metric"
            ],
            xp: 25
          }
        ],
        quiz: {
          title: "Routing quick check",
          xp: 100,
          questions: [
            {
              id: "q1",
              question: "OSPF is a:",
              options: [
                "Distance-vector",
                "Link-state",
                "Hybrid"
              ],
              correctAnswer: 1,
              explanation: "OSPF is a link-state routing protocol."
            },
            {
              id: "q2",
              question: "Static routes must be updated:",
              options: [
                "Manually by an administrator",
                "Automatically by OSPF",
                "By the switch"
              ],
              correctAnswer: 0,
              explanation: "Static routes do not adapt on their own; an admin must change them."
            },
            {
              id: "q3",
              question: "Which algorithm does OSPF use to calculate shortest paths?",
              options: [
                "Bellman-Ford",
                "Dijkstra SPF",
                "Round-robin"
              ],
              correctAnswer: 1,
              explanation: "OSPF uses Dijkstra's Shortest Path First algorithm."
            },
            {
              id: "q4",
              question: "Dynamic routing is preferred over static routing when:",
              options: [
                "The network has multiple paths and redundancy",
                "There is only one exit path",
                "No routers are present"
              ],
              correctAnswer: 0,
              explanation: "Dynamic protocols can find alternate paths automatically when links fail."
            },
            {
              id: "q5",
              question: "OSPF routers discover neighbours by exchanging:",
              options: [
                "Hello packets",
                "ARP requests",
                "DNS queries"
              ],
              correctAnswer: 0,
              explanation: "OSPF uses Hello packets to form and maintain neighbour relationships."
            }
          ]
        },
        sandbox: {
          title: "Compare routing methods",
          xp: 50,
          steps: [
            "Add two routers (R1 and R2) and a PC to the canvas.",
            "Connect the PC to R1, then R1 to R2 with a link.",
            "On R1, note the command you would use to add a static route to the network behind R2.",
            "Explain in one sentence why you would choose OSPF instead if there were five routers."
          ],
          tips: "Static routes are simple but do not scale — OSPF is the right choice when your network can change or grow."
        },
        challenge: {
          title: "Design a routed network",
          xp: 100,
          rules: {
            description: "You have three branch offices that must all be able to reach each other. Use the sandbox to plan and document your routing approach.",
            objectives: [
              "Connect all three branches via two routers",
              "Choose between static and OSPF and justify your choice",
              "Verify that a packet from Branch A can theoretically reach Branch C"
            ]
          },
          steps: [
            "Add three PCs (one per branch) and two routers to the canvas.",
            "Connect Branch A PC to R1, Branch C PC to R2, Branch B PC to both R1 and R2.",
            "Decide whether to use static routes or OSPF — note your reasoning.",
            "Trace the path a packet takes from Branch A to Branch C."
          ],
          tips: "Think about what happens if one router link goes down — which routing method handles it better?"
        }
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
    xpReward: 300,
    category: "Services",
    units: [
      {
        title: "Unit 1: Wireless and Services",
        about: "Explore Wi‑Fi basics and core network services.",
        lessons: [
          {
            title: "Wi‑Fi standards",
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
                title: "Explain: 2.4 GHz vs 5 GHz"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which Wi‑Fi standard introduced OFDMA for better efficiency?",
                options: [
                  "Wi‑Fi 4 (802.11n)",
                  "Wi‑Fi 5 (802.11ac)",
                  "Wi‑Fi 6 (802.11ax)"
                ],
                correctIndex: 2,
                explanation: "Wi‑Fi 6 (802.11ax) introduced OFDMA for more efficient airtime usage."
              }
            ],
            objectives: [
              "Compare major Wi‑Fi standards",
              "Explain the difference between 2.4 GHz and 5 GHz",
              "Describe key features of Wi‑Fi 6"
            ],
            xp: 25
          },
          {
            title: "DHCP & DNS basics",
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
                title: "Explain: The DORA process"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What does the D in DORA stand for?",
                options: [
                  "Deliver",
                  "Discover",
                  "Deny"
                ],
                correctIndex: 1,
                explanation: "The first step of DHCP is Discover — the client broadcasts looking for a server."
              }
            ],
            objectives: [
              "Describe how DHCP works",
              "Explain the DORA process",
              "Describe the DNS hierarchy"
            ],
            xp: 25
          }
        ],
        quiz: {
          title: "Services quick check",
          xp: 100,
          questions: [
            {
              id: "q1",
              question: "DNS is used to:",
              options: [
                "Encrypt traffic",
                "Resolve domain names",
                "Assign MACs"
              ],
              correctAnswer: 1,
              explanation: "DNS maps names to IP addresses."
            },
            {
              id: "q2",
              question: "The first step of the DHCP process is:",
              options: [
                "Discover",
                "Offer",
                "Acknowledge"
              ],
              correctAnswer: 0,
              explanation: "The client starts with a Discover broadcast looking for a DHCP server."
            },
            {
              id: "q3",
              question: "Wi‑Fi 6 (802.11ax) improved efficiency using:",
              options: [
                "OFDMA",
                "Token Ring",
                "Static channels only"
              ],
              correctAnswer: 0,
              explanation: "OFDMA allows Wi‑Fi 6 to serve multiple clients simultaneously on subcarriers."
            },
            {
              id: "q4",
              question: "Which frequency band has longer range but more interference?",
              options: [
                "2.4 GHz",
                "5 GHz",
                "6 GHz"
              ],
              correctAnswer: 0,
              explanation: "2.4 GHz penetrates walls better but is more crowded with devices."
            },
            {
              id: "q5",
              question: "If users can reach 8.8.8.8 but not google.com, the issue is likely:",
              options: [
                "DNS",
                "DHCP",
                "The switch"
              ],
              correctAnswer: 0,
              explanation: "IP connectivity works but name resolution fails, so DNS is the culprit."
            }
          ]
        },
        sandbox: {
          title: "Configure DHCP and DNS roles",
          xp: 50,
          steps: [
            "Add a router, a server, and two PCs to the canvas.",
            "Connect both PCs to the router, and the server to the router.",
            "Mark the server as your DHCP server — list the four pieces of info it would hand to each PC.",
            "Explain what would break for users if the DNS server went offline."
          ],
          tips: "DHCP and DNS are silent heroes — most users never notice them until they stop working."
        },
        challenge: {
          title: "Troubleshoot a broken network service",
          xp: 100,
          rules: {
            description: "A user complains they can ping 8.8.8.8 but cannot open any website. Use the sandbox to map out what is working and what is not.",
            objectives: [
              "Identify whether IP connectivity is working",
              "Identify which specific service is failing",
              "Propose a fix for the broken service"
            ]
          },
          steps: [
            "Add a PC, a router, and a DNS server to the canvas.",
            "Connect the PC to the router and the router to the DNS server.",
            "Confirm: if ping to 8.8.8.8 works, what layer is functioning correctly?",
            "Explain what single change would restore website access."
          ],
          tips: "When IP works but names do not, always check DNS first."
        }
      }
    ]
  },
  "7": {
    id: "7",
    title: "Network Security & Hardening",
    description: "Secure networks with hardening, firewalls, ACLs, and monitoring best practices.",
    difficulty: "advanced",
    required_level: 5,
    estimatedTime: "6.5 hrs",
    xpReward: 1260,
    category: "Security",
    units: [
      {
        title: "Unit 1: Threats & Hardening",
        about: "Identify common threats and apply hardening techniques.",
        lessons: [
          {
            title: "Attack surface",
            blocks: [
              {
                type: "text",
                text: [
                  "Every open service, port, and misconfiguration is part of the attack surface.",
                  "Reducing exposure lowers the chance of compromise and limits blast radius.",
                  "Focus on least privilege, minimal services, and strong identity controls.",
                  "Example: disabling unused remote access services closes entire categories of attacks.",
                  "Documenting network assets helps you find and reduce unnecessary exposure.",
                  "Examples of high-risk exposure include default SNMP communities and legacy management interfaces.",
                  "Regular scans and configuration reviews keep the attack surface from creeping back over time.",
                  "A smaller attack surface improves both security and operational clarity."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Staying small"
              },
              {
                type: "check",
                question: "Which action reduces the attack surface?",
                options: [
                  "Disable unused services",
                  "Enable all management interfaces",
                  "Use default credentials"
                ],
                correctIndex: 0,
                explanation: "Disabling unused services removes unnecessary exposure."
              }
            ],
            objectives: [
              "Define attack surface",
              "List common exposure points",
              "Explain why reduction matters"
            ],
            xp: 30
          },
          {
            title: "Threat modeling and risk",
            blocks: [
              {
                type: "text",
                text: [
                  "Threat modeling starts with your most valuable assets and how they could be harmed.",
                  "Consider likelihood and impact to focus on the highest-risk scenarios first.",
                  "Example: protecting payment systems has higher priority than public marketing sites.",
                  "Map data flows so you know where sensitive information travels and where to add controls.",
                  "Use simple categories like spoofing, tampering, and data loss to guide discussions.",
                  "Translate risks into concrete actions such as MFA, network segmentation, or logging.",
                  "Revisit the model after major changes, new vendors, or new regulatory requirements.",
                  "This approach keeps security aligned with business goals and limited budgets."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Risk prioritization"
              },
              {
                type: "check",
                question: "When prioritizing risks, you should consider:",
                options: [
                  "Likelihood and impact",
                  "Only cost",
                  "Only technical difficulty"
                ],
                correctIndex: 0,
                explanation: "Both likelihood and impact determine which risks matter most."
              }
            ],
            objectives: [
              "Explain why threat modeling matters",
              "Prioritize risks by likelihood and impact",
              "Identify where to place controls"
            ],
            xp: 30
          },
          {
            title: "Hardening checklist",
            blocks: [
              {
                type: "text",
                text: [
                  "Disable unused services, close unused ports, and remove default credentials.",
                  "Patch operating systems and network devices regularly.",
                  "Enforce strong authentication and log important events.",
                  "Use configuration backups and version control to recover quickly after incidents.",
                  "Apply secure management: restrict admin access to known subnets or jump hosts.",
                  "Example: replace Telnet with SSH and prefer key-based authentication where possible.",
                  "Harden the management plane with a separate management VLAN and strict access rules.",
                  "Routine hardening reduces both risk and emergency change work later."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Management plane"
              },
              {
                type: "check",
                question: "Which is a key hardening action?",
                options: [
                  "Patch devices regularly",
                  "Enable all services",
                  "Use default admin accounts"
                ],
                correctIndex: 0,
                explanation: "Patching removes known vulnerabilities."
              }
            ],
            objectives: [
              "Describe key hardening actions",
              "Explain why patching is critical"
            ],
            xp: 30
          },
          {
            title: "Authentication and AAA",
            blocks: [
              {
                type: "text",
                text: [
                  "Authentication verifies identity; authorization defines what a user can do; accounting logs actions.",
                  "Centralized AAA (like RADIUS or TACACS+) simplifies management and auditing.",
                  "Least privilege ensures users only get the access they need to do their job.",
                  "Multi-factor authentication adds a second layer of protection for administrative access.",
                  "Audit logs are essential for investigations and compliance.",
                  "Role-based access helps: admins can change configs while helpdesk can only view status.",
                  "Central AAA makes offboarding fast and enforces consistent password policies.",
                  "Strong identity controls reduce the chance of lateral movement after a breach."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Least privilege"
              },
              {
                type: "check",
                question: "AAA stands for:",
                options: [
                  "Authentication, Authorization, Accounting",
                  "Access, Address, Audit",
                  "Application, API, Admin"
                ],
                correctIndex: 0,
                explanation: "AAA is Authentication, Authorization, and Accounting."
              }
            ],
            objectives: [
              "Define AAA",
              "Explain least privilege",
              "Describe why MFA improves security"
            ],
            xp: 30
          }
        ],
        quiz: {
          title: "Hardening fundamentals quiz",
          xp: 120,
          questions: [
            {
              id: "q1",
              question: "Which action reduces attack surface?",
              options: [
                "Enable unused services",
                "Disable unused services",
                "Use default passwords"
              ],
              correctAnswer: 1,
              explanation: "Disable unused services to reduce exposure."
            },
            {
              id: "q2",
              question: "Which is a strong hardening practice?",
              options: [
                "Use default admin accounts",
                "Patch regularly",
                "Open all ports"
              ],
              correctAnswer: 1,
              explanation: "Patching removes known vulnerabilities."
            },
            {
              id: "q3",
              question: "Least privilege means:",
              options: [
                "Everyone has admin access",
                "Access is only what's needed",
                "No authentication required"
              ],
              correctAnswer: 1,
              explanation: "Least privilege limits access to only what is required."
            },
            {
              id: "q4",
              question: "AAA stands for:",
              options: [
                "Access, Address, Audit",
                "Authentication, Authorization, Accounting",
                "Application, API, Admin"
              ],
              correctAnswer: 1,
              explanation: "AAA is Authentication, Authorization, Accounting."
            },
            {
              id: "q5",
              question: "Fill in the blank: MFA adds a second ___ to authentication.",
              options: [
                "factor",
                "router",
                "subnet"
              ],
              correctAnswer: 0,
              explanation: "MFA adds a second factor."
            },
            {
              id: "q6",
              question: "Why are audit logs important?",
              options: [
                "They block all attacks",
                "They show who did what",
                "They replace backups"
              ],
              correctAnswer: 1,
              explanation: "Audit logs provide accountability and investigation data."
            },
            {
              id: "q7",
              question: "Centralized AAA helps because it:",
              options: [
                "Requires more passwords",
                "Simplifies access management",
                "Stops routing"
              ],
              correctAnswer: 1,
              explanation: "Centralized AAA simplifies control and auditing."
            },
            {
              id: "q8",
              question: "Which control limits lateral movement?",
              options: [
                "Network segmentation",
                "Disable backups",
                "Open admin ports"
              ],
              correctAnswer: 0,
              explanation: "Segmentation limits how far an attacker can move."
            },
            {
              id: "q9",
              question: "Hardening the management plane often includes:",
              options: [
                "Management VLAN and restricted access",
                "Guest Wi-Fi on the same VLAN",
                "Public admin interfaces"
              ],
              correctAnswer: 0,
              explanation: "Separate management access reduces risk."
            },
            {
              id: "q10",
              question: "Least privilege helps because it:",
              options: [
                "Reduces blast radius",
                "Increases attack surface",
                "Eliminates logging"
              ],
              correctAnswer: 0,
              explanation: "Smaller permissions reduce the impact of compromise."
            }
          ]
        },
        sandbox: {
          title: "Spot hardening gaps",
          xp: 60,
          steps: [
            "Add a router, firewall, switch, two PCs, and a server.",
            "Connect PCs and server to the switch, then switch to firewall, firewall to router.",
            "List three services you would disable on the server if unused.",
            "Identify one logging source you would always keep enabled."
          ],
          tips: "Least privilege and minimal services reduce exposure and simplify monitoring."
        },
        challenge: {
          title: "Harden a branch network",
          xp: 120,
          rules: {
            minDevices: 6,
            minConnections: 5,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 4
            }
          },
          steps: [
            "Build a small branch network with a router, switch, and four PCs.",
            "Designate one PC as admin and the rest as users in your notes.",
            "Describe which services should be disabled and which logs should be enabled."
          ],
          tips: "Focus on least privilege and reducing exposed services."
        }
      },
      {
        title: "Unit 2: Firewalls & ACLs",
        about: "Control traffic with ACLs and firewall policy.",
        lessons: [
          {
            title: "Stateless vs stateful",
            blocks: [
              {
                type: "text",
                text: [
                  "Stateless firewalls filter each packet in isolation.",
                  "Stateful firewalls track connection state and allow return traffic automatically.",
                  "Stateful rules are typically simpler and safer for most networks.",
                  "Stateful inspection reduces the need for separate inbound allow rules for established sessions.",
                  "Stateless filtering can be faster but requires more careful rule design.",
                  "Example: web browsing needs return traffic; stateless ACLs require explicit inbound allows.",
                  "State tables consume memory, so tune timeouts for long-lived connections.",
                  "Choose stateful inspection when usability and safety are priorities."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Why stateful is simpler"
              },
              {
                type: "check",
                question: "Stateful firewalls are different because they:",
                options: [
                  "Track connection state",
                  "Ignore all ports",
                  "Disable routing"
                ],
                correctIndex: 0,
                explanation: "Stateful firewalls track active connections and allow return traffic."
              }
            ],
            objectives: [
              "Compare stateless vs stateful behavior",
              "Explain why statefulness reduces rule count"
            ],
            xp: 30
          },
          {
            title: "ACL design",
            blocks: [
              {
                type: "text",
                text: [
                  "ACLs are evaluated top-down: the first match wins.",
                  "Put specific allow or deny rules before general rules.",
                  "Always include a default deny at the end when appropriate.",
                  "Document each rule so future changes do not break intent.",
                  "Use least privilege: allow only what is required, deny everything else.",
                  "Group rules by zones (user VLAN to server VLAN) so intent is obvious.",
                  "Object groups and naming conventions make large ACLs easier to maintain.",
                  "Well-structured ACLs are easier to audit and safer to change."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Documentation"
              },
              {
                type: "check",
                question: "ACLs are evaluated in what order?",
                options: [
                  "Top-down, first match wins",
                  "Bottom-up",
                  "Randomly"
                ],
                correctIndex: 0,
                explanation: "ACLs are processed from top to bottom and the first match applies."
              }
            ],
            objectives: [
              "Explain ACL order of operations",
              "Apply least privilege to rule design"
            ],
            xp: 30
          },
          {
            title: "Firewall policy lifecycle",
            blocks: [
              {
                type: "text",
                text: [
                  "Firewall rules often outlive their original purpose unless they are reviewed.",
                  "A good policy lifecycle includes request, review, approval, and implementation.",
                  "Add owners and expiration dates so temporary rules do not become permanent.",
                  "Example: open a port for a migration with a planned removal date.",
                  "Log usage and review counters to identify rules that never match.",
                  "Clean up unused rules to reduce risk and improve performance.",
                  "Change control reduces accidental outages and keeps security aligned with business needs.",
                  "A healthy policy set is small, documented, and easy to explain."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Clean-up"
              },
              {
                type: "check",
                question: "Why review firewall rules periodically?",
                options: [
                  "Remove unused rules and reduce risk",
                  "Make them longer",
                  "Disable logging"
                ],
                correctIndex: 0,
                explanation: "Unused rules increase risk and complexity over time."
              }
            ],
            objectives: [
              "Describe a firewall policy lifecycle",
              "Explain why rule cleanup matters",
              "Identify ways to control change risk"
            ],
            xp: 30
          },
          {
            title: "Rule ordering and implicit deny",
            blocks: [
              {
                type: "text",
                text: [
                  "ACLs are evaluated top-down, so the first match wins.",
                  "An early broad rule can override later detailed rules.",
                  "Many platforms apply an implicit deny at the end of the list.",
                  "Always test rules in a safe environment before deploying to production.",
                  "Logging helps you validate which rules are being matched.",
                  "Watch for shadowed rules that never match because an earlier rule already applies.",
                  "Use counters or logs to clean up unused rules over time.",
                  "Careful ordering prevents accidental outages and security gaps."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Testing safely"
              },
              {
                type: "check",
                question: "An implicit deny at the end of an ACL means:",
                options: [
                  "All unmatched traffic is blocked",
                  "All traffic is allowed",
                  "Rules are ignored"
                ],
                correctIndex: 0,
                explanation: "An implicit deny blocks any traffic not explicitly permitted."
              }
            ],
            objectives: [
              "Explain rule ordering",
              "Identify common ACL mistakes"
            ],
            xp: 30
          }
        ],
        quiz: {
          title: "Firewall and ACL quiz",
          xp: 120,
          questions: [
            {
              id: "q1",
              question: "Which is a best practice for ACLs?",
              options: [
                "Permit all by default",
                "Least privilege",
                "Random ordering"
              ],
              correctAnswer: 1,
              explanation: "Least privilege reduces risk."
            },
            {
              id: "q2",
              question: "ACLs are evaluated:",
              options: [
                "Bottom-up",
                "Top-down",
                "Randomly"
              ],
              correctAnswer: 1,
              explanation: "ACLs are processed from top to bottom."
            },
            {
              id: "q3",
              question: "Fill in the blank: Most ACLs end with an implicit ___.",
              options: [
                "allow",
                "deny",
                "route"
              ],
              correctAnswer: 1,
              explanation: "Implicit deny blocks traffic not explicitly allowed."
            },
            {
              id: "q4",
              question: "Stateful firewalls are different because they:",
              options: [
                "Track connections",
                "Ignore ports",
                "Disable routing"
              ],
              correctAnswer: 0,
              explanation: "Stateful firewalls track connection state."
            },
            {
              id: "q5",
              question: "A common mistake is to place a ___ rule before a specific rule.",
              options: [
                "deny all",
                "specific allow",
                "log only"
              ],
              correctAnswer: 0,
              explanation: "A deny all early will block everything else."
            },
            {
              id: "q6",
              question: "Which aligns with least privilege?",
              options: [
                "Allow everything then block later",
                "Allow only required traffic",
                "Disable logging"
              ],
              correctAnswer: 1,
              explanation: "Least privilege allows only what is needed."
            },
            {
              id: "q7",
              question: "Stateful firewalls allow return traffic because they keep a:",
              options: [
                "State table",
                "MAC table",
                "Routing table only"
              ],
              correctAnswer: 0,
              explanation: "State tables track active connections."
            },
            {
              id: "q8",
              question: "Best rule order for ACLs is:",
              options: [
                "Specific rules first, then general rules",
                "General rules first",
                "Random ordering"
              ],
              correctAnswer: 0,
              explanation: "Specific rules should appear before broad rules."
            },
            {
              id: "q9",
              question: "Why review firewall rules periodically?",
              options: [
                "Remove unused rules and reduce risk",
                "Make them longer",
                "Disable logging"
              ],
              correctAnswer: 0,
              explanation: "Unused rules increase risk and complexity."
            }
          ]
        },
        challenge: {
          title: "Build an ACL policy",
          xp: 120,
          rules: {
            minDevices: 4,
            minConnections: 3,
            requiredTypes: {
              router: 1,
              switch: 1,
              pc: 2
            }
          },
          steps: [
            "Add a router, a switch, and two PCs.",
            "Connect PCs to the switch, then connect the switch to the router.",
            "Imagine the router enforcing ACL rules between the PCs."
          ],
          tips: "You're validating topology and segmentation awareness."
        },
        sandbox: {
          title: "Sketch an ACL policy",
          xp: 60,
          steps: [
            "Add a router (with ACL capability), two VLANs, and the Internet cloud to the canvas.",
            "Connect VLAN 10 (staff) and VLAN 20 (guest) to the router, then router to Internet.",
            "List two traffic types you would explicitly permit from the staff VLAN.",
            "List one traffic type you would block from the guest VLAN and explain why."
          ],
          tips: "ACLs are read top-to-bottom and stop at the first match — order your rules from most specific to least specific."
        }
      },
      {
        title: "Unit 3: Monitoring & Incident Response",
        about: "Detect issues early and respond effectively.",
        lessons: [
          {
            title: "Logging and SIEM basics",
            blocks: [
              {
                type: "text",
                text: [
                  "Centralized logging aggregates events from firewalls, routers, and servers.",
                  "SIEM tools correlate events to detect suspicious behavior faster.",
                  "Good logs improve forensic analysis after an incident.",
                  "Make sure logs include timestamps, usernames, source IPs, and action results.",
                  "Noise reduction is important: collect what you need and keep it consistent.",
                  "Example: repeated failed logins plus a sudden admin login from a new IP is higher risk when correlated.",
                  "Time sync (NTP) and log retention policies are critical for usable timelines.",
                  "Well-structured logs reduce investigation time and false positives."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Time sync"
              },
              {
                type: "check",
                question: "A SIEM is used to:",
                options: [
                  "Correlate and analyze logs",
                  "Block all traffic",
                  "Assign IP addresses"
                ],
                correctIndex: 0,
                explanation: "SIEM systems aggregate and analyze logs for security insights."
              }
            ],
            objectives: [
              "Define SIEM at a high level",
              "Explain why log centralization matters"
            ],
            xp: 30
          },
          {
            title: "Incident response workflow",
            blocks: [
              {
                type: "text",
                text: [
                  "IR phases: Prepare, Detect, Contain, Eradicate, and Recover.",
                  "Preparation and detection reduce mean time to respond.",
                  "Document everything to improve future defenses.",
                  "Containment limits damage; eradication removes root cause.",
                  "Recovery restores services safely and validates that the threat is gone.",
                  "Define roles, contacts, and communication channels before incidents happen.",
                  "A post-incident review turns lessons learned into better controls.",
                  "Clear escalation paths prevent confusion during high-stress events."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Post-incident review"
              },
              {
                type: "check",
                question: "Which IR phase comes first?",
                options: [
                  "Prepare",
                  "Contain",
                  "Recover"
                ],
                correctIndex: 0,
                explanation: "Preparation ensures your team and tools are ready before an incident occurs."
              }
            ],
            objectives: [
              "List the IR phases",
              "Explain why documentation matters"
            ],
            xp: 30
          },
          {
            title: "Playbooks and tabletop exercises",
            blocks: [
              {
                type: "text",
                text: [
                  "Playbooks are step-by-step guides for common incidents like phishing or ransomware.",
                  "They define who does what, which systems to isolate, and how to communicate.",
                  "Tabletop exercises simulate incidents without breaking production systems.",
                  "Example: run a tabletop where a VPN account is compromised and test your containment plan.",
                  "Practicing reveals gaps in tooling, access, and decision-making.",
                  "Update playbooks after each exercise so they stay accurate.",
                  "Well-practiced teams respond faster and reduce business impact.",
                  "Playbooks also help onboard new team members quickly."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Why practice matters"
              },
              {
                type: "check",
                question: "Tabletop exercises help teams:",
                options: [
                  "Practice response without production impact",
                  "Encrypt all traffic",
                  "Assign IP addresses"
                ],
                correctIndex: 0,
                explanation: "Tabletops test process and communication safely."
              }
            ],
            objectives: [
              "Explain what a playbook is",
              "Describe the value of tabletop exercises",
              "Identify gaps through practice"
            ],
            xp: 30
          },
          {
            title: "Detection baselines and alerting",
            blocks: [
              {
                type: "text",
                text: [
                  "A baseline is the normal behavior of your network and systems.",
                  "Without a baseline, alerts will be noisy and hard to trust.",
                  "Start with simple metrics: login failures, unusual traffic, and service health.",
                  "Tune alerts so they are actionable and not overwhelming.",
                  "Good alerting reduces fatigue and improves response time.",
                  "Example: a baseline for DNS queries per host helps spot malware or misbehaving clients.",
                  "Baselines shift after major changes or seasonal peaks, so revisit them regularly.",
                  "Alert quality is a measurable sign of a mature security program."
                ]
              },
              {
                type: "explain",
                title: "Key Concept: Revisiting baselines"
              },
              {
                type: "check",
                question: "Fill in the blank: A baseline describes ___ behavior.",
                options: [
                  "normal",
                  "unknown",
                  "hostile"
                ],
                correctIndex: 0,
                explanation: "Baselines define what normal looks like so anomalies stand out."
              }
            ],
            objectives: [
              "Explain what a baseline is",
              "Describe how to tune alerts"
            ],
            xp: 30
          }
        ],
        quiz: {
          title: "Monitoring and IR quiz",
          xp: 120,
          questions: [
            {
              id: "q1",
              question: "Which comes first in IR?",
              options: [
                "Contain",
                "Prepare",
                "Recover"
              ],
              correctAnswer: 1,
              explanation: "Preparation ensures your team and tools are ready."
            },
            {
              id: "q2",
              question: "A SIEM is used to:",
              options: [
                "Block all traffic",
                "Correlate and analyze logs",
                "Assign IP addresses"
              ],
              correctAnswer: 1,
              explanation: "SIEM systems aggregate and analyze logs for security insights."
            },
            {
              id: "q3",
              question: "Fill in the blank: A baseline describes ___ behavior.",
              options: [
                "normal",
                "unknown",
                "hostile"
              ],
              correctAnswer: 0,
              explanation: "Baselines describe normal behavior."
            },
            {
              id: "q4",
              question: "Why tune alerts?",
              options: [
                "To increase noise",
                "To make alerts actionable",
                "To disable logging"
              ],
              correctAnswer: 1,
              explanation: "Tuned alerts reduce noise and improve response."
            },
            {
              id: "q5",
              question: "Containment is used to:",
              options: [
                "Spread the incident",
                "Limit damage",
                "Erase evidence"
              ],
              correctAnswer: 1,
              explanation: "Containment limits impact."
            },
            {
              id: "q6",
              question: "Good logs should include:",
              options: [
                "Timestamps and user actions",
                "Only usernames",
                "Only IP addresses"
              ],
              correctAnswer: 0,
              explanation: "Timestamps and actions are critical for investigations."
            },
            {
              id: "q7",
              question: "Which phase comes after containment?",
              options: [
                "Eradicate",
                "Prepare",
                "Detect"
              ],
              correctAnswer: 0,
              explanation: "After containment, remove root cause during eradication."
            },
            {
              id: "q8",
              question: "Tabletop exercises help teams:",
              options: [
                "Practice response without production impact",
                "Encrypt traffic",
                "Assign IPs"
              ],
              correctAnswer: 0,
              explanation: "Tabletops test process and communication safely."
            },
            {
              id: "q9",
              question: "A good alert should be:",
              options: [
                "Actionable and low-noise",
                "As loud as possible",
                "Hidden by default"
              ],
              correctAnswer: 0,
              explanation: "Actionable alerts reduce fatigue and speed response."
            }
          ]
        },
        sandbox: {
          title: "Analyze a log snippet",
          xp: 60,
          steps: [
            "Add a firewall and a server to the canvas.",
            "Connect the server to the firewall, then connect the firewall to the Internet cloud.",
            "In your notes, list two signals that would make a log entry suspicious.",
            "Explain how a SIEM would correlate repeated failures from one IP."
          ],
          tips: "Look for repeated failures, impossible travel, or unusual ports for quick wins."
        },
        challenge: {
          title: "Design an incident response plan",
          xp: 120,
          rules: {
            description: "A SIEM alert fires at 03:00 showing 500 failed SSH logins from a single external IP in 10 minutes, followed by one success. Plan your response.",
            objectives: [
              "Identify the likely attack type",
              "List the first three actions you would take",
              "Describe how you would prevent recurrence"
            ]
          },
          steps: [
            "Add a firewall, a jump host, and a SIEM server to the canvas.",
            "Connect the Internet cloud through the firewall to the jump host.",
            "Write down the attack type this pattern describes.",
            "List your first three response actions in order of priority.",
            "Propose one firewall rule change that would prevent this in future."
          ],
          tips: "Brute-force followed by a successful login means credentials may be compromised — containment before investigation."
        }
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
    xpReward: 360,
    category: "WAN",
    units: [
      {
        title: "Unit 1: WAN and BGP",
        about: "Learn WAN connectivity and BGP fundamentals.",
        lessons: [
          {
            title: "WAN technologies",
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
                title: "Explain: Why SD-WAN is growing"
              },
              {
                type: "check",
                title: "Quick check",
                question: "Which WAN technology provides application-aware routing over multiple links?",
                options: [
                  "MPLS",
                  "SD-WAN",
                  "Leased line"
                ],
                correctIndex: 1,
                explanation: "SD-WAN uses software-defined policies for intelligent path selection."
              }
            ],
            objectives: [
              "Compare MPLS, SD-WAN, and VPN technologies",
              "Explain why SD-WAN is growing",
              "Describe trade-offs between WAN options"
            ],
            xp: 30
          },
          {
            title: "BGP basics",
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
                title: "Explain: AS-PATH attribute"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What does BGP use to select the best route?",
                options: [
                  "Bandwidth cost",
                  "Path attributes like AS-PATH",
                  "Hop count only"
                ],
                correctIndex: 1,
                explanation: "BGP uses multiple path attributes including AS-PATH and LOCAL_PREF."
              }
            ],
            objectives: [
              "Explain what BGP does",
              "Describe key BGP path attributes",
              "Compare eBGP and iBGP"
            ],
            xp: 30
          }
        ],
        quiz: {
          title: "WAN quick check",
          xp: 120,
          questions: [
            {
              id: "q1",
              question: "BGP is used for:",
              options: [
                "LAN switching",
                "Internet routing",
                "Wi‑Fi encryption"
              ],
              correctAnswer: 1,
              explanation: "BGP is the routing protocol of the Internet."
            },
            {
              id: "q2",
              question: "SD-WAN uses ___ to choose the best path for traffic.",
              options: [
                "Software-defined policies",
                "Static routes only",
                "MAC addresses"
              ],
              correctAnswer: 0,
              explanation: "SD-WAN applies application-aware policies across multiple links."
            },
            {
              id: "q3",
              question: "BGP selects routes primarily using:",
              options: [
                "Path attributes like AS-PATH",
                "Hop count only",
                "Cable length"
              ],
              correctAnswer: 0,
              explanation: "BGP uses attributes such as AS-PATH and LOCAL_PREF for route selection."
            },
            {
              id: "q4",
              question: "eBGP runs between:",
              options: [
                "Different Autonomous Systems",
                "Switches on the same LAN",
                "Wireless access points"
              ],
              correctAnswer: 0,
              explanation: "eBGP exchanges routes between separate Autonomous Systems."
            },
            {
              id: "q5",
              question: "MPLS is typically described as:",
              options: [
                "A private low-latency carrier service",
                "A free open-source tool",
                "A wireless protocol"
              ],
              correctAnswer: 0,
              explanation: "MPLS provides dedicated paths through a service provider network."
            }
          ]
        },
        sandbox: {
          title: "Map a WAN topology",
          xp: 60,
          steps: [
            "Add two office routers (HQ and Branch) and an Internet cloud to the canvas.",
            "Connect both routers to the cloud to represent a dual-ISP SD-WAN setup.",
            "Label which link you would prefer for real-time traffic (VoIP) and which for bulk data.",
            "Explain in one sentence why MPLS is preferred over the public Internet for sensitive traffic."
          ],
          tips: "SD-WAN policies apply quality-of-service rules per application — always mark real-time traffic as high priority."
        },
        challenge: {
          title: "Troubleshoot a BGP session",
          xp: 120,
          rules: {
            description: "Your BGP session with your upstream ISP is down. The physical link is up. Walk through a systematic troubleshooting approach.",
            objectives: [
              "Identify the most common causes of a BGP session failure",
              "Describe the BGP state machine steps",
              "Propose specific commands or checks you would run"
            ]
          },
          steps: [
            "Add two routers (your edge router and the ISP router) and an Internet cloud.",
            "Connect both routers to each other to represent the eBGP peering link.",
            "List the BGP states in order: Idle → Connect → Active → OpenSent → OpenConfirm → Established.",
            "Identify two configuration mismatches (e.g. wrong AS number, wrong neighbor IP) that would prevent Established.",
            "Write the single show command that tells you the current BGP neighbor state."
          ],
          tips: "Check AS numbers, neighbor IP addresses, and MD5 auth keys first — 90% of BGP session failures are one of these three."
        }
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
    xpReward: 360,
    category: "Automation",
    units: [
      {
        title: "Unit 1: Automation and Observability",
        about: "Learn why automation matters and how monitoring works.",
        lessons: [
          {
            title: "Network automation overview",
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
                title: "Explain: Infrastructure as Code"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is the main benefit of network automation?",
                options: [
                  "It eliminates all hardware",
                  "It reduces manual errors and speeds up changes",
                  "It replaces all security tools"
                ],
                correctIndex: 1,
                explanation: "Automation reduces errors and makes changes faster and more consistent."
              }
            ],
            objectives: [
              "Explain why network automation matters",
              "Describe Infrastructure as Code",
              "Identify common automation tools"
            ],
            xp: 30
          },
          {
            title: "Monitoring & SNMP",
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
                title: "Explain: SNMP versions"
              },
              {
                type: "check",
                title: "Quick check",
                question: "What is an SNMP trap?",
                options: [
                  "A scheduled poll from the server",
                  "An unsolicited alert sent by a device",
                  "A type of firewall rule"
                ],
                correctIndex: 1,
                explanation: "SNMP traps are alerts sent proactively by devices when something changes."
              }
            ],
            objectives: [
              "Describe how SNMP works",
              "Compare SNMP polling and traps",
              "Explain why SNMPv3 is preferred"
            ],
            xp: 30
          }
        ],
        quiz: {
          title: "Automation quick check",
          xp: 120,
          questions: [
            {
              id: "q1",
              question: "SNMP is commonly used for:",
              options: [
                "Routing",
                "Monitoring",
                "Encryption"
              ],
              correctAnswer: 1,
              explanation: "SNMP is a monitoring protocol."
            },
            {
              id: "q2",
              question: "An SNMP trap is:",
              options: [
                "An unsolicited alert sent by a device",
                "A scheduled poll from the server",
                "A type of firewall rule"
              ],
              correctAnswer: 0,
              explanation: "Traps are alerts devices send proactively when thresholds are exceeded."
            },
            {
              id: "q3",
              question: "Infrastructure as Code means:",
              options: [
                "Defining network state in version-controlled files",
                "Writing code on physical routers",
                "Replacing all hardware with software"
              ],
              correctAnswer: 0,
              explanation: "IaC stores the desired configuration in files that are reviewed and deployed like software."
            },
            {
              id: "q4",
              question: "SNMPv3 improves on earlier versions by adding:",
              options: [
                "Authentication and encryption",
                "Faster polling only",
                "Wireless support"
              ],
              correctAnswer: 0,
              explanation: "SNMPv3 adds authentication and encryption to protect monitoring data."
            },
            {
              id: "q5",
              question: "The main benefit of network automation is:",
              options: [
                "Reducing manual errors and speeding up changes",
                "Eliminating all hardware",
                "Removing the need for monitoring"
              ],
              correctAnswer: 0,
              explanation: "Automation makes changes faster, more consistent, and less error-prone."
            }
          ]
        },
        sandbox: {
          title: "Plan an automation workflow",
          xp: 60,
          steps: [
            "Add three network devices (router, switch, firewall) and a management server to the canvas.",
            "Connect all devices to the management server to represent out-of-band management.",
            "List the three steps an Ansible playbook would follow to push a VLAN config to all switches.",
            "Identify one risk of running an untested automation script on production devices."
          ],
          tips: "Always test automation in a staging environment first — a bad playbook can misconfigure every device simultaneously."
        },
        challenge: {
          title: "Set up a monitoring baseline",
          xp: 120,
          rules: {
            description: "You have been asked to set up basic monitoring for a 20-device network. Design what you would monitor, how you would alert, and what thresholds you would set.",
            objectives: [
              "Choose at least four metrics to monitor per device",
              "Define alert thresholds for each metric",
              "Describe how SNMP traps fit into your design"
            ]
          },
          steps: [
            "Add four device types (router, switch, firewall, server) and an NMS to the canvas.",
            "Connect all devices to the NMS server.",
            "List the four metrics you would poll via SNMP GET on each device.",
            "Define a threshold for each metric that would trigger a warning alert.",
            "Explain when you would use SNMP traps instead of polling."
          ],
          tips: "Start with interface utilisation, CPU, memory, and error counters — these cover 80% of real outages."
        }
      }
    ]
  }
};

// expose globally so all pages can use window.COURSE_CONTENT
window.COURSE_CONTENT = COURSE_CONTENT;
