import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import AppShell, { PageHeader } from '../../components/AppShell.jsx';
import TransactionForm from '../../components/TransactionForm.jsx';
import { createTransaction } from '../../utils/transactions.js';

export default function NewTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const presetSubscriber = searchParams.get('subscriber') || null;

  const handleSubmit = async (data) => {
    await createTransaction({
      ...data,
      admin: { uid: currentUser.uid, email: currentUser.email },
    });
    if (presetSubscriber) {
      navigate(`/admin/subscribers/${presetSubscriber}`, { replace: true });
    } else {
      navigate('/admin/transactions', { replace: true });
    }
  };

  return (
    <AppShell container="medium">
      <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      <PageHeader title="New Transaction" />
      <TransactionForm
        initial={presetSubscriber ? { subscriberUid: presetSubscriber } : null}
        lockSubscriber={!!presetSubscriber}
        submitLabel="Record transaction"
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </AppShell>
  );
}
