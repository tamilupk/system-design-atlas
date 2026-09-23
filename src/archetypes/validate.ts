/**
 * Structural validation for archetypes.
 *
 * TypeScript guarantees the *shape* of an archetype module, but almost every authoring
 * mistake is a broken cross-reference between two files: a lesson step pointing at a
 * diagram state that does not exist, a step with no component, a challenge key that does
 * not match its own `id`, a concept that was never registered. Those all type-check and
 * only surface later as a blank panel or a dead link.
 *
 * `validateArchetypeModule` and `validateArchetypeCatalog` turn that whole class of bug
 * into a failing unit test. They are pure, synchronous, and side-effect free, so they can
 * also be reused by authoring tooling.
 */

import type { ArchetypeMetadata, ArchetypeModule } from '@/types/archetype';
import type { ChallengeDefinition, ChallengeOption } from '@/types/challenge';
import type { ConceptContext } from '@/types/concept';
import type { DiagramDefinition, DiagramNodeRole, DiagramState } from '@/types/diagram';
import type { LessonDefinition, LessonStep, StepComponentMap, ChapterStepManifest } from '@/types/lesson';
/** Stable identifiers for each class of authoring mistake. */
export type ArchetypeIssueCode =
  | 'metadata/invalid'
  | 'lesson/archetype-mismatch'
  | 'lesson/invalid'
  | 'step/id-duplicate'
  | 'step/invalid'
  | 'step/diagram-state-missing'
  | 'step/flow-sequence-missing'
  | 'step/highlighted-node-missing'
  | 'step/concept-unregistered'
  | 'step/component-missing'
  | 'step/component-unreachable'
  | 'manifest/invalid'
  | 'manifest/step-missing'
  | 'manifest/step-unreachable'
  | 'manifest/title-mismatch'
  | 'diagram/state-id-mismatch'
  | 'diagram/node-id-duplicate'
  | 'diagram/node-invalid'
  | 'diagram/node-concept-unregistered'
  | 'diagram/edge-id-duplicate'
  | 'diagram/edge-endpoint-missing'
  | 'diagram/edge-invalid'
  | 'diagram/flow-sequence-id-duplicate'
  | 'diagram/flow-sequence-invalid'
  | 'diagram/flow-event-edge-missing'
  | 'diagram/flow-event-node-missing'
  | 'concept-context/key-mismatch'
  | 'concept-context/invalid'
  | 'concept-context/unregistered'
  | 'challenge/key-mismatch'
  | 'challenge/invalid'
  | 'challenge/option-id-duplicate'
  | 'challenge/option-invalid'
  | 'challenge/optimal-count'
  | 'catalog/entry-invalid'
  | 'catalog/id-duplicate'
  | 'catalog/sequence-duplicate'
  | 'catalog/available-unregistered'
  | 'catalog/registered-unavailable'
  | 'catalog/manifest-missing'
  | 'catalog/manifest-unreachable';

export interface ArchetypeIssue {
  readonly code: ArchetypeIssueCode;
  readonly message: string;
}

export interface ArchetypeValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ArchetypeIssue[];
}

export interface ValidateModuleOptions {
  /**
   * Concept IDs known to the shared registry. When supplied, every concept referenced by
   * a lesson step, a diagram node, or the chapter's concept context is checked against it.
   * Omit to skip registration checks (for example when validating a throwaway fixture).
   */
  readonly knownConceptIds?: readonly string[];
  /**
   * The chapter's data-only step manifest, when one exists. When supplied, it is checked
   * against `lesson.steps` so the two cannot drift apart.
   */
  readonly stepManifest?: ChapterStepManifest;
}

export interface ValidateCatalogInput {
  readonly catalog: readonly ArchetypeMetadata[];
  /** IDs present in `archetypeRegistry`, i.e. chapters that can actually be loaded. */
  readonly registeredIds: readonly string[];
  /** IDs present in `chapterStepManifests`, i.e. chapters enumerable without loading content. */
  readonly manifestIds?: readonly string[];
}

