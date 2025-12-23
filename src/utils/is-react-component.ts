import { isValidElement, type ReactNode } from "react";

/**
 * Check if a value is a valid React component type (function or class component).
 * This is useful for distinguishing between a component type and a rendered element.
 */
export function isReactComponent(value: unknown): value is React.ComponentType<unknown> {
    if (typeof value === "function") {
        return true;
    }
    
    // Check for forwardRef components and other exotic component types
    if (typeof value === "object" && value !== null) {
        const obj = value as { $$typeof?: symbol };
        if (obj.$$typeof) {
            const typeofSymbol = obj.$$typeof.toString();
            return (
                typeofSymbol === "Symbol(react.forward_ref)" ||
                typeofSymbol === "Symbol(react.memo)"
            );
        }
    }
    
    return false;
}

/**
 * Check if a value is a rendered React element (JSX).
 */
export function isRenderedElement(value: unknown): value is ReactNode {
    return isValidElement(value);
}
