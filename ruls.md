# Tailwind CSS Anti-Patterns & Lint Rules Research

This document collects common Tailwind CSS anti-patterns and possible lint rules for a custom linter project such as `twlinter`.

The goal is not only style consistency, but also:

* reducing redundant utilities
* preventing conflicts
* improving maintainability
* enforcing design systems
* improving accessibility
* improving RTL/logical property support
* reducing arbitrary value abuse

Inspired partially by:

* [Tailwind CSS Docs](https://tailwindcss.com/docs?utm_source=chatgpt.com)
* [eslint-plugin-tailwindcss](https://github.com/francoismassart/eslint-plugin-tailwindcss?utm_source=chatgpt.com)
* [prettier-plugin-tailwindcss](https://tailwindcss.com/blog/automatic-class-sorting-with-prettier?utm_source=chatgpt.com)

---

# 1. Shorthand Opportunities

## Rule: `prefer-shorthand`

Detect utilities that can be replaced by shorter equivalents.

## Examples

### Bad

```html
w-4 h-4
```

### Good

```html
size-4
```

---

### Bad

```html
pt-4 pb-4
```

### Good

```html
py-4
```

---

### Bad

```html
pl-4 pr-4
```

### Good

```html
px-4
```

---

### Bad

```html
mt-4 mb-4 ml-4 mr-4
```

### Good

```html
m-4
```

---

### Bad

```html
top-0 right-0 bottom-0 left-0
```

### Good

```html
inset-0
```

---

### Bad

```html
border-l border-r
```

### Good

```html
border-x
```

---

### Bad

```html
gap-x-4 gap-y-4
```

### Good

```html
gap-4
```

---

# 2. Conflicting Utilities

## Rule: `no-conflicting-utilities`

Detect multiple utilities affecting the same CSS property.

## Examples

### Bad

```html
p-4 p-6
```

---

### Bad

```html
flex grid
```

---

### Bad

```html
block inline hidden
```

---

### Bad

```html
text-sm text-lg
```

---

### Bad

```html
font-bold font-medium
```

---

### Bad

```html
justify-center justify-between
```

---

### Important

Responsive/state variants should NOT trigger conflicts:

```html
p-4 md:p-6
```

```html
bg-white dark:bg-black
```

```html
text-sm hover:text-lg
```

---

# 3. Duplicate Utilities

## Rule: `no-duplicate-utilities`

Detect repeated identical utilities.

## Bad

```html
p-4 p-4
```

---

```html
hover:bg-red-500 hover:bg-red-500
```

---

# 4. Class Ordering

## Rule: `canonical-class-order`

Enforce deterministic utility ordering.

## Bad

```html
md:p-4 p-2 lg:p-8
```

## Good

```html
p-2 md:p-4 lg:p-8
```

---

# 5. Arbitrary Value Abuse

## Rule: `prefer-theme-scale`

Prefer Tailwind design tokens/scales over arbitrary values.

## Bad

```html
mt-[16px]
```

## Good

```html
mt-4
```

---

## Bad

```html
text-[14px]
```

## Good

```html
text-sm
```

---

## Bad

```html
w-[24px] h-[24px]
```

## Good

```html
size-6
```

---

# 6. Negative Arbitrary Value Consistency

## Rule: `consistent-negative-arbitrary-values`

Enforce consistent syntax for negative arbitrary values.

## Avoid mixing

```html
-top-[5px]
```

and

```html
top-[-5px]
```

---

# 7. Logical Properties (RTL-Friendly)

## Rule: `prefer-logical-properties`

Encourage logical properties over physical left/right utilities.

## Bad

```html
pl-4 pr-2
```

## Good

```html
ps-4 pe-2
```

---

## Bad

```html
ml-4
```

## Good

```html
ms-4
```

---

# 8. Orphan Layout Utilities

## Rule: `no-orphan-layout-utilities`

Detect utilities that require flex/grid but are missing them.

## Bad

```html
<div class="items-center justify-center">
```

Missing:

```html
flex
```

or

```html
grid
```

---

## Bad

```html
<div class="gap-4">
```

without `flex` or `grid`.

---

# 9. Flex-Only Utilities Without Flex

## Rule: `require-flex-for-flex-utilities`

## Bad

```html
<div class="flex-col">
```

without:

```html
flex
```

---

## Bad

```html
<div class="flex-wrap">
```

without:

```html
flex
```

---

# 10. Grid-Only Utilities Without Grid

## Rule: `require-grid-for-grid-utilities`

## Bad

```html
<div class="grid-cols-3">
```

without:

```html
grid
```

---

# 11. Ineffective z-index

## Rule: `warn-ineffective-z-index`

Detect suspicious z-index usage without positioning or stacking context.

## Suspicious

```html
z-50
```

without:

```html
relative
absolute
fixed
sticky
```

---

# 12. Truncate Redundancy

## Rule: `prefer-truncate-shorthand`

## Bad

```html
overflow-hidden text-ellipsis whitespace-nowrap truncate
```

## Good

```html
truncate
```

---

# 13. sr-only Conflicts

## Rule: `no-sr-only-display-conflict`

## Bad

```html
sr-only block
```

---

```html
sr-only flex
```

---

# 14. Width/Height on Inline Elements

## Rule: `require-display-for-sizing`

## Bad

```html
<span class="w-4 h-4">
```

## Good

```html
<span class="inline-block size-4">
```

---

# 15. Hover on Disabled Elements

## Rule: `warn-hover-on-disabled`

## Suspicious

```html
<button disabled class="hover:bg-blue-600">
```

Possible improvement:

```html
disabled:opacity-50
disabled:pointer-events-none
```

---

# 16. Missing Focus Visible Styles

## Rule: `require-focus-visible-for-interactive`

## Bad

```html
<button class="hover:bg-blue-600">
```

## Better

```html
<button class="hover:bg-blue-600 focus-visible:ring-2">
```

---

# 17. Incomplete Dark Mode Pairing

## Rule: `warn-incomplete-dark-color-pair`

Detect incomplete dark mode color combinations.

## Suspicious

```html
text-gray-900 dark:bg-black
```

Missing:

```html
dark:text-*
```

---

# 18. Arbitrary Color Abuse

## Rule: `prefer-design-tokens`

## Bad

```html
bg-[#121212]
text-[#f8f8f8]
border-[#333333]
```

## Better

```html
bg-background
text-foreground
border-border
```

---

# 19. Magic Numbers

## Rule: `no-magic-spacing`

## Suspicious

```html
mt-[37px]
```

Allow exceptions:

* `calc()`
* `var()`
* `env()`

---

# 20. Template Literal Conflicts

## Rule: `detect-conflicts-in-template-literals`

## Example

```tsx
className={`p-4 ${active ? "bg-blue-500" : "bg-gray-500"} p-6`}
```

Should detect:

* `p-4`
* `p-6`

---

# 21. Important Abuse

## Rule: `no-important-abuse`

## Suspicious

```html
!p-4 !text-red-500
```

Warn when overused.

---

# 22. Excessively Long Class Lists

## Rule: `max-classname-length`

## Example

```tsx
className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-900 md:p-6 lg:p-8"
```

Possible suggestion:

* extract reusable component
* use variants
* use custom utility

---

# 23. Repeated Utility Groups

## Rule: `suggest-reusable-patterns`

Detect repeated class combinations across files.

## Example

Repeated dozens of times:

```html
flex items-center justify-center
```

Suggest:

```css
@utility flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

# 24. Missing motion-reduce Support

## Rule: `require-motion-reduce-for-animation`

## Example

```html
animate-spin
```

Better:

```html
animate-spin motion-reduce:animate-none
```

---

# 25. Potential Future Advanced Rules

## Semantic/AI-Powered Rules

Possible future ideas for `twlinter`:

* detect visually identical class combinations
* detect layout smells
* suggest reusable components
* detect inaccessible color combinations
* suggest container extraction
* detect inconsistent spacing systems
* suggest migration to design tokens
* detect dead responsive variants
* detect redundant state variants

---

# High Priority Rules for MVP

Recommended first rules for `twlinter`:

```txt
no-conflicting-utilities
prefer-shorthand
no-duplicate-utilities
canonical-class-order
prefer-theme-scale
require-flex-for-flex-utilities
require-grid-for-grid-utilities
prefer-logical-properties
prefer-truncate-shorthand
max-classname-length
```

These provide the highest practical value with relatively low implementation complexity.
