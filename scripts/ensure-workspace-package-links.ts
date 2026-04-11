#!/usr/bin/env -S node --import tsx
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./dev-service-profile.ts";

type WorkspaceLinkMismatch = {
  packageName: string;
  expectedPath: string;
  actualPath: string | null;
};

const SKIP_CHECK = process.env.PAPERCLIP_SKIP_WORKSPACE_LINK_CHECK === "true";
const TIMEOUT_MS = 30_000;

function readJsonFile(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function discoverWorkspacePackagePaths(rootDir: string): Map<string, string> {
  const packagePaths = new Map<string, string>();
  const ignoredDirNames = new Set([".git", ".paperclip", "dist", "node_modules"]);

  function visit(dirPath: string) {
    const packageJsonPath = path.join(dirPath, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = readJsonFile(packageJsonPath);
      if (typeof packageJson.name === "string" && packageJson.name.length > 0) {
        packagePaths.set(packageJson.name, dirPath);
      }
    }

    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.isSymbolicLink()) continue; // Skip symlinks to avoid infinite loops
      if (ignoredDirNames.has(entry.name)) continue;
      visit(path.join(dirPath, entry.name));
    }
  }

  visit(path.join(rootDir, "packages"));
  visit(path.join(rootDir, "server"));
  visit(path.join(rootDir, "ui"));
  visit(path.join(rootDir, "cli"));

  return packagePaths;
}

const workspacePackagePaths = discoverWorkspacePackagePaths(repoRoot);

function findServerWorkspaceLinkMismatches(): WorkspaceLinkMismatch[] {
  const serverPackageJson = readJsonFile(path.join(repoRoot, "server", "package.json"));
  const dependencies = {
    ...(serverPackageJson.dependencies as Record<string, unknown> | undefined),
    ...(serverPackageJson.devDependencies as Record<string, unknown> | undefined),
  };
  const mismatches: WorkspaceLinkMismatch[] = [];

  for (const [packageName, version] of Object.entries(dependencies)) {
    if (typeof version !== "string" || !version.startsWith("workspace:")) continue;

    const expectedPath = workspacePackagePaths.get(packageName);
    if (!expectedPath) continue;

    const linkPath = path.join(repoRoot, "server", "node_modules", ...packageName.split("/"));
    const actualPath = existsSync(linkPath) ? path.resolve(realpathSync(linkPath)) : null;

    const normalize = (p: string | null) => {
      if (!p) return null;
      const resolved = path.resolve(p);
      return process.platform === "win32" ? resolved.toLowerCase() : resolved;
    };

    if (normalize(actualPath) === normalize(expectedPath)) continue;

    mismatches.push({
      packageName,
      expectedPath: path.resolve(expectedPath),
      actualPath: actualPath ? path.resolve(actualPath) : null,
    });
  }

  return mismatches;
}

function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`}`,
        ),
      );
    });
  });
}

async function ensureServerWorkspaceLinksCurrent() {
  if (SKIP_CHECK || process.platform === "win32") {
    console.log("[paperclip] skipping workspace package link check (avoiding NTFS deadlocks)");
    return;
  }

  console.log("[paperclip] verifying workspace package links...");
  
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("Timeout during workspace link verification")), TIMEOUT_MS);
  });

  try {
    await Promise.race([
      (async () => {
        const mismatches = findServerWorkspaceLinkMismatches();
        if (mismatches.length === 0) return;

        console.log("[paperclip] detected stale workspace package links for server; relinking dependencies...");
        for (const mismatch of mismatches) {
          console.log(
            `[paperclip]   ${mismatch.packageName}: ${mismatch.actualPath ?? "missing"} -> ${mismatch.expectedPath}`,
          );
        }

        const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
        await runCommand(
          pnpmBin,
          ["install", "--force", "--config.confirmModulesPurge=false"],
          repoRoot,
        );

        const remainingMismatches = findServerWorkspaceLinkMismatches();
        if (remainingMismatches.length === 0) return;

        throw new Error(
          `Workspace relink did not repair all server package links: ${remainingMismatches.map((item) => item.packageName).join(", ")}`,
        );
      })(),
      timeoutPromise,
    ]);
  } catch (error) {
    console.warn(`[paperclip] WARNING: Workspace link verification failed or timed out: ${error instanceof Error ? error.message : String(error)}`);
    console.warn("[paperclip] Proceeding anyway, but some local package changes might not be reflected.");
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

await ensureServerWorkspaceLinksCurrent();
process.exit(0);
