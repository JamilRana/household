/**
 * Unified Action Result type for standardize server action return contracts.
 */
export type ActionResult<T = void> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError(error: string): ActionResult<never> {
  return { success: false, error };
}
