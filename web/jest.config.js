// TODO: pinned to Jest 29 / ts-jest 29 for compatibility. Try upgrading to Jest 30 once
//       ts-jest ships stable 30.x support and remove the exact version pins in package.json.
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/src/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: { jsx: 'react-jsx' },
    },
  },
};
