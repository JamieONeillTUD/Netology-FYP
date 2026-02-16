/**
 * sandbox-console.js – Network Sandbox Command Console
 * 
 * Features:
 * - Interactive command-line interface for network operations
 * - Help system with available commands
 * - Real-time command execution and output
 * - History tracking and autocomplete
 * - Integration with topology builder
 */

class SandboxConsole {
  constructor() {
    this.commandHistory = [];
    this.historyIndex = -1;
    this.topology = null;
    this.selectedDevice = null;
    
    this.initializeElements();
    this.attachEventListeners();
    this.loadCommandHistory();
  }

  initializeElements() {
    this.consoleOutput = document.getElementById('sbxConsoleOutput');
    this.consoleInput = document.getElementById('sbxConsoleInput');
    this.consoleSendBtn = document.getElementById('sbxConsoleSend');
  }

  attachEventListeners() {
    this.consoleInput?.addEventListener('keypress', (e) => this.handleInputKeypress(e));
    this.consoleInput?.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    this.consoleSendBtn?.addEventListener('click', () => this.executeCommand());
  }

  /**
   * Handle Enter key for command execution
   */
  handleInputKeypress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.executeCommand();
    }
  }

  /**
   * Handle arrow keys for command history
   */
  handleInputKeydown(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateHistory(1);
    }
  }

  /**
   * Navigate through command history
   */
  navigateHistory(direction) {
    const newIndex = this.historyIndex + direction;
    
    if (newIndex >= -1 && newIndex < this.commandHistory.length) {
      this.historyIndex = newIndex;
      if (newIndex === -1) {
        this.consoleInput.value = '';
      } else {
        this.consoleInput.value = this.commandHistory[newIndex];
      }
    }
  }

  /**
   * Execute command from input
   */
  executeCommand() {
    const command = this.consoleInput.value.trim();
    
    if (!command) return;
    
    // Display command
    this.addLine(command, 'cmd');
    
    // Add to history
    this.commandHistory.push(command);
    this.historyIndex = -1;
    this.saveCommandHistory();
    
    // Clear input
    this.consoleInput.value = '';
    this.consoleInput.focus();
    
    // Parse and execute
    this.parseCommand(command);
  }

  /**
   * Parse and execute command
   */
  parseCommand(command) {
    const parts = command.toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'help':
        this.showHelp(args[0]);
        break;
      case 'clear':
        this.clearConsole();
        break;
      case 'show':
        this.showCommand(args);
        break;
      case 'ping':
        this.pingCommand(args);
        break;
      case 'traceroute':
        this.tracerouteCommand(args);
        break;
      case 'ipconfig':
        this.ipconfigCommand(args);
        break;
      case 'devices':
        this.devicesCommand();
        break;
      case 'connections':
        this.connectionsCommand();
        break;
      case 'status':
        this.statusCommand();
        break;
      case 'configure':
        this.configureCommand(args);
        break;
      case 'reset':
        this.resetCommand();
        break;
      default:
        this.addLine(`Unknown command: ${cmd}. Type 'help' for available commands.`, 'error');
    }
  }

  /**
   * Show help information
   */
  showHelp(topic) {
    if (topic) {
      this.showTopicHelp(topic);
    } else {
      this.addLine('Available commands:', 'info');
      this.addLine('');
      
      const commands = [
        ['help [topic]', 'Show this help or help for a specific command'],
        ['show devices', 'Display all devices in topology'],
        ['show connections', 'Display all connections'],
        ['show stats', 'Show topology statistics'],
        ['ping <device>', 'Test connectivity to a device'],
        ['traceroute <device>', 'Trace route to a device'],
        ['ipconfig [device]', 'Show device IP configuration'],
        ['devices', 'Alias for show devices'],
        ['connections', 'Alias for show connections'],
        ['status', 'Show overall network status'],
        ['configure <device> <prop> <value>', 'Configure device property'],
        ['reset', 'Clear all devices and connections'],
        ['clear', 'Clear console output']
      ];
      
      commands.forEach(([cmd, desc]) => {
        this.addLine(`  ${cmd.padEnd(35)} ${desc}`, 'info');
      });
      
      this.addLine('');
      this.addLine('Tip: Use arrow keys to navigate command history');
    }
  }

  /**
   * Show help for specific topic
   */
  showTopicHelp(topic) {
    const topics = {
      'ping': 'Ping a device to test connectivity\nUsage: ping <device_name>\nExample: ping router1',
      'show': 'Show topology information\nUsage: show [devices|connections|stats]\nExample: show devices',
      'configure': 'Configure device properties\nUsage: configure <device> <property> <value>\nExample: configure router1 ip 192.168.1.1'
    };
    
    if (topics[topic]) {
      this.addLine(topics[topic], 'info');
    } else {
      this.addLine(`No help available for topic: ${topic}`, 'warning');
    }
  }

  /**
   * Show devices command
   */
  showCommand(args) {
    if (args[0] === 'devices') {
      this.devicesCommand();
    } else if (args[0] === 'connections') {
      this.connectionsCommand();
    } else if (args[0] === 'stats') {
      this.statusCommand();
    } else {
      this.addLine('Usage: show [devices|connections|stats]', 'warning');
    }
  }

  /**
   * List all devices
   */
  devicesCommand() {
    const deviceElems = document.querySelectorAll('.sbx-device');
    
    if (deviceElems.length === 0) {
      this.addLine('No devices in topology.', 'warning');
      return;
    }
    
    this.addLine(`Total devices: ${deviceElems.length}`, 'info');
    this.addLine('─'.repeat(60));
    
    deviceElems.forEach((elem) => {
      const name = elem.dataset.name || 'Unknown';
      const type = elem.dataset.type || 'unknown';
      const ip = elem.dataset.ip || 'Not configured';
      
      this.addLine(`${name.padEnd(20)} Type: ${type.padEnd(15)} IP: ${ip}`);
    });
    
    this.addLine('─'.repeat(60));
  }

  /**
   * List all connections
   */
  connectionsCommand() {
    const connElems = document.querySelectorAll('.sbx-connection');
    
    if (connElems.length === 0) {
      this.addLine('No connections in topology.', 'warning');
      return;
    }
    
    this.addLine(`Total connections: ${connElems.length}`, 'info');
    this.addLine('─'.repeat(70));
    
    connElems.forEach((elem, i) => {
      const source = elem.dataset.source || 'Unknown';
      const target = elem.dataset.target || 'Unknown';
      const type = elem.dataset.type || 'ethernet';
      const status = elem.dataset.active === 'true' ? 'Active' : 'Down';
      
      this.addLine(`${(i + 1)}. ${source.padEnd(15)} ──[${type.padEnd(10)}]── ${target.padEnd(15)} [${status}]`);
    });
    
    this.addLine('─'.repeat(70));
  }

  /**
   * Ping command
   */
  pingCommand(args) {
    if (args.length === 0) {
      this.addLine('Usage: ping <device_name>', 'warning');
      return;
    }
    
    const target = args[0];
    const targetElem = document.querySelector(`[data-name="${target}"]`);
    
    if (!targetElem) {
      this.addLine(`Error: Device '${target}' not found.`, 'error');
      return;
    }
    
    this.addLine(`Pinging ${target}...`, 'info');
    
    // Simulate ping with random success/failure
    const success = Math.random() > 0.2; // 80% success rate
    const latency = Math.floor(Math.random() * 50) + 1; // 1-50ms
    
    if (success) {
      this.addLine(`Reply from ${target}: bytes=32 time=${latency}ms TTL=64`, 'success');
      this.addLine('');
      this.addLine('Ping statistics:', 'info');
      this.addLine(`  Packets: Sent=1, Received=1, Lost=0%`);
      this.addLine(`  Round-trip time: min=${latency}ms, max=${latency}ms, avg=${latency}ms`);
    } else {
      this.addLine(`Destination unreachable to ${target}.`, 'error');
      this.addLine('');
      this.addLine('Ping statistics:', 'info');
      this.addLine('  Packets: Sent=1, Received=0, Lost=100%');
    }
  }

  /**
   * Traceroute command
   */
  tracerouteCommand(args) {
    if (args.length === 0) {
      this.addLine('Usage: traceroute <device_name>', 'warning');
      return;
    }
    
    const target = args[0];
    const targetElem = document.querySelector(`[data-name="${target}"]`);
    
    if (!targetElem) {
      this.addLine(`Error: Device '${target}' not found.`, 'error');
      return;
    }
    
    this.addLine(`Tracing route to ${target}...`, 'info');
    
    // Simulate traceroute with path
    const hops = Math.floor(Math.random() * 4) + 2; // 2-5 hops
    
    for (let i = 1; i <= hops; i++) {
      const latency = Math.floor(Math.random() * 30) + 5;
      this.addLine(`${i.toString().padEnd(3)} router${i}.local (192.168.${i}.1)  ${latency}ms`);
    }
    
    this.addLine(`${(hops + 1).toString().padEnd(3)} ${target} (reached)`, 'success');
  }

  /**
   * IP configuration command
   */
  ipconfigCommand(args) {
    if (args.length === 0) {
      // Show all devices
      this.addLine('Network configuration:', 'info');
      const deviceElems = document.querySelectorAll('.sbx-device');
      
      if (deviceElems.length === 0) {
        this.addLine('No devices configured.', 'warning');
        return;
      }
      
      deviceElems.forEach((elem) => {
        const name = elem.dataset.name || 'Unknown';
        const ip = elem.dataset.ip || 'DHCP';
        const mask = elem.dataset.mask || '255.255.255.0';
        const mac = elem.dataset.mac || '00:00:00:00:00:00';
        
        this.addLine(`${name}:`);
        this.addLine(`  IPv4 Address: ${ip}`);
        this.addLine(`  Subnet Mask: ${mask}`);
        this.addLine(`  MAC Address: ${mac}`);
        this.addLine('');
      });
    } else {
      // Show specific device
      const device = args[0];
      const elem = document.querySelector(`[data-name="${device}"]`);
      
      if (!elem) {
        this.addLine(`Error: Device '${device}' not found.`, 'error');
        return;
      }
      
      const ip = elem.dataset.ip || 'DHCP';
      const mask = elem.dataset.mask || '255.255.255.0';
      const mac = elem.dataset.mac || '00:00:00:00:00:00';
      
      this.addLine(`Configuration for ${device}:`, 'info');
      this.addLine(`  IPv4 Address: ${ip}`);
      this.addLine(`  Subnet Mask: ${mask}`);
      this.addLine(`  MAC Address: ${mac}`);
    }
  }

  /**
   * Show status command
   */
  statusCommand() {
    const devices = document.querySelectorAll('.sbx-device').length;
    const connections = document.querySelectorAll('.sbx-connection').length;
    const activeConn = document.querySelectorAll('[data-active="true"]').length;
    
    this.addLine('Network Status:', 'info');
    this.addLine('─'.repeat(40));
    this.addLine(`Devices: ${devices}`);
    this.addLine(`Connections: ${connections} (${activeConn} active)`);
    this.addLine(`Network Status: ${devices > 0 ? 'Online' : 'No devices'}`, devices > 0 ? 'success' : 'warning');
    this.addLine('─'.repeat(40));
  }

  /**
   * Configure device command
   */
  configureCommand(args) {
    if (args.length < 3) {
      this.addLine('Usage: configure <device> <property> <value>', 'warning');
      this.addLine('Example: configure router1 ip 192.168.1.1', 'info');
      return;
    }
    
    const [device, property, ...valueParts] = args;
    const value = valueParts.join(' ');
    
    const elem = document.querySelector(`[data-name="${device}"]`);
    
    if (!elem) {
      this.addLine(`Error: Device '${device}' not found.`, 'error');
      return;
    }
    
    // Update device attribute
    elem.dataset[property] = value;
    
    this.addLine(`Configured ${device}: ${property} = ${value}`, 'success');
  }

  /**
   * Reset network topology
   */
  resetCommand() {
    this.addLine('Resetting topology... (use clear button in UI to confirm)', 'warning');
  }

  /**
   * Clear console output
   */
  clearConsole() {
    if (this.consoleOutput) {
      this.consoleOutput.innerHTML = '';
      this.addLine('Console cleared.', 'info');
    }
  }

  /**
   * Add a line to console output
   */
  addLine(text, type = 'default') {
    if (!this.consoleOutput) return;
    
    const line = document.createElement('div');
    line.className = `sbx-console-line sbx-console-${type}`;
    
    if (type === 'cmd') {
      line.innerHTML = `<span class="sbx-console-prompt">$</span><span class="sbx-console-cmd">${this.escapeHtml(text)}</span>`;
    } else {
      line.textContent = text;
    }
    
    this.consoleOutput.appendChild(line);
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Save command history to localStorage
   */
  saveCommandHistory() {
    localStorage.setItem('sbx_command_history', JSON.stringify(this.commandHistory.slice(-50)));
  }

  /**
   * Load command history from localStorage
   */
  loadCommandHistory() {
    const saved = localStorage.getItem('sbx_command_history');
    if (saved) {
      this.commandHistory = JSON.parse(saved);
    }
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    this.addLine('Welcome to Netology Sandbox Console', 'info');
    this.addLine('Type "help" for available commands');
    this.addLine('');
  }
}

// Initialize console when page loads
document.addEventListener('DOMContentLoaded', () => {
  const console = new SandboxConsole();
  console.showWelcome();
  
  // Make console globally accessible
  window.sandboxConsole = console;
});
