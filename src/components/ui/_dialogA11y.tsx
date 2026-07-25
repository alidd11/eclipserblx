import * as React from "react";

/**
 * Recursively walk a React children tree looking for any element whose `type`
 * matches one of the provided component types. Used to detect whether a
 * consumer has already rendered a Radix Title/Description inside a
 * *Content wrapper so we can decide whether to auto-inject a fallback.
 *
 * Note: This can only see elements that appear literally in the passed
 * `children` prop tree. It does not render child components, so a caller
 * that puts its Title/Description inside a nested component's own JSX will
 * still get a fallback injected — that is safe (Radix accepts multiple
 * Title registrations and the sr-only fallback is harmless).
 */
export function containsComponent(
  children: React.ReactNode,
  types: readonly React.ElementType[],
): boolean {
  let found = false;
  React.Children.forEach(children, (child) => {
    if (found || !React.isValidElement(child)) return;
    if (types.includes(child.type as React.ElementType)) {
      found = true;
      return;
    }
    const nested = (child.props as { children?: React.ReactNode })?.children;
    if (nested && containsComponent(nested, types)) {
      found = true;
    }
  });
  return found;
}
