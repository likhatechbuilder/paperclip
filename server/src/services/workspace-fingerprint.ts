import fs from "node:fs/promises";
import path from "node:path";

export type WorkspaceFingerprint = {
  extensions: string[];
  dependencies: string[];
  topLevelFiles: string[];
};

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "target", "venv", ".venv"]);

async function readPackageJsonDependencies(workspaceCwd: string): Promise<string[]> {
  const packageJsonPath = path.resolve(workspaceCwd, "package.json");
  try {
    const content = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(content);
    const deps = Object.keys(parsed.dependencies ?? {});
    const devDeps = Object.keys(parsed.devDependencies ?? {});
    return Array.from(new Set([...deps, ...devDeps]));
  } catch {
    return [];
  }
}

export async function getWorkspaceFingerprint(workspaceCwd: string): Promise<WorkspaceFingerprint> {
  const extensions = new Set<string>();
  const topLevelFiles: string[] = [];
  
  async function walk(currentPath: string, depth: number) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true }).catch(() => []);
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        // Limit depth for speed and to avoid massive scans
        if (depth < 5) {
          await walk(path.join(currentPath, entry.name), depth + 1);
        }
        continue;
      }
      
      if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (ext) extensions.add(ext);
        
        if (depth === 0) {
          topLevelFiles.push(entry.name);
        }
      }
    }
  }

  await walk(workspaceCwd, 0);
  const dependencies = await readPackageJsonDependencies(workspaceCwd);

  return {
    extensions: Array.from(extensions).sort(),
    dependencies: dependencies.sort(),
    topLevelFiles: topLevelFiles.sort(),
  };
}
