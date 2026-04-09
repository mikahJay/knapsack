# test-data

Standalone scripts for seeding and cleaning up test data in the Knapsack database.

## Setup

```bash
cd test-data
npm install
cp ../.env.example ../.env   # fill in DATABASE_URL (already done for local dev)
```

## Scripts

### `npm run generate` — seed random data

```
npx ts-node src/generate.ts [env] [options]
```

| Argument | Default | Description |
|---|---|---|
| `env` (positional) | `non-prod` | Pass `prod` to run in production mode (bob is excluded as an owner) |
| `--needs N` | `10` | Number of needs to create (0 – 100) |
| `--resources N` | `10` | Number of resources to create (0 – 100) |
| `--owners N` | `5` | Number of distinct owners to assign items to (1 – 10), drawn from a pool of 100 persistent test users |
| `--bob-pct N` | `20` | Percentage of items owned by `bob@local.dev` (0 – 100). Ignored in `prod` mode. |

**Examples:**

```bash
# Non-prod defaults (10 needs, 10 resources, 5 owners, 20% owned by bob)
npm run generate

# 50 needs, 30 resources, 8 distinct owners, 40% owned by bob
npm run generate -- non-prod --needs 50 --resources 30 --owners 8 --bob-pct 40

# Prod mode — bob is not used as an owner
npm run generate -- prod --needs 20 --resources 20 --owners 3
```

### `npm run delete` — remove all test-generated data

```bash
npm run delete
```

Deletes, in order:

1. All **needs** whose title starts with `[TEST-DATA]`
2. All **resources** whose title starts with `[TEST-DATA]`
3. All **users** with `provider = 'test'` (the 100-owner pool)

Bob (`bob@local.dev`, `provider = 'local'`) is **not** deleted, but any needs/resources
he owns that carry the `[TEST-DATA]` title prefix are removed.

## How it works

### Owner pool

The generate script maintains a pool of **100 persistent test users** in `auth.users`
(emails `testuser-001@test.local` through `testuser-100@test.local`, `provider = 'test'`).
On each run, `--owners` controls how many of these are randomly selected as active owners
for that batch of data.

### Tracking test data

Every seeded need/resource title is prefixed with `[TEST-DATA]`.
The delete script uses this prefix to identify and remove only test-generated records,
leaving any real data untouched.
