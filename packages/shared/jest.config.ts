import type { Config } from 'jest'
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@cosmos/shared(.*)$': '<rootDir>/src$1' },
}
export default config
