"""sandbox_routes.py - Sandbox command execution API routes."""

import subprocess

from flask import Blueprint, jsonify, request

sandbox = Blueprint("sandbox", __name__)


def _request_data():
    return request.get_json(silent=True) or {}


@sandbox.post("/api/sandbox/execute-command")
def execute_sandbox_command():
    """Execute whitelisted network commands."""
    data = _request_data()
    command = str(data.get("command") or "").lower().strip()
    args = data.get("args", [])

    if not isinstance(args, list):
        return jsonify({"error": "args must be a list"}), 400
    args = [str(arg) for arg in args]

    allowed_commands = {
        "ping": ["ping", "-c", "4"],
        "ipconfig": ["ipconfig"],
        "ifconfig": ["ifconfig"],
        "traceroute": ["traceroute"],
        "nslookup": ["nslookup"],
        "whoami": ["whoami"],
        "hostname": ["hostname"],
        "netstat": ["netstat"],
        "arp": ["arp", "-a"],
    }

    if command not in allowed_commands:
        return jsonify({"error": f'Command "{command}" not allowed'}), 403

    dangerous_chars = [";", "|", ">", "<", "&", "$", "`", "\n"]
    for arg in args:
        for char in dangerous_chars:
            if char in arg:
                return jsonify({"error": "Invalid arguments"}), 400

    try:
        full_cmd = allowed_commands[command] + args
        result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=10)
        return jsonify(
            {
                "success": True,
                "output": result.stdout,
                "error": result.stderr,
                "exit_code": result.returncode,
                "command": command,
            }
        )
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command timed out"}), 504
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@sandbox.get("/api/sandbox/allowed-commands")
def get_allowed_commands():
    """Return list of allowed sandbox commands."""
    commands = ["ping", "ipconfig", "ifconfig", "traceroute", "nslookup", "whoami", "hostname", "netstat", "arp"]
    return jsonify({"success": True, "commands": commands})
