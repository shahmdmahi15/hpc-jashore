// apps/web/components/ReceptionView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import ThermalSlipModal from './ThermalSlipModal';
import QrScannerModal from './QrScannerModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';

export default function ReceptionView() {
  const [mobileTab, setMobileTab] = useState<'checkin' | 'queue'>('checkin');
  const [patients, setPatients] = useState<any[]>([]);
  const [todayVisits, setTodayVisits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regData, setRegData] = useState({
    nameEn: '',
    nameBn: '',
    phone: '',
    ageYears: '',
    gender: 'male',
    bloodGroup: 'B+',
    address: 'Jashore',
    allergies: '',
  });

  // Check-In State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly'>('normal');

  // Thermal Slip Print State
  const [printedToken, setPrintedToken] = useState<any>(null);

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
      const doctors = (s || []).filter((st: any) => st.role === 'head_doctor' || st.role === 'doctor');
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

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.nameEn || !regData.phone) {
      alert('Please fill Name and Phone');
      return;
    }
    try {
      const created = await api.patients.create({
        ...regData,
        ageYears: regData.ageYears ? parseInt(regData.ageYears) : undefined,
      });
      alert(`Patient Registered! MRN: ${created.mrn}`);
      setShowRegModal(false);
      setSelectedPatientId(created.id);
      loadData();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId) {
      alert('Please select both a Patient and a Doctor');
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

      setPrintedToken({
        tokenNumber: res.tokenNumber || `A-${String(res.serialNumber).padStart(3, '0')}`,
        serialNumber: res.serialNumber,
        patientName: pat?.nameEn || 'Patient',
        patientNameBn: pat?.nameBn,
        mrn: pat?.mrn || 'N/A',
        doctorName: doc?.fullName || 'Physiotherapist',
        priority,
        issuedAt: new Date().toISOString(),
        clinicNameEn: 'HPC Health & Pain Care Center, Jashore',
        clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর',
      });

      loadData();
    } catch (err: any) {
      alert(`Check-in failed: ${err.message}`);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()),
  );

  const doctors = staffList.filter((s) => s.role === 'head_doctor' || s.role === 'doctor');

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile Tab Switcher (<lg screens: smartphones, small tablets) */}
      <div className="flex lg:hidden rounded-xl border border-border bg-card p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('checkin')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'checkin'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          📋 Check-in &amp; Patients
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('queue')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'queue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          ⏱️ Today&apos;s Queue ({todayVisits.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Check-in & Patient Search */}
        <div
          className={cn(
            'flex flex-col gap-6 lg:col-span-6 xl:col-span-5',
            mobileTab === 'queue' && 'hidden lg:flex'
          )}
        >
          {/* Check-in Card */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>📋</span> Check-in &amp; Token Issue
              </CardTitle>
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowRegModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                + New Patient
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckIn} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Search / Select Patient:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Filter by Name, Phone, MRN..."
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

                  <Select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Patient ({filteredPatients.length} found) --</option>
                    {filteredPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.mrn} · {p.nameEn} ({p.phone}) {p.bloodGroup ? `[${p.bloodGroup}]` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Assigning Doctor / Chamber:"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.specialization || d.role})
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Queue Priority:"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="normal">Normal (সাধারণ)</option>
                    <option value="emergency">Emergency (জরুরি)</option>
                    <option value="package">Package Follow-up (প্যাকেজ)</option>
                    <option value="elderly">Elderly / Disabled (বয়োজ্যেষ্ঠ)</option>
                    <option value="follow_up">Follow Up (ফলোআপ)</option>
                  </Select>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm sm:text-base shadow-sm"
                >
                  🎟️ Issue Serial &amp; Print 80mm Slip
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Directory List Card */}
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
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
                      <th className="p-2.5">Blood</th>
                      <th className="p-2.5 text-right">Action</th>
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
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                            {p.bloodGroup || 'N/A'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
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
                        <th className="p-3">Token</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3 hidden sm:table-cell">Doctor</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 hidden md:table-cell">Location</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {todayVisits.map((v) => (
                        <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <span className="font-extrabold text-emerald-600 text-sm sm:text-base">
                              #{v.tokenNumber}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-foreground">{v.patient?.nameEn}</div>
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
                          <td className="p-3 hidden md:table-cell text-muted-foreground capitalize">
                            {v.currentLocation || 'reception'}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPrintedToken({
                                  tokenNumber: `A-${String(v.tokenNumber).padStart(3, '0')}`,
                                  serialNumber: v.tokenNumber,
                                  patientName: v.patient?.nameEn || 'Patient',
                                  patientNameBn: v.patient?.nameBn,
                                  mrn: v.patient?.mrn || 'N/A',
                                  doctorName: v.doctor?.fullName || 'Doctor',
                                  priority: v.priority || 'normal',
                                  issuedAt: v.createdAt,
                                  clinicNameEn: 'HPC Health & Pain Care Center',
                                  clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার',
                                })
                              }
                              className="h-7 text-xs flex items-center gap-1 ml-auto"
                            >
                              🖨️ <span className="hidden sm:inline">Repr.</span> Slip
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
      </div>

      {/* New Patient Registration Dialog */}
      <Dialog open={showRegModal} onOpenChange={setShowRegModal}>
        <DialogContent className="max-w-xl" onClose={() => setShowRegModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Register New Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegisterPatient} className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name (English) *"
                type="text"
                required
                value={regData.nameEn}
                onChange={(e) => setRegData({ ...regData, nameEn: e.target.value })}
              />
              <Input
                label="নাম (বাংলা)"
                type="text"
                value={regData.nameBn}
                onChange={(e) => setRegData({ ...regData, nameBn: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mobile Number *"
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                value={regData.phone}
                onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
              />
              <Input
                label="Age (Years)"
                type="number"
                value={regData.ageYears}
                onChange={(e) => setRegData({ ...regData, ageYears: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Gender"
                value={regData.gender}
                onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
              >
                <option value="male">Male (পুরুষ)</option>
                <option value="female">Female (মহিলা)</option>
                <option value="other">Other</option>
              </Select>

              <Select
                label="Blood Group"
                value={regData.bloodGroup}
                onChange={(e) => setRegData({ ...regData, bloodGroup: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </Select>
            </div>

            <Input
              label="Address"
              type="text"
              value={regData.address}
              onChange={(e) => setRegData({ ...regData, address: e.target.value })}
            />

            <Input
              label="Allergies / Warnings (If any)"
              type="text"
              placeholder="e.g. Penicillin, NSAID allergy"
              value={regData.allergies}
              onChange={(e) => setRegData({ ...regData, allergies: e.target.value })}
            />

            <div className="flex gap-3 mt-4 pt-2 border-t border-border">
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save &amp; Generate MRN
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 80mm Token Slip Modal */}
      {printedToken && (
        <ThermalSlipModal tokenData={printedToken} onClose={() => setPrintedToken(null)} />
      )}

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
    </div>
  );
}
