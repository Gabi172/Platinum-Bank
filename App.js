import React, { useMemo, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import Navbar from './components/Navbar';
import TopNav from './components/TopNav';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import Home from './pages/Home';
import Personal from './pages/Personal';
import Business from './pages/Business';
import Profile from './pages/Profile';


// Initial balance: 1500000 fils = 1,500 IQD
const INITIAL_BALANCE_CENTS = 1_500_000;

const appStyles = {
  appShell: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    backgroundColor: '#F9FAFB',
    minHeight: '100vh',
  },
};

function PrivateRoute({ isAuthenticated, children }) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function AppShell({ isAuthenticated, user, onLogout, children }) {
  if (!isAuthenticated) {
    // For the login page, we don't render Navbar or shell layout
    return children;
  }

  return (
    <div style={appStyles.appShell}>
      <Navbar userName={user?.name ?? 'Platinum User'} onLogout={onLogout} />
      <TopNav />
      {children}
    </div>
  );
}

function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [balanceCents, setBalanceCents] = useState(INITIAL_BALANCE_CENTS);
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [transactions, setTransactions] = useState(() => {
    // Mock initial transactions – all amounts in cents
    return [
      {
        id: 'tx-1',
        type: 'credit',
        amountCents: 50_000,
        counterparty: 'Payroll Deposit',
        date: '2026-02-01',
      },
      {
        id: 'tx-2',
        type: 'debit',
        amountCents: -10_000,
        counterparty: 'Rent Payment',
        date: '2026-02-03',
      },
      {
        id: 'tx-3',
        type: 'debit',
        amountCents: -2_500,
        counterparty: 'Utility Bill',
        date: '2026-02-04',
      },
    ];
  });

  const handleLogin = (userFromLogin) => {
    setUser(userFromLogin);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setBalanceCents(INITIAL_BALANCE_CENTS);
    setTransactions([]);
    setAccounts([]);
    setActiveAccountId(null);
  };

  const handleUpdateUser = (updatedUserInfo) => {
    setUser((prev) => ({ ...prev, ...updatedUserInfo }));
  };

  const handleAddAccount = (accountData) => {
    const newAccount = {
      id: `acc-${Date.now()}`,
      type: accountData.type,
      name: accountData.name || 'Unnamed',
      balance: INITIAL_BALANCE_CENTS,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    // Set as active if it's the first account
    if (activeAccountId === null) {
      setActiveAccountId(newAccount.id);
    }
  };

  const handleSwitchAccount = (accountId) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      setActiveAccountId(accountId);
      // Update balance to match this account
      setBalanceCents(account.balance);
    }
  };

  const handleUpdateAccount = (updatedAccount) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === updatedAccount.id
          ? { ...acc, name: updatedAccount.name, type: updatedAccount.type }
          : acc
      )
    );
  };

  const handleDeleteAccount = (accountId) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
    // If deleted account was active, switch to first remaining account
    if (activeAccountId === accountId) {
      const remainingAccounts = accounts.filter((acc) => acc.id !== accountId);
      if (remainingAccounts.length > 0) {
        setActiveAccountId(remainingAccounts[0].id);
        setBalanceCents(remainingAccounts[0].balance);
      } else {
        setActiveAccountId(null);
        setBalanceCents(INITIAL_BALANCE_CENTS);
      }
    }
  };

  const handleTransfer = ({ recipientId, amountCents, idempotencyKey }) => {
    // Deduct from active (FROM) account and add to recipient (TO) account
    if (activeAccountId) {
      setAccounts((prev) =>
        prev.map((acc) => {
          // Deduct from sending account
          if (acc.id === activeAccountId) {
            return { ...acc, balance: acc.balance - amountCents };
          }
          // Add to receiving account (if recipient is an account in our system)
          if (acc.id === recipientId) {
            return { ...acc, balance: acc.balance + amountCents };
          }
          return acc;
        })
      );
      // Also update the main balance for display
      setBalanceCents((prev) => prev - amountCents);
    }

    setTransactions((prev) => [
      {
        id: idempotencyKey,
        type: 'debit',
        amountCents: -amountCents,
        counterparty: `Transfer to ${recipientId}`,
        date: new Date().toISOString().slice(0, 10),
        accountId: activeAccountId,
      },
      ...prev,
    ]);
  };

  const shellProps = useMemo(
    () => ({
      isAuthenticated,
      user,
      onLogout: handleLogout,
    }),
    [isAuthenticated, user]
  );

  return (
    <AppShell {...shellProps}>
      <Routes>
        <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
        <Route path="/personal" element={<Personal isAuthenticated={isAuthenticated} />} />
        <Route path="/business" element={<Business isAuthenticated={isAuthenticated} />} />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <SignUp onSignUp={handleLogin} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Dashboard balanceCents={balanceCents} transactions={transactions} accounts={accounts} activeAccountId={activeAccountId} />
            </PrivateRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Transfer balanceCents={balanceCents} onTransfer={handleTransfer} accounts={accounts} activeAccountId={activeAccountId} />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <Profile
                user={user}
                accounts={accounts}
                activeAccountId={activeAccountId}
                onUpdateUser={handleUpdateUser}
                onAddAccount={handleAddAccount}
                onSwitchAccount={handleSwitchAccount}
                onUpdateAccount={handleUpdateAccount}
                onDeleteAccount={handleDeleteAccount}
              />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}