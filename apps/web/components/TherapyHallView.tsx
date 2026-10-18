// apps/web/components/TherapyHallView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSession, getSession } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';

export interface TherapyHallProps {
  session?: UserSession | null;
}

export default function TherapyHallView({ session: propSession }: TherapyHallProps = {}) {
  const session = propSession || getSession();
  const [mobileTab, setMobileTab] = useState<'beds' | 'sessions' | 'packages'>('beds');
  const [beds, setBeds] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Start Session Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedModalityCode, setSelectedModalityCode] = useState('IFT');
  const [durationMinutes, setDurationMinutes] = useState(15);

  // Complete Session Modal
  const [completingSession, setCompletingSession] = useState<any>(null);
  const [therapistPin, setTherapistPin] = useState('3579');
  const [painScoreAfter, setPainScoreAfter] = useState(3);
  const [outcomeNote, setOutcomeNote] = useState('Good tolerance, muscle spasm relieved.');

  const loadData = async () => {
    try {
      const [b, m, s, p, pat] = await Promise.all([
        api.therapy.getBeds(),
        api.therapy.getMachines(),
        api.therapy.getActiveSessions(),
        api.therapy.getPackages(),
        api.patients.list(),
      ]);
      setBeds(b || []);
      setMachines(m || []);
      setActiveSessions(s || []);
      setPackages(p || []);
      setPatients(pat || []);

      if (b && b.length > 0 && !selectedBedId) setSelectedBedId(b[0].id);
      if (m && m.length > 0 && !selectedMachineId) setSelectedMachineId(m[0].id);
      if (pat && pat.length > 0 && !selectedPatientId) setSelectedPatientId(pat[0].id);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.therapy.startSession({
        patientId: selectedPatientId,
        bedId: selectedBedId,
        machineId: selectedMachineId || undefined,
        modalityCode: selectedModalityCode,
        durationMinutes,
      });
      alert('Therapy Session Started!');
      setShowStartModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to start session: ${err.message}`);
    }
  };

  const handleCompleteSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSession) return;
    try {
      await api.therapy.completeSession(completingSession.id, {
        pin: therapistPin,
        painScoreAfter,
        outcomeNote,
      });
      alert('Therapy Session Completed & Recorded!');
      setCompletingSession(null);
      loadData();
    } catch (err: any) {
      alert(`Completion failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">⚡ Therapy Hall &amp; Electrotherapy Matrix</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Hall A · Live Bed Allocation &amp; Modality Timers</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            onClick={() => setShowStartModal(true)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            + Start Session
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            className="flex-1 sm:flex-initial flex items-center gap-1.5"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Mobile Tab Switcher (<lg screens: smartphones, small tablets) */}
      <div className="flex lg:hidden rounded-xl border border-border bg-card p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('beds')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'beds'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          🛏️ Beds ({beds.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('sessions')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'sessions'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          ⏱️ Sessions ({activeSessions.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('packages')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'packages'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          📦 Packages ({packages.length})
        </button>
      </div>

      {/* Bed Matrix Grid */}
      <div className={cn(mobileTab !== 'beds' && 'hidden lg:block')}>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              🛏️ Hall A Bed Status ({beds.length} Beds)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {beds.map((b) => {
                const activeSess = activeSessions.find((s) => s.bedId === b.id);
                const isOccupied = !!activeSess;

                return (
                  <div
                    key={b.id}
                    className={cn(
                      'rounded-xl p-4 flex flex-col gap-3 transition-colors border',
                      isOccupied
                        ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20'
                        : 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-base font-bold text-foreground">{b.name}</strong>
                      <Badge variant={isOccupied ? 'warning' : 'success'}>
                        {isOccupied ? 'In Session' : 'Available'}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Code: {b.code}
                    </div>

                    {isOccupied ? (
                      <div className="mt-1 flex flex-col gap-2 text-xs">
                        <div>
                          Patient: <strong className="text-foreground">{activeSess.patient?.nameEn || 'Patient'}</strong>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>Modality:</span>
                          <Badge variant="outline" className="text-xs uppercase">
                            {activeSess.modalityCode}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full mt-1 text-xs"
                          onClick={() => setCompletingSession(activeSess)}
                        >
                          ✓ Complete with PIN
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-auto text-xs"
                        onClick={() => {
                          setSelectedBedId(b.id);
                          setShowStartModal(true);
                        }}
                      >
                        Assign Bed
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Live Table */}
      <div className={cn(mobileTab !== 'sessions' && 'hidden lg:block')}>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              ⏱️ Active Therapy Sessions ({activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No therapy sessions actively running right now.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Patient</th>
                      <th className="p-2.5 hidden sm:table-cell">MRN</th>
                      <th className="p-2.5">Bed</th>
                      <th className="p-2.5 hidden md:table-cell">Machine</th>
                      <th className="p-2.5">Modality</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-bold text-foreground">
                          {s.patient?.nameEn || 'Patient'}
                        </td>
                        <td className="p-2.5 hidden sm:table-cell text-muted-foreground">
                          {s.patient?.mrn || 'N/A'}
                        </td>
                        <td className="p-2.5 text-foreground">{s.bed?.name || s.bedId}</td>
                        <td className="p-2.5 hidden md:table-cell text-muted-foreground">
                          {s.machine?.name || 'N/A'}
                        </td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                            {s.modalityCode}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{s.durationMinutes} mins</td>
                        <td className="p-2.5">
                          <Badge variant="warning">{s.status}</Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setCompletingSession(s)}
                          >
                            PIN Complete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Therapy Packages Catalog */}
      <div className={cn(mobileTab !== 'packages' && 'hidden lg:block')}>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              📦 Curated Rehab Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div>
                    <h4 className="text-base font-bold text-foreground">{pkg.nameEn}</h4>
                    <div className="text-xs text-muted-foreground mb-3">{pkg.nameBn}</div>
                    <div className="text-xs flex flex-col gap-1.5 text-muted-foreground">
                      <div>🩺 <strong className="text-foreground">{pkg.totalConsultations}</strong> Doctor Consultations</div>
                      <div>⚡ <strong className="text-foreground">{pkg.totalTherapySessions}</strong> Physical Therapy Sessions</div>
                      <div>📅 Validity: <strong className="text-foreground">{pkg.validityDays}</strong> Days</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                    <strong className="text-base font-bold text-emerald-600">
                      ৳{(pkg.pricePaisa / 100).toFixed(0)} BDT
                    </strong>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!selectedPatientId) {
                          alert('Select a patient in reception first');
                          return;
                        }
                        try {
                          await api.therapy.purchasePackage({
                            patientId: selectedPatientId,
                            packageId: pkg.id,
                            billId: undefined,
                          });
                          alert(`Package ${pkg.nameEn} assigned to patient!`);
                        } catch (err: any) {
                          alert(`Purchase error: ${err.message}`);
                        }
                      }}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      Assign to Patient
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Session Dialog */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="max-w-lg" onClose={() => setShowStartModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Start Physical Therapy Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartSession} className="flex flex-col gap-4 mt-2">
            <Select
              label="Select Patient *"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mrn} · {p.nameEn} ({p.phone})
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Assign Bed *"
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
                required
              >
                {beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </Select>

              <Select
                label="Therapy Machine"
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
              >
                <option value="">None / Manual Exercise</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Modality Code"
                value={selectedModalityCode}
                onChange={(e) => setSelectedModalityCode(e.target.value)}
              >
                <option value="IFT">IFT (Interferential Therapy)</option>
                <option value="UST">UST (Ultrasound Therapy)</option>
                <option value="SWD">SWD (Shortwave Diathermy)</option>
                <option value="EXE">EXE (Therapeutic Exercise)</option>
              </Select>

              <Select
                label="Duration (Minutes)"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </Select>
            </div>

            <div className="flex gap-3 mt-4 pt-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Start Session &amp; Run Timer
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowStartModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Session with PIN Dialog */}
      {completingSession && (
        <Dialog open={!!completingSession} onOpenChange={() => setCompletingSession(null)}>
          <DialogContent className="max-w-md" onClose={() => setCompletingSession(null)}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Complete Session with PIN</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCompleteSession} className="flex flex-col gap-4 mt-2">
              <div className="rounded-lg bg-muted/40 p-3 text-xs flex flex-col gap-1 border border-border">
                <div>Patient: <strong className="text-foreground">{completingSession.patient?.nameEn || 'Patient'}</strong></div>
                <div>Modality: <strong className="text-foreground">{completingSession.modalityCode}</strong></div>
              </div>

              <Input
                label="Therapist 4-Digit Security PIN *"
                type="password"
                maxLength={4}
                required
                placeholder="Enter PIN (Demo: 3579)"
                value={therapistPin}
                onChange={(e) => setTherapistPin(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Pain Score After Session (0-10): <span className="text-foreground font-bold">{painScoreAfter}/10</span>
                </label>
                <div className="py-2">
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={painScoreAfter}
                    onValueChange={(val: any) => setPainScoreAfter(Array.isArray(val) ? val[0] : val)}
                    className="w-full"
                  />
                </div>
              </div>

              <Textarea
                label="Therapist Notes / Patient Tolerance"
                rows={2}
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
              />

              <div className="flex gap-3 mt-4 pt-2 border-t border-border">
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Verify PIN &amp; Complete
                </Button>
                <Button type="button" variant="outline" onClick={() => setCompletingSession(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
