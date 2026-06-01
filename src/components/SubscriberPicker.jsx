import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import { Input } from './ui/input.jsx';
import { Button } from './ui/button.jsx';

export default function SubscriberPicker({ value, onChange, disabled }) {
  const [subscribers, setSubscribers] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'user'));
        const snap = await getDocs(q);
        if (!cancelled) {
          setSubscribers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(
    () => subscribers.find((s) => s.id === value),
    [subscribers, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => {
      return (
        (s.displayName || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    });
  }, [subscribers, search]);

  const handlePick = (s) => {
    onChange(s.id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">{selected.displayName || 'Unnamed'}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{selected.email}</div>
          </div>
          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
              Change
            </Button>
          )}
        </div>
      ) : (
        <>
          <Input
            type="text"
            placeholder={loading ? 'Loading subscribers…' : 'Search by name or email'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            disabled={disabled || loading}
          />
          {open && filtered.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
              {filtered.slice(0, 50).map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className="block w-full border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-secondary"
                  onClick={() => handlePick(s)}
                >
                  <div className="text-sm font-medium">{s.displayName || 'Unnamed'}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.email}</div>
                </button>
              ))}
            </div>
          )}
          {open && search && filtered.length === 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-lg">
              No subscribers match "{search}".
            </div>
          )}
        </>
      )}
    </div>
  );
}
