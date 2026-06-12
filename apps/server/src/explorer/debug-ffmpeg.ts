// Drop this file anywhere in the server and call it once on startup
// to see exactly what the bun process can access
import { execFile, exec } from "node:child_process";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export async function debugFfmpegAccess() {
  const paths = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/bin/ffmpeg",
    "/AMP/bun-app-runner/app/usr/bin/ffmpeg",
    "/mnt/Servers/AMPDatastore/Instances/ARCON-API-Explorer01/bun-app-runner/app/usr/bin/ffmpeg",
  ];

  console.log("=== FFMPEG DEBUG ===");
  console.log("process.env.FFMPEG_PATH:", process.env.FFMPEG_PATH);
  console.log("process.pid:", process.pid);

  // Check /proc/self/root to see chroot
  try {
    const { stdout } = await execAsync("ls -la /proc/self/root");
    console.log("/proc/self/root ->", stdout.trim());
  } catch (e) {
    console.log("/proc/self/root error:", e);
  }

  // Check what / looks like
  try {
    const { stdout } = await execAsync("ls /usr/bin/ff* 2>/dev/null || echo NONE");
    console.log("ls /usr/bin/ff*:", stdout.trim());
  } catch (e) {
    console.log("ls /usr/bin/ff* error:", String(e));
  }

  // Try each path
  for (const p of paths) {
    try {
      await access(p, fsConstants.X_OK);
      console.log("✓ ACCESSIBLE:", p);
    } catch (e) {
      console.log("✗ NOT accessible:", p, String(e));
    }
  }

  // Try which
  try {
    const { stdout } = await execFileAsync("which", ["ffmpeg"]);
    console.log("which ffmpeg:", stdout.trim());
  } catch (e) {
    console.log("which ffmpeg failed:", String(e));
  }

  // Check mounts visible to this process
  try {
    const { stdout } = await execAsync("cat /proc/self/mounts | grep -i 'ffmpeg\\|amp\\|bun\\|usr' | head -20");
    console.log("mounts:", stdout.trim());
  } catch (e) {
    console.log("mounts error:", String(e));
  }

  console.log("=== END FFMPEG DEBUG ===");
}