// @ts-nocheck
// Stand-in for the shadcn/Radix Select: a native <select> built from the same SelectItem children.
import * as React from "react";
function collect(children, out) {
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c)) return;
    if (c.type === SelectItem) out.items.push(c.props);
    else if (c.type === SelectTrigger) { out.trigger = c.props; collect(c.props.children, out); }
    else if (c.type === SelectValue) out.placeholder = c.props.placeholder;
    else collect(c.props.children, out);
  });
  return out;
}
export function Select({ value, defaultValue, onValueChange, children, required, name, disabled }) {
  const info = collect(children, { items: [], trigger: {}, placeholder: "" });
  const { children: _c, className, ...aria } = info.trigger;
  return <select className={className} {...aria} value={value ?? undefined} defaultValue={value === undefined ? (defaultValue ?? "") : undefined} required={required} name={name} disabled={disabled} onChange={(e) => onValueChange?.(e.target.value)} style={{ appearance: "auto" }}>
    <option value="" disabled>{info.placeholder}</option>
    {info.items.map((it) => <option key={it.value} value={it.value} disabled={it.disabled}>{it.children}</option>)}
  </select>;
}
export function SelectTrigger(p) { return null; }
export function SelectValue(p) { return null; }
export function SelectContent(p) { return null; }
export function SelectItem(p) { return null; }
export function SelectGroup(p) { return <>{p.children}</>; }
export function SelectLabel(p) { return null; }
export function SelectSeparator() { return null; }
