# Knapsack

A resource sharing and optimization platform.

## Testing

### Running Tests

All projects use [Vitest](https://vitest.dev/) for testing. Tests are tagged by type:

- **Unit tests** (default): Fast, isolated tests with mocked dependencies
- **Integration tests**: Tests with real external connections (tag with `@integration`)

```bash
# Run tests for each module
cd apps/web-app && npm test
cd services/need-server && npm test
cd services/resource-server && npm test
```

### GitHub Actions

The **Run Tests** workflow runs automatically on PRs and pushes to main. You can also trigger it manually to run:
- Unit tests only (default)
- Integration tests only
- All tests

### Writing Tests

Tag integration tests in the test name:
```javascript
// Unit test (default - no tag)
test('validates input correctly', () => { ... })

// Integration test
test('fetches from real API @integration', () => { ... })
```

See individual test READMEs for more details:
- [apps/web-app/tests/README.md](apps/web-app/tests/README.md)
- [services/need-server/tests/README.md](services/need-server/tests/README.md)
- [services/resource-server/tests/README.md](services/resource-server/tests/README.md)

