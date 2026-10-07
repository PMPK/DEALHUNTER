import type { FeedbackDimension, LocalTopic, ScoreDimension, WarningCategory } from './types';

/** Vocabulary only (names of things we can assess). No facts about Zanzibar live here. */
export const SCORE_DIMENSIONS: ScoreDimension[] = ['overall', 'beach', 'infrastructure', 'surroundings'];
export const FEEDBACK_DIMENSIONS: FeedbackDimension[] = [...SCORE_DIMENSIONS, 'warnings'];

export const DIMENSION_LABEL: Record<FeedbackDimension, string> = {
  overall: 'Overall stay attractiveness',
  beach: 'Beach / swimming reality',
  infrastructure: 'Tourist infrastructure',
  surroundings: 'Surroundings / visual environment',
  warnings: 'Environmental / industrial warnings',
};

export const DIMENSION_SHORT: Record<FeedbackDimension, string> = {
  overall: 'Overall',
  beach: 'Beach',
  infrastructure: 'Infra',
  surroundings: 'Surr.',
  warnings: 'Warn',
};

export const TOPIC_LABEL: Record<LocalTopic, string> = {
  'beach-conditions': 'Beach / swimming conditions',
  'beach-access': 'Access to the beach',
  'infrastructure-nearby': 'Tourist infrastructure nearby',
  'roads-built-environment': 'Roads / built environment',
  'ports-industrial': 'Ports / marinas / industrial features',
  surroundings: 'Surroundings attractiveness',
  'environmental-issues': 'Known environmental issues',
  'key-attractions': 'Key attractions',
  'distance-context': 'Distance / context',
};

export const LOCAL_TOPICS = Object.keys(TOPIC_LABEL) as LocalTopic[];

export const WARNING_CATEGORY_LABEL: Record<WarningCategory, string> = {
  environmental: 'Environmental',
  industrial: 'Industrial',
  'port-marina': 'Port / marina',
  'roads-built': 'Roads / built',
  noise: 'Noise',
  waste: 'Waste',
  other: 'Other',
};
