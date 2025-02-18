file: prisma/schema.prisma

## CODE NOTE

    - Model is from schema prisma
    - the object is from the model defined in schema prisma
    - Seed by column defined in schema

## Template For Schema

```typescript

// [model-name].seed.ts
import fs from "fs"
import path from "path"
import { faker } from "@faker-js/faker"


const model = Array.from({ length: 100 }, () => ({
    id: faker.string.uuid(),
    //here another column
}))

fs.writeFileSync(
  path.join(__dirname, "model.json"),
  JSON.stringify(tasks, null, 2)
)

console.log("✅ model data generated.")

// Implement other handlers...
```