const NODE_ROLES: readonly DiagramNodeRole[] = [
  'client',
  'service',
  'database',
  'cache',
  'loadbalancer',
  'queue',
  'external',
];

const STAGES = ['foundation', 'advanced', 'genai'] as const;
const AVAILABILITIES = ['available', 'planned'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry));
}

/**
 * Runtime array check without a type predicate: `Array.isArray` narrows a `readonly T[]`
 * to `any[]`, which would silently discard the element types this file relies on.
 */
function isArrayValue(value: unknown): boolean {
  return Array.isArray(value);
}

/** Own-property lookup that cannot be fooled by `__proto__` or inherited members. */
function hasOwn(target: object, key: string): boolean {
  return Object.hasOwn(target, key);
}

function ownKeys(target: object): string[] {
  return Object.keys(target);
}

function issue(code: ArchetypeIssueCode, message: string): ArchetypeIssue {
  return { code, message };
}

function validateMetadata(metadata: ArchetypeMetadata | undefined, issues: ArchetypeIssue[]): void {
  if (!metadata || typeof metadata !== 'object') {
    issues.push(issue('metadata/invalid', 'metadata is missing'));
    return;
  }
  if (!isNonEmptyString(metadata.id)) {
    issues.push(issue('metadata/invalid', 'metadata.id must be a non-empty string'));
  }
  if (!isNonEmptyString(metadata.title)) {
    issues.push(issue('metadata/invalid', `metadata.title must be a non-empty string (id: ${metadata.id})`));
  }
  if (!isNonEmptyString(metadata.description)) {
    issues.push(issue('metadata/invalid', `metadata.description must be a non-empty string (id: ${metadata.id})`));
  }
  if (!STAGES.includes(metadata.stage as (typeof STAGES)[number])) {
    issues.push(issue('metadata/invalid', `metadata.stage "${String(metadata.stage)}" is not one of ${STAGES.join(', ')}`));
  }
  if (!AVAILABILITIES.includes(metadata.availability as (typeof AVAILABILITIES)[number])) {
    issues.push(
      issue('metadata/invalid', `metadata.availability "${String(metadata.availability)}" is not one of ${AVAILABILITIES.join(', ')}`),
    );
  }
  if (!Number.isInteger(metadata.sequence) || metadata.sequence < 1) {
    issues.push(issue('metadata/invalid', `metadata.sequence must be an integer >= 1 (id: ${metadata.id})`));
  }
  if (metadata.estimatedMinutes !== undefined && (!Number.isFinite(metadata.estimatedMinutes) || metadata.estimatedMinutes <= 0)) {
    issues.push(issue('metadata/invalid', `metadata.estimatedMinutes must be a positive number (id: ${metadata.id})`));
  }
  if (!Array.isArray(metadata.tags) || !isStringArray(metadata.tags)) {
    issues.push(issue('metadata/invalid', `metadata.tags must be an array of non-empty strings (id: ${metadata.id})`));
  }
}

