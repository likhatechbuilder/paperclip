import { spawn, execSync } from "node:child_process";

const PORT = 3100;
const HEALTH_URL = `http://localhost:${PORT}/api/health`;
const PING_INTERVAL_MS = 30000; // Check every 30 seconds
const MAX_FAILURES = 3; // Restart after 3 consecutive failures

let currentProcess = null;
let failureCount = 0;

function log(msg) {
  console.log(`[WATCHDOG] [${new Date().toISOString()}] ${msg}`);
}

function startPaperclip() {
  log("Starting Paperclip Engine...");
  
  // Use shell to run pnpm smoothly on Windows
  currentProcess = spawn("npx", ["pnpm", "paperclipai", "run", "--repair"], {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
  });

  currentProcess.on("exit", (code, signal) => {
    log(`Paperclip process exited with code ${code} and signal ${signal}`);
    currentProcess = null;
  });

  currentProcess.on("error", (err) => {
    log(`Failed to start Paperclip: ${err.message}`);
    currentProcess = null;
  });
}

async function checkHealth() {
  try {
    const res = await fetch(HEALTH_URL, {
      method: "GET",
      // Short timeout so we detect hangs quickly
      signal: AbortSignal.timeout(5000), 
    });

    if (res.ok) {
      if (failureCount > 0) {
        log("Health check succeeded. Resetting failure count.");
      }
      failureCount = 0;
      return true;
    } else {
      log(`Health check returned bad status: ${res.status}`);
      return false;
    }
  } catch (err) {
    log(`Health check failed: ${err.name} - ${err.message}`);
    return false;
  }
}

async function runWatchdogLoop() {
  log("Starting Resilience Watchdog...");

  // Start immediately
  startPaperclip();

  while (true) {
    // Wait for the interval
    await new Promise((resolve) => setTimeout(resolve, PING_INTERVAL_MS));

    // If there's no process running manually, we should start it
    // Gives paperclip time to gracefully reboot if it crashed on its own
    if (!currentProcess) {
      log("Process missing. Restarting...");
      startPaperclip();
      continue;
    }

    const isHealthy = await checkHealth();

    if (!isHealthy) {
      failureCount++;
      log(`Health check missed. Consecutive failures: ${failureCount}/${MAX_FAILURES}`);

      if (failureCount >= MAX_FAILURES) {
        log("CRITICAL FAILURE TRESHOLD REACHED. Executing Resurrection Protocol...");
        
        if (currentProcess && currentProcess.pid) {
          log("Force-killing hung Paperclip process and all descendants...");
          try {
            if (process.platform === "win32") {
              execSync(`taskkill /pid ${currentProcess.pid} /T /F`, { stdio: 'ignore' });
            } else {
              currentProcess.kill("SIGKILL");
            }
          } catch (err) {
            log(`Error killing process: ${err.message}`);
          }
          currentProcess = null;
        }

        // Failsafe: sweep any dangling node instances running paperclip to free PC memory!
        log("Running deep memory sweep...");
        try {
          if (process.platform === "win32") {
            execSync(`powershell -Command "Get-WmiObject Win32_Process -Filter \\"Name = 'node.exe' AND CommandLine LIKE '%paperclip%'\\" | ForEach-Object { Stop-Process $_.ProcessId -Force }"`, { stdio: 'ignore' });
          }
        } catch(e) {}

        failureCount = 0;

        // Wait a small moment to ensure OS releases file locks (like PGLite)
        await new Promise(r => setTimeout(r, 2000));
        startPaperclip();
      }
    }
  }
}

// Handle gracefully closing the watchdog itself
process.on("SIGINT", () => {
  log("Watchdog terminating by user request...");
  if (currentProcess && currentProcess.pid) {
    if (process.platform === "win32") {
      try { execSync(`taskkill /pid ${currentProcess.pid} /T /F`, { stdio: 'ignore' }); } catch(err) {}
    } else {
      currentProcess.kill("SIGINT");
    }
  }
  process.exit(0);
});

runWatchdogLoop().catch(err => {
  log(`Fatal watchdog error: ${err.stack}`);
  process.exit(1);
});
