import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  CreditCard,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001';

const confidenceByFailureCode = {
  NETWORK_DROP: 92,
  BANK_TIMEOUT: 87,
  INSUFFICIENT_FUNDS: 78,
  EXPIRED_CARD: 74,
};

const statusOptions = ['ALL', 'FAILED', 'PENDING_RETRY', 'RECOVERED', 'TERMINATED'];

const sortOptions = [
  { key: 'created_at', label: 'Created Time' },
  { key: 'amount', label: 'Amount' },
  { key: 'id', label: 'Transaction ID' },
  { key: 'failure_code', label: 'Failure Code' },
  { key: 'status', label: 'Status' },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel = (status) => {
  if (status === 'PENDING_RETRY') return 'Pending Retry';
  return status ?? 'Unknown';
};

const failureCodeClass = (code) => {
  if (code === 'EXPIRED_CARD') return 'fc-expired';
  if (code === 'INSUFFICIENT_FUNDS') return 'fc-insufficient';
  if (code === 'BANK_TIMEOUT') return 'fc-timeout';
  if (code === 'NETWORK_DROP') return 'fc-network';
  return '';
};

const statusClass = (status) => {
  if (status === 'FAILED') return 'st-failed';
  if (status === 'PENDING_RETRY') return 'st-pending';
  if (status === 'RECOVERED') return 'st-recovered';
  if (status === 'TERMINATED') return 'st-terminated';
  return 'st-unknown';
};

const getApiErrorMessage = (error, fallbackMessage) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) return String(error.response.data.detail);
    if (typeof error.response?.data === 'string') return error.response.data;
    if (error.message) return error.message;
  }
  return fallbackMessage;
};

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedTxnId, setSelectedTxnId] = useState('');
  const [aiDecision, setAiDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [apiStatus, setApiStatus] = useState('Checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(7);
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState(15);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [auditScope, setAuditScope] = useState('ALL');

  const fetchDashboardData = async () => {
    try {
      const [txnRes, logsRes] = await Promise.all([
        axios.get(`${API_BASE}/transactions`),
        axios.get(`${API_BASE}/audit-logs`),
      ]);
      setTransactions(txnRes.data);
      setAuditLogs(logsRes.data);
      setApiStatus('Online');
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error('Error connecting to backend:', err);
      setApiStatus('Offline');
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchDashboardData();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (autoRefreshSeconds <= 0) return undefined;
    const intervalId = setInterval(() => {
      void fetchDashboardData();
    }, autoRefreshSeconds * 1000);
    return () => clearInterval(intervalId);
  }, [autoRefreshSeconds]);

  const activeSelectedTxnId =
    transactions.length === 0
      ? ''
      : transactions.some((t) => t.id === selectedTxnId)
        ? selectedTxnId
        : transactions[0].id;

  const selectedTransaction = useMemo(
    () => transactions.find((t) => t.id === activeSelectedTxnId) ?? null,
    [transactions, activeSelectedTxnId],
  );

  const latestSelectedLog = useMemo(() => {
    if (!activeSelectedTxnId) return null;
    const selectedLogs = auditLogs
      .filter((log) => log.transaction_id === activeSelectedTxnId)
      .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at));
    return selectedLogs[0] ?? null;
  }, [activeSelectedTxnId, auditLogs]);

  const effectiveDecision = aiDecision
    ? {
        action: aiDecision.action,
        delay_hours: aiDecision.delay_hours,
        reasoning: aiDecision.reasoning,
      }
    : latestSelectedLog
      ? {
          action: latestSelectedLog.agent_action,
          delay_hours: selectedTransaction?.status === 'PENDING_RETRY' ? 0 : null,
          reasoning: latestSelectedLog.reasoning,
        }
      : null;

  const confidence = Math.max(
    60,
    Math.min(99, confidenceByFailureCode[selectedTransaction?.failure_code] ?? 70),
  );

  const amountAtRisk = useMemo(
    () =>
      transactions
        .filter((t) => t.status === 'FAILED' || t.status === 'PENDING_RETRY')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [transactions],
  );

  const failedCount = useMemo(
    () => transactions.filter((t) => t.status === 'FAILED').length,
    [transactions],
  );

  const pendingRetryCount = useMemo(
    () => transactions.filter((t) => t.status === 'PENDING_RETRY').length,
    [transactions],
  );

  const recoveredCount = useMemo(
    () => transactions.filter((t) => t.status === 'RECOVERED').length,
    [transactions],
  );

  const filteredSortedTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = transactions.filter((transaction) => {
      const matchesSearch =
        query.length === 0 ||
        transaction.id.toLowerCase().includes(query) ||
        transaction.failure_code.toLowerCase().includes(query) ||
        transaction.status.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || transaction.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    list = list.sort((a, b) => {
      if (sortBy === 'amount') {
        return sortDir === 'asc'
          ? Number(a.amount || 0) - Number(b.amount || 0)
          : Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (sortBy === 'created_at') {
        const aValue = new Date(a.created_at).getTime();
        const bValue = new Date(b.created_at).getTime();
        return sortDir === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aValue = String(a[sortBy] ?? '').toUpperCase();
      const bValue = String(b[sortBy] ?? '').toUpperCase();
      if (sortDir === 'asc') return aValue.localeCompare(bValue);
      return bValue.localeCompare(aValue);
    });

    return list;
  }, [transactions, searchQuery, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedTransactions.length / rowsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * rowsPerPage;
  const pagedTransactions = filteredSortedTransactions.slice(
    pageStartIndex,
    pageStartIndex + rowsPerPage,
  );

  const orderedAuditLogs = useMemo(
    () => [...auditLogs].sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at)),
    [auditLogs],
  );

  const visibleAuditLogs = useMemo(() => {
    if (auditScope === 'SELECTED' && activeSelectedTxnId) {
      return orderedAuditLogs.filter((log) => log.transaction_id === activeSelectedTxnId);
    }
    if (auditScope === 'SELECTED') {
      return [];
    }
    return orderedAuditLogs;
  }, [auditScope, orderedAuditLogs, activeSelectedTxnId]);

  const handleSimulateFailure = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_BASE}/simulate-failure`);
      await fetchDashboardData();
      setSelectedTxnId(res.data.id);
      setAiDecision(null);
      setCurrentPage(1);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Backend unreachable. Ensure FastAPI server is running.'));
    } finally {
      setSimulating(false);
    }
  };

  const handleRunAiRecovery = async () => {
    if (!activeSelectedTxnId) return;
    setLoading(true);
    setAiDecision(null);
    try {
      const res = await axios.post(`${API_BASE}/recover/${activeSelectedTxnId}`);
      setAiDecision(res.data);
      await fetchDashboardData();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Recovery failed or transaction not found.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="wrap">
        <header className="topbar">
          <div className="brand">
            <div className="mark" aria-hidden="true">
              <CreditCard />
            </div>
            <div className="brand-text">
              <h1>
                Razorpay <span>AI Recovery Agent</span>
              </h1>
              <div className="brand-meta">
                <span className={`dot-live ${apiStatus === 'Offline' ? 'offline' : ''}`} />
                {apiStatus === 'Checking' ? 'Checking system' : `${apiStatus} dunning engine`}
                <span className="chip">NVIDIA Llama 3.1 NIM</span>
              </div>
            </div>
          </div>

          <button className="btn-sim" onClick={handleSimulateFailure} disabled={simulating}>
            <RefreshCw className={simulating ? 'spin' : ''} />
            {simulating ? 'Simulating...' : 'Simulate Payment Failure'}
          </button>
        </header>

        <section className="kpis">
          <article className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Amount at risk</span>
              <div className="kpi-icon blue-icon">
                <CreditCard />
              </div>
            </div>
            <div className="kpi-value">{formatCurrency(amountAtRisk)}</div>
            <div className="kpi-sub">Across {transactions.length} transactions</div>
          </article>

          <article className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Failed</span>
              <div className="kpi-icon red-icon">
                <XCircle />
              </div>
            </div>
            <div className="kpi-value">{failedCount}</div>
            <div className="kpi-sub">Awaiting agent strategy</div>
          </article>

          <article className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Pending retry</span>
              <div className="kpi-icon amber-icon">
                <Clock3 />
              </div>
            </div>
            <div className="kpi-value">{pendingRetryCount}</div>
            <div className="kpi-sub">Retry scheduled by AI</div>
          </article>

          <article className="kpi">
            <div className="kpi-top">
              <span className="kpi-label">Recovered</span>
              <div className="kpi-icon green-icon">
                <CircleCheck />
              </div>
            </div>
            <div className="kpi-value">{recoveredCount}</div>
            <div className="kpi-sub">Successful recoveries</div>
          </article>
        </section>

        <main className="grid">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-head-left">
                <div className="panel-icon">
                  <Bot />
                </div>
                <span className="panel-title">AI Strategy Decision Engine</span>
              </div>
            </div>
            <div className="panel-body">
              <label htmlFor="transaction-id" className="field-label">
                Target Transaction ID
              </label>
              <div className="input-wrap">
                <input
                  id="transaction-id"
                  type="text"
                  value={activeSelectedTxnId}
                  onChange={(event) => setSelectedTxnId(event.target.value)}
                  placeholder="Select transaction below or paste ID"
                />
              </div>

              <button
                className="btn-execute"
                onClick={handleRunAiRecovery}
                disabled={loading || !activeSelectedTxnId}
              >
                {loading ? (
                  <>
                    <Activity className="spin" />
                    Evaluating strategy...
                  </>
                ) : (
                  <>
                    Execute Recovery Strategy
                    <ArrowRight />
                  </>
                )}
              </button>

              <div className="action-card">
                <div className="action-head">
                  <span className="action-label">Recommended Action</span>
                  <span
                    className={`badge-action ${effectiveDecision?.action === 'TERMINATE' ? 'danger' : ''}`}
                  >
                    <Sparkles />
                    {effectiveDecision?.action ?? 'Awaiting execution'}
                  </span>
                </div>

                <div className="stat-row">
                  <span className="k">Execution Delay</span>
                  <span className="v">
                    {effectiveDecision?.delay_hours != null
                      ? `${effectiveDecision.delay_hours} Hours`
                      : 'Not available'}
                  </span>
                </div>
                <div className="stat-row no-border">
                  <span className="k">Failure Signal</span>
                  <span className="v signal">
                    {selectedTransaction?.failure_code ?? 'Select a transaction'}
                  </span>
                </div>

                <div className="confidence">
                  <div className="confidence-top">
                    <span className="k">Model Confidence</span>
                    <span className="v">{confidence}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${confidence}%` }} />
                  </div>
                </div>

                <div className="reasoning">
                  <div className="reasoning-head">
                    <Sparkles />
                    <span>AI Reasoning</span>
                  </div>
                  <p>
                    {effectiveDecision?.reasoning ??
                      'Run recovery strategy to generate recommendation and reasoning for this transaction.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-head-left">
                <div className="panel-icon">
                  <ChartNoAxesCombined />
                </div>
                <span className="panel-title">Live Transactions</span>
              </div>
              <span className="total-badge">
                {filteredSortedTransactions.length} / {transactions.length} Total
              </span>
            </div>

            <div className="panel-body panel-body-tight">
              <div className="table-controls">
                <div className="search-wrap">
                  <Search />
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by transaction, status, or failure code"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL' ? 'All Status' : statusLabel(status)}
                    </option>
                  ))}
                </select>

                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  {sortOptions.map((sortOption) => (
                    <option key={sortOption.key} value={sortOption.key}>
                      Sort: {sortOption.label}
                    </option>
                  ))}
                </select>

                <button
                  className="control-button"
                  type="button"
                  onClick={() => setSortDir((value) => (value === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortDir === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Failure Code</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-state">
                          No transactions match your filter.
                        </td>
                      </tr>
                    ) : (
                      pagedTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className={activeSelectedTxnId === transaction.id ? 'selected' : ''}
                          onClick={() => setSelectedTxnId(transaction.id)}
                        >
                          <td className="id">{transaction.id}</td>
                          <td className="amount">{formatCurrency(transaction.amount)}</td>
                          <td className={`fcode ${failureCodeClass(transaction.failure_code)}`}>
                            {transaction.failure_code}
                          </td>
                          <td>
                            <span className={`status-pill dot ${statusClass(transaction.status)}`}>
                              {statusLabel(transaction.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div className="meta-row">
                  <span>
                    Showing {pagedTransactions.length === 0 ? 0 : pageStartIndex + 1}-
                    {pageStartIndex + pagedTransactions.length} of {filteredSortedTransactions.length}
                  </span>
                  <span>Last updated: {formatDateTime(lastUpdatedAt)}</span>
                </div>
                <div className="meta-row">
                  <label className="inline-select">
                    Auto Refresh
                    <select
                      value={autoRefreshSeconds}
                      onChange={(event) => setAutoRefreshSeconds(Number(event.target.value))}
                    >
                      <option value={0}>Off</option>
                      <option value={10}>10s</option>
                      <option value={15}>15s</option>
                      <option value={30}>30s</option>
                      <option value={60}>60s</option>
                    </select>
                  </label>
                  <label className="inline-select">
                    Rows
                    <select
                      value={rowsPerPage}
                      onChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={7}>7</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </label>
                  <div className="pager">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                      disabled={activePage <= 1}
                    >
                      <ChevronLeft />
                    </button>
                    <span>
                      Page {activePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                      disabled={activePage >= totalPages}
                    >
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <section className="panel audit-panel">
          <div className="panel-head">
            <div className="panel-head-left">
              <div className="panel-icon">
                <Sparkles />
              </div>
              <span className="panel-title">Audit Logs</span>
            </div>
            <span className="total-badge">{visibleAuditLogs.length} Entries</span>
          </div>
          <div className="panel-body panel-body-tight">
            <div className="audit-toolbar">
              <label className="inline-select">
                View
                <select value={auditScope} onChange={(event) => setAuditScope(event.target.value)}>
                  <option value="ALL">All Transactions</option>
                  <option value="SELECTED">Selected Transaction</option>
                </select>
              </label>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Transaction</th>
                    <th>Action</th>
                    <th>Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        No audit entries to display.
                      </td>
                    </tr>
                  ) : (
                    visibleAuditLogs.slice(0, 15).map((log) => (
                      <tr key={log.id}>
                        <td className="id">{formatDateTime(log.executed_at)}</td>
                        <td className="id">{log.transaction_id}</td>
                        <td>
                          <span className="status-pill st-pending">{log.agent_action}</span>
                        </td>
                        <td className="audit-reason">{log.reasoning || 'No reasoning provided.'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p className="footnote">
          <b>{auditLogs.length}</b> recovery decisions logged in audit trail
        </p>
      </div>
    </div>
  );
}
