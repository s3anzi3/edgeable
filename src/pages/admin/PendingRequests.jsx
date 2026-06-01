import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import {
  getPendingProfileRequests, approveProfileRequest, rejectProfileRequest,
} from '../../utils/profileRequests.js';
import {
  getPendingTransactionRequests,
} from '../../utils/transactionRequests.js';
import { formatDateTime } from '../../utils/subscription.js';
import { formatLength } from '../../utils/dateMath.js';
import AppShell, { PageHeader } from '../../components/AppShell.jsx';
import { Card, CardContent } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import ApproveTransactionRequestModal from '../../components/ApproveTransactionRequestModal.jsx';
import RejectTransactionRequestModal from '../../components/RejectTransactionRequestModal.jsx';
import ProofImage from '../../components/ProofImage.jsx';

export default function PendingRequests() {
  const { currentUser, userDoc } = useAuth();
  const [profileReqs, setProfileReqs] = useState([]);
  const [txnReqs, setTxnReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [approvingTxn, setApprovingTxn] = useState(null);
  const [rejectingTxn, setRejectingTxn] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, t] = await Promise.all([
        getPendingProfileRequests(),
        getPendingTransactionRequests(),
      ]);
      setProfileReqs(p);
      setTxnReqs(t);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const adminPayload = {
    uid: currentUser?.uid,
    email: userDoc?.telegramUsername || currentUser?.email || '',
  };

  const handleApproveProfile = async (req) => {
    if (!window.confirm(`Approve this change?\n\n${labelForField(req.field)}: ${req.currentValue || '(empty)'} → ${req.proposedValue}`)) return;
    setBusyId(req.id);
    try {
      await approveProfileRequest(req.id, adminPayload);
      await reload();
    } catch (e) { alert(`Failed: ${e.message}`); }
    finally { setBusyId(null); }
  };

  const handleRejectProfile = async (req) => {
    const reason = window.prompt('Reason for rejection (shown to subscriber):', '');
    if (reason == null) return;
    setBusyId(req.id);
    try {
      await rejectProfileRequest(req.id, reason, adminPayload);
      await reload();
    } catch (e) { alert(`Failed: ${e.message}`); }
    finally { setBusyId(null); }
  };

  const handleApproveTxn = (req) => setApprovingTxn(req);
  const handleRejectTxn = (req) => setRejectingTxn(req);

  return (
    <AppShell container="medium">
      <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <PageHeader title="Pending Requests" />

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Subscription requests ({txnReqs.length})
          </h2>

          {txnReqs.length === 0 ? (
            <Empty>No pending subscription requests.</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {txnReqs.map((req) => (
                <RequestCard key={req.id}>
                  <CardHead
                    name={req.subscriberDisplayName}
                    uid={req.subscriberUid}
                    meta={`@${req.subscriberTelegramUsername || '—'} · ${formatDateTime(req.createdAt)}`}
                    badge={req.paymentMethod}
                  />

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/50 p-3">
                    <div>
                      <DiffLabel>Length</DiffLabel>
                      <div className="text-sm font-medium">{formatLength(req.length)}</div>
                    </div>
                    <div>
                      <DiffLabel>Declared</DiffLabel>
                      <div className="text-sm font-medium">${Number(req.declaredPrice).toFixed(2)}</div>
                    </div>
                  </div>

                  {req.proofImageUrl && (
                    <div>
                      <DiffLabel>Proof</DiffLabel>
                      <div className="mt-1">
                        <ProofImage url={req.proofImageUrl} thumbClassName="max-h-40 max-w-40" />
                      </div>
                    </div>
                  )}

                  {req.paymentReference && (
                    <div className="text-sm text-foreground/80"><strong>Reference:</strong> {req.paymentReference}</div>
                  )}
                  {req.notes && (
                    <div className="text-sm text-muted-foreground"><strong>Notes:</strong> {req.notes}</div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleRejectTxn(req)} className="text-destructive hover:text-destructive">
                      Reject
                    </Button>
                    <Button onClick={() => handleApproveTxn(req)} className="bg-success text-success-foreground hover:bg-success/90">
                      Approve & process
                    </Button>
                  </div>
                </RequestCard>
              ))}
            </div>
          )}

          {approvingTxn && (
            <ApproveTransactionRequestModal
              request={approvingTxn}
              admin={adminPayload}
              onClose={() => setApprovingTxn(null)}
              onDone={reload}
            />
          )}
          {rejectingTxn && (
            <RejectTransactionRequestModal
              request={rejectingTxn}
              admin={adminPayload}
              onClose={() => setRejectingTxn(null)}
              onDone={reload}
            />
          )}

          <h2 className="mb-3 mt-8 font-display text-lg font-semibold tracking-tight">
            Profile change requests ({profileReqs.length})
          </h2>

          {profileReqs.length === 0 ? (
            <Empty>No pending profile change requests.</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {profileReqs.map((req) => (
                <RequestCard key={req.id}>
                  <CardHead
                    name={req.subscriberDisplayName}
                    uid={req.subscriberUid}
                    meta={formatDateTime(req.createdAt)}
                    badge={labelForField(req.field)}
                  />

                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary/50 p-3">
                    <div className="min-w-[120px] flex-1">
                      <DiffLabel>Current</DiffLabel>
                      <div className="text-sm text-muted-foreground line-through">{req.currentValue || '(empty)'}</div>
                    </div>
                    <div className="text-lg text-muted-foreground/50">→</div>
                    <div className="min-w-[120px] flex-1">
                      <DiffLabel>Proposed</DiffLabel>
                      <div className="text-sm font-medium text-success">{req.proposedValue}</div>
                    </div>
                  </div>

                  <div className="text-sm text-foreground/80"><strong>Reason:</strong> {req.reason}</div>
                  {req.notes && (<div className="text-sm text-muted-foreground"><strong>Notes:</strong> {req.notes}</div>)}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleRejectProfile(req)} disabled={busyId === req.id} className="text-destructive hover:text-destructive">
                      Reject
                    </Button>
                    <Button onClick={() => handleApproveProfile(req)} disabled={busyId === req.id} className="bg-success text-success-foreground hover:bg-success/90">
                      {busyId === req.id ? 'Working…' : 'Approve & apply'}
                    </Button>
                  </div>
                </RequestCard>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
      {children}
    </div>
  );
}

function RequestCard({ children }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">{children}</CardContent>
    </Card>
  );
}

function DiffLabel({ children }) {
  return <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function CardHead({ name, uid, meta, badge }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="font-semibold">
          <Link to={`/admin/subscribers/${uid}`} className="text-primary hover:underline">
            {name || 'Subscriber'}
          </Link>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
      </div>
      <Badge variant="secondary" className="capitalize">{badge}</Badge>
    </div>
  );
}

function labelForField(field) {
  switch (field) {
    case 'displayName': return 'Display name';
    case 'phone': return 'Phone';
    default: return field;
  }
}