function validateDiagramState(
  stateKey: string,
  state: DiagramState,
  knownConceptIds: readonly string[] | undefined,
  issues: ArchetypeIssue[],
): void {
  if (state.id !== stateKey) {
    issues.push(
      issue('diagram/state-id-mismatch', `diagram state key "${stateKey}" does not match its own id "${String(state.id)}"`),
    );
  }
  if (!isArrayValue(state.nodes) || !isArrayValue(state.edges) || !isArrayValue(state.flowSequences)) {
    issues.push(issue('diagram/state-id-mismatch', `diagram state "${stateKey}" must define nodes, edges and flowSequences arrays`));
    return;
  }

  const nodeIds = new Set<string>();
  for (const node of state.nodes) {
    if (!isNonEmptyString(node.id)) {
      issues.push(issue('diagram/node-invalid', `diagram state "${stateKey}" contains a node without an id`));
      continue;
    }
    if (nodeIds.has(node.id)) {
      issues.push(issue('diagram/node-id-duplicate', `diagram state "${stateKey}" declares node id "${node.id}" more than once`));
    }
    nodeIds.add(node.id);
    if (!isNonEmptyString(node.label)) {
      issues.push(issue('diagram/node-invalid', `node "${node.id}" in state "${stateKey}" must have a non-empty label`));
    }
    if (!NODE_ROLES.includes(node.role)) {
      issues.push(issue('diagram/node-invalid', `node "${node.id}" in state "${stateKey}" has unknown role "${String(node.role)}"`));
    }
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      issues.push(issue('diagram/node-invalid', `node "${node.id}" in state "${stateKey}" must have finite x and y coordinates`));
    }
    if (node.conceptId !== undefined) {
      if (!isNonEmptyString(node.conceptId)) {
        issues.push(issue('diagram/node-invalid', `node "${node.id}" in state "${stateKey}" has an empty conceptId`));
      } else if (knownConceptIds && !knownConceptIds.includes(node.conceptId)) {
        issues.push(
          issue(
            'diagram/node-concept-unregistered',
            `node "${node.id}" in state "${stateKey}" references concept "${node.conceptId}" which is not registered in src/concepts/registry.ts`,
          ),
        );
      }
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of state.edges) {
    if (!isNonEmptyString(edge.id)) {
      issues.push(issue('diagram/edge-invalid', `diagram state "${stateKey}" contains an edge without an id`));
      continue;
    }
    if (edgeIds.has(edge.id)) {
      issues.push(issue('diagram/edge-id-duplicate', `diagram state "${stateKey}" declares edge id "${edge.id}" more than once`));
    }
    edgeIds.add(edge.id);
    for (const endpoint of ['from', 'to'] as const) {
      if (!nodeIds.has(edge[endpoint])) {
        issues.push(
          issue(
            'diagram/edge-endpoint-missing',
            `edge "${edge.id}" in state "${stateKey}" points ${endpoint} "${String(edge[endpoint])}" which is not a node in that state`,
          ),
        );
      }
    }
    if (edge.style !== undefined && edge.style !== 'solid' && edge.style !== 'dashed') {
      issues.push(issue('diagram/edge-invalid', `edge "${edge.id}" in state "${stateKey}" has unknown style "${String(edge.style)}"`));
    }
  }

  const flowIds = new Set<string>();
  for (const flow of state.flowSequences) {
    if (!isNonEmptyString(flow.id)) {
      issues.push(issue('diagram/flow-sequence-invalid', `diagram state "${stateKey}" contains a flow sequence without an id`));
      continue;
    }
    if (flowIds.has(flow.id)) {
      issues.push(
        issue('diagram/flow-sequence-id-duplicate', `diagram state "${stateKey}" declares flow sequence id "${flow.id}" more than once`),
      );
    }
    flowIds.add(flow.id);
    if (!isNonEmptyString(flow.title)) {
      issues.push(issue('diagram/flow-sequence-invalid', `flow sequence "${flow.id}" in state "${stateKey}" must have a non-empty title`));
    }
    if (!flow.events || flow.events.length === 0) {
      issues.push(issue('diagram/flow-sequence-invalid', `flow sequence "${flow.id}" in state "${stateKey}" must declare at least one event`));
      continue;
    }
    flow.events.forEach((event, index) => {
      if (!isNonEmptyString(event.label) || !isNonEmptyString(event.description)) {
        issues.push(
          issue(
            'diagram/flow-sequence-invalid',
            `flow sequence "${flow.id}" event ${index} in state "${stateKey}" must have a non-empty label and description`,
          ),
        );
      }
      if (!isStringArray(event.edgeIds)) {
        issues.push(
          issue('diagram/flow-sequence-invalid', `flow sequence "${flow.id}" event ${index} in state "${stateKey}" has invalid edgeIds`),
        );
      } else {
        for (const edgeId of event.edgeIds) {
          if (!edgeIds.has(edgeId)) {
            issues.push(
              issue(
                'diagram/flow-event-edge-missing',
                `flow sequence "${flow.id}" event ${index} in state "${stateKey}" references edge "${edgeId}" which does not exist in that state`,
              ),
            );
          }
        }
      }
      if (!isStringArray(event.highlightNodeIds)) {
        issues.push(
          issue(
            'diagram/flow-sequence-invalid',
            `flow sequence "${flow.id}" event ${index} in state "${stateKey}" has invalid highlightNodeIds`,
          ),
        );
      } else {
        for (const nodeId of event.highlightNodeIds) {
          if (!nodeIds.has(nodeId)) {
            issues.push(
              issue(
                'diagram/flow-event-node-missing',
                `flow sequence "${flow.id}" event ${index} in state "${stateKey}" highlights node "${nodeId}" which does not exist in that state`,
              ),
            );
          }
        }
      }
    });
  }
}

