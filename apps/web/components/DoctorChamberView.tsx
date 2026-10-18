// apps/web/components/DoctorChamberView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, UserSession, getSession } from '../lib/api';
import { cn } from '../lib/utils';
import PrescriptionPrintModal from './PrescriptionPrintModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Select } from './ui/select';

export interface DoctorChamberProps {
  session?: UserSession | null;
}

export default function DoctorChamberView({ session: propSession }: DoctorChamberProps = {}) {
  const session = propSession || getSession();
  const [queue, setQueue] = useState<any[]>([]);
  const [activeSerial, setActiveSerial] = useState<any>(null);
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [modalitiesList, setModalitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Consultation & Prescription State
  const [chiefComplaints, setChiefComplaints] = useState('Severe lower back pain radiating down left leg for 3 months');
  const [painScore, setPainScore] = useState(7);
  const [diagnosis, setDiagnosis] = useState('Lumbar Radiculopathy / Sciatica (L4-L5 disc protrusion)');
  const [objectiveNotes, setObjectiveNotes] = useState('SLR test positive on left side at 45°. Tenderness on lumbar paravertebral muscles.');
  const [advice, setAdvice] = useState('Avoid bending forward and lifting heavy weights. Use hard mattress. Apply warm moist compress for 15 mins twice daily.');

  // Prescribed Medicines State
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([
    {
      brandName: 'Naprosyn 500',
      genericName: 'Naproxen 500mg',
      dosage: '1+0+1',
      duration: '7 days',
      instructions: 'খাবারের পর (After meals)',
    },
    {
      brandName: 'Myolax 50',
      genericName: 'Tolperisone HCl 50mg',
      dosage: '1+0+1',
      duration: '7 days',
      instructions: 'খাবারের পর (After meals)',
    },
    {
      brandName: 'Maxpro 20',
      genericName: 'Esomeprazole 20mg',
      dosage: '1+0+0',
      duration: '14 days',
      instructions: 'খাবারের ২০ মিনিট আগে (Before meal)',
    },
  ]);

  // Prescribed Modalities State
  const [prescribedMods, setPrescribedMods] = useState<any[]>([
    { modalityCode: 'IFT', modalityName: 'Interferential Therapy (IFT)', sessionsPrescribed: 10, frequency: 'daily' },
    { modalityCode: 'UST', modalityName: 'Ultrasound Therapy (UST)', sessionsPrescribed: 10, frequency: 'daily' },
  ]);

  // Print modal state
  const [printData, setPrintData] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<'queue' | 'consultation'>('queue');

  const doctorId = session?.staffId || '';

  const loadQueue = async () => {
    try {
      setLoading(true);
      const staffList = await api.staff.list();
      let targetDoctor = staffList.find((s: any) => s.userId === session?.userId || s.role === 'head_doctor' || s.role === 'doctor');
      const docId = targetDoctor ? targetDoctor.id : doctorId;

      if (docId) {
        const q = await api.visits.getDoctorQueue(docId);
        setQueue(q || []);
        if (q && q.length > 0 && !activeSerial) {
          const inProgress = q.find((s: any) => s.status === 'called' || s.status === 'in_chamber') || q[0];
          setActiveSerial(inProgress);
        }
      }

      const [meds, mods] = await Promise.all([
        api.inventory.getMedicines(),
        api.therapy.getMachines(),
      ]);
      setMedicinesList(meds || []);
      setModalitiesList(mods || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [doctorId, session]);

  const handleCallNext = async () => {
    try {
      const staffList = await api.staff.list();
      const doc = staffList.find((s: any) => s.userId === session?.userId || s.role === 'head_doctor');
      const targetDocId = doc?.id || doctorId;

      const called = await api.visits.callNext(targetDocId);
      const active = called.serial || called;
      setActiveSerial(active);
      setMobileTab('consultation');
      toast.success(`Called Serial #${active.serialNumber || 'Next'}`);
      loadQueue();
    } catch (err: any) {
      toast.error(`Call next error: ${err.message}`);
    }
  };

  const handleSelectSerial = (s: any) => {
    setActiveSerial(s);
    setMobileTab('consultation');
  };

  const handleAddMedicine = () => {
    setPrescribedMeds([
      ...prescribedMeds,
      {
        brandName: medicinesList[0]?.brandName || 'Tab. Paracetamol 500mg',
        genericName: medicinesList[0]?.genericName || 'Paracetamol',
        dosage: '1+0+1',
        duration: '7 days',
        instructions: 'খাবারের পর (After meals)',
      },
    ]);
  };

  const handleRemoveMedicine = (idx: number) => {
    setPrescribedMeds(prescribedMeds.filter((_, i) => i !== idx));
  };

  const handleAddModality = (code: string, name: string) => {
    if (prescribedMods.some((m) => m.modalityCode === code)) return;
    setPrescribedMods([
      ...prescribedMods,
      {
        modalityCode: code,
        modalityName: name,
        sessionsPrescribed: 10,
        frequency: 'daily',
      },
    ]);
  };

  const handleRemoveModality = (code: string) => {
    setPrescribedMods(prescribedMods.filter((m) => m.modalityCode !== code));
  };

  const handleSaveAndPrint = async () => {
    if (!activeSerial) {
      toast.error('No active patient selected from queue!');
      return;
    }

    try {
      let createdRx = null;
      try {
        createdRx = await api.prescriptions.create({
          visitId: activeSerial.id,
          doctorId: session?.staffId || 'staff-1',
          patientId: activeSerial.patientId,
          chiefComplaints,
          diagnosis,
          painScore,
          objectiveNotes,
          advice,
          medicines: prescribedMeds,
          modalities: prescribedMods,
        });
        toast.success('Prescription saved to database!');
      } catch (e: any) {
        console.warn('API save note:', e.message);
      }

      setPrintData({
        rxNumber: createdRx?.rxNumber || `RX-${new Date().getFullYear()}-${String(activeSerial.serialNumber).padStart(4, '0')}`,
        serialNumber: activeSerial.serialNumber,
        patient: {
          nameEn: activeSerial.patient?.nameEn || 'Abdul Karim',
          nameBn: activeSerial.patient?.nameBn,
          mrn: activeSerial.patient?.mrn || 'HPC-26-00001',
          phone: activeSerial.patient?.phone || '01712345678',
          ageYears: activeSerial.patient?.ageYears || 52,
          gender: activeSerial.patient?.gender || 'male',
          bloodGroup: activeSerial.patient?.bloodGroup,
        },
        doctor: {
          name: session?.displayName || 'Dr. Toufiq (Md. Toufiq Uz Zaman)',
          specialization: 'Physiotherapist & Pain Specialist',
        },
        clinicalNotes: {
          chiefComplaints,
          diagnosis,
          painScore,
        },
        medicines: prescribedMeds,
        modalities: prescribedMods,
        advice,
        createdAt: new Date().toISOString(),
      });

      loadQueue();
    } catch (err: any) {
      toast.error(`Error saving prescription: ${err.message}`);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile & Small Tablet Adaptive Segmented Control */}
      <div className="flex lg:hidden items-center gap-2 mb-4 p-1 rounded-xl bg-card border border-border shadow-2xs">
        <Button
          type="button"
          variant={mobileTab === 'queue' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileTab('queue')}
          className={cn(
            'flex-1 text-xs font-bold rounded-lg',
            mobileTab === 'queue' && 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-xs'
          )}
        >
          🚪 Queue ({queue.length})
        </Button>
        <Button
          type="button"
          variant={mobileTab === 'consultation' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileTab('consultation')}
          className={cn(
            'flex-1 text-xs font-bold rounded-lg',
            mobileTab === 'consultation' && 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-xs'
          )}
        >
          📝 Consultation &amp; Rx {activeSerial ? `(#${activeSerial.serialNumber})` : ''}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 sm:gap-6 w-full items-start">
        {/* Left Column: Chamber Patient Queue */}
        <Card className={cn('h-fit transition-all border-border shadow-sm', mobileTab !== 'queue' && 'hidden lg:block')}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>🚪</span> Chamber Queue ({queue.length})
            </CardTitle>
            <Button size="sm" onClick={handleCallNext} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              📢 Call Next
            </Button>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted-foreground text-sm">
                No patients waiting in queue.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {queue.map((s) => {
                  const isCurrent = activeSerial?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSerial(s)}
                      className={cn(
                        'border rounded-xl p-3 cursor-pointer transition-all',
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-border bg-card hover:bg-muted/50'
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                          #{s.serialNumber} · {s.tokenNumber || `T-${s.serialNumber}`}
                        </span>
                        <Badge variant={isCurrent ? 'default' : 'outline'} className="text-xs">
                          {s.status}
                        </Badge>
                      </div>
                      <div className="font-semibold text-sm mt-1 text-foreground">
                        {s.patient?.nameEn}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        MRN: {s.patient?.mrn} · {s.patient?.gender}, {s.patient?.ageYears}y
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: SOAP Consultation & 5.5in x 8.27in Prescription Writer */}
        <div className={cn('flex flex-col gap-4 sm:gap-5 transition-all w-full', mobileTab !== 'consultation' && 'hidden lg:flex')}>
          {/* Active Patient Demographics Bar */}
          <Card className="border-border bg-card/90 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    NOW IN CHAMBER
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                    {activeSerial?.patient?.nameEn || 'Abdul Karim'}{' '}
                    {activeSerial?.patient?.nameBn && <small className="text-sm font-normal">({activeSerial.patient.nameBn})</small>}
                  </h2>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    MRN: <strong className="text-foreground">{activeSerial?.patient?.mrn || 'HPC-26-00001'}</strong> · Age: {activeSerial?.patient?.ageYears || 52} Y · Gender: {activeSerial?.patient?.gender || 'male'} · Phone: {activeSerial?.patient?.phone || '01712345678'}
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Blood: {activeSerial?.patient?.bloodGroup || 'B+'}
                  </Badge>
                  {activeSerial?.patient?.allergies && (
                    <Badge variant="destructive" className="font-semibold">
                      ⚠️ {activeSerial.patient.allergies}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Assessment Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                🩺 Clinical Physio Assessment (SOAP)
              </CardTitle>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold">
                  VAS Pain Score: <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{painScore}/10</span>
                </Label>
                <div className="w-32">
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={painScore}
                    onValueChange={(val: any) => setPainScore(Array.isArray(val) ? val[0] : val)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Chief Complaints & History"
                  rows={3}
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                />

                <Input
                  label="Provisional Diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <Textarea
                label="Objective Examination (ROM, Gait, Palpation, Special Tests)"
                rows={2}
                value={objectiveNotes}
                onChange={(e) => setObjectiveNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Therapy Modalities Prescribing */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                ⚡ Prescribed Therapy Modalities
              </CardTitle>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('IFT', 'Interferential Therapy (IFT)')}
                  className="text-xs font-semibold"
                >
                  + IFT
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('UST', 'Ultrasound Therapy (UST)')}
                  className="text-xs font-semibold"
                >
                  + Ultrasound
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('SWD', 'Shortwave Diathermy (SWD)')}
                  className="text-xs font-semibold"
                >
                  + Shortwave
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('EXE', 'Therapeutic Exercise')}
                  className="text-xs font-semibold"
                >
                  + Exercise
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modality</TableHead>
                    <TableHead className="w-32">Prescribed Sessions</TableHead>
                    <TableHead className="w-36">Frequency</TableHead>
                    <TableHead className="w-16 text-right">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescribedMods.map((m) => (
                    <TableRow key={m.modalityCode}>
                      <TableCell className="font-bold text-foreground">
                        {m.modalityName}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24 h-8"
                          value={m.sessionsPrescribed}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setPrescribedMods(
                              prescribedMods.map((it) =>
                                it.modalityCode === m.modalityCode ? { ...it, sessionsPrescribed: val } : it,
                              ),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.frequency}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setPrescribedMods(
                              prescribedMods.map((it) =>
                                it.modalityCode === m.modalityCode ? { ...it, frequency: e.target.value } : it,
                              ),
                            );
                          }}
                          className="w-32 h-8 text-xs"
                        >
                          <option value="daily">Daily</option>
                          <option value="alternate_days">Alt. Days</option>
                          <option value="weekly">Weekly</option>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="size-7 p-0 ml-auto"
                          onClick={() => handleRemoveModality(m.modalityCode)}
                        >
                          ✕
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Medicines (Rx) Writer */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                ℞ Prescribed Medicines
              </CardTitle>
              <Button size="sm" onClick={handleAddMedicine} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                + Add Medicine
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2.5">
                {prescribedMeds.map((med, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr_2fr_auto] gap-2 items-center bg-muted/40 p-2.5 rounded-xl border border-border/60"
                  >
                    <Input
                      placeholder="Brand Name"
                      value={med.brandName}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].brandName = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="Generic"
                      value={med.genericName}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].genericName = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="1+0+1"
                      value={med.dosage}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].dosage = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="7 days"
                      value={med.duration}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].duration = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="খাবারের পর"
                      value={med.instructions}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].instructions = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="size-8 p-0 shrink-0 self-center"
                      onClick={() => handleRemoveMedicine(idx)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>

              <Textarea
                label="Special Advice / নির্দেশাবলী"
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
              />

              <div className="pt-2">
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm sm:text-base shadow-sm"
                  onClick={handleSaveAndPrint}
                >
                  📄 Save &amp; Print 5.5in × 8.27in Prescription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5.5in x 8.27in Prescription Modal */}
      {printData && (
        <PrescriptionPrintModal
          prescription={printData}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
