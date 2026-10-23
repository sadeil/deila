import { copyFileSync } from "node:fs";
import path from "node:path";

/** Integration tests run against a throwaway copy of the seeded dev database. */
export default function setup() {
  const root = path.resolve(__dirname, "..");
  copyFileSync(path.join(root, "prisma", "dev.db"), path.join(root, "prisma", "test.db"));
}
