const violationTypes = [
  'Toxic towards the Team',
  'Toxic towards the Opponents',
  'Toxic towards themselves',
  'Own Goal',
  'Saved Own Shot',
  'Lying about Things'
] as const;

export type ViolationType = typeof violationTypes[number];

export function getViolationTypes(): readonly ViolationType[] {
  return violationTypes;
}