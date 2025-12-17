/**
 * Deep equality comparison for flat objects with primitive or array values
 *
 * Compares two objects checking:
 * - Same keys exist in both
 * - Primitive values are strictly equal
 * - Arrays have same length and elements (order-sensitive)
 *
 * Note: Does not handle nested objects, functions, or other complex types.
 * Designed for simple state objects like BrowseParams.
 *
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns True if objects are deeply equal
 */
export function deepEqual<T extends object>(obj1: T, obj2: T): boolean {
  const keys1 = Object.keys(obj1) as (keyof T)[];
  const keys2 = Object.keys(obj2) as (keyof T)[];

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (
        val1.length !== val2.length ||
        !val1.every((item, index) => item === val2[index])
      ) {
        return false;
      }
    } else if (val1 !== val2) {
      return false;
    }
  }

  return true;
}
