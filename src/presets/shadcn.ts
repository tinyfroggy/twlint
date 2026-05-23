import type { ComponentInfo } from "../config/types.js";

export const shadcnPreset: Record<string, ComponentInfo> = {
  Accordion: {
    baseClasses: "",
  },
  Alert: {
    baseClasses: "relative w-full rounded-lg border px-4 py-3 text-sm",
  },
  "Alert.Description": {
    baseClasses: "",
  },
  "Alert.Title": {
    baseClasses: "",
  },
  AlertDialog: {
    baseClasses: "",
  },
  "AlertDialog.Action": {
    baseClasses: "",
  },
  "AlertDialog.Cancel": {
    baseClasses: "",
  },
  "AlertDialog.Content": {
    baseClasses:
      "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
  },
  "AlertDialog.Description": {
    baseClasses: "text-sm text-muted-foreground",
  },
  "AlertDialog.Footer": {
    baseClasses: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
  },
  "AlertDialog.Header": {
    baseClasses: "flex flex-col space-y-1.5 text-center sm:text-left",
  },
  "AlertDialog.Overlay": {
    baseClasses:
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  },
  "AlertDialog.Title": {
    baseClasses: "text-lg font-semibold",
  },
  "AlertDialog.Trigger": {
    baseClasses: "",
  },
  AspectRatio: {
    baseClasses: "",
  },
  Avatar: {
    baseClasses: "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
  },
  "Avatar.Fallback": {
    baseClasses:
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
  },
  "Avatar.Image": {
    baseClasses: "aspect-square h-full w-full",
  },
  Badge: {
    baseClasses:
      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  },
  Breadcrumb: {
    baseClasses: "",
  },
  "Breadcrumb.Ellipsis": {
    baseClasses: "flex h-9 w-9 items-center justify-center",
  },
  "Breadcrumb.Item": {
    baseClasses: "inline-flex items-center gap-1.5",
  },
  "Breadcrumb.Link": {
    baseClasses: "transition-colors hover:text-foreground",
  },
  "Breadcrumb.List": {
    baseClasses: "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
  },
  "Breadcrumb.Page": {
    baseClasses: "font-normal text-foreground",
  },
  "Breadcrumb.Separator": {
    baseClasses: "",
  },
  Button: {
    baseClasses:
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  },
  Calendar: {
    baseClasses: "p-3",
  },
  Card: {
    baseClasses: "rounded-xl border bg-card text-card-foreground shadow",
  },
  "Card.Content": {
    baseClasses: "p-6 pt-0",
  },
  "Card.Description": {
    baseClasses: "text-sm text-muted-foreground",
  },
  "Card.Footer": {
    baseClasses: "flex items-center p-6 pt-0",
  },
  "Card.Header": {
    baseClasses: "flex flex-col space-y-1.5 p-6",
  },
  "Card.Title": {
    baseClasses: "font-semibold leading-none tracking-tight",
  },
  Carousel: {
    baseClasses: "relative",
  },
  "Carousel.Content": {
    baseClasses: "flex",
  },
  "Carousel.Item": {
    baseClasses: "min-w-0 shrink-0 grow-0 basis-full",
  },
  "Carousel.Next": {
    baseClasses:
      "absolute h-8 w-8 rounded-full",
  },
  "Carousel.Previous": {
    baseClasses:
      "absolute h-8 w-8 rounded-full",
  },
  Checkbox: {
    baseClasses:
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  },
  Collapsible: {
    baseClasses: "",
  },
  "Collapsible.Content": {
    baseClasses: "",
  },
  "Collapsible.Trigger": {
    baseClasses: "",
  },
  Command: {
    baseClasses:
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
  },
  "Command.Dialog": {
    baseClasses: "",
  },
  "Command.Empty": {
    baseClasses: "py-6 text-center text-sm",
  },
  "Command.Group": {
    baseClasses:
      "overflow-hidden p-1 text-foreground",
  },
  "Command.Input": {
    baseClasses:
      "flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  },
  "Command.Item": {
    baseClasses:
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
  },
  "Command.List": {
    baseClasses: "max-h-300 overflow-y-auto overflow-x-hidden",
  },
  "Command.Separator": {
    baseClasses: "-mx-1 h-px bg-border",
  },
  "Command.Shortcut": {
    baseClasses: "ml-auto text-xs tracking-widest text-muted-foreground",
  },
  ContextMenu: {
    baseClasses: "",
  },
  "ContextMenu.CheckboxItem": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "ContextMenu.Content": {
    baseClasses:
      "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
  },
  "ContextMenu.Group": {
    baseClasses: "",
  },
  "ContextMenu.Item": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "ContextMenu.Label": {
    baseClasses: "px-2 py-1.5 text-sm font-semibold",
  },
  "ContextMenu.RadioGroup": {
    baseClasses: "",
  },
  "ContextMenu.RadioItem": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "ContextMenu.Separator": {
    baseClasses: "-mx-1 my-1 h-px bg-border",
  },
  "ContextMenu.Shortcut": {
    baseClasses: "ml-auto text-xs tracking-widest text-muted-foreground",
  },
  "ContextMenu.Sub": {
    baseClasses: "",
  },
  "ContextMenu.SubContent": {
    baseClasses:
      "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
  },
  "ContextMenu.SubTrigger": {
    baseClasses:
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  },
  "ContextMenu.Trigger": {
    baseClasses: "",
  },
  DataTable: {
    baseClasses: "",
  },
  DatePicker: {
    baseClasses: "",
  },
  Dialog: {
    baseClasses: "",
  },
  "Dialog.Close": {
    baseClasses:
      "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
  },
  "Dialog.Content": {
    baseClasses:
      "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-48 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-48 sm:rounded-lg",
  },
  "Dialog.Description": {
    baseClasses: "text-sm text-muted-foreground",
  },
  "Dialog.Footer": {
    baseClasses:
      "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
  },
  "Dialog.Header": {
    baseClasses: "flex flex-col gap-1.5 text-center sm:text-left",
  },
  "Dialog.Overlay": {
    baseClasses:
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  },
  "Dialog.Title": {
    baseClasses: "text-lg font-semibold leading-none tracking-tight",
  },
  "Dialog.Trigger": {
    baseClasses: "",
  },
  Drawer: {
    baseClasses: "",
  },
  "Drawer.Content": {
    baseClasses: "flex flex-col rounded-t-2xl border bg-background p-6",
  },
  "Drawer.Description": {
    baseClasses: "text-sm text-muted-foreground",
  },
  "Drawer.Footer": {
    baseClasses: "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2",
  },
  "Drawer.Header": {
    baseClasses: "grid gap-1.5 text-center sm:text-left",
  },
  "Drawer.Nested": {
    baseClasses: "",
  },
  "Drawer.Overlay": {
    baseClasses: "fixed inset-0 z-50 bg-black/80",
  },
  "Drawer.Title": {
    baseClasses: "text-lg font-semibold leading-none tracking-tight",
  },
  "Drawer.Trigger": {
    baseClasses: "",
  },
  DropdownMenu: {
    baseClasses: "",
  },
  "DropdownMenu.CheckboxItem": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "DropdownMenu.Content": {
    baseClasses:
      "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
  },
  "DropdownMenu.Group": {
    baseClasses: "",
  },
  "DropdownMenu.Item": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "DropdownMenu.Label": {
    baseClasses: "px-2 py-1.5 text-sm font-semibold",
  },
  "DropdownMenu.RadioGroup": {
    baseClasses: "",
  },
  "DropdownMenu.RadioItem": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "DropdownMenu.Separator": {
    baseClasses: "-mx-1 my-1 h-px bg-border",
  },
  "DropdownMenu.Shortcut": {
    baseClasses: "ml-auto text-xs tracking-widest text-muted-foreground",
  },
  "DropdownMenu.Sub": {
    baseClasses: "",
  },
  "DropdownMenu.SubContent": {
    baseClasses:
      "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
  },
  "DropdownMenu.SubTrigger": {
    baseClasses:
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  },
  "DropdownMenu.Trigger": {
    baseClasses: "",
  },
  Form: {
    baseClasses: "",
  },
  "Form.Control": {
    baseClasses: "",
  },
  "Form.Description": {
    baseClasses: "text-sm text-muted-foreground",
  },
  "Form.Field": {
    baseClasses: "",
  },
  "Form.Item": {
    baseClasses: "space-y-2",
  },
  "Form.Label": {
    baseClasses: "",
  },
  "Form.Message": {
    baseClasses: "text-sm font-medium text-destructive",
  },
  HoverCard: {
    baseClasses: "",
  },
  "HoverCard.Content": {
    baseClasses:
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
  },
  "HoverCard.Trigger": {
    baseClasses: "",
  },
  Input: {
    baseClasses:
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  },
  "Input.Otp": {
    baseClasses: "flex items-center gap-2",
  },
  Label: {
    baseClasses:
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  },
  Menubar: {
    baseClasses: "flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-sm",
  },
  "Menubar.CheckboxItem": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "Menubar.Content": {
    baseClasses:
      "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
  },
  "Menubar.Group": {
    baseClasses: "",
  },
  "Menubar.Item": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "Menubar.Label": {
    baseClasses: "px-2 py-1.5 text-sm font-semibold",
  },
  "Menubar.Menu": {
    baseClasses: "",
  },
  "Menubar.RadioGroup": {
    baseClasses: "",
  },
  "Menubar.RadioItem": {
    baseClasses:
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "Menubar.Separator": {
    baseClasses: "-mx-1 my-1 h-px bg-border",
  },
  "Menubar.Shortcut": {
    baseClasses: "ml-auto text-xs tracking-widest text-muted-foreground",
  },
  "Menubar.Sub": {
    baseClasses: "",
  },
  "Menubar.SubContent": {
    baseClasses:
      "z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
  },
  "Menubar.SubTrigger": {
    baseClasses:
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  },
  "Menubar.Trigger": {
    baseClasses:
      "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
  },
  NavigationMenu: {
    baseClasses: "",
  },
  "NavigationMenu.Content": {
    baseClasses:
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto",
  },
  "NavigationMenu.ContentList": {
    baseClasses: "grid gap-3 p-4 md:w-400 md:grid-cols-2 lg:w-600",
  },
  "NavigationMenu.Indicator": {
    baseClasses:
      "top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
  },
  "NavigationMenu.Item": {
    baseClasses: "",
  },
  "NavigationMenu.Link": {
    baseClasses:
      "block select-none rounded-md p-3 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
  },
  "NavigationMenu.List": {
    baseClasses: "group flex flex-1 list-none items-center justify-center space-x-1",
  },
  "NavigationMenu.Sub": {
    baseClasses: "",
  },
  "NavigationMenu.Trigger": {
    baseClasses:
      "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
  },
  "NavigationMenu.Viewport": {
    baseClasses:
      "relative h-var-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-var-2",
  },
  Pagination: {
    baseClasses: "flex",
  },
  "Pagination.Content": {
    baseClasses: "flex flex-row items-center gap-1",
  },
  "Pagination.Ellipsis": {
    baseClasses: "flex h-9 w-9 items-center justify-center",
  },
  "Pagination.Item": {
    baseClasses: "",
  },
  "Pagination.Link": {
    baseClasses:
      "",
  },
  "Pagination.Next": {
    baseClasses: "",
  },
  "Pagination.Previous": {
    baseClasses: "",
  },
  Popover: {
    baseClasses: "",
  },
  "Popover.Content": {
    baseClasses:
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  },
  "Popover.Trigger": {
    baseClasses: "",
  },
  Progress: {
    baseClasses: "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
  },
  "Progress.Indicator": {
    baseClasses: "h-full w-full flex-1 bg-primary transition-all",
  },
  RadioGroup: {
    baseClasses: "grid gap-2",
  },
  "RadioGroup.Item": {
    baseClasses:
      "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  },
  Resizable: {
    baseClasses: "",
  },
  "Resizable.Handle": {
    baseClasses:
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[resize-handle-active]:ring-1 data-[resize-handle-active]:ring-ring data-[resize-handle-active]:ring-offset-1",
  },
  "Resizable.Panel": {
    baseClasses: "",
  },
  ScrollArea: {
    baseClasses: "relative overflow-hidden",
  },
  "ScrollArea.Bar": {
    baseClasses:
      "flex touch-none select-none transition-colors",
  },
  "ScrollArea.Corner": {
    baseClasses: "bg-border",
  },
  "ScrollArea.Thumb": {
    baseClasses:
      "relative flex-1 rounded-full bg-border",
  },
  Select: {
    baseClasses: "",
  },
  "Select.Content": {
    baseClasses:
      "relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  },
  "Select.Group": {
    baseClasses: "",
  },
  "Select.Item": {
    baseClasses:
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  },
  "Select.ItemIndicator": {
    baseClasses: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
  },
  "Select.ItemText": {
    baseClasses: "",
  },
  "Select.Label": {
    baseClasses: "px-2 py-1.5 text-sm font-semibold",
  },
  "Select.ScrollDownButton": {
    baseClasses: "flex cursor-default items-center justify-center py-1",
  },
  "Select.ScrollUpButton": {
    baseClasses: "flex cursor-default items-center justify-center py-1",
  },
  "Select.Separator": {
    baseClasses: "-mx-1 my-1 h-px bg-muted",
  },
  "Select.Trigger": {
    baseClasses:
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  },
  "Select.Value": {
    baseClasses: "",
  },
  Separator: {
    baseClasses: "shrink-0 bg-border",
  },
  Sheet: {
    baseClasses: "",
  },
  "Sheet.Close": {
    baseClasses:
      "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
  },
  "Sheet.Content": {
    baseClasses:
      "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  },
  "Sheet.Description": {
    baseClasses: "text-sm text-muted-foreground",
  },
  "Sheet.Footer": {
    baseClasses: "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2",
  },
  "Sheet.Header": {
    baseClasses: "flex flex-col gap-1.5 text-center sm:text-left",
  },
  "Sheet.Overlay": {
    baseClasses: "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  },
  "Sheet.Title": {
    baseClasses: "text-lg font-semibold leading-none tracking-tight",
  },
  "Sheet.Trigger": {
    baseClasses: "",
  },
  Skeleton: {
    baseClasses: "animate-pulse rounded-md bg-primary/10",
  },
  Slider: {
    baseClasses: "relative flex w-full touch-none select-none items-center",
  },
  "Slider.Range": {
    baseClasses: "absolute h-full bg-primary",
  },
  "Slider.Thumb": {
    baseClasses:
      "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  },
  "Slider.Track": {
    baseClasses: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20",
  },
  Sonner: {
    baseClasses: "",
  },
  Switch: {
    baseClasses:
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
  },
  "Switch.Thumb": {
    baseClasses:
      "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
  },
  Table: {
    baseClasses: "w-full caption-bottom text-sm",
  },
  "Table.Body": {
    baseClasses: "",
  },
  "Table.Caption": {
    baseClasses: "mt-4 text-sm text-muted-foreground",
  },
  "Table.Cell": {
    baseClasses: "p-2 align-middle",
  },
  "Table.Head": {
    baseClasses: "h-10 px-2 text-left align-middle font-medium text-muted-foreground",
  },
  "Table.Header": {
    baseClasses: "",
  },
  "Table.Row": {
    baseClasses:
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
  },
  Tabs: {
    baseClasses: "",
  },
  "Tabs.Content": {
    baseClasses:
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  },
  "Tabs.List": {
    baseClasses:
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
  },
  "Tabs.Trigger": {
    baseClasses:
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
  },
  Textarea: {
    baseClasses:
      "flex min-h-60 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  },
  Toggle: {
    baseClasses:
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  },
  "Toggle.Group": {
    baseClasses: "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
  },
  ToggleGroup: {
    baseClasses: "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
  },
  Toolbar: {
    baseClasses: "",
  },
  Tooltip: {
    baseClasses: "",
  },
  "Tooltip.Content": {
    baseClasses:
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  },
  "Tooltip.Provider": {
    baseClasses: "",
  },
  "Tooltip.Trigger": {
    baseClasses: "",
  },
};

// Flat named export aliases (e.g. DialogFooter for Dialog.Footer)
const flatAliases: Record<string, string> = {
  AlertDialogFooter: "AlertDialog.Footer",
  AlertDialogHeader: "AlertDialog.Header",
  AlertDialogTitle: "AlertDialog.Title",
  AlertDialogDescription: "AlertDialog.Description",
  AlertDialogAction: "AlertDialog.Action",
  AlertDialogCancel: "AlertDialog.Cancel",
  AlertDialogContent: "AlertDialog.Content",
  AlertDialogOverlay: "AlertDialog.Overlay",
  AlertDialogTrigger: "AlertDialog.Trigger",
  AvatarFallback: "Avatar.Fallback",
  AvatarImage: "Avatar.Image",
  Badge: "Badge",
  BreadcrumbEllipsis: "Breadcrumb.Ellipsis",
  BreadcrumbItem: "Breadcrumb.Item",
  BreadcrumbLink: "Breadcrumb.Link",
  BreadcrumbList: "Breadcrumb.List",
  BreadcrumbPage: "Breadcrumb.Page",
  BreadcrumbSeparator: "Breadcrumb.Separator",
  CardContent: "Card.Content",
  CardDescription: "Card.Description",
  CardFooter: "Card.Footer",
  CardHeader: "Card.Header",
  CardTitle: "Card.Title",
  CarouselContent: "Carousel.Content",
  CarouselItem: "Carousel.Item",
  CarouselNext: "Carousel.Next",
  CarouselPrevious: "Carousel.Previous",
  CollapsibleContent: "Collapsible.Content",
  CollapsibleTrigger: "Collapsible.Trigger",
  CommandDialog: "Command.Dialog",
  CommandEmpty: "Command.Empty",
  CommandGroup: "Command.Group",
  CommandInput: "Command.Input",
  CommandItem: "Command.Item",
  CommandList: "Command.List",
  CommandSeparator: "Command.Separator",
  CommandShortcut: "Command.Shortcut",
  ContextMenuCheckboxItem: "ContextMenu.CheckboxItem",
  ContextMenuContent: "ContextMenu.Content",
  ContextMenuGroup: "ContextMenu.Group",
  ContextMenuItem: "ContextMenu.Item",
  ContextMenuLabel: "ContextMenu.Label",
  ContextMenuRadioGroup: "ContextMenu.RadioGroup",
  ContextMenuRadioItem: "ContextMenu.RadioItem",
  ContextMenuSeparator: "ContextMenu.Separator",
  ContextMenuShortcut: "ContextMenu.Shortcut",
  ContextMenuSub: "ContextMenu.Sub",
  ContextMenuSubContent: "ContextMenu.SubContent",
  ContextMenuSubTrigger: "ContextMenu.SubTrigger",
  ContextMenuTrigger: "ContextMenu.Trigger",
  DialogClose: "Dialog.Close",
  DialogContent: "Dialog.Content",
  DialogDescription: "Dialog.Description",
  DialogFooter: "Dialog.Footer",
  DialogHeader: "Dialog.Header",
  DialogOverlay: "Dialog.Overlay",
  DialogTitle: "Dialog.Title",
  DialogTrigger: "Dialog.Trigger",
  DrawerContent: "Drawer.Content",
  DrawerDescription: "Drawer.Description",
  DrawerFooter: "Drawer.Footer",
  DrawerHeader: "Drawer.Header",
  DrawerNested: "Drawer.Nested",
  DrawerOverlay: "Drawer.Overlay",
  DrawerTitle: "Drawer.Title",
  DrawerTrigger: "Drawer.Trigger",
  DropdownMenuCheckboxItem: "DropdownMenu.CheckboxItem",
  DropdownMenuContent: "DropdownMenu.Content",
  DropdownMenuGroup: "DropdownMenu.Group",
  DropdownMenuItem: "DropdownMenu.Item",
  DropdownMenuLabel: "DropdownMenu.Label",
  DropdownMenuRadioGroup: "DropdownMenu.RadioGroup",
  DropdownMenuRadioItem: "DropdownMenu.RadioItem",
  DropdownMenuSeparator: "DropdownMenu.Separator",
  DropdownMenuShortcut: "DropdownMenu.Shortcut",
  DropdownMenuSub: "DropdownMenu.Sub",
  DropdownMenuSubContent: "DropdownMenu.SubContent",
  DropdownMenuSubTrigger: "DropdownMenu.SubTrigger",
  DropdownMenuTrigger: "DropdownMenu.Trigger",
  FormControl: "Form.Control",
  FormDescription: "Form.Description",
  FormField: "Form.Field",
  FormItem: "Form.Item",
  FormLabel: "Form.Label",
  FormMessage: "Form.Message",
  HoverCardContent: "HoverCard.Content",
  HoverCardTrigger: "HoverCard.Trigger",
  InputOtp: "Input.Otp",
  MenubarCheckboxItem: "Menubar.CheckboxItem",
  MenubarContent: "Menubar.Content",
  MenubarGroup: "Menubar.Group",
  MenubarItem: "Menubar.Item",
  MenubarLabel: "Menubar.Label",
  MenubarMenu: "Menubar.Menu",
  MenubarRadioGroup: "Menubar.RadioGroup",
  MenubarRadioItem: "Menubar.RadioItem",
  MenubarSeparator: "Menubar.Separator",
  MenubarShortcut: "Menubar.Shortcut",
  MenubarSub: "Menubar.Sub",
  MenubarSubContent: "Menubar.SubContent",
  MenubarSubTrigger: "Menubar.SubTrigger",
  MenubarTrigger: "Menubar.Trigger",
  NavigationMenuContent: "NavigationMenu.Content",
  NavigationMenuContentList: "NavigationMenu.ContentList",
  NavigationMenuIndicator: "NavigationMenu.Indicator",
  NavigationMenuItem: "NavigationMenu.Item",
  NavigationMenuLink: "NavigationMenu.Link",
  NavigationMenuList: "NavigationMenu.List",
  NavigationMenuSub: "NavigationMenu.Sub",
  NavigationMenuTrigger: "NavigationMenu.Trigger",
  NavigationMenuViewport: "NavigationMenu.Viewport",
  PaginationContent: "Pagination.Content",
  PaginationEllipsis: "Pagination.Ellipsis",
  PaginationItem: "Pagination.Item",
  PaginationLink: "Pagination.Link",
  PaginationNext: "Pagination.Next",
  PaginationPrevious: "Pagination.Previous",
  PopoverContent: "Popover.Content",
  PopoverTrigger: "Popover.Trigger",
  ProgressIndicator: "Progress.Indicator",
  RadioGroupItem: "RadioGroup.Item",
  ResizableHandle: "Resizable.Handle",
  ResizablePanel: "Resizable.Panel",
  ScrollAreaBar: "ScrollArea.Bar",
  ScrollAreaCorner: "ScrollArea.Corner",
  ScrollAreaThumb: "ScrollArea.Thumb",
  SelectContent: "Select.Content",
  SelectGroup: "Select.Group",
  SelectItem: "Select.Item",
  SelectItemIndicator: "Select.ItemIndicator",
  SelectItemText: "Select.ItemText",
  SelectLabel: "Select.Label",
  SelectScrollDownButton: "Select.ScrollDownButton",
  SelectScrollUpButton: "Select.ScrollUpButton",
  SelectSeparator: "Select.Separator",
  SelectTrigger: "Select.Trigger",
  SelectValue: "Select.Value",
  SheetClose: "Sheet.Close",
  SheetContent: "Sheet.Content",
  SheetDescription: "Sheet.Description",
  SheetFooter: "Sheet.Footer",
  SheetHeader: "Sheet.Header",
  SheetOverlay: "Sheet.Overlay",
  SheetTitle: "Sheet.Title",
  SheetTrigger: "Sheet.Trigger",
  SliderRange: "Slider.Range",
  SliderThumb: "Slider.Thumb",
  SliderTrack: "Slider.Track",
  SwitchThumb: "Switch.Thumb",
  TableBody: "Table.Body",
  TableCaption: "Table.Caption",
  TableCell: "Table.Cell",
  TableHead: "Table.Head",
  TableHeader: "Table.Header",
  TableRow: "Table.Row",
  TabsContent: "Tabs.Content",
  TabsList: "Tabs.List",
  TabsTrigger: "Tabs.Trigger",
  ToggleGroup: "Toggle.Group",
  TooltipContent: "Tooltip.Content",
  TooltipProvider: "Tooltip.Provider",
  TooltipTrigger: "Tooltip.Trigger",
};

// Resolve flat aliases at module load time
const aliased: Record<string, ComponentInfo> = {};
for (const [flat, compound] of Object.entries(flatAliases)) {
  const info = shadcnPreset[compound];
  if (info) {
    aliased[flat] = info;
  }
}

export const flatAliasPreset: Record<string, ComponentInfo> = aliased;
