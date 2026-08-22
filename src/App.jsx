import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, RefreshCw, Cpu, FileText, CheckCircle2, 
  AlertCircle, ShieldCheck, ArrowRight, Activity 
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedTxnId, setSelectedTxnId] = useState('');
  const [aiDecision, setAiDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [txnRes, logsRes] = await Promise.all([
        axios.get(`${API_BASE}/transactions`),
        axios.get(`${API_BASE}/audit-logs`)
      ]);
      setTransactions(txnRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error("Error connecting to backend:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSimulateFailure = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_BASE}/simulate-failure`);
      await fetchDashboardData();
      setSelectedTxnId(res.data.id);
    } catch (err) {
      alert("Backend unreachable. Ensure FastAPI server is running.");
    } finally {
      setSimulating(false);
    }
  };

  const handleRunAiRecovery = async () => {
    if (!selectedTxnId) return;
    setLoading(true);
    setAiDecision(null);
    try {
      const res = await axios.post(`${API_BASE}/recover/${selectedTxnId}`);
      setAiDecision(res.data);
      await fetchDashboardData();
    } catch (err) {
      alert("Recovery failed or transaction not found.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111e] text-slate-100 p-6 font-sans">
      {/* Top Navbar */}
      <header className="flex justify-between items-center border-b border-[#1d2c42] pb-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-[#3395ff]/10 p-2.5 rounded-xl border border-[#3395ff]/30">
            <CreditCard className="w-7 h-7 text-[#3395ff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Razorpay <span className="text-[#3395ff]">AI Recovery Agent</span>
            </h1>
            <p className="text-xs text-slate-400">Autonomous Dunning Engine • NVIDIA Llama-3.1 NIM</p>
          </div>
        </div>

        <button 
          onClick={handleSimulateFailure} 
          disabled={simulating}
          className="bg-[#3395ff] hover:bg-[#2575d0] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-[#3395ff]/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
          {simulating ? 'Simulating...' : 'Simulate Payment Failure'}
        </button>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI Decision Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111c2d] border border-[#1d2c42] rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#3395ff]">
              <Cpu className="w-5 h-5" />
              <h2 className="font-semibold text-white">AI Strategy Decision Engine</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Target Transaction ID</label>
                <input 
                  type="text" 
                  placeholder="Select transaction below or paste ID" 
                  value={selectedTxnId}
                  onChange={(e) => setSelectedTxnId(e.target.value)}
                  className="w-full bg-[#07111e] border border-[#1d2c42] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#3395ff] font-mono"
                />
              </div>

              <button 
                onClick={handleRunAiRecovery}
                disabled={loading || !selectedTxnId}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Evaluating via NVIDIA NIM...
                  </>
                ) : (
                  <>
                    Execute Recovery Strategy
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Decision Result Card */}
            {aiDecision && (
              <div className="mt-6 bg-[#07111e] border border-emerald-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1d2c42] pb-2">
                  <span className="text-xs text-slate-400 font-medium">RECOMMENDED ACTION</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {aiDecision.action}
                  </span>
                </div>

                <div className="text-xs space-y-1.5">
                  <p className="text-slate-400"><strong className="text-slate-200">Execution Delay:</strong> {aiDecision.delay_hours} Hours</p>
                  <p className="text-slate-300 leading-relaxed"><strong className="text-slate-200 block mb-1">AI Reasoning:</strong> {aiDecision.reasoning}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Data Feeds */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111c2d] border border-[#1d2c42] rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-200">
                <FileText className="w-5 h-5 text-[#3395ff]" />
                <h2 className="font-semibold text-white">Live Transactions</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">{transactions.length} Total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#07111e] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1d2c42]">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Failure Code</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d2c42]/60">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500">No transaction data yet. Click "Simulate Payment Failure".</td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr 
                        key={t.id} 
                        onClick={() => setSelectedTxnId(t.id)}
                        className={`hover:bg-[#1a283d] transition cursor-pointer ${selectedTxnId === t.id ? 'bg-[#1a283d]/80 border-l-2 border-[#3395ff]' : ''}`}
                      >
                        <td className="p-3 font-mono text-slate-200">{t.id}</td>
                        <td className="p-3 font-semibold text-white">₹{t.amount}</td>
                        <td className="p-3 font-mono text-amber-400">{t.failure_code}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            t.status === 'RECOVERED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            t.status === 'TERMINATED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}