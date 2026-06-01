import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, BookOpen, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import AppShell, { PageHeader } from '../components/AppShell.jsx';
import SubscriptionCard from '../components/SubscriptionCard.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import MyRequestsList from '../components/MyRequestsList.jsx';
import AccountHistory from '../components/AccountHistory.jsx';
import PerformanceCard from '../components/PerformanceCard.jsx';
import RequestProfileUpdateModal from '../components/RequestProfileUpdateModal.jsx';
import RequestRenewalModal from '../components/RequestRenewalModal.jsx';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';
import { Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';

export default function Dashboard() {
  const { currentUser, userDoc } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);

  const handleSubmitted = () => {
    setRequestsRefreshKey((k) => k + 1);
  };

  return (
    <AppShell onChangePassword={() => setShowPasswordModal(true)} container="narrow">
      <PageHeader
        title="My Subscription"
        description={userDoc?.telegramUsername ? `Signed in as @${userDoc.telegramUsername}` : undefined}
      />

      <div className="flex flex-col gap-4">
        <SubscriptionCard userDoc={userDoc} />

        <Link
          to="/guide"
          className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 card-glow transition-colors hover:bg-secondary/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold tracking-tight">How to tail my picks</div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              New here? Read the guide on reading the card, units, and bankroll strategy.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        {currentUser && <PerformanceCard uid={currentUser.uid} userDoc={userDoc} />}

        <Card className="overflow-hidden">
          <div className="h-1 w-full bg-primary" aria-hidden />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold tracking-tight">
                Submit a subscription request
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Send your payment, then upload a screenshot as proof.
              </p>
            </div>
            <Button onClick={() => setShowRenewalModal(true)}>
              <Send className="h-4 w-4" />
              New request
            </Button>
          </div>
        </Card>

        <ProfileCard userDoc={userDoc} onRequestUpdate={() => setShowProfileModal(true)} />
        {currentUser && (
          <MyRequestsList uid={currentUser.uid} refreshKey={requestsRefreshKey} />
        )}
        {currentUser && (
          <AccountHistory uid={currentUser.uid} refreshKey={requestsRefreshKey} />
        )}
      </div>

      {showProfileModal && currentUser && (
        <RequestProfileUpdateModal
          uid={currentUser.uid}
          userDoc={userDoc}
          onClose={() => setShowProfileModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}

      {showRenewalModal && currentUser && (
        <RequestRenewalModal
          uid={currentUser.uid}
          userDoc={userDoc}
          onClose={() => setShowRenewalModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </AppShell>
  );
}
