import type { ArchetypeModule } from '@/types/archetype';
import { ticketBookingMetadata } from './metadata';
import { ticketBookingLesson } from './lesson';
import { ticketBookingDiagrams } from './diagrams';
import { ticketBookingChallenges } from './challenges';
import { ticketBookingConceptContext } from './concept-context';
import { stepComponents } from './steps';

const chapter: ArchetypeModule = { metadata: ticketBookingMetadata, lesson: ticketBookingLesson, diagrams: ticketBookingDiagrams, challenges: ticketBookingChallenges, conceptContext: ticketBookingConceptContext, stepComponents };
export default chapter;
