import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dataUser } from "../data/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, "../../docs/operations/SEED_BASIC_USER_LOGINS_2026-04-06.csv");

const escapeCsv = (value) => {
  const raw = value ? String(value) : "";

  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
};

const users = dataUser
  .filter((user) => {
    const roleValue = user.role ? String(user.role).toLowerCase() : "user";
    return roleValue === "user";
  })
  .map((user) => ({
    role: "user",
    name: user.name ? String(user.name) : "",
    email: user.email ? String(user.email).toLowerCase() : "",
    password: user.password ? String(user.password) : "",
  }));

const rows = [
  "role,name,email,password",
  ...users.map((user) => [user.role, user.name, user.email, user.password].map(escapeCsv).join(",")),
];

fs.writeFileSync(outputPath, rows.join("\n"), "utf8");

console.log(
  JSON.stringify(
    {
      outputPath,
      exportedUsers: users.length,
    },
    null,
    2
  )
);
