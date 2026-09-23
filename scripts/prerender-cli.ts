import { prerender } from './prerender';

try {
  await prerender();
} catch (error) {
  console.error('Prerender failed:', error);
  process.exitCode = 1;
}
