import fs from "fs";
import path from "path";
import { faker } from "@faker-js/faker";

const memberships = Array.from({ length: 100 }, () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  registerDate: faker.date.past(),
  rfidNumber: faker.string.uuid(),
  isActive: faker.datatype.boolean(),
  createdBy: faker.string.uuid(),
  revokedAt: faker.date.future(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
}));

fs.writeFileSync(
  path.join(__dirname, "memberships.json"),
  JSON.stringify(memberships, null, 2)
);

console.log("✅ Membership data generated.");