function validateDiagrams(
  diagrams: DiagramDefinition | undefined,
  knownConceptIds: readonly string[] | undefined,
  issues: ArchetypeIssue[],
): void {
  if (!diagrams || typeof diagrams.states !== 'object' || diagrams.states === null) {
    issues.push(issue('diagram/state-id-mismatch', 'diagrams.states is missing'));
    return;
  }
  for (const stateKey of ownKeys(diagrams.states)) {
    const state = diagrams.states[stateKey];
    if (!state || typeof state !== 'object') {
      issues.push(issue('diagram/state-id-mismatch', `diagram state "${stateKey}" is not an object`));
      continue;
    }
    validateDiagramState(stateKey, state, knownConceptIds, issues);
  }
}

function validateConceptContext(
  conceptContext: ConceptContext | undefined,
  knownConceptIds: readonly string[] | undefined,
  issues: ArchetypeIssue[],
): void {
  if (!conceptContext || typeof conceptContext !== 'object') {
    issues.push(issue('concept-context/invalid', 'conceptContext is missing'));
    return;
  }
  for (const key of ownKeys(conceptContext)) {
    const entry = conceptContext[key];
    if (!entry || typeof entry !== 'object') {
      issues.push(issue('concept-context/invalid', `conceptContext entry "${key}" is not an object`));
      continue;
    }
    if (entry.conceptId !== key) {
      issues.push(
        issue('concept-context/key-mismatch', `conceptContext key "${key}" does not match its own conceptId "${String(entry.conceptId)}"`),
      );
    }
    if (!isNonEmptyString(entry.chapterRole)) {
      issues.push(issue('concept-context/invalid', `conceptContext entry "${key}" must have a non-empty chapterRole`));
    }
    if (!Array.isArray(entry.specificConsiderations) || !isStringArray(entry.specificConsiderations)) {
      issues.push(
        issue('concept-context/invalid', `conceptContext entry "${key}" must have specificConsiderations as an array of non-empty strings`),
      );
    }
    if (entry.exampleData !== undefined && !isNonEmptyString(entry.exampleData)) {
      issues.push(issue('concept-context/invalid', `conceptContext entry "${key}" has an empty exampleData`));
    }
    if (knownConceptIds && !knownConceptIds.includes(key)) {
      issues.push(
        issue(
          'concept-context/unregistered',
          `conceptContext defines "${key}" which is not registered in src/concepts/registry.ts`,
        ),
      );
    }
  }
}

