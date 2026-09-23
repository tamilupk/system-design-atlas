import { describe, it, expect } from 'vitest';
import type { ArchetypeModule } from '@/types/archetype';
import type { ChallengeDefinition, ChallengeOption } from '@/types/challenge';
import type { DiagramDefinition } from '@/types/diagram';
import type { LessonDefinition, StepComponentProps } from '@/types/lesson';
import { archetypeCatalog } from '../catalog';
import { archetypeRegistry } from '../registry';
import { chapterStepManifests, getStepIds, getStepTitle, isKnownStep } from '../step-manifests';
import { getAllConcepts } from '@/concepts/registry';
import {
  validateArchetypeCatalog,
  validateArchetypeModule,
  type ArchetypeIssueCode,
  type ArchetypeValidationResult,
} from '../validate';

/**
 * These tests are the safety net behind the authoring workflow. Every rule in `validate.ts`
 * maps to a real class of cross-file authoring mistake, so each one gets a negative case
 * built from a minimal in-memory module — there is no fixture file to keep in sync.
 */

const KNOWN_CONCEPT_IDS = getAllConcepts().map((concept) => concept.id);

function noopStep(_props: StepComponentProps) {
  return null;
}

function makeDiagrams(): DiagramDefinition {
  return {
    states: {
      'empty': { id: 'empty', nodes: [], edges: [], flowSequences: [] },
      'baseline': {
        id: 'baseline',
        nodes: [
          { id: 'client', label: 'Client', role: 'client', x: 0, y: 0, conceptId: 'cache' },
          { id: 'service', label: 'Service', role: 'service', x: 10, y: 10 },
        ],
        edges: [{ id: 'e1', from: 'client', to: 'service', label: 'GET' }],
        flowSequences: [
          {
            id: 'read-flow',
            title: 'Read',
            events: [{ label: 'Request', description: 'Client reads', edgeIds: ['e1'], highlightNodeIds: ['client'] }],
          },
        ],
      },
    },
  };
}

function makeLesson(overrides: Partial<LessonDefinition> = {}): LessonDefinition {
  return {
    archetypeId: 'fixture',
    title: 'Fixture',
    contentVersion: 1,
    steps: [
      { id: 'intro', title: 'Intro', objective: 'Set the stage', diagramStateId: 'empty', concepts: [] },
      {
        id: 'baseline',
        title: 'Baseline',
        objective: 'Build it',
        diagramStateId: 'baseline',
        highlightedNodes: ['client'],
        flowSequenceId: 'read-flow',
        concepts: ['cache'],
      },
    ],
    ...overrides,
  };
}

function makeModule(overrides: Partial<ArchetypeModule> = {}): ArchetypeModule {
  return {
    metadata: {
      id: 'fixture',
      title: 'Fixture',
      description: 'A minimal valid module used by validation tests.',
      stage: 'foundation',
      sequence: 1,
      availability: 'available',
      tags: ['test'],
    },
    lesson: makeLesson(),
    diagrams: makeDiagrams(),
    conceptContext: {
      'cache': { conceptId: 'cache', chapterRole: 'Hot path', specificConsiderations: ['TTL'] },
    },
    stepComponents: { 'intro': noopStep, 'baseline': noopStep },
    ...overrides,
  };
}

function makeOption(id: string, isOptimal: boolean): ChallengeOption {
  return {
    id,
    title: `Option ${id}`,
    description: 'A description.',
    isOptimal,
    simulationResult: { metric: 'p99', outcome: 'lower', impact: 'positive' },
    seniorRationale: 'The rationale.',
    tradeOffSummary: 'The trade-off.',
  };
}

function makeChallenge(id: string, options: ChallengeOption[]): ChallengeDefinition {
  return { id, title: 'T', category: 'C', scenario: 'S', interviewContext: 'I', options };
}

