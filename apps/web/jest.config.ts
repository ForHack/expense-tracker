import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// next/jest подтягивает SWC-транспиляцию, алиасы из tsconfig, .env и заглушки для CSS/статики
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Как в apps/api: тесты лежат рядом с кодом, расширение .spec
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.spec.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};

export default createJestConfig(config);