function validateChallengeOption(challengeId: string, option: ChallengeOption, index: number, issues: ArchetypeIssue[]): void {
  if (!isNonEmptyString(option.id)) {
    issues.push(issue('challenge/option-invalid', `challenge "${challengeId}" option ${index} must have a non-empty id`));
  }
  for (const field of ['title', 'description', 'seniorRationale', 'tradeOffSummary'] as const) {
    if (!isNonEmptyString(option[field])) {
      issues.push(issue('challenge/option-invalid', `challenge "${challengeId}" option ${index} must have a non-empty ${field}`));
    }
  }
  if (typeof option.isOptimal !== 'boolean') {
    issues.push(issue('challenge/option-invalid', `challenge "${challengeId}" option ${index} must set isOptimal to a boolean`));
  }
  const simulation = option.simulationResult;
  if (!simulation || typeof simulation !== 'object') {
    issues.push(issue('challenge/option-invalid', `challenge "${challengeId}" option ${index} is missing simulationResult`));
    return;
  }
  for (const field of ['metric', 'outcome', 'impact'] as const) {
    if (!isNonEmptyString(simulation[field])) {
      issues.push(
        issue('challenge/option-invalid', `challenge "${challengeId}" option ${index} must have a non-empty simulationResult.${field}`),
      );
    }
  }
}

function validateChallenges(
  challenges: Readonly<Record<string, ChallengeDefinition>> | undefined,
  issues: ArchetypeIssue[],
): void {
  if (challenges === undefined) return;
  if (typeof challenges !== 'object' || challenges === null) {
    issues.push(issue('challenge/invalid', 'challenges must be a record of challenge id to ChallengeDefinition'));
    return;
  }
  for (const key of ownKeys(challenges)) {
    const challenge = challenges[key];
    if (!challenge || typeof challenge !== 'object') {
      issues.push(issue('challenge/invalid', `challenge "${key}" is not an object`));
      continue;
    }
    if (challenge.id !== key) {
      issues.push(issue('challenge/key-mismatch', `challenges key "${key}" does not match its own id "${String(challenge.id)}"`));
    }
    for (const field of ['title', 'category', 'scenario', 'interviewContext'] as const) {
      if (!isNonEmptyString(challenge[field])) {
        issues.push(issue('challenge/invalid', `challenge "${key}" must have a non-empty ${field}`));
      }
    }
    if (!Array.isArray(challenge.options) || challenge.options.length < 2) {
      issues.push(issue('challenge/invalid', `challenge "${key}" must offer at least two options`));
      continue;
    }
    const optionIds = new Set<string>();
    challenge.options.forEach((option, index) => {
      validateChallengeOption(key, option, index, issues);
      if (isNonEmptyString(option.id)) {
        if (optionIds.has(option.id)) {
          issues.push(issue('challenge/option-id-duplicate', `challenge "${key}" declares option id "${option.id}" more than once`));
        }
        optionIds.add(option.id);
      }
    });
    const optimalCount = challenge.options.filter((option) => option.isOptimal).length;
    if (optimalCount !== 1) {
      issues.push(
        issue('challenge/optimal-count', `challenge "${key}" must mark exactly one option as optimal (found ${optimalCount})`),
      );
    }
  }
}