function codes(result: ArchetypeValidationResult): ArchetypeIssueCode[] {
  return result.issues.map((entry) => entry.code);
}

describe('validateArchetypeModule — baseline', () => {
  it('accepts a minimal well-formed module', () => {
    const result = validateArchetypeModule(makeModule(), { knownConceptIds: KNOWN_CONCEPT_IDS });
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('accepts a module with valid challenges', () => {
    const challenges = { 'pick-a': makeChallenge('pick-a', [makeOption('a', true), makeOption('b', false)]) };
    const result = validateArchetypeModule(makeModule({ challenges }), { knownConceptIds: KNOWN_CONCEPT_IDS });
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('skips concept registration checks when no known ids are supplied', () => {
    const lesson = makeLesson({ steps: [{ id: 'intro', title: 'Intro', objective: 'o', concepts: ['anything'] }] });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).not.toContain('step/concept-unregistered');
    expect(result.valid).toBe(true);
  });
});

describe('validateArchetypeModule — negative cases', () => {
  it('flags lesson/metadata archetype id mismatch', () => {
    const result = validateArchetypeModule(makeModule({ lesson: makeLesson({ archetypeId: 'other' }) }));
    expect(codes(result)).toContain('lesson/archetype-mismatch');
    expect(result.valid).toBe(false);
  });

  it('flags invalid metadata', () => {
    const result = validateArchetypeModule(
      makeModule({
        metadata: {
          id: 'fixture',
          title: '',
          description: 'd',
          stage: 'not-a-stage' as never,
          sequence: 0,
          availability: 'available',
          tags: [],
        },
      }),
    );
    expect(codes(result)).toContain('metadata/invalid');
  });

  it('flags a step referencing a missing diagram state', () => {
    const lesson = makeLesson({
      steps: [{ id: 'intro', title: 'Intro', objective: 'o', diagramStateId: 'does-not-exist' }],
    });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('step/diagram-state-missing');
  });

  it('flags a step referencing a missing flow sequence', () => {
    const lesson = makeLesson({
      steps: [{ id: 'intro', title: 'Intro', objective: 'o', diagramStateId: 'baseline', flowSequenceId: 'nope' }],
    });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('step/flow-sequence-missing');
  });

  it('flags a step highlighting a node absent from its diagram state', () => {
    const lesson = makeLesson({
      steps: [{ id: 'intro', title: 'Intro', objective: 'o', diagramStateId: 'baseline', highlightedNodes: ['ghost'] }],
    });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('step/highlighted-node-missing');
  });

  it('flags a step referencing an unregistered concept', () => {
    const lesson = makeLesson({
      steps: [{ id: 'intro', title: 'Intro', objective: 'o', concepts: ['not-a-real-concept'] }],
    });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'intro': noopStep } }), {
      knownConceptIds: KNOWN_CONCEPT_IDS,
    });
    expect(codes(result)).toContain('step/concept-unregistered');
  });

  it('flags a step with no component and an unreachable component', () => {
    const lesson = makeLesson({ steps: [{ id: 'intro', title: 'Intro', objective: 'o' }] });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'other-step': noopStep } }));
    expect(codes(result)).toContain('step/component-missing');
    expect(codes(result)).toContain('step/component-unreachable');
  });

  it('flags duplicate step ids', () => {
    const lesson = makeLesson({
      steps: [
        { id: 'intro', title: 'A', objective: 'o' },
        { id: 'intro', title: 'B', objective: 'o' },
      ],
    });
    const result = validateArchetypeModule(makeModule({ lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('step/id-duplicate');
  });

  it('flags a diagram state whose key disagrees with its id', () => {
    const diagrams: DiagramDefinition = {
      states: { 'wrong-key': { id: 'right-key', nodes: [], edges: [], flowSequences: [] } },
    };
    const lesson = makeLesson({ steps: [{ id: 'intro', title: 'Intro', objective: 'o' }] });
    const result = validateArchetypeModule(makeModule({ diagrams, lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('diagram/state-id-mismatch');
  });

  it('flags an edge pointing at a missing node and duplicate node ids', () => {
    const diagrams: DiagramDefinition = {
      states: {
        'baseline': {
          id: 'baseline',
          nodes: [
            { id: 'client', label: 'Client', role: 'client', x: 0, y: 0 },
            { id: 'client', label: 'Client again', role: 'client', x: 1, y: 1 },
          ],
          edges: [{ id: 'e1', from: 'client', to: 'ghost', label: 'x' }],
          flowSequences: [],
        },
      },
    };
    const lesson = makeLesson({ steps: [{ id: 'intro', title: 'Intro', objective: 'o' }] });
    const result = validateArchetypeModule(makeModule({ diagrams, lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('diagram/edge-endpoint-missing');
    expect(codes(result)).toContain('diagram/node-id-duplicate');
  });

  it('flags a flow event referencing a missing edge and node', () => {
    const diagrams: DiagramDefinition = {
      states: {
        'baseline': {
          id: 'baseline',
          nodes: [{ id: 'client', label: 'Client', role: 'client', x: 0, y: 0 }],
          edges: [],
          flowSequences: [
            {
              id: 'read-flow',
              title: 'Read',
              events: [{ label: 'L', description: 'D', edgeIds: ['ghost-edge'], highlightNodeIds: ['ghost-node'] }],
            },
          ],
        },
      },
    };
    const lesson = makeLesson({ steps: [{ id: 'intro', title: 'Intro', objective: 'o' }] });
    const result = validateArchetypeModule(makeModule({ diagrams, lesson, stepComponents: { 'intro': noopStep } }));
    expect(codes(result)).toContain('diagram/flow-event-edge-missing');
    expect(codes(result)).toContain('diagram/flow-event-node-missing');
  });

  it('flags a diagram node referencing an unregistered concept', () => {
    const diagrams: DiagramDefinition = {
      states: {
        'baseline': {
          id: 'baseline',
          nodes: [{ id: 'client', label: 'Client', role: 'client', x: 0, y: 0, conceptId: 'not-real' }],
          edges: [],
          flowSequences: [],
        },
      },
    };
    const lesson = makeLesson({ steps: [{ id: 'intro', title: 'Intro', objective: 'o' }] });
    const result = validateArchetypeModule(makeModule({ diagrams, lesson, stepComponents: { 'intro': noopStep } }), {
      knownConceptIds: KNOWN_CONCEPT_IDS,
    });
    expect(codes(result)).toContain('diagram/node-concept-unregistered');
  });

  it('flags a concept context key that disagrees with its conceptId', () => {
    const result = validateArchetypeModule(
      makeModule({
        conceptContext: { 'cache': { conceptId: 'load-balancer', chapterRole: 'Role', specificConsiderations: ['x'] } },
      }),
    );
    expect(codes(result)).toContain('concept-context/key-mismatch');
  });

  it('flags a concept context entry for an unregistered concept', () => {
    const result = validateArchetypeModule(
      makeModule({
        conceptContext: { 'not-real': { conceptId: 'not-real', chapterRole: 'Role', specificConsiderations: ['x'] } },
      }),
      { knownConceptIds: KNOWN_CONCEPT_IDS },
    );
    expect(codes(result)).toContain('concept-context/unregistered');
  });

  it('flags a challenge key that disagrees with its id', () => {
    const challenges = { 'wrong-key': makeChallenge('right-key', [makeOption('a', true), makeOption('b', false)]) };
    expect(codes(validateArchetypeModule(makeModule({ challenges })))).toContain('challenge/key-mismatch');
  });

  it('flags a challenge that marks zero or multiple options optimal', () => {
    const none = { 'c': makeChallenge('c', [makeOption('a', false), makeOption('b', false)]) };
    const many = { 'c': makeChallenge('c', [makeOption('a', true), makeOption('b', true)]) };
    expect(codes(validateArchetypeModule(makeModule({ challenges: none })))).toContain('challenge/optimal-count');
    expect(codes(validateArchetypeModule(makeModule({ challenges: many })))).toContain('challenge/optimal-count');
  });

  it('flags a challenge with fewer than two options and duplicate option ids', () => {
    const single = { 'c': makeChallenge('c', [makeOption('a', true)]) };
    expect(codes(validateArchetypeModule(makeModule({ challenges: single })))).toContain('challenge/invalid');

    const dupes = { 'c': makeChallenge('c', [makeOption('a', true), makeOption('a', false)]) };
    expect(codes(validateArchetypeModule(makeModule({ challenges: dupes })))).toContain('challenge/option-id-duplicate');
  });
});

describe('validateArchetypeModule — step manifests', () => {
  const matchingManifest = [
    { id: 'intro', title: 'Intro' },
    { id: 'baseline', title: 'Baseline' },
  ] as const;

  it('accepts a manifest that mirrors the lesson', () => {
    const result = validateArchetypeModule(makeModule(), {
      knownConceptIds: KNOWN_CONCEPT_IDS,
      stepManifest: matchingManifest,
    });
    expect(result.issues).toEqual([]);
  });

  it('flags a lesson step missing from the manifest', () => {
    const result = validateArchetypeModule(makeModule(), { stepManifest: [{ id: 'intro', title: 'Intro' }] });
    expect(codes(result)).toContain('manifest/step-missing');
  });

  it('flags a manifest entry that is not a lesson step', () => {
    const manifest = [...matchingManifest, { id: 'ghost', title: 'Ghost' }];
    expect(codes(validateArchetypeModule(makeModule(), { stepManifest: manifest }))).toContain(
      'manifest/step-unreachable',
    );
  });

  it('flags a title that drifts from lesson.ts', () => {
    const manifest = [{ id: 'intro', title: 'Introduction' }, { id: 'baseline', title: 'Baseline' }];
    expect(codes(validateArchetypeModule(makeModule(), { stepManifest: manifest }))).toContain(
      'manifest/title-mismatch',
    );
  });

  it('flags a manifest ordered differently from the lesson', () => {
    const manifest = [{ id: 'baseline', title: 'Baseline' }, { id: 'intro', title: 'Intro' }];
    expect(codes(validateArchetypeModule(makeModule(), { stepManifest: manifest }))).toContain('manifest/step-missing');
  });

  it('flags malformed manifest entries', () => {
    expect(
      codes(validateArchetypeModule(makeModule(), { stepManifest: [{ id: 'intro', title: '' }] })),
    ).toContain('manifest/invalid');
    expect(
      codes(validateArchetypeModule(makeModule(), { stepManifest: [{ id: '', title: 'x' }] as never })),
    ).toContain('manifest/invalid');
  });
});

describe('validateArchetypeCatalog', () => {
  it('flags an available catalog entry with no loader', () => {
    const result = validateArchetypeCatalog({
      catalog: [
        { id: 'a', title: 'A', description: 'd', stage: 'foundation', sequence: 1, availability: 'available', tags: [] },
      ],
      registeredIds: [],
    });
    expect(codes(result)).toContain('catalog/available-unregistered');
  });

  it('flags a registered loader whose catalog entry is not available', () => {
    const result = validateArchetypeCatalog({
      catalog: [
        { id: 'a', title: 'A', description: 'd', stage: 'foundation', sequence: 1, availability: 'planned', tags: [] },
      ],
      registeredIds: ['a'],
    });
    expect(codes(result)).toContain('catalog/registered-unavailable');
  });

  it('flags duplicate ids and duplicate sequences', () => {
    const result = validateArchetypeCatalog({
      catalog: [
        { id: 'a', title: 'A', description: 'd', stage: 'foundation', sequence: 1, availability: 'planned', tags: [] },
        { id: 'a', title: 'A2', description: 'd', stage: 'foundation', sequence: 1, availability: 'planned', tags: [] },
      ],
      registeredIds: [],
    });
    expect(codes(result)).toContain('catalog/id-duplicate');
    expect(codes(result)).toContain('catalog/sequence-duplicate');
  });

  it('flags an available entry with no step manifest and a manifest with no available entry', () => {
    const missing = validateArchetypeCatalog({
      catalog: [
        { id: 'a', title: 'A', description: 'd', stage: 'foundation', sequence: 1, availability: 'available', tags: [] },
      ],
      registeredIds: ['a'],
      manifestIds: [],
    });
    expect(codes(missing)).toContain('catalog/manifest-missing');

    const orphan = validateArchetypeCatalog({
      catalog: [
        { id: 'a', title: 'A', description: 'd', stage: 'foundation', sequence: 1, availability: 'planned', tags: [] },
      ],
      registeredIds: [],
      manifestIds: ['a', 'ghost'],
    });
    expect(codes(orphan).filter((code) => code === 'catalog/manifest-unreachable')).toHaveLength(2);
  });
});

describe('shipped archetypes', () => {
  it('the real catalog is internally consistent and matches the registry', () => {
    const result = validateArchetypeCatalog({
      catalog: archetypeCatalog,
      registeredIds: Object.keys(archetypeRegistry),
      manifestIds: Object.keys(chapterStepManifests),
    });
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('every registered archetype module passes full validation', async () => {
    const ids = Object.keys(archetypeRegistry);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const loader = archetypeRegistry[id];
      expect(loader, `${id} should have a loader`).toBeTruthy();
      const module = await loader!();
      const result = validateArchetypeModule(module, {
        knownConceptIds: KNOWN_CONCEPT_IDS,
        stepManifest: chapterStepManifests[id],
      });
      expect(result.issues, `issues in ${id}`).toEqual([]);
      expect(result.valid, `${id} should be valid`).toBe(true);
    }
  });

  it('every available catalog entry has a step manifest usable without loading the chapter', async () => {
    const available = archetypeCatalog.filter((entry) => entry.availability === 'available');
    expect(available.length).toBeGreaterThan(0);
    for (const entry of available) {
      const manifest = chapterStepManifests[entry.id];
      expect(manifest, `${entry.id} should have a step manifest`).toBeTruthy();
      expect(manifest!.length).toBeGreaterThan(0);

      const loader = archetypeRegistry[entry.id];
      expect(loader, `${entry.id} should have a loader`).toBeTruthy();
      const module = await loader!();
      expect(getStepIds(entry.id)).toEqual(module.lesson.steps.map((step) => step.id));
      for (const step of module.lesson.steps) {
        expect(getStepTitle(entry.id, step.id)).toBe(step.title);
        expect(isKnownStep(entry.id, step.id)).toBe(true);
      }
      expect(isKnownStep(entry.id, 'not-a-real-step')).toBe(false);
      expect(getStepTitle(entry.id, 'not-a-real-step')).toBe('not-a-real-step');
    }
  });

  it('planned chapters expose no manifest, so they cannot contribute fake progress', () => {
    const planned = archetypeCatalog.filter((entry) => entry.availability === 'planned');
    expect(planned.length).toBeGreaterThan(0);
    for (const entry of planned) {
      expect(chapterStepManifests[entry.id], `${entry.id} should have no manifest`).toBeUndefined();
      expect(getStepIds(entry.id)).toEqual([]);
    }
  });

  it('every available catalog entry has a registered loader', () => {
    const available = archetypeCatalog.filter((entry) => entry.availability === 'available');
    expect(available.length).toBeGreaterThan(0);
    for (const entry of available) {
      expect(Object.hasOwn(archetypeRegistry, entry.id), `${entry.id} should be loadable`).toBe(true);
    }
  });
});
