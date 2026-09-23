import { describe, it, expect } from 'vitest';
import { chatProviders, getProviderUrl } from '../providers';

describe('chatProviders and getProviderUrl', () => {
  it('should have chatgpt configured with url prefill support', () => {
    const config = chatProviders.chatgpt;
    expect(config.supportsUrlPrefill).toBe(true);
    expect(config.url).toBe('https://chatgpt.com/');
  });

  it('should generate prefilled URL for ChatGPT with encoded prompt', () => {
    const config = chatProviders.chatgpt;
    const prompt = 'Please explain URL Shortener cache-aside pattern';
    const url = getProviderUrl(config, prompt);
    expect(url).toBe(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`);
  });

  it('should fallback to base URL if prompt is empty or missing', () => {
    const config = chatProviders.chatgpt;
    expect(getProviderUrl(config)).toBe('https://chatgpt.com/');
    expect(getProviderUrl(config, '')).toBe('https://chatgpt.com/');
  });

  it('should have claude configured with url prefill support', () => {
    const config = chatProviders.claude;
    expect(config.supportsUrlPrefill).toBe(true);
    expect(config.url).toBe('https://claude.ai/new');
  });

  it('should generate prefilled URL for Claude with encoded prompt', () => {
    const config = chatProviders.claude;
    const prompt = 'Explain database sharding strategies';
    const url = getProviderUrl(config, prompt);
    expect(url).toBe(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`);
  });

  it('should return base URL for Gemini which does not support URL query prefill natively', () => {
    const geminiConfig = chatProviders.gemini;
    expect(geminiConfig.supportsUrlPrefill).toBe(false);
    expect(getProviderUrl(geminiConfig, 'test prompt')).toBe('https://gemini.google.com/app');
  });
});