function validateStep(
  step: LessonStep,
  index: number,
  diagrams: DiagramDefinition | undefined,
  issues: ArchetypeIssue[],
): void {
  const label = isNonEmptyString(step.id) ? step.id : `steps[${index}]`;
  if (!isNonEmptyString(step.id)) {
    issues.push(issue('step/invalid', `steps[${index}] must have a non-empty id`));
  }
  if (!isNonEmptyString(step.title)) {
    issues.push(issue('step/invalid', `step "${label}" must have a non-empty title`));
  }
  if (step.shortTitle !== undefined && !isNonEmptyString(step.shortTitle)) {
    issues.push(issue('step/invalid', `step "${label}" has an empty shortTitle`));
  }
  if (!isNonEmptyString(step.objective)) {
    issues.push(issue('step/invalid', `step "${label}" must have a non-empty objective`));
  }
  if (step.concepts !== undefined && !isStringArray(step.concepts)) {
    issues.push(issue('step/invalid', `step "${label}" must declare concepts as an array of non-empty strings`));
  }

  const states = diagrams?.states;
  if (step.diagramStateId === undefined) return;

  if (!states || !hasOwn(states, step.diagramStateId)) {
    issues.push(
      issue('step/diagram-state-missing', `step "${label}" references diagram state "${step.diagramStateId}" which does not exist`),
    );
    return;
  }

  const state = states[step.diagramStateId];
  if (!state || typeof state !== 'object') return;
  const nodeIds = new Set(state.nodes.map((node) => node.id));

  if (step.flowSequenceId !== undefined) {
    if (!state.flowSequences.some((flow) => flow.id === step.flowSequenceId)) {
      issues.push(
        issue(
          'step/flow-sequence-missing',
          `step "${label}" references flow sequence "${step.flowSequenceId}" which does not exist in diagram state "${step.diagramStateId}"`,
        ),
      );
    }
  }

  if (step.highlightedNodes !== undefined) {
    if (!isStringArray(step.highlightedNodes)) {
      issues.push(issue('step/invalid', `step "${label}" must declare highlightedNodes as an array of non-empty strings`));
    } else {
      for (const nodeId of step.highlightedNodes) {
        if (!nodeIds.has(nodeId)) {
          issues.push(
            issue(
              'step/highlighted-node-missing',
              `step "${label}" highlights node "${nodeId}" which does not exist in diagram state "${step.diagramStateId}"`,
            ),
          );
        }
      }
    }
  }
}

function validateStepComponents(
  lesson: LessonDefinition,
  stepComponents: StepComponentMap | undefined,
  issues: ArchetypeIssue[],
): void {
  if (!stepComponents || typeof stepComponents !== 'object') {
    issues.push(issue('step/component-missing', 'stepComponents is missing'));
    return;
  }
  const stepIds = new Set(lesson.steps.map((step) => step.id));
  for (const step of lesson.steps) {
    if (!isNonEmptyString(step.id)) continue;
    const component = hasOwn(stepComponents, step.id) ? stepComponents[step.id] : undefined;
    if (typeof component !== 'function') {
      issues.push(issue('step/component-missing', `step "${step.id}" has no entry in stepComponents`));
    }
  }
  for (const key of ownKeys(stepComponents)) {
    if (!stepIds.has(key)) {
      issues.push(
        issue('step/component-unreachable', `stepComponents registers "${key}" which is not a step id in lesson.steps`),
      );
    }
  }
}

/**
 * Check a chapter's data-only step manifest against its lesson. The manifest exists so
 * chapter-agnostic surfaces never import lesson content, which makes it a second copy of
 * the step list — this is what keeps that copy honest.
 */
