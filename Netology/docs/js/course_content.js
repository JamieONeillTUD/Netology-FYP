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
      // =========================================================
      // UNIT 1 (Lessons 1–4)
      // =========================================================
      {
        title: "Unit 1: Networking foundations",
        about:
          "Learn the building blocks of computer networking. You’ll explore what networks are, why they exist, common network types, key LAN devices, and the basics of Ethernet + MAC addressing.",
        sections: [
          {
            title: "Getting started",
            items: [
              { type: "Learn", lesson_index: 1, label: "What is networking?" },
              { type: "Quiz", lesson_index: 1, label: "Quick check: networking purpose" },
              { type: "Learn", lesson_index: 2, label: "LAN vs WAN vs Internet" },
              { type: "Practice", lesson_index: 2, label: "Classify network types", questions: 4 }
            ]
          },
          {
            title: "Devices + roles in a LAN",
            items: [
              { type: "Learn", lesson_index: 3, label: "Network devices (PC, switch, router)" },
              { type: "Quiz", lesson_index: 3, label: "Quick check: device roles" },
              { type: "Challenge", lesson_index: 3, label: "Build: a basic LAN topology" }
            ]
          },
          {
            title: "Ethernet basics",
            items: [
              { type: "Learn", lesson_index: 4, label: "Ethernet frames + MAC addresses" },
              { type: "Practice", lesson_index: 4, label: "Identify MAC address format", questions: 4 },
              { type: "Quiz", lesson_index: 4, label: "Quick check: Ethernet" }
            ]
          }
        ],
        lessons: [
          // 1
          {
            title: "What is networking?",
            learn:
              "Computer networking is the practice of connecting devices so they can share data and resources.\n\n" +
              "A network lets devices communicate using agreed rules called protocols. When you open a website, send a message, or stream a video, your device is sending and receiving data across networks.\n\n" +
              "Why networks exist:\n" +
              "- Share files and services (printers, storage)\n" +
              "- Communicate (email, chat, video calls)\n" +
              "- Access the Internet\n" +
              "- Improve reliability (backup paths) and scalability (more users/devices)\n\n" +
              "A network can be as small as two PCs connected together, or as large as the Internet.",
            quiz: {
              question: "What is the main purpose of a network?",
              options: ["To store files only", "To let devices communicate and share data", "To increase CPU performance"],
              answer: 1,
              explain: "Networks exist to connect devices so they can communicate and share information and resources."
            },
            challenge: {
              title: "Connect two devices",
              objectives: ["Add 2 PCs", "Connect them with a link"],
              rules: { requiredTypes: { pc: 2 }, requireConnections: true }
            }
          },
          // 2
          {
            title: "LAN vs WAN vs Internet",
            learn:
              "Networks are often grouped by size and scope:\n\n" +
              "- LAN (Local Area Network): a small network in a home, office, or lab.\n" +
              "- WAN (Wide Area Network): connects LANs over large distances (cities/countries).\n" +
              "- Internet: the largest WAN in the world (public networks connected together).\n\n" +
              "A key idea: LANs are usually owned/managed by one organization, while WANs often involve service providers.\n\n" +
              "In your project, most sandbox topologies represent LANs (PCs, switches, a router).",
            quiz: {
              question: "Which network type usually covers a home or small office?",
              options: ["LAN", "WAN", "Internet"],
              answer: 0,
              explain: "A LAN is a local network limited to a small area like a home, office, or lab."
            },
            challenge: null
          },
          // 3
          {
            title: "Network devices (PC, switch, router)",
            learn:
              "In a basic network, devices play specific roles:\n\n" +
              "- End devices (PCs, laptops): generate/consume data.\n" +
              "- Switch: connects devices in the same LAN and forwards frames based on MAC addresses.\n" +
              "- Router: connects different networks (different subnets) and forwards packets based on IP addressing.\n\n" +
              "Quick mental model:\n" +
              "Switch = inside the LAN (Layer 2)\n" +
              "Router = between networks/subnets (Layer 3)\n\n" +
              "In real life you may also see access points (Wi-Fi), firewalls, and servers.",
            quiz: {
              question: "Which device connects multiple PCs inside a LAN?",
              options: ["Switch", "Monitor", "Keyboard"],
              answer: 0,
              explain: "Switches connect devices together inside a local network (LAN)."
            },
            challenge: {
              title: "LAN layout",
              objectives: ["Add 1 switch", "Add 2 PCs", "Connect PCs to the switch"],
              rules: { requiredTypes: { pc: 2, switch: 1 }, requireConnections: true }
            }
          },
          // 4
          {
            title: "Ethernet frames + MAC addresses",
            learn:
              "Ethernet is the most common technology used in wired LANs.\n\n" +
              "Important concepts:\n" +
              "- Frames: Ethernet sends data in frames (Layer 2).\n" +
              "- MAC Address: a unique identifier on a network interface (example: 3C:52:82:AA:10:FF).\n\n" +
              "Switches learn which MAC addresses are reachable on which ports, and forward frames to the correct destination when possible.\n\n" +
              "MAC vs IP:\n" +
              "- MAC = local delivery inside a LAN\n" +
              "- IP  = logical addressing for routing between networks",
            quiz: {
              question: "What does a switch mainly use to forward traffic inside a LAN?",
              options: ["MAC addresses", "IP addresses", "DNS records"],
              answer: 0,
              explain: "Switches forward frames based on MAC address tables (Layer 2)."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 2 (Lessons 5–8)
      // =========================================================
      {
        title: "Unit 2: IP addressing + subnet masks",
        about:
          "Learn how IP addresses identify devices, how subnet masks define the network boundary, and how to tell whether devices are on the same subnet. You’ll also learn the idea of network, host, and broadcast addresses.",
        sections: [
          {
            title: "IP essentials",
            items: [
              { type: "Learn", lesson_index: 5, label: "IP addresses explained" },
              { type: "Quiz", lesson_index: 5, label: "Quick check: IP purpose" },
              { type: "Learn", lesson_index: 6, label: "Network vs host vs broadcast" },
              { type: "Practice", lesson_index: 6, label: "Pick network/broadcast", questions: 4 }
            ]
          },
          {
            title: "Subnet masks",
            items: [
              { type: "Learn", lesson_index: 7, label: "Subnet masks (network vs host)" },
              { type: "Practice", lesson_index: 7, label: "Identify valid subnet masks", questions: 4 },
              { type: "Quiz", lesson_index: 7, label: "Quick check: subnet masks" }
            ]
          },
          {
            title: "Same subnet (hands-on)",
            items: [
              { type: "Learn", lesson_index: 8, label: "Same subnet vs different subnet" },
              { type: "Quiz", lesson_index: 8, label: "Quick check: same subnet" },
              { type: "Challenge", lesson_index: 8, label: "Build: two PCs on same subnet" }
            ]
          }
        ],
        lessons: [
          // 5
          {
            title: "IP addresses explained",
            learn:
              "An IP address is a logical address used to identify a device on a network (Layer 3).\n\n" +
              "IPv4 addresses look like: 192.168.1.10\n" +
              "They are made of 4 octets (0–255).\n\n" +
              "Key idea:\n" +
              "- Inside a subnet, devices communicate locally.\n" +
              "- To reach outside the subnet, devices typically use a router.\n\n" +
              "In your sandbox labs, IP addressing is the #1 reason things do or don’t connect.",
            quiz: {
              question: "What is an IP address used for?",
              options: ["Identifying a device on a network", "Naming Wi-Fi networks", "Encrypting passwords"],
              answer: 0,
              explain: "IP addresses identify devices logically at Layer 3 so data can be delivered and routed."
            },
            challenge: null
          },
          // 6
          {
            title: "Network vs host vs broadcast",
            learn:
              "Inside each subnet, some addresses have special meaning:\n\n" +
              "- Network address: identifies the subnet itself (usually the first address).\n" +
              "- Broadcast address: used to send to all hosts in the subnet (usually the last address).\n" +
              "- Host addresses: usable addresses between network and broadcast.\n\n" +
              "Example: 192.168.1.0/24\n" +
              "- Network: 192.168.1.0\n" +
              "- Broadcast: 192.168.1.255\n" +
              "- Hosts: 192.168.1.1 → 192.168.1.254\n\n" +
              "Knowing these helps you avoid picking invalid device IPs.",
            quiz: {
              question: "In a typical subnet, the broadcast address is…",
              options: ["The first usable host", "The last address in the subnet", "The router address only"],
              answer: 1,
              explain: "Broadcast is usually the last address in a subnet (all host bits set to 1)."
            },
            challenge: null
          },
          // 7
          {
            title: "Subnet masks (network vs host)",
            learn:
              "A subnet mask tells you which part of an IP address is the network portion and which part is the host portion.\n\n" +
              "Example:\n" +
              "- IP: 192.168.1.10\n" +
              "- Mask: 255.255.255.0\n\n" +
              "Subnet masks must be contiguous (1s then 0s in binary). Common masks include:\n" +
              "- 255.255.255.0 (/24)\n" +
              "- 255.255.255.192 (/26)\n" +
              "- 255.255.0.0 (/16)\n\n" +
              "If the mask is wrong, a PC can think remote hosts are local (or local hosts are remote).",
            quiz: {
              question: "What does a subnet mask do?",
              options: ["Encrypts packets", "Splits network vs host bits", "Assigns MAC addresses"],
              answer: 1,
              explain: "Subnet masks define the boundary between network bits and host bits."
            },
            challenge: null
          },
          // 8
          {
            title: "Same subnet vs different subnet",
            learn:
              "To check if two devices are on the same subnet:\n\n" +
              "1) Apply the subnet mask to both IP addresses\n" +
              "2) If the resulting network address is the same, they are in the same subnet\n\n" +
              "Example:\n" +
              "- 192.168.1.10 / 255.255.255.0 → network: 192.168.1.0\n" +
              "- 192.168.1.50 / 255.255.255.0 → network: 192.168.1.0\n" +
              "Same subnet ✅\n\n" +
              "If devices are in different subnets, you normally need a router/gateway to communicate.",
            quiz: {
              question: "Two devices with 192.168.1.10/24 and 192.168.1.50/24 are…",
              options: ["On the same subnet", "On different subnets", "Invalid addresses"],
              answer: 0,
              explain: "Both IPs fall under 192.168.1.0/24, so they are on the same subnet."
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
          }
        ]
      },

      // =========================================================
      // UNIT 3 (Lessons 9–12)
      // =========================================================
      {
        title: "Unit 3: Switching + LAN design",
        about:
          "Understand why switches exist, how MAC learning works, and how to build stable LANs with consistent addressing. You’ll also learn the difference between collision domains and broadcast domains at a beginner-friendly level.",
        sections: [
          {
            title: "Switching basics",
            items: [
              { type: "Learn", lesson_index: 9, label: "Switches and MAC learning" },
              { type: "Quiz", lesson_index: 9, label: "Quick check: MAC tables" },
              { type: "Learn", lesson_index: 10, label: "Flooding vs forwarding" },
              { type: "Practice", lesson_index: 10, label: "Predict switch behavior", questions: 4 }
            ]
          },
          {
            title: "LAN planning",
            items: [
              { type: "Learn", lesson_index: 11, label: "LAN planning (IPs, mask, naming)" },
              { type: "Practice", lesson_index: 11, label: "Pick correct host ranges", questions: 4 },
              { type: "Challenge", lesson_index: 11, label: "Build: small LAN with a switch" }
            ]
          },
          {
            title: "Broadcast vs collision (intro)",
            items: [
              { type: "Learn", lesson_index: 12, label: "Broadcast domains (simple intro)" },
              { type: "Quiz", lesson_index: 12, label: "Quick check: broadcast domain" }
            ]
          }
        ],
        lessons: [
          // 9
          {
            title: "Switches and MAC learning",
            learn:
              "A switch is designed to intelligently forward traffic inside a LAN.\n\n" +
              "How it works (simplified):\n" +
              "- Learns source MAC addresses by observing incoming frames\n" +
              "- Builds a MAC table mapping MAC → port\n" +
              "- If it knows the destination MAC, it forwards only to that port\n" +
              "- If it doesn’t know, it floods the frame (temporarily)\n\n" +
              "This is more efficient than sending everything everywhere.",
            quiz: {
              question: "What does a switch learn to build its forwarding table?",
              options: ["Source MAC addresses", "Subnet masks", "DNS names"],
              answer: 0,
              explain: "Switches learn source MAC addresses and record which ports they arrive on."
            },
            challenge: null
          },
          // 10
          {
            title: "Flooding vs forwarding",
            learn:
              "When a switch receives a frame, it decides what to do:\n\n" +
              "- If destination MAC is known → forward to one port\n" +
              "- If destination MAC is unknown → flood to all ports (except the incoming port)\n\n" +
              "Flooding is normal at the start of a network (before the switch learns MACs), but long-term forwarding is more efficient.\n\n" +
              "In troubleshooting, flooding can explain why a network seems noisy until it 'settles'.",
            quiz: {
              question: "When does a switch flood a frame?",
              options: ["When the destination MAC is unknown", "When the IP is invalid", "When the subnet mask is /24"],
              answer: 0,
              explain: "If the switch doesn’t know where the destination MAC is, it floods the frame to discover it."
            },
            challenge: null
          },
          // 11
          {
            title: "LAN planning (IPs, mask, naming)",
            learn:
              "A good LAN setup is readable and consistent.\n\n" +
              "Best practices:\n" +
              "- Use a consistent subnet (example: 192.168.10.0/24)\n" +
              "- Give devices clear names (PC-1, PC-2, Switch-1)\n" +
              "- Keep IP addressing logical (PC-1 = .10, PC-2 = .11)\n\n" +
              "In your sandbox, a ‘valid’ configuration usually means:\n" +
              "- IPs look correct (0–255)\n" +
              "- Masks are real masks (contiguous)\n" +
              "- Devices intended to communicate share a subnet",
            quiz: {
              question: "Which is a good practice for a small LAN?",
              options: ["Use random IPs from different ranges", "Use a consistent subnet and logical IP assignments", "Avoid naming devices"],
              answer: 1,
              explain: "Consistent subnets and logical addressing makes networks easier to manage and troubleshoot."
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
          },
          // 12
          {
            title: "Broadcast domains (simple intro)",
            learn:
              "A broadcast is a message sent to all devices in a subnet (like ARP requests).\n\n" +
              "Beginner rule of thumb:\n" +
              "- A switch forwards broadcasts within the LAN.\n" +
              "- A router does NOT forward broadcasts between subnets.\n\n" +
              "That means:\n" +
              "- One subnet = one broadcast domain\n" +
              "- If you split into multiple subnets, you reduce broadcast spread\n\n" +
              "This is one reason companies use multiple VLANs/subnets as networks grow.",
            quiz: {
              question: "What device typically stops broadcasts from crossing into another subnet?",
              options: ["Router", "Switch", "PC"],
              answer: 0,
              explain: "Routers separate broadcast domains by not forwarding broadcasts between subnets."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 4 (Lessons 13–16)
      // =========================================================
      {
        title: "Unit 4: Routing + default gateway",
        about:
          "Learn why routers exist, how subnets differ, when you need a default gateway, and how traffic leaves a subnet. You’ll build simple router-based topologies and practice correct addressing.",
        sections: [
          {
            title: "Routers",
            items: [
              { type: "Learn", lesson_index: 13, label: "Routing basics" },
              { type: "Quiz", lesson_index: 13, label: "Quick check: routers" },
              { type: "Challenge", lesson_index: 13, label: "Build: router in the middle" }
            ]
          },
          {
            title: "Default gateway",
            items: [
              { type: "Learn", lesson_index: 14, label: "Default gateway explained" },
              { type: "Practice", lesson_index: 14, label: "Pick the correct gateway", questions: 4 },
              { type: "Quiz", lesson_index: 14, label: "Quick check: gateway use" },
              { type: "Challenge", lesson_index: 14, label: "Build: gateway-ready LAN" }
            ]
          },
          {
            title: "Troubleshooting mindset",
            items: [
              { type: "Learn", lesson_index: 15, label: "Troubleshooting checklist (L1–L3)" },
              { type: "Quiz", lesson_index: 15, label: "Quick check: troubleshooting order" },
              { type: "Learn", lesson_index: 16, label: "Common misconfigs (IP/mask/gateway)" }
            ]
          }
        ],
        lessons: [
          // 13
          {
            title: "Routing basics",
            learn:
              "Routers connect different networks. If devices are on different subnets, you normally need a router (and a gateway) so traffic can move between them.\n\n" +
              "Key idea:\n" +
              "- Switches forward frames inside a LAN (MAC)\n" +
              "- Routers forward packets between networks (IP)\n\n" +
              "In real networks, routers may also perform NAT, firewall rules, and routing protocols.",
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
          // 14
          {
            title: "Default gateway explained",
            learn:
              "A default gateway is the router address a device uses to reach other networks.\n\n" +
              "How a PC decides where to send traffic:\n" +
              "- If destination is in the same subnet → send directly\n" +
              "- If destination is outside the subnet → send to default gateway\n\n" +
              "Common mistakes:\n" +
              "- Wrong gateway (outside subnet)\n" +
              "- Missing gateway\n" +
              "- Wrong mask (makes device think remote hosts are local)",
            quiz: {
              question: "When does a PC use the default gateway?",
              options: ["When sending to same subnet", "When sending to a different subnet", "When requesting DNS only"],
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
          },
          // 15
          {
            title: "Troubleshooting checklist (L1–L3)",
            learn:
              "Networking troubleshooting is mostly structured thinking.\n\n" +
              "A simple checklist:\n" +
              "1) Physical: is it connected? (in your sandbox: do you have links?)\n" +
              "2) IP addressing: valid IP? correct subnet mask?\n" +
              "3) Same subnet: are endpoints in the same subnet?\n" +
              "4) Gateway: if not same subnet, is a gateway/router present?\n\n" +
              "Tip: change one thing at a time and re-test. That’s how you learn faster.",
            quiz: {
              question: "Best first step when two PCs can’t communicate?",
              options: ["Reinstall the OS", "Check links and IP/subnet settings first", "Buy a new switch"],
              answer: 1,
              explain: "Start with basics: connection and addressing. Most issues are simple misconfigurations."
            },
            challenge: null
          },
          // 16
          {
            title: "Common misconfigs (IP/mask/gateway)",
            learn:
              "Most beginner networking failures come from a small set of mistakes:\n\n" +
              "- IP typo (192.168.1.300)\n" +
              "- Mask mismatch (one PC /24 and another /16)\n" +
              "- Wrong gateway (gateway not in the same subnet)\n" +
              "- Devices in different subnets with no router\n\n" +
              "A useful habit:\n" +
              "Write down each device's IP + mask, then write the network address. If the network addresses differ, you’ll need routing.",
            quiz: {
              question: "A default gateway must usually be…",
              options: ["In the same subnet as the PC", "In a different subnet", "Any random address"],
              answer: 0,
              explain: "A PC must be able to reach its gateway directly, so it must be in the same subnet."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 5 (Lessons 17–20)
      // =========================================================
      {
        title: "Unit 5: Core network services (DNS + DHCP)",
        about:
          "Learn what DNS and DHCP do in real networks. You’ll understand why humans use names, how devices get IP addresses automatically, and what can go wrong when these services are missing or misconfigured.",
        sections: [
          {
            title: "DNS fundamentals",
            items: [
              { type: "Learn", lesson_index: 17, label: "What is DNS?" },
              { type: "Quiz", lesson_index: 17, label: "Quick check: DNS job" },
              { type: "Learn", lesson_index: 18, label: "DNS in the real world (records + caching)" },
              { type: "Practice", lesson_index: 18, label: "Pick the correct record type", questions: 4 }
            ]
          },
          {
            title: "DHCP fundamentals",
            items: [
              { type: "Learn", lesson_index: 19, label: "What is DHCP?" },
              { type: "Quiz", lesson_index: 19, label: "Quick check: DHCP job" },
              { type: "Learn", lesson_index: 20, label: "DHCP leases (DORA)" }
            ]
          }
        ],
        lessons: [
          // 17
          {
            title: "What is DNS?",
            learn:
              "DNS (Domain Name System) translates human-friendly names into IP addresses.\n\n" +
              "Example:\n" +
              "- You type: example.com\n" +
              "- DNS returns: 93.184.216.34 (an IP)\n\n" +
              "Without DNS, you’d have to remember IP addresses for everything.\n\n" +
              "In troubleshooting:\n" +
              "- If IP connectivity works but names fail, DNS is often the issue.",
            quiz: {
              question: "What is DNS mainly used for?",
              options: ["Assigning IP addresses automatically", "Translating names to IP addresses", "Forwarding Ethernet frames"],
              answer: 1,
              explain: "DNS maps names (domains) to IP addresses so humans don’t need to remember IPs."
            },
            challenge: null
          },
          // 18
          {
            title: "DNS in the real world (records + caching)",
            learn:
              "DNS is a distributed database with different record types.\n\n" +
              "Common records:\n" +
              "- A: name → IPv4 address\n" +
              "- AAAA: name → IPv6 address\n" +
              "- CNAME: alias → canonical name\n\n" +
              "Caching matters:\n" +
              "- Devices cache DNS answers for performance\n" +
              "- That’s why changes can take time to appear\n\n" +
              "Beginner tip: separate the problem:\n" +
              "1) Can I reach an IP?\n" +
              "2) Can I resolve a name?",
            quiz: {
              question: "Which DNS record type maps a name to an IPv4 address?",
              options: ["A", "CNAME", "MX"],
              answer: 0,
              explain: "An A record maps a hostname to an IPv4 address."
            },
            challenge: null
          },
          // 19
          {
            title: "What is DHCP?",
            learn:
              "DHCP (Dynamic Host Configuration Protocol) automatically gives devices network settings.\n\n" +
              "Typically assigned:\n" +
              "- IP address\n" +
              "- Subnet mask\n" +
              "- Default gateway\n" +
              "- DNS server\n\n" +
              "Why it matters:\n" +
              "- Saves time\n" +
              "- Reduces mistakes\n" +
              "- Makes large networks manageable\n\n" +
              "Static IPs are still used for servers, routers, printers, and important devices.",
            quiz: {
              question: "What is DHCP mainly used for?",
              options: ["Forwarding frames", "Automatically assigning IP configuration", "Encrypting traffic"],
              answer: 1,
              explain: "DHCP hands out IP settings automatically to reduce manual configuration."
            },
            challenge: null
          },
          // 20
          {
            title: "DHCP leases (DORA)",
            learn:
              "DHCP often follows a simple exchange called DORA:\n\n" +
              "- Discover: client asks for an address\n" +
              "- Offer: server offers an address\n" +
              "- Request: client requests the offered address\n" +
              "- Acknowledge: server confirms (lease begins)\n\n" +
              "Leases expire after a time and can be renewed.\n\n" +
              "Troubleshooting clues:\n" +
              "- If a device gets an unexpected address range, DHCP might be missing or blocked.",
            quiz: {
              question: "In DHCP, what does the server send after Discover?",
              options: ["Offer", "Acknowledge", "Broadcast address"],
              answer: 0,
              explain: "After Discover, the DHCP server responds with an Offer."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 6 (Lessons 21–24)
      // =========================================================
      {
        title: "Unit 6: Internet access basics (NAT + private IPs)",
        about:
          "Learn why private IP ranges exist and how NAT allows many private devices to share one public Internet connection. This unit builds practical intuition for home routers and real networks.",
        sections: [
          {
            title: "Private vs public",
            items: [
              { type: "Learn", lesson_index: 21, label: "Private IP ranges (RFC1918)" },
              { type: "Quiz", lesson_index: 21, label: "Quick check: private ranges" }
            ]
          },
          {
            title: "NAT basics",
            items: [
              { type: "Learn", lesson_index: 22, label: "What is NAT?" },
              { type: "Quiz", lesson_index: 22, label: "Quick check: NAT purpose" },
              { type: "Learn", lesson_index: 23, label: "PAT (many-to-one NAT)" },
              { type: "Practice", lesson_index: 23, label: "Pick correct NAT statement", questions: 4 }
            ]
          },
          {
            title: "Home-router mental model",
            items: [
              { type: "Learn", lesson_index: 24, label: "What your home router actually does" }
            ]
          }
        ],
        lessons: [
          // 21
          {
            title: "Private IP ranges (RFC1918)",
            learn:
              "Private IP addresses are used inside internal networks and are not routed on the public Internet.\n\n" +
              "Common private ranges:\n" +
              "- 10.0.0.0/8\n" +
              "- 172.16.0.0/12\n" +
              "- 192.168.0.0/16\n\n" +
              "This lets organizations reuse internal addressing without needing public IPs for every device.",
            quiz: {
              question: "Which is a private IP range?",
              options: ["192.168.0.0 - 192.168.255.255", "8.8.8.0 - 8.8.8.255", "1.1.1.0 - 1.1.1.255"],
              answer: 0,
              explain: "192.168.0.0/16 is a private range defined for internal networks."
            },
            challenge: null
          },
          // 22
          {
            title: "What is NAT?",
            learn:
              "NAT (Network Address Translation) changes IP addresses as traffic passes through a router.\n\n" +
              "Why it exists:\n" +
              "- Many internal devices use private IPs\n" +
              "- The Internet requires public-routable addresses\n\n" +
              "So the router translates private source addresses into a public address when traffic goes out to the Internet.\n\n" +
              "Key idea: NAT is common in home networks and small businesses.",
            quiz: {
              question: "Why is NAT commonly used in home networks?",
              options: ["To replace switches", "To allow private IP devices to access the Internet", "To increase Wi-Fi speed"],
              answer: 1,
              explain: "NAT allows many private IP devices to share one public Internet connection."
            },
            challenge: null
          },
          // 23
          {
            title: "PAT (many-to-one NAT)",
            learn:
              "PAT (Port Address Translation) is the most common type of NAT in home routers.\n\n" +
              "It allows many internal devices to share a single public IP address by tracking connections using port numbers.\n\n" +
              "Example idea:\n" +
              "- PC-1 internal: 192.168.1.10:51000\n" +
              "- Router public: 203.0.113.5:40001\n\n" +
              "The router keeps a translation table so replies return to the correct internal device.",
            quiz: {
              question: "PAT allows many devices to share one public IP by using…",
              options: ["MAC addresses", "Port numbers", "Subnet masks"],
              answer: 1,
              explain: "PAT tracks flows using ports so multiple internal devices can share a single public IP."
            },
            challenge: null
          },
          // 24
          {
            title: "What your home router actually does",
            learn:
              "A typical home router is doing multiple jobs at once:\n\n" +
              "- Router (Layer 3): connects your home subnet to the ISP network\n" +
              "- Switch (Layer 2): provides multiple LAN ports\n" +
              "- Wi-Fi access point: connects wireless devices\n" +
              "- DHCP server: gives IP settings automatically\n" +
              "- DNS forwarder: forwards DNS queries\n" +
              "- NAT/PAT: translates your private traffic to the public Internet\n\n" +
              "This is why one small box can run an entire home network.",
            quiz: {
              question: "Which service on a home router typically hands out IP addresses?",
              options: ["DNS", "DHCP", "NAT"],
              answer: 1,
              explain: "DHCP is responsible for automatically assigning IP settings to devices."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 7 (Lessons 25–28)
      // =========================================================
      {
        title: "Unit 7: Tools + troubleshooting in practice",
        about:
          "Learn how real networking is tested: ping, tracert/traceroute, and a practical troubleshooting mindset. You’ll learn what success looks like at each layer and how to narrow a problem quickly.",
        sections: [
          {
            title: "Core tools",
            items: [
              { type: "Learn", lesson_index: 25, label: "Ping (what it proves)" },
              { type: "Quiz", lesson_index: 25, label: "Quick check: ping meaning" },
              { type: "Learn", lesson_index: 26, label: "Traceroute/tracert (path thinking)" },
              { type: "Practice", lesson_index: 26, label: "Interpret a simple path", questions: 4 }
            ]
          },
          {
            title: "Troubleshooting flow",
            items: [
              { type: "Learn", lesson_index: 27, label: "Layered troubleshooting mindset" },
              { type: "Quiz", lesson_index: 27, label: "Quick check: layer order" },
              { type: "Learn", lesson_index: 28, label: "Case study: why two PCs can’t talk" }
            ]
          }
        ],
        lessons: [
          // 25
          {
            title: "Ping (what it proves)",
            learn:
              "Ping tests basic IP connectivity between two endpoints.\n\n" +
              "Beginner meaning:\n" +
              "- If ping works, the IP path is likely working.\n" +
              "- If ping fails, something is wrong (connection, addressing, routing, or filtering).\n\n" +
              "Ping does NOT guarantee everything is perfect, but it is a fast first test.\n\n" +
              "In your project, you can treat 'valid topology + correct config' as the goal that would allow ping in real life.",
            quiz: {
              question: "If ping succeeds, what does it strongly suggest?",
              options: ["DNS is working", "Basic IP connectivity is working", "The switch has no MAC table"],
              answer: 1,
              explain: "Ping success strongly suggests the endpoints can reach each other at IP level."
            },
            challenge: null
          },
          // 26
          {
            title: "Traceroute/tracert (path thinking)",
            learn:
              "Traceroute (tracert on Windows) shows the path traffic takes across routers.\n\n" +
              "Why it helps:\n" +
              "- Shows each hop (router) along the way\n" +
              "- Helps you find where traffic stops\n\n" +
              "Beginner takeaway:\n" +
              "If you can reach hop 1 but not hop 2, focus on the hop 1 → hop 2 link/routing.",
            quiz: {
              question: "Traceroute is mainly used to…",
              options: ["Assign IP addresses", "Show the path through routers", "Change subnet masks automatically"],
              answer: 1,
              explain: "Traceroute reveals the path traffic takes through routers/hops."
            },
            challenge: null
          },
          // 27
          {
            title: "Layered troubleshooting mindset",
            learn:
              "A reliable troubleshooting mindset uses layers:\n\n" +
              "Layer 1 (physical): cables/links\n" +
              "Layer 2 (LAN): switching, MAC learning\n" +
              "Layer 3 (IP): addressing, subnet masks, routing\n" +
              "Services: DHCP, DNS\n\n" +
              "Always start low and move up.\n\n" +
              "This prevents guessing and makes you much faster in real labs and exams.",
            quiz: {
              question: "What should you check first in a network problem?",
              options: ["DNS records", "Links/cabling (Layer 1)", "Subnetting math"],
              answer: 1,
              explain: "Start at Layer 1. If there’s no link, nothing else matters."
            },
            challenge: null
          },
          // 28
          {
            title: "Case study: why two PCs can’t talk",
            learn:
              "Scenario: PC-A can’t communicate with PC-B.\n\n" +
              "A clean debugging plan:\n" +
              "1) Confirm they are physically connected (direct link or via switch)\n" +
              "2) Verify both IPs are valid (no typos)\n" +
              "3) Verify masks match the design\n" +
              "4) Check if they are in the same subnet\n" +
              "5) If not, check router + gateway settings\n\n" +
              "Best habit: write down each device’s IP/mask and compute the network address. That single step solves many problems.",
            quiz: {
              question: "If two PCs are in different subnets, what is usually required?",
              options: ["A router/gateway", "A second keyboard", "A bigger switch only"],
              answer: 0,
              explain: "Different subnets typically require routing via a router/default gateway."
            },
            challenge: null
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
      // =========================================================
      // UNIT 1 (Lessons 1–5)
      // =========================================================
      {
        title: "Unit 1: Routing tables + static routing",
        about:
          "Build multi-network topologies and learn how routers decide where to send traffic using routing tables and static routes. You’ll practice longest-prefix match and common routing failure patterns.",
        sections: [
          {
            title: "Routing tables",
            items: [
              { type: "Learn", lesson_index: 1, label: "What is a route?" },
              { type: "Learn", lesson_index: 2, label: "How routers choose a route (longest prefix)" },
              { type: "Quiz", lesson_index: 2, label: "Quick check: best match" }
            ]
          },
          {
            title: "Static routes",
            items: [
              { type: "Learn", lesson_index: 3, label: "Adding a static route" },
              { type: "Practice", lesson_index: 3, label: "Pick next hop vs interface", questions: 4 },
              { type: "Quiz", lesson_index: 3, label: "Quick check: static routes" },
              { type: "Challenge", lesson_index: 3, label: "Build: two networks + router routes" }
            ]
          },
          {
            title: "Routing troubleshooting",
            items: [
              { type: "Learn", lesson_index: 4, label: "Common routing mistakes" },
              { type: "Quiz", lesson_index: 4, label: "Quick check: routing issues" },
              { type: "Learn", lesson_index: 5, label: "Default route (0.0.0.0/0) explained" }
            ]
          }
        ],
        lessons: [
          // 1
          {
            title: "What is a route?",
            learn:
              "A route tells a router how to reach a destination network.\n\n" +
              "A route usually includes:\n" +
              "- Destination network (example: 10.0.2.0/24)\n" +
              "- Next hop IP or outgoing interface\n\n" +
              "Routers store routes in a routing table and consult it for every packet they forward.",
            quiz: {
              question: "What does a route describe?",
              options: ["A MAC address", "A path to a destination network", "A DNS server"],
              answer: 1,
              explain: "Routes describe how to reach a destination network."
            },
            challenge: null
          },
          // 2
          {
            title: "How routers choose a route (longest prefix)",
            learn:
              "If multiple routes match a destination, routers choose the most specific match.\n\n" +
              "This is called 'Longest Prefix Match':\n" +
              "- /24 is more specific than /16\n" +
              "- /30 is more specific than /24\n\n" +
              "In real routers, metrics and administrative distance also influence route selection depending on the route source.",
            quiz: {
              question: "If both 10.0.0.0/16 and 10.0.1.0/24 match, which is chosen?",
              options: ["10.0.0.0/16", "10.0.1.0/24", "Neither"],
              answer: 1,
              explain: "Routers choose the most specific match: the longest prefix (/24)."
            },
            challenge: null
          },
          // 3
          {
            title: "Adding a static route",
            learn:
              "Static routes are manually configured routes.\n\n" +
              "They are useful when:\n" +
              "- Networks are small and stable\n" +
              "- You want predictable routing\n" +
              "- You are building a lab or controlled topology\n\n" +
              "Downside: they don’t adapt automatically when topology changes.",
            quiz: {
              question: "Static routes are…",
              options: ["Automatically learned", "Manually configured by an admin", "Only used by switches"],
              answer: 1,
              explain: "Static routes are configured manually."
            },
            challenge: {
              title: "Two networks with routing",
              objectives: ["Create 2 LANs on different subnets", "Add 1 router to connect them", "Ensure both sides can reach each other"],
              rules: {
                requiredTypes: { pc: 2, router: 1 },
                requireConnections: true,
                requireValidIpAndMask: true
              }
            }
          },
          // 4
          {
            title: "Common routing mistakes",
            learn:
              "Routing problems are usually caused by missing or incorrect routes.\n\n" +
              "Common mistakes:\n" +
              "- Wrong subnet mask (networks don’t match expected ranges)\n" +
              "- Missing route back (asymmetric routing)\n" +
              "- Next hop unreachable\n" +
              "- Interfaces in the wrong subnet\n\n" +
              "Troubleshooting approach:\n" +
              "- Confirm IP/mask correctness\n" +
              "- Confirm which networks should exist\n" +
              "- Confirm the router has a path to each network",
            quiz: {
              question: "A common cause of routing failure is…",
              options: ["Too many PCs", "Missing or incorrect routes", "Too much RAM"],
              answer: 1,
              explain: "Routing depends on correct route knowledge. Missing/incorrect routes are a frequent cause of failure."
            },
            challenge: null
          },
          // 5
          {
            title: "Default route (0.0.0.0/0) explained",
            learn:
              "A default route is used when no more specific route matches a destination.\n\n" +
              "It is often written as:\n" +
              "- 0.0.0.0/0 → next hop\n\n" +
              "Think of it as: “send unknown destinations this way.”\n\n" +
              "Common use:\n" +
              "- A LAN router sends Internet-bound traffic to the ISP via a default route.",
            quiz: {
              question: "A default route is used when…",
              options: ["A more specific route exists", "No specific route matches", "The destination is a MAC address"],
              answer: 1,
              explain: "Default route is the catch-all used when no other route matches."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 2 (Lessons 6–10)
      // =========================================================
      {
        title: "Unit 2: Multi-router topologies",
        about:
          "Move beyond a single router. You’ll reason about paths across multiple routers and learn why you must configure routes in both directions for end-to-end communication.",
        sections: [
          {
            title: "Two routers",
            items: [
              { type: "Learn", lesson_index: 6, label: "Why routes must exist both ways" },
              { type: "Quiz", lesson_index: 6, label: "Quick check: return path" },
              { type: "Learn", lesson_index: 7, label: "Transit networks (router-to-router links)" }
            ]
          },
          {
            title: "Lab building",
            items: [
              { type: "Challenge", lesson_index: 8, label: "Build: two routers, three networks" },
              { type: "Learn", lesson_index: 9, label: "Summarizing the routing plan" },
              { type: "Quiz", lesson_index: 9, label: "Quick check: route summary" }
            ]
          },
          {
            title: "Failure patterns",
            items: [
              { type: "Learn", lesson_index: 10, label: "Asymmetric routing (simple)" }
            ]
          }
        ],
        lessons: [
          // 6
          {
            title: "Why routes must exist both ways",
            learn:
              "For two devices to communicate, packets must travel:\n" +
              "- From A → B (forward path)\n" +
              "- From B → A (return path)\n\n" +
              "If one router knows the forward route but not the return route, traffic fails.\n\n" +
              "Beginner rule: whenever you add a route for a new network, check the reverse direction too.",
            quiz: {
              question: "Why is a return route important?",
              options: ["So DNS can work", "So replies can get back to the sender", "So MAC addresses change"],
              answer: 1,
              explain: "Communication requires a return path so replies can reach the original sender."
            },
            challenge: null
          },
          // 7
          {
            title: "Transit networks (router-to-router links)",
            learn:
              "When two routers connect, the link between them is its own network (a transit network).\n\n" +
              "Each router interface on that link needs an IP in the same subnet.\n\n" +
              "This transit network becomes the next hop path for routes between LANs on either side.\n\n" +
              "Tip: keep transit networks small and consistent in naming to reduce confusion.",
            quiz: {
              question: "A transit network is…",
              options: ["A LAN behind a switch", "The network connecting two routers", "A DNS record type"],
              answer: 1,
              explain: "Transit networks connect routers and carry traffic between them."
            },
            challenge: null
          },
          // 8
          {
            title: "Build: two routers, three networks",
            learn:
              "Goal: practice a real routing layout.\n\n" +
              "Design:\n" +
              "- LAN-A behind Router-1\n" +
              "- LAN-B behind Router-2\n" +
              "- Transit network between Router-1 and Router-2\n\n" +
              "Success means PCs in LAN-A and LAN-B would be able to communicate with correct IP + mask + routing.",
            quiz: {
              question: "In a two-router design, what is usually needed for LAN-A to reach LAN-B?",
              options: ["Only a switch", "Routes on routers (and correct addressing)", "Only DNS"],
              answer: 1,
              explain: "You need correct addressing and routing knowledge on routers for inter-LAN connectivity."
            },
            challenge: {
              title: "Two routers, three networks",
              objectives: ["Add 2 routers + 2 PCs", "Connect routers together", "Connect each PC to a router", "Set valid IP + mask on all devices"],
              rules: {
                requiredTypes: { pc: 2, router: 2 },
                requireConnections: true,
                requireValidIpAndMask: true
              }
            }
          },
          // 9
          {
            title: "Summarizing the routing plan",
            learn:
              "In multi-network routing, a written plan prevents mistakes.\n\n" +
              "A good plan lists:\n" +
              "- Each subnet (LAN-A, LAN-B, transit)\n" +
              "- Each interface IP on routers\n" +
              "- Each PC IP + mask\n" +
              "- Which routes are required (destination → next hop)\n\n" +
              "This is exactly how network engineers prevent misconfiguration in real deployments.",
            quiz: {
              question: "A routing plan is most useful for…",
              options: ["Reducing CPU load", "Preventing misconfiguration and confusion", "Changing MAC addresses"],
              answer: 1,
              explain: "A plan makes routing and addressing consistent and reduces mistakes."
            },
            challenge: null
          },
          // 10
          {
            title: "Asymmetric routing (simple)",
            learn:
              "Asymmetric routing happens when traffic takes one path out and a different path back.\n\n" +
              "It can be normal, but it can also break things (especially with NAT or firewalls).\n\n" +
              "Beginner takeaway:\n" +
              "- If something works one way but not the other, suspect routing symmetry or missing reverse routes.",
            quiz: {
              question: "Asymmetric routing can cause problems when…",
              options: ["Firewalls or NAT expect return traffic on the same path", "Switches learn MAC addresses", "You use /24 masks"],
              answer: 0,
              explain: "Stateful devices like firewalls/NAT may require return traffic to follow expected paths."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 3 (Lessons 11–14)
      // =========================================================
      {
        title: "Unit 3: VLANs and segmentation (conceptual)",
        about:
          "Learn why networks are segmented and how VLANs separate groups logically. This unit is intentionally conceptual (still compatible with your current course.js), preparing you for real networking modules.",
        sections: [
          {
            title: "Segmentation",
            items: [
              { type: "Learn", lesson_index: 11, label: "Why segment networks?" },
              { type: "Quiz", lesson_index: 11, label: "Quick check: segmentation benefit" }
            ]
          },
          {
            title: "VLAN basics",
            items: [
              { type: "Learn", lesson_index: 12, label: "What is a VLAN? (beginner)" },
              { type: "Practice", lesson_index: 12, label: "Pick correct VLAN statement", questions: 4 }
            ]
          },
          {
            title: "Inter-VLAN routing (intro)",
            items: [
              { type: "Learn", lesson_index: 13, label: "Why inter-VLAN routing needs a router" },
              { type: "Quiz", lesson_index: 13, label: "Quick check: inter-VLAN idea" },
              { type: "Learn", lesson_index: 14, label: "Broadcast domains revisited" }
            ]
          }
        ],
        lessons: [
          // 11
          {
            title: "Why segment networks?",
            learn:
              "Segmentation means splitting one big network into smaller parts.\n\n" +
              "Reasons:\n" +
              "- Security: keep sensitive devices separate\n" +
              "- Performance: reduce broadcast traffic\n" +
              "- Organization: simpler troubleshooting\n\n" +
              "In the real world, segmentation is one of the most important design ideas.",
            quiz: {
              question: "A key benefit of segmentation is…",
              options: ["More broadcasts everywhere", "Improved security and control", "Replacing all routers"],
              answer: 1,
              explain: "Segmentation reduces exposure and improves control and troubleshooting."
            },
            challenge: null
          },
          // 12
          {
            title: "What is a VLAN? (beginner)",
            learn:
              "A VLAN (Virtual LAN) is a logical separation on a switch.\n\n" +
              "Simple idea:\n" +
              "- One physical switch can act like multiple separate networks.\n\n" +
              "Devices in different VLANs behave like they are in different subnets (separate broadcast domains).\n\n" +
              "Even though your sandbox may not configure VLANs directly yet, the concept matches how networks scale.",
            quiz: {
              question: "A VLAN is best described as…",
              options: ["A physical cable type", "A logical network separation on a switch", "A DNS server"],
              answer: 1,
              explain: "VLANs logically separate devices into different virtual networks on switches."
            },
            challenge: null
          },
          // 13
          {
            title: "Why inter-VLAN routing needs a router",
            learn:
              "If VLANs are separate networks, traffic between them requires routing.\n\n" +
              "That means:\n" +
              "- Different VLANs typically map to different subnets\n" +
              "- A router (or Layer 3 switch) routes between them\n\n" +
              "Beginner rule:\n" +
              "If it’s a different subnet, you need routing.",
            quiz: {
              question: "To communicate between VLANs, you usually need…",
              options: ["A router or Layer 3 device", "A second keyboard", "Only a hub"],
              answer: 0,
              explain: "Different VLANs/subnets require routing by a Layer 3 device."
            },
            challenge: null
          },
          // 14
          {
            title: "Broadcast domains revisited",
            learn:
              "A broadcast domain is the set of devices that receive a broadcast frame.\n\n" +
              "Key relationships:\n" +
              "- One subnet = one broadcast domain\n" +
              "- VLANs often define separate broadcast domains on a switch\n" +
              "- Routers separate broadcast domains\n\n" +
              "This is why segmentation improves performance: fewer devices receive each broadcast.",
            quiz: {
              question: "Routers separate broadcast domains by…",
              options: ["Forwarding all broadcasts", "Not forwarding broadcasts between subnets", "Changing MAC addresses"],
              answer: 1,
              explain: "Routers do not forward broadcasts between subnets, creating separate broadcast domains."
            },
            challenge: null
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
      // =========================================================
      // UNIT 1 (Lessons 1–4)
      // =========================================================
      {
        title: "Unit 1: CIDR + subnetting skills",
        about:
          "Master CIDR, masks, hosts-per-subnet, and usable ranges. You’ll build speed and accuracy for real subnetting problems and design decisions.",
        sections: [
          {
            title: "CIDR and masks",
            items: [
              { type: "Learn", lesson_index: 1, label: "CIDR notation" },
              { type: "Practice", lesson_index: 1, label: "Convert CIDR to mask", questions: 4 },
              { type: "Quiz", lesson_index: 1, label: "Quick check: CIDR meaning" }
            ]
          },
          {
            title: "Hosts + ranges",
            items: [
              { type: "Learn", lesson_index: 2, label: "Hosts per subnet + usable ranges" },
              { type: "Practice", lesson_index: 2, label: "Calculate usable hosts", questions: 4 },
              { type: "Quiz", lesson_index: 2, label: "Quick check: usable hosts" }
            ]
          },
          {
            title: "Network + broadcast",
            items: [
              { type: "Learn", lesson_index: 3, label: "Network + broadcast rules (fast method)" },
              { type: "Quiz", lesson_index: 3, label: "Quick check: broadcast address" },
              { type: "Learn", lesson_index: 4, label: "Subnet boundaries (block size)" }
            ]
          }
        ],
        lessons: [
          // 1
          {
            title: "CIDR notation",
            learn:
              "CIDR uses a /prefix length (like /24). The prefix length indicates how many bits are the network portion.\n\n" +
              "Examples:\n" +
              "- /24 → 255.255.255.0\n" +
              "- /26 → 255.255.255.192\n\n" +
              "More network bits = fewer host bits = fewer hosts.\n\n" +
              "CIDR is used everywhere in modern networking because it allows flexible subnet sizes.",
            quiz: {
              question: "What does /24 mean?",
              options: ["24 hosts", "24 network bits", "24 routers"],
              answer: 1,
              explain: "/24 means 24 bits are used for the network portion."
            },
            challenge: null
          },
          // 2
          {
            title: "Hosts per subnet + usable ranges",
            learn:
              "To calculate hosts in a subnet:\n\n" +
              "Host bits = 32 - prefix\n" +
              "Total addresses = 2^(host bits)\n" +
              "Usable hosts = total - 2 (network + broadcast)\n\n" +
              "Example: /26\n" +
              "- Host bits = 6\n" +
              "- Total = 64\n" +
              "- Usable = 62\n\n" +
              "Knowing usable ranges helps you plan addressing and avoid overlap.",
            quiz: {
              question: "How many usable hosts are in a /26 subnet?",
              options: ["32", "62", "64", "128"],
              answer: 1,
              explain: "/26 has 64 total addresses and 62 usable hosts after excluding network and broadcast."
            },
            challenge: null
          },
          // 3
          {
            title: "Network + broadcast rules (fast method)",
            learn:
              "Fast rule:\n" +
              "- Network address: all host bits = 0\n" +
              "- Broadcast address: all host bits = 1\n\n" +
              "For /24:\n" +
              "- Network: x.x.x.0\n" +
              "- Broadcast: x.x.x.255\n\n" +
              "For other prefixes, you use the subnet block size (next lesson) to find where subnets start and end.",
            quiz: {
              question: "In 192.168.10.0/24, the broadcast address is…",
              options: ["192.168.10.0", "192.168.10.1", "192.168.10.254", "192.168.10.255"],
              answer: 3,
              explain: "In a /24, broadcast is the last address: .255"
            },
            challenge: null
          },
          // 4
          {
            title: "Subnet boundaries (block size)",
            learn:
              "Subnetting speed trick: block size.\n\n" +
              "If the mask is 255.255.255.192, the block size is 256 - 192 = 64.\n\n" +
              "That means subnets start at:\n" +
              "0, 64, 128, 192\n\n" +
              "So the ranges are:\n" +
              "- 0–63\n" +
              "- 64–127\n" +
              "- 128–191\n" +
              "- 192–255\n\n" +
              "This method is fast and accurate once practiced.",
            quiz: {
              question: "If the last octet mask is 192, the block size is…",
              options: ["32", "64", "128"],
              answer: 1,
              explain: "Block size = 256 - 192 = 64."
            },
            challenge: null
          }
        ]
      },

      // =========================================================
      // UNIT 2 (Lessons 5–8)
      // =========================================================
      {
        title: "Unit 2: VLSM + real-world subnet design",
        about:
          "Move from pure math to real design: allocate different subnet sizes for different departments, plan growth, and avoid overlapping ranges using VLSM (Variable Length Subnet Mask).",
        sections: [
          {
            title: "VLSM basics",
            items: [
              { type: "Learn", lesson_index: 5, label: "What is VLSM?" },
              { type: "Quiz", lesson_index: 5, label: "Quick check: VLSM meaning" }
            ]
          },
          {
            title: "Design workflow",
            items: [
              { type: "Learn", lesson_index: 6, label: "Subnet design workflow (largest first)" },
              { type: "Practice", lesson_index: 6, label: "Order subnets by size", questions: 4 }
            ]
          },
          {
            title: "Avoid overlap",
            items: [
              { type: "Learn", lesson_index: 7, label: "Avoiding overlap (range checking)" },
              { type: "Quiz", lesson_index: 7, label: "Quick check: overlap" },
              { type: "Learn", lesson_index: 8, label: "Documenting an address plan" }
            ]
          }
        ],
        lessons: [
          // 5
          {
            title: "What is VLSM?",
            learn:
              "VLSM (Variable Length Subnet Mask) means using different subnet sizes in the same overall address space.\n\n" +
              "Example:\n" +
              "- A /26 for a department with ~50 hosts\n" +
              "- A /27 for a department with ~25 hosts\n" +
              "- A /28 for a small team\n\n" +
              "This avoids wasting addresses and is common in real network design.",
            quiz: {
              question: "VLSM allows you to…",
              options: ["Use one subnet size only", "Use different subnet sizes as needed", "Remove subnet masks entirely"],
              answer: 1,
              explain: "VLSM lets you allocate different subnet sizes for different needs."
            },
            challenge: null
          },
          // 6
          {
            title: "Subnet design workflow (largest first)",
            learn:
              "A reliable VLSM workflow:\n\n" +
              "1) List department host requirements\n" +
              "2) Sort from largest to smallest\n" +
              "3) Allocate the largest subnet first\n" +
              "4) Move to the next available range for the next subnet\n" +
              "5) Keep going until all requirements are satisfied\n\n" +
              "Largest-first reduces the chance you trap yourself with awkward gaps.",
            quiz: {
              question: "Why allocate the largest subnet first?",
              options: ["It looks nicer", "It reduces the chance of running out of contiguous space", "It changes MAC addresses"],
              answer: 1,
              explain: "Largest-first helps ensure big subnets fit and reduces fragmentation."
            },
            challenge: null
          },
          // 7
          {
            title: "Avoiding overlap (range checking)",
            learn:
              "Overlapping subnets cause major problems.\n\n" +
              "To avoid overlap:\n" +
              "- Always record the full usable range for each subnet\n" +
              "- Confirm the next subnet starts AFTER the previous subnet’s broadcast\n\n" +
              "Tip: write down network + broadcast for every subnet in your plan. If any range overlaps, fix it immediately.",
            quiz: {
              question: "If two subnets overlap, what is the likely result?",
              options: ["Better performance", "Routing/addressing confusion and failures", "Faster DNS resolution"],
              answer: 1,
              explain: "Overlap makes addressing ambiguous and breaks routing assumptions."
            },
            challenge: null
          },
          // 8
          {
            title: "Documenting an address plan",
            learn:
              "A professional address plan includes:\n\n" +
              "- Subnet name (e.g., Sales, IT, Guest)\n" +
              "- Network/prefix (e.g., 10.10.10.0/26)\n" +
              "- Usable range\n" +
              "- Broadcast address\n" +
              "- Gateway/router IP convention\n\n" +
              "Documentation is what keeps networks stable as they grow and as teams change.",
            quiz: {
              question: "A good address plan should include…",
              options: ["Only the DNS server name", "Subnets, ranges, and gateway conventions", "Only MAC addresses"],
              answer: 1,
              explain: "Plans should clearly document subnet ranges and how devices (like gateways) are assigned."
            },
            challenge: null
          }
        ]
      }
    ]
  }
};
