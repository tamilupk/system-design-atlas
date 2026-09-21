import type { PromptContext, PromptAction } from './types';

const ACTION_INSTRUCTIONS: Record<PromptAction, string> = {
  explain: 'Please explain this concept in simple, clear terms. Use analogies where helpful. Break down the key ideas step by step.',
  example: 'Please provide a concrete, practical example. Include specific data, request/response flows, or code snippets where relevant.',
  compare: 'Please compare the main alternatives or approaches. Use a structured comparison covering trade-offs, use cases, and when to choose each option.',
  failures: 'Please explain the common failure modes and edge cases. Describe what can go wrong, how to detect issues, and mitigation strategies.',
  custom: '',
};

export function buildPrompt(context: PromptContext): string {
  const parts: string[] = [];

  parts.push(`I'm studying system design, specifically the chapter on "${context.chapterTitle}".`);
  parts.push(`I'm currently on the step: "${context.stepTitle}".`);
  parts.push(`Learning objective: ${context.stepObjective}`);
  parts.push('');
  parts.push(`Here's a summary of the design so far:`);
  parts.push(context.designSummary);

  if (context.conceptTitle && context.conceptContext) {
    parts.push('');
    parts.push(`I'm looking at the "${context.conceptTitle}" component specifically.`);
    parts.push(`In this chapter's context: ${context.conceptContext}`);
  }

  parts.push('');

  if (context.action === 'custom' && context.userQuestion) {
    parts.push(`My question: ${context.userQuestion}`);
  } else {
    parts.push(ACTION_INSTRUCTIONS[context.action]);
  }

  parts.push('');
  parts.push('Please provide a clear explanation with concrete examples and relevant trade-offs where applicable.');

  return parts.join('\n');
}

export const PROMPT_ACTIONS: { id: PromptAction; label: string }[] = [
  { id: 'explain', label: 'Explain simply' },
  { id: 'example', label: 'Show an example' },
  { id: 'compare', label: 'Compare alternatives' },
  { id: 'failures', label: 'Explain failure modes' },
  { id: 'custom', label: 'Ask a custom question' },
];
