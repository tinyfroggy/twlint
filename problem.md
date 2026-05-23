## The problem

The warning is technically correct for raw Tailwind:

```tsx
<div className="flex-row" />
```

`flex-row` only sets:

```css
flex-direction: row;
```

It does **not** set:

```css
display: flex;
```

So this needs `flex` or `inline-flex`:

```tsx
<div className="flex flex-row" />
```

But your real code is different:

```tsx
<DialogFooter className="flex-row gap-2 ..." />
```

`DialogFooter` is not a plain `div`. Internally it already has:

```tsx
"flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end ..."
```

So the real rendered element has both:

```txt
flex
flex-col-reverse
sm:flex-row
flex-row
gap-2
```

That means `flex-row` **does have an effect**, because `flex` exists inside the component.

So the linter warning is a **false positive**.

The linter only saw this:

```tsx
className="flex-row gap-2 ..."
```

But it did not understand this hidden component context:

```tsx
DialogFooter => always renders a div with "flex ..."
```

## The deeper issue

Tailwind linting is easy for native elements:

```tsx
<div className="flex-row" />
```

This is clearly wrong.

But it becomes hard with component abstractions:

```tsx
<DialogFooter className="flex-row" />
<Button className="items-center" />
<CardFooter className="justify-between" />
```

The linter cannot safely know whether these components already include `flex`, `grid`, `relative`, `group`, `peer`, etc.

So a simple rule like this is too naive:

```txt
If className contains flex-row but does not contain flex, warn.
```

Because it ignores base classes added by the component.

## Important detail in your exact case

Your `DialogFooter` has:

```tsx
"flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end ..."
```

Then user classes are appended last:

```tsx
className
```

So this:

```tsx
<DialogFooter className="flex-row gap-2 ..." />
```

does not only add `flex-row`.

It also overrides the mobile direction.

Before:

```txt
mobile: flex-col-reverse
sm+:   flex-row
```

After:

```txt
mobile: flex-row
sm+:   flex-row
```

So the warning should not be:

```txt
flex-row requires flex
```

A better warning would be:

```txt
DialogFooter already provides flex and sm:flex-row.
This flex-row is valid, but it overrides the default mobile flex-col-reverse behavior.
```

## The solution

Your linter needs to become **component-aware**.

Instead of checking only the visible `className`, calculate the effective classes.

For native elements:

```tsx
<div className="flex-row" />
```

Effective classes:

```txt
flex-row
```

Result:

```txt
Warning: flex-row requires flex or inline-flex.
```

For known components:

```tsx
<DialogFooter className="flex-row" />
```

Known base classes:

```txt
flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end
```

Effective classes:

```txt
flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end flex-row
```

Result:

```txt
No warning.
```

## Practical architecture

Create a component class registry:

```ts
const componentClassMap = {
  DialogFooter: {
    classNameProp: "className",
    baseClasses:
      "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
  },

  Button: {
    classNameProp: "className",
    baseClasses:
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
  },
};
```

Then your lint rule should do this:

```ts
function getEffectiveClasses(node) {
  const userClasses = getClassNameValue(node);

  if (isNativeElement(node.name)) {
    return userClasses;
  }

  const componentInfo = componentClassMap[node.name];

  if (!componentInfo) {
    return {
      classes: userClasses,
      confidence: "low",
    };
  }

  return {
    classes: `${componentInfo.baseClasses} ${userClasses}`,
    confidence: "high",
  };
}
```

Then validate against the effective classes:

```ts
function checkFlexDirection(classes) {
  const hasFlexDirection =
    classes.includes("flex-row") ||
    classes.includes("flex-row-reverse") ||
    classes.includes("flex-col") ||
    classes.includes("flex-col-reverse");

  const hasFlexDisplay =
    classes.includes("flex") || classes.includes("inline-flex");

  if (hasFlexDirection && !hasFlexDisplay) {
    return "flex-direction utility requires flex or inline-flex";
  }

  return null;
}
```

## Confidence levels

This is very important.

Do not treat every warning equally.

### High confidence

Native HTML element:

```tsx
<div className="flex-row" />
```

Warn normally.

### High confidence no-warning

Known component with known base classes:

```tsx
<DialogFooter className="flex-row" />
```

No warning because base class has `flex`.

### Low confidence

Unknown component:

```tsx
<Something className="flex-row" />
```

Do not show a hard warning.

Show one of these instead:

```txt
Low confidence: flex-row may require flex or inline-flex unless Something provides it internally.
```

Or suppress it by default unless the user enables strict mode.

## Handle `cn(...)`

Most real components use this pattern:

```tsx
className={cn(
  "flex flex-col-reverse gap-2",
  variant === "default" && "border-t bg-muted/72 py-4",
  variant === "bare" && "pt-4 pb-6",
  className,
)}
```

Your linter should extract:

```txt
base always:
flex flex-col-reverse gap-2

variant conditional:
border-t bg-muted/72 py-4
pt-4 pb-6

user override:
className
```

For dependency rules like `flex-row requires flex`, only the **always-present base classes** matter most.

So if `flex` is always present, no warning.

If `flex` is only conditional, then warning should be conditional/low confidence.

Example:

```tsx
cn(
  variant === "flex" && "flex",
  className,
)
```

Then:

```tsx
<MyComponent variant="bare" className="flex-row" />
```

might be wrong.

## Recommended rule behavior

For this rule:

```txt
flex-row requires flex or inline-flex
```

Use this logic:

```txt
1. Does the effective class list contain flex-row/flex-col/etc?
2. Does the same responsive scope contain flex or inline-flex?
3. If yes, no warning.
4. If no, check known component base classes.
5. If base classes provide flex, no warning.
6. If unknown component, emit low-confidence warning or skip.
7. If native element and no flex, emit high-confidence warning.
```

## Responsive scopes matter

This is also important.

These are not the same:

```tsx
<div className="flex sm:flex-row" />
```

Valid:

```txt
base: flex
sm: flex-row
```

Because `flex` applies at all breakpoints unless overridden.

But this is suspicious:

```tsx
<div className="sm:flex sm:flex-row flex-col" />
```

At base size:

```txt
flex-col without flex
```

At `sm`:

```txt
flex + flex-row
```

So your linter needs to understand variants:

```txt
base
sm
md
lg
hover
group-hover
dark
```

At minimum, split classes by responsive prefix:

```txt
flex-col       => base
sm:flex-row   => sm
md:flex-col   => md
```

## Final recommendation for twlinter

Implement three things:

```txt
1. Utility dependency rules
   Example: flex-row requires flex/inline-flex.

2. Component-aware class resolution
   Example: DialogFooter provides flex internally.

3. Confidence-based diagnostics
   Example:
   - native element = high confidence
   - known component = high confidence
   - unknown component = low confidence or ignored
```

For your exact case, the correct output should be:

```txt
No error: DialogFooter already provides `flex`.

Suggestion:
`flex-row` overrides DialogFooter's default mobile `flex-col-reverse`.
Remove it unless you intentionally want row layout on mobile.
```
