import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keeps Turbopack scoped to this project (a package-lock.json also exists
  // in the parent home directory).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