function validateStepManifest(
  lesson: LessonDefinition,
  stepManifest: ChapterStepManifest | undefined,
  issues: ArchetypeIssue[],
): void {
  if (stepManifest === undefined) return;
  if (!Array.isArray(stepManifest)) {
    issues.push(issue('manifest/invalid', 'stepManifest must be an array of step summaries'));
    return;
  }

  const manifestIds = new Set<string>();
  for (const entry of stepManifest) {
    if (!isNonEmptyString(entry?.id)) {
      issues.push(issue('manifest/invalid', 'stepManifest contains an entry without an id'));
      continue;
    }
    if (manifestIds.has(entry.id)) {
      issues.push(issue('manifest/invalid', `stepManifest declares step id "${entry.id}" more than once`));
    }
    manifestIds.add(entry.id);
    if (!isNonEmptyString(entry.title)) {
      issues.push(issue('manifest/invalid', `stepManifest entry "${entry.id}" must have a non-empty title`));
    }
    if (entry.shortTitle !== undefined && !isNonEmptyString(entry.shortTitle)) {
      issues.push(issue('manifest/invalid', `stepManifest entry "${entry.id}" has an empty shortTitle`));
    }
  }

  lesson.steps.forEach((step, index) => {
    if (!isNonEmptyString(step.id)) return;
    if (!manifestIds.has(step.id)) {
      issues.push(issue('manifest/step-missing', `lesson step "${step.id}" is missing from stepManifest`));
      return;
    }
    const entry = stepManifest.find((candidate) => candidate.id === step.id);
    if (!entry) return;
    if (entry.title !== step.title) {
      issues.push(
        issue(
          'manifest/title-mismatch',
          `stepManifest title for "${step.id}" ("${String(entry.title)}") does not match lesson.ts ("${String(step.title)}")`,
        ),
      );
    }
    if ((entry.shortTitle ?? undefined) !== (step.shortTitle ?? undefined)) {
      issues.push(
        issue(
          'manifest/title-mismatch',
          `stepManifest shortTitle for "${step.id}" ("${String(entry.shortTitle)}") does not match lesson.ts ("${String(step.shortTitle)}")`,
        ),
      );
    }
    const manifestIndex = stepManifest.findIndex((candidate) => candidate.id === step.id);
    if (manifestIndex !== index) {
      issues.push(
        issue(
          'manifest/step-missing',
          `stepManifest lists "${step.id}" at position ${manifestIndex} but lesson.ts has it at position ${index}`,
        ),
      );
    }
  });

  const lessonIds = new Set(lesson.steps.map((step) => step.id));
  for (const entry of stepManifest) {
    if (isNonEmptyString(entry?.id) && !lessonIds.has(entry.id)) {
      issues.push(issue('manifest/step-unreachable', `stepManifest lists "${entry.id}" which is not a step in lesson.ts`));
    }
  }
}

/**
 * Validate a single archetype module against every cross-file contract the framework
 * depends on. Returns all problems found rather than failing on the first one, so an
 * author can fix a chapter in a single pass.
 */
export function validateArchetypeModule(
  module: ArchetypeModule,
  options: ValidateModuleOptions = {},
): ArchetypeValidationResult {
  const issues: ArchetypeIssue[] = [];
  const { knownConceptIds, stepManifest } = options;

  validateMetadata(module?.metadata, issues);
  validateDiagrams(module?.diagrams, knownConceptIds, issues);
  validateConceptContext(module?.conceptContext, knownConceptIds, issues);
  validateChallenges(module?.challenges, issues);

  const lesson = module?.lesson;
  if (!lesson || typeof lesson !== 'object') {
    issues.push(issue('lesson/invalid', 'lesson is missing'));
    return { valid: false, issues };
  }
  if (module?.metadata && lesson.archetypeId !== module.metadata.id) {
    issues.push(
      issue(
        'lesson/archetype-mismatch',
        `lesson.archetypeId "${String(lesson.archetypeId)}" does not match metadata.id "${String(module.metadata.id)}"`,
      ),
    );
  }
  if (!isNonEmptyString(lesson.title)) {
    issues.push(issue('lesson/invalid', 'lesson.title must be a non-empty string'));
  }
  if (!Number.isInteger(lesson.contentVersion) || lesson.contentVersion < 1) {
    issues.push(issue('lesson/invalid', `lesson.contentVersion must be an integer >= 1 (found ${String(lesson.contentVersion)})`));
  }
  if (!Array.isArray(lesson.steps) || lesson.steps.length === 0) {
    issues.push(issue('lesson/invalid', 'lesson.steps must declare at least one step'));
    return { valid: false, issues };
  }

  const stepIds = new Set<string>();
  lesson.steps.forEach((step, index) => {
    validateStep(step, index, module?.diagrams, issues);
    if (!isNonEmptyString(step.id)) return;
    if (stepIds.has(step.id)) {
      issues.push(issue('step/id-duplicate', `lesson.steps declares step id "${step.id}" more than once`));
    }
    stepIds.add(step.id);
    if (knownConceptIds && step.concepts) {
      for (const conceptId of step.concepts) {
        if (!knownConceptIds.includes(conceptId)) {
          issues.push(
            issue(
              'step/concept-unregistered',
              `step "${step.id}" references concept "${conceptId}" which is not registered in src/concepts/registry.ts`,
            ),
          );
        }
      }
    }
  });

  validateStepComponents(lesson, module?.stepComponents, issues);
  validateStepManifest(lesson, stepManifest, issues);

  return { valid: issues.length === 0, issues };
}

