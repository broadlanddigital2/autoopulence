// @ts-nocheck
// Stand-in for the react-day-picker Calendar: a simple month grid with the same props the site uses.
import * as React from "react";
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export function Calendar({ month, onMonthChange, selected, onSelect, disabled, defaultMonth }) {
  const [inner, setInner] = React.useState(() => month || defaultMonth || selected || new Date());
  const m = month || inner;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const go = (d) => { const n = new Date(m.getFullYear(), m.getMonth() + d, 1); setInner(n); onMonthChange?.(n); };
  const isDis = (d) => typeof disabled === "function" ? disabled(d) : Array.isArray(disabled) ? false : !!disabled;
  const same = (a, b) => a && b && a.toDateString() === b.toDateString();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<span key={"e" + i} />);
  for (let d = 1; d <= count; d++) {
    const date = new Date(m.getFullYear(), m.getMonth(), d);
    const dis = isDis(date);
    cells.push(<button type="button" key={d} disabled={dis} onClick={() => onSelect?.(date)} className="ao-cal-day" data-selected={same(date, selected) || undefined}>{d}</button>);
  }
  return <div className="ao-cal">
    <div className="ao-cal-head"><button type="button" onClick={() => go(-1)} aria-label="Previous month">‹</button><strong>{m.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => go(1)} aria-label="Next month">›</button></div>
    <div className="ao-cal-grid">{DAYS.map((d) => <small key={d}>{d}</small>)}{cells}</div>
  </div>;
}
export default Calendar;
