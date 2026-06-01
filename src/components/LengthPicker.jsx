import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';

const PRESETS = [
  { label: '1 week',         length: { years: 0, months: 0, weeks: 1 } },
  { label: '1 month',        length: { years: 0, months: 1, weeks: 0 } },
  { label: '3 months',       length: { years: 0, months: 3, weeks: 0 } },
  { label: '6 months',       length: { years: 0, months: 6, weeks: 0 } },
  { label: '1 year',         length: { years: 1, months: 0, weeks: 0 } },
  { label: '1 year + 6 mo',  length: { years: 1, months: 6, weeks: 0 } },
];

export default function LengthPicker({ value, onChange }) {
  const length = value || { years: 0, months: 0, weeks: 0 };

  const setField = (field) => (e) => {
    const n = Math.max(0, parseInt(e.target.value || '0', 10) || 0);
    onChange({ ...length, [field]: n });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.length)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['years', 'months', 'weeks'].map((field) => (
          <div key={field} className="min-w-0 space-y-1.5">
            <Label htmlFor={`len-${field}`} className="capitalize">{field}</Label>
            <Input
              id={`len-${field}`}
              type="number" min="0" step="1"
              value={length[field]} onChange={setField(field)}
              className="h-10"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