/**
 * Validate the catalog as a whole: unique IDs, unique ordering, and agreement with the
 * lazy-load registry so a chapter can never be advertised as available but unloadable
 * (or registered but unreachable from the home page).
 */
export function validateArchetypeCatalog(input: ValidateCatalogInput): ArchetypeValidationResult {
  const issues: ArchetypeIssue[] = [];
  const { catalog, registeredIds, manifestIds } = input;

  if (!Array.isArray(catalog) || catalog.length === 0) {
    issues.push(issue('catalog/entry-invalid', 'archetypeCatalog must be a non-empty array'));
    return { valid: false, issues };
  }

  const seenIds = new Set<string>();
  const seenSequences = new Set<number>();
  for (const entry of catalog) {
    validateMetadata(entry, issues);
    if (!entry || typeof entry !== 'object' || !isNonEmptyString(entry.id)) continue;

    if (seenIds.has(entry.id)) {
      issues.push(issue('catalog/id-duplicate', `archetypeCatalog declares id "${entry.id}" more than once`));
    }
    seenIds.add(entry.id);

    if (Number.isInteger(entry.sequence)) {
      if (seenSequences.has(entry.sequence)) {
        issues.push(issue('catalog/sequence-duplicate', `archetypeCatalog uses sequence ${entry.sequence} more than once`));
      }
      seenSequences.add(entry.sequence);
    }

    if (entry.availability === 'available' && !registeredIds.includes(entry.id)) {
      issues.push(
        issue(
          'catalog/available-unregistered',
          `catalog entry "${entry.id}" is marked available but has no lazy loader in src/archetypes/registry.ts`,
        ),
      );
    }

    if (entry.availability === 'available' && manifestIds && !manifestIds.includes(entry.id)) {
      issues.push(
        issue(
          'catalog/manifest-missing',
          `catalog entry "${entry.id}" is available but has no step manifest in src/archetypes/step-manifests.ts`,
        ),
      );
    }
  }

  if (manifestIds) {
    for (const manifestId of manifestIds) {
      const entry = catalog.find((candidate) => candidate?.id === manifestId);
      if (!entry) {
        issues.push(
          issue('catalog/manifest-unreachable', `step-manifests.ts lists "${manifestId}" which is not present in archetypeCatalog`),
        );
      } else if (entry.availability !== 'available') {
        issues.push(
          issue(
            'catalog/manifest-unreachable',
            `step-manifests.ts lists "${manifestId}" but its catalog entry is marked "${String(entry.availability)}"`,
          ),
        );
      }
    }
  }

  for (const registeredId of registeredIds) {
    const entry = catalog.find((candidate) => candidate?.id === registeredId);
    if (!entry) {
      issues.push(issue('catalog/entry-invalid', `registry loads "${registeredId}" which is not present in archetypeCatalog`));
    } else if (entry.availability !== 'available') {
      issues.push(
        issue(
          'catalog/registered-unavailable',
          `registry loads "${registeredId}" but its catalog entry is marked "${String(entry.availability)}"`,
        ),
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

/** Render issues as readable lines, for test failure output and authoring tooling. */
export function formatArchetypeIssues(archetypeId: string, issues: readonly ArchetypeIssue[]): string {
  return issues.map((entry) => `  [${entry.code}] ${entry.message}`).join('\n') || `  (no issues for ${archetypeId})`;
}
