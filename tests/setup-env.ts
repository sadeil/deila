import path from "node:path";

const dest = path.resolve(__dirname, "..", "prisma", "test.db").split(path.sep).join("/");
process.env.DATABASE_URL = `file:${dest}`;
process.env.SESSION_SECRET ||= "test-secret-test-secret-test-secret-1234";
process.env.SANDBOX_WEBHOOK_SECRET ||= "sandbox-test-secret";
