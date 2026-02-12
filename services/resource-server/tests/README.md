# Server Tests

## Test Types

All tests default to **unit tests**. To mark a test as a different type, add a tag to the test name:

- **Unit tests** (default): No tag needed
- **Integration tests**: Add `@integration` to the test name

Example:
```javascript
// Unit test (default)
it('returns 200 for valid input', () => { ... })

// Integration test
it('connects to real database @integration', () => { ... })
```

## Running Tests

```bash
# Run all unit tests (default)
npm test

# Run unit tests only (CI)
npm test -- --run --testNamePattern='^(?!.*@integration)'

# Run integration tests only
npm test -- --run --testNamePattern='@integration'

# Run all tests
npm test -- --run

# Run with coverage
npm run coverage
```

## Writing Tests

- Mock external dependencies (database, APIs) for unit tests
- Use real connections only for integration tests (tagged with `@integration`)
- Keep tests fast and isolated
