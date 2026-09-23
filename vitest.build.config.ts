import { defineConfig } from 'vitest/config';
import base from './vite.config';
export default defineConfig({ ...base, test: { ...base.test, include: ['tests/artifacts/**/*.test.ts'] } });
