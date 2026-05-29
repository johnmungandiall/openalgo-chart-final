export { getDeviceId } from './deviceId';
export { checkTrial, activateOrValidate } from './activationApi';
export type { TrialResult, LicenseResult } from './activationApi';
export { checkRegistration, register } from './registrationApi';
export type { RegistrationStatus, RegisterResult } from './registrationApi';
export { resolveAccess, submitKey, submitRegistration } from './accessResolver';
export type { AccessState, AccessDeps, RegisterOutcome } from './accessResolver';
