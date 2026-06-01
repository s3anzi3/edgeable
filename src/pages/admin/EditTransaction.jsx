import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell, { PageHeader } from '../../components/AppShell.jsx';
import TransactionForm from '../../components/TransactionForm.jsx';
import { Button } from '../../components/ui/button.jsx';
import { getTransaction, updateTransaction, deleteTransaction } from '../../utils/transactions.js';
import { formatDateTime } from '../../utils/subscription.js';

export default function EditTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await getTransaction(id);
        if (!cancelled) {
          if (!t) setError('Transaction not found.');
          setTxn(t);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (data) => {
    await updateTransaction(id, {
      length: data.length,
      price: data.price,
      notes: data.notes,
      imageFile: data.imageFile,
    });
    navigate(`/admin/subscribers/${txn.subscriberUid}`, { replace: true });
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this transaction? The subscriber\'s end date will be recomputed from their remaining transactions.')) {
      return;
    }
    setDeleting(true);
    try {
      await deleteTransaction(id);
      navigate(`/admin/subscribers/${txn.subscriberUid}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  };

  if (loading) return <Centered>Loading transaction…</Centered>;
  if (error && !txn) return <Centered><div className="text-destructive">{error}</div></Centered>;

  return (
    <AppShell container="medium">
      <Link
        to={`/admin/subscribers/${txn.subscriberUid}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {txn.subscriberDisplayName || 'subscriber'}
      </Link>
      <PageHeader
        title="Edit Transaction"
        description={`Created ${formatDateTime(txn.createdAt)} by ${txn.createdByEmail || 'admin'}`}
      />

      <TransactionForm
        initial={{
          subscriberUid: txn.subscriberUid,
          length: txn.length,
          price: txn.price,
          notes: txn.notes,
          proofImageUrl: txn.proofImageUrl,
        }}
        lockSubscriber
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />

      <div className="mt-10 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="font-display font-semibold text-destructive">Danger zone</h3>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Deleting this transaction will recompute the subscriber's end date from their remaining transactions.
        </p>
        <Button variant="outline" onClick={handleDelete} disabled={deleting} className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
          {deleting ? 'Deleting…' : 'Delete transaction'}
        </Button>
      </div>
    </AppShell>
  );
}

function Centered({ children }) {
  return <div className="py-16 text-center text-muted-foreground">{children}</div>;
}
