// apps/web/components/ReceptionView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import QrScannerModal from './QrScannerModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { CreatePatientDialog } from './patient/CreatePatientDialog';
import { PatientIntakeFormModal } from './patient/PatientIntakeFormModal';
import {
  IntakeAssessmentPrintModal,
  IntakeAssessmentData,
} from './patient/IntakeAssessmentPrintModal';
import { PatientTimelineModal } from './patient/PatientTimelineModal';
import { cn } from '../lib/utils';
import { TherapyQueueManagementTab } from './therapy/TherapyQueueManagementTab';
import { toast } from 'sonner';
import {
  FileText,
  Printer,
  CreditCard,
  Clock,
  UserCheck,
  Send,
  Loader2,
} from 'lucide-react';

export default function ReceptionView() {
  const [mobileTab, setMobileTab] = useState<'checkin' | 'queue' | 'therapy_queue'>('checkin');
  const [patients, setPatients] = useState<any[]>([]);
  const [todayVisits, setTodayVisits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);

  // Check-In Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly'>('normal');

  // Intake Form Modal State
  const [intakePatient, setIntakePatient] = useState<any | null>(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // A4 Print Modal State
  const [printData, setPrintData] = useState<IntakeAssessmentData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Timeline Modal State
  const [timelinePatient, setTimelinePatient] = useState<{
    id: string;
    name: string;
    mrn?: string;
    phone?: string;
  } | null>(null);

  // Forward to Cashier Modal State
  const [forwardVisit, setForwardVisit] = useState<any | null>(null);
  const [forwardDoctorId, setForwardDoctorId] = useState('');
  const [forwarding, setForwarding] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [v, p, s] = await Promise.all([
        api.visits.getToday(),
        api.patients.list(),
        api.staff.list(),
      ]);
      setTodayVisits(v || []);
      setPatients(p || []);
      setStaffList(s || []);
      const doctors = (s || []).filter((st: any) => st.role === 'doctor');
      if (doctors.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(doctors[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check-In Handler: Strictly NO thermal printing
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId) {
      toast.error('অনুগ্রহ করে একজন রোগী ও একজন ডাক্তার নির্বাচন করুন (Please select both a Patient and a Doctor)');
      return;
    }
    try {
      const res = await api.visits.checkIn({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        priority,
      });

      const pat = patients.find((p) => p.id === selectedPatientId);
      const doc = staffList.find((s) => s.id === selectedDoctorId);

      // Record timeline event
      try {
        await api.patients.addTimelineEvent(selectedPatientId, {
          step: 'checked_in',
          titleEn: 'Patient Checked In',
          titleBn: 'রোগীর চেক-ইন সম্পন্ন',
          descriptionEn: `Checked in for ${doc?.fullName || 'Doctor Consultation'}. Priority: ${priority}`,
          descriptionBn: `ডাক্তার পরামর্শের জন্য চেক-ইন সম্পন্ন। প্রায়োরিটি: ${priority}`,
          visitId: res?.id || res?.visit?.id,
        });
      } catch (timelineErr) {
        console.warn('Failed to record timeline event:', timelineErr);
      }

      toast.success(
        `রোগী ${pat?.nameEn || ''} সফলভাবে চেক-ইন সম্পন্ন হয়েছে! (আগমনের সময়: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      );

      // Reset selection and refresh queue
      setSelectedPatientId('');
      loadData();
    } catch (err: any) {
      toast.error(`চেক-ইন ব্যর্থ: ${err.message}`);
    }
  };

  // Open Intake Assessment for a patient
  const handleOpenIntake = (patient: any) => {
    setIntakePatient(patient);
    setShowIntakeModal(true);
  };

  // Open A4 Print for patient
  const handleOpenPrintPreview = async (patient: any, visit?: any) => {
    try {
      const intakeForms = await api.patients.listIntakeForms({ patientId: patient.id });
      if (intakeForms && intakeForms.length > 0) {
        const latest = intakeForms[0];
        setPrintData({
          mrn: patient.mrn || latest.mrn,
          date: latest.date || new Date(),
          name: latest.name || patient.nameBn || patient.nameEn,
          ageYears: latest.ageYears || patient.ageYears,
          phone: latest.phone || patient.phone,
          gender: latest.gender || patient.gender,
          address: latest.address || patient.address,
          occupation: latest.occupation || patient.occupation,
          bpSystolic: latest.bpSystolic,
          bpDiastolic: latest.bpDiastolic,
          bloodSugar: latest.bloodSugar,
          hasDiabetes: latest.hasDiabetes,
          weightKg: latest.weightKg,
          chiefComplaint: latest.chiefComplaint,
          problemDuration: latest.problemDuration,
          seenDoctorBefore: latest.seenDoctorBefore,
          previousDoctorDetails: latest.previousDoctorDetails,
          hasPreviousReports: latest.hasPreviousReports,
          previousReportNames: latest.previousReportNames,
          takesRegularMedication: latest.takesRegularMedication,
          regularMedicationDetails: latest.regularMedicationDetails,
          hasDrugAllergies: latest.hasDrugAllergies,
          drugAllergyDetails: latest.drugAllergyDetails,
          referralSource: latest.referralSource,
          referralOtherDetails: latest.referralOtherDetails,
          receptionistName: latest.receptionistName,
          specialNotes: latest.specialNotes,
          doctorName: latest.doctor?.fullName || visit?.doctor?.fullName || 'ডাক্তার কনসালটেশন',
        });
      } else {
        // Fallback with basic patient profile
        setPrintData({
          mrn: patient.mrn,
          date: new Date(),
          name: patient.nameBn || patient.nameEn,
          ageYears: patient.ageYears,
          phone: patient.phone,
          gender: patient.gender,
          address: patient.address,
          occupation: patient.occupation,
          doctorName: visit?.doctor?.fullName || 'ডাক্তার কনসালটেশন',
        });
      }
      setShowPrintModal(true);
    } catch {
      setPrintData({
        mrn: patient.mrn,
        date: new Date(),
        name: patient.nameBn || patient.nameEn,
        ageYears: patient.ageYears,
        phone: patient.phone,
        gender: patient.gender,
        address: patient.address,
        occupation: patient.occupation,
        doctorName: visit?.doctor?.fullName || 'ডাক্তার কনসালটেশন',
      });
      setShowPrintModal(true);
    }
  };

  // Forward patient to cashier
  const handleConfirmForwardToCashier = async () => {
    if (!forwardVisit) return;
    try {
      setForwarding(true);
      const patId = forwardVisit.patient?.id || forwardVisit.patientId;
      const doc = staffList.find((s) => s.id === forwardDoctorId);

      // Check if an intake form exists to forward
      try {
        const intakeForms = await api.patients.listIntakeForms({ patientId: patId });
        if (intakeForms && intakeForms.length > 0) {
          await api.patients.forwardIntakeFormToCashier(intakeForms[0].id);
        }
      } catch {
        // Continue if no intake form
      }

      // Record timeline event
      if (patId) {
        await api.patients.addTimelineEvent(patId, {
          step: 'forwarded_to_cashier',
          titleEn: 'Forwarded to Cashier',
          titleBn: 'ক্যাশিয়ারের কাছে পাঠানো হয়েছে',
          descriptionEn: `Forwarded to Cashier for fee payment. Assigned doctor: ${doc?.fullName || 'Doctor'}`,
          descriptionBn: `কনসালটেশন ফি পরিশোধের জন্য ক্যাশিয়ারে ফরোয়ার্ড করা হয়েছে। ডাক্তার: ${doc?.fullName || 'নির্ধারিত ডাক্তার'}`,
          visitId: forwardVisit.id,
        });
      }

      toast.success('রোগীকে সফলভাবে ক্যাশিয়ারের কাছে পাঠানো হয়েছে!');
      setForwardVisit(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'ক্যাশিয়ারে পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setForwarding(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()),
  );

  const doctors = staffList.filter((s) => s.role === 'doctor');

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-xs max-w-xl">
        <button
          type="button"
          onClick={() => setMobileTab('checkin')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5',
            mobileTab === 'checkin'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <span>📋 চেক-ইন ও রোগী</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('therapy_queue')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5',
            mobileTab === 'therapy_queue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <span>⚡ থেরাপি কিউ ও কল</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('queue')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5',
            mobileTab === 'queue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <span>⏱️ আজকের কিউ ({todayVisits.length})</span>
        </button>
      </div>

      {mobileTab === 'therapy_queue' ? (
        <TherapyQueueManagementTab />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Check-in & Patient Search */}
            <div
              className={cn(
                'flex flex-col gap-6 lg:col-span-6 xl:col-span-5',
                mobileTab === 'queue' && 'hidden lg:flex'
              )}
            >
              {/* Check-in Card (Strictly No Thermal Printing) */}
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>📋</span> Check-in (রোগী উপস্থিতি নিশ্চিতকরণ)
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowRegModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                  >
                    + New Patient (নতুন রোগী)
                  </Button>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleCheckIn}
                    className="flex flex-col gap-4"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                  >
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Search / Select Patient (রোগী খুঁজুন বা নির্বাচন করুন):
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="নাম, ফোন বা MRN দিয়ে খুঁজুন..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="whitespace-nowrap flex items-center gap-1.5"
                          onClick={() => setShowScannerModal(true)}
                        >
                          📷 Scan Card
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Select
                          value={selectedPatientId}
                          onValueChange={setSelectedPatientId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`-- Choose Patient (${filteredPatients.length} found) --`} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPatients.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.mrn} · {p.nameEn} ({p.phone}) {p.bloodGroup ? `[${p.bloodGroup}]` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Assigning Doctor / Chamber:
                        </Label>
                        <Select
                          value={selectedDoctorId}
                          onValueChange={setSelectedDoctorId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="-- Select Doctor --" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.fullName} ({d.specialization || d.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Queue Priority:
                        </Label>
                        <Select
                          value={priority}
                          onValueChange={(val: 'normal' | 'emergency' | 'package' | 'elderly' | 'follow_up') =>
                            setPriority(val)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal (সাধারণ)</SelectItem>
                            <SelectItem value="emergency">Emergency (জরুরি)</SelectItem>
                            <SelectItem value="package">Package Follow-up (প্যাকেজ)</SelectItem>
                            <SelectItem value="elderly">Elderly / Disabled (বয়োজ্যেষ্ঠ)</SelectItem>
                            <SelectItem value="follow_up">Follow Up (ফলোআপ)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm sm:text-base shadow-sm gap-2"
                    >
                      <UserCheck className="size-4" />
                      <span>✓ চেক-ইন সম্পন্ন করুন (Mark as Checked In)</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Directory List Card */}
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    👥 Registered Patients ({patients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-muted/50 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5">MRN</th>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5 hidden sm:table-cell">Phone</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPatients.slice(0, 15).map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-bold text-foreground">{p.mrn}</td>
                            <td className="p-2.5">
                              <div className="font-medium text-foreground">{p.nameEn}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">{p.phone}</div>
                            </td>
                            <td className="p-2.5 hidden sm:table-cell text-muted-foreground">{p.phone}</td>
                            <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenIntake(p)}
                                title="প্রাথমিক তথ্য পূরণ"
                                className="h-7 px-2 text-[11px] gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              >
                                <FileText className="size-3" />
                                <span className="hidden sm:inline">ইন্ট্যাক</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setSelectedPatientId(p.id)}
                                className="h-7 text-xs"
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Waiting Queue */}
            <div
              className={cn(
                'flex flex-col gap-6 lg:col-span-6 xl:col-span-7',
                mobileTab === 'checkin' && 'hidden lg:flex'
              )}
            >
              <Card className="border border-border bg-card shadow-sm h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>⏱️</span> Today&apos;s Live Waiting Queue ({todayVisits.length})
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-1.5"
                  >
                    🔄 Refresh
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {todayVisits.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-12 text-center text-sm text-muted-foreground">
                      No visits registered yet today.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-3">আগমনের সময় / Time</th>
                            <th className="p-3">Patient</th>
                            <th className="p-3 hidden sm:table-cell">Doctor</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Workflow Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {todayVisits.map((v) => (
                            <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-emerald-600 text-xs sm:text-sm font-mono flex items-center gap-1">
                                    <Clock className="size-3.5" />
                                    {new Date(v.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {v.priority === 'emergency' && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px] uppercase font-bold animate-pulse px-1.5 py-0.5 bg-rose-500 text-white"
                                    >
                                      🚨 Emergency
                                    </Badge>
                                  )}
                                  {v.priority === 'vip' && (
                                    <Badge className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
                                      ⭐ VIP
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-foreground">
                                  {v.patient?.nameBn || v.patient?.nameEn}
                                </div>
                                <div className="text-xs text-muted-foreground">{v.patient?.mrn}</div>
                              </td>
                              <td className="p-3 hidden sm:table-cell text-muted-foreground">
                                {v.doctor?.fullName || 'Not assigned'}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant={
                                    v.status === 'in_consult'
                                      ? 'warning'
                                      : v.status === 'in_therapy'
                                      ? 'default'
                                      : v.status === 'checked_out'
                                      ? 'success'
                                      : 'secondary'
                                  }
                                >
                                  {v.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Intake Form Button */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenIntake(v.patient)}
                                    title="রোগীর প্রাথমিক তথ্য পূরণ"
                                    className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1"
                                  >
                                    <FileText className="size-3" />
                                    <span>ইন্ট্যাক</span>
                                  </Button>

                                  {/* A4 Print Button */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenPrintPreview(v.patient, v)}
                                    title="A4 সাইজ পেপারে ইন্ট্যাক ফরম প্রিন্ট করুন"
                                    className="h-7 text-xs border-zinc-300 hover:bg-muted gap-1"
                                  >
                                    <Printer className="size-3" />
                                    <span>A4 প্রিন্ট</span>
                                  </Button>

                                  {/* Forward to Cashier Button */}
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setForwardVisit(v);
                                      setForwardDoctorId(v.doctorId || (doctors[0]?.id ?? ''));
                                    }}
                                    title="ক্যাশিয়ারের কাছে ফি গ্রহণের জন্য পাঠান"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                                  >
                                    <CreditCard className="size-3" />
                                    <span>ক্যাশিয়ার</span>
                                  </Button>

                                  {/* Timeline Button */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setTimelinePatient({
                                        id: v.patient?.id || v.patientId,
                                        name: v.patient?.nameBn || v.patient?.nameEn || '',
                                        mrn: v.patient?.mrn,
                                        phone: v.patient?.phone,
                                      })
                                    }
                                    title="রোগীর টাইমলাইন দেখুন"
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  >
                                    <Clock className="size-3.5" />
                                  </Button>
                                </div>
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
          </div>
        </>
      )}

      {/* New Patient Registration Dialog */}
      <CreatePatientDialog
        open={showRegModal}
        onOpenChange={setShowRegModal}
        onSuccess={(created) => {
          setSelectedPatientId(created.id);
          loadData();
        }}
      />

      {/* QR / Barcode Scanner Modal */}
      {showScannerModal && (
        <QrScannerModal
          onScan={(scanned) => {
            const hit = patients.find(
              (p) =>
                p.mrn.toLowerCase() === scanned.toLowerCase() ||
                p.phone === scanned ||
                p.id === scanned,
            );
            if (hit) {
              setSelectedPatientId(hit.id);
            } else {
              setSearch(scanned);
            }
            setShowScannerModal(false);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Patient Intake Form Modal */}
      {intakePatient && (
        <PatientIntakeFormModal
          open={showIntakeModal}
          onOpenChange={(op) => {
            setShowIntakeModal(op);
            if (!op) setIntakePatient(null);
          }}
          patient={intakePatient}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* A4 Intake Assessment Print Modal */}
      <IntakeAssessmentPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        data={printData}
      />

      {/* Patient Timeline Modal */}
      <PatientTimelineModal
        open={Boolean(timelinePatient)}
        onOpenChange={(op) => {
          if (!op) setTimelinePatient(null);
        }}
        patientId={timelinePatient?.id}
        patientName={timelinePatient?.name}
        mrn={timelinePatient?.mrn}
        phone={timelinePatient?.phone}
      />

      {/* Forward to Cashier Confirmation Dialog */}
      {forwardVisit && (
        <Dialog open={Boolean(forwardVisit)} onOpenChange={(op) => !op && setForwardVisit(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-emerald-600" />
                রোগীকে ক্যাশিয়ারের কাছে পাঠান
              </DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                <div>
                  <strong>রোগী:</strong>{' '}
                  {forwardVisit.patient?.nameBn || forwardVisit.patient?.nameEn} (
                  {forwardVisit.patient?.mrn})
                </div>
                <div>
                  <strong>আগমনের সময়:</strong> {forwardVisit.checkedInAt ? new Date(forwardVisit.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'আজ'}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">পরামর্শের ডাক্তার নিশ্চিত করুন:</Label>
                <Select value={forwardDoctorId} onValueChange={setForwardDoctorId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="ডাক্তার নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.fullName} ({d.specialization || d.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ক্যাশিয়ার ডাক্তারের কনসালটেশন ফি গ্রহণ করবেন এবং রোগীকে সিরিয়াল কিউতে অন্তর্ভুক্ত করবেন।
              </p>
            </div>
            <DialogFooter className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setForwardVisit(null)}
                disabled={forwarding}
                className="text-xs"
              >
                বাতিল করুন
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmForwardToCashier}
                disabled={forwarding}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
              >
                {forwarding ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> পাঠানো হচ্ছে...
                  </>
                ) : (
                  <>
                    <Send className="size-3" />
                    ক্যাশিয়ারে পাঠান
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
