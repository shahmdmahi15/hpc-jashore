// scripts/e2e-walkthrough.ts
// Programmatic Live E2E Walkthrough of Patient Lifecycle across all workstations

const API_BASE = 'http://localhost:4000/api';

async function request(path: string, options: any = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${path} failed: ${text}`);
  }
  return res.json();
}

async function runE2E() {
  console.log('=====================================================');
  console.log('🚀 HPC JASHORE — LIVE E2E PATIENT LIFECYCLE WALKTHROUGH');
  console.log('=====================================================\n');

  // Step 1: Healthcheck
  const health = await request('/healthz');
  console.log('1. API Health Check:', health);

  // Step 2: Auth Login as Admin and Staff Discovery
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@hpc.local', password: 'Admin123!' }),
  });
  const token = adminLogin.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('2. Admin Authenticated. JWT Access Token acquired.');

  const staffList = await request('/staff', { headers: authHeaders });
  const headDoc = staffList.find((s: any) => s.role === 'doctor');
  const therapist = staffList.find((s: any) => s.role === 'handler');
  const cashier = staffList.find((s: any) => s.role === 'cashier');
  console.log(`   Staff discovered: Doctor=${headDoc?.fullName}, Handler=${therapist?.fullName}`);

  // Step 3: Reception Desk — Register Patient & Issue Serial Slip
  const testPhone = `017${Math.floor(10000000 + Math.random() * 90000000)}`;
  const patient = await request('/patients', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      nameEn: 'Md. Shafiqul Islam',
      nameBn: 'মোঃ শফিকুল ইসলাম',
      phone: testPhone,
      ageYears: 48,
      gender: 'male',
      bloodGroup: 'A+',
      allergies: 'Aspirin allergy',
      address: 'Chowrasta, Jashore',
    }),
  });
  console.log(`\n3. [RECEPTION DESK] Registered Patient:`);
  console.log(`   MRN: ${patient.mrn} | Name: ${patient.nameEn} | Blood: ${patient.bloodGroup}`);

  const checkIn = await request('/visits/check-in', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      doctorId: headDoc.id,
      priority: 'normal',
    }),
  });
  console.log(`   Checked In! Issued 80mm Token Slip:`);
  console.log(`   Token Number: #${checkIn.tokenNumber} | Serial: ${checkIn.serialNumber}`);

  // Step 4: Doctor Chamber — Call Serial, SOAP Notes, 5.5in x 8.27in Prescription
  console.log(`\n4. [DOCTOR CHAMBER] Calling patient to chamber...`);
  const calledSerial = await request(`/visits/doctor/${headDoc.id}/call-next`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ note: 'Called into Chamber 1' }),
  });
  console.log(`   Now Serving Serial #${calledSerial.serialNumber} (Visit ID: ${calledSerial.visitId})`);

  // Save Consultation
  const consult = await request('/clinical/consultations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      visitId: calledSerial.visitId,
      patientId: patient.id,
      doctorId: headDoc.id,
      chiefComplaints: 'Cervical neck pain radiating to right shoulder and fingers for 4 weeks.',
      painScore: 8,
      objectiveNotes: 'Spurling test positive on right side. Limited cervical extension (20 deg).',
      provisionalDiagnosis: 'Cervical Radiculopathy (C5-C6)',
      planNotes: 'Cervical traction and posture correction.',
    }),
  });
  console.log(`   SOAP Consultation Saved! Diagnosis: ${consult.provisionalDiagnosis} | VAS Pain: 8/10`);

  // Create Prescription
  const rx = await request('/clinical/prescriptions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      visitId: calledSerial.visitId,
      patientId: patient.id,
      doctorId: headDoc.id,
      medicines: [
        { brandName: 'Naprosyn 500', genericName: 'Naproxen', dosage: '1+0+1', duration: '7 days', instructions: 'খাবারের পর' },
        { brandName: 'Myolax 50', genericName: 'Tolperisone', dosage: '1+0+1', duration: '7 days', instructions: 'খাবারের পর' },
      ],
      modalities: [
        { modalityCode: 'IFT', modalityName: 'Interferential Therapy', sessionsPrescribed: 7, frequency: 'daily' },
        { modalityCode: 'UST', modalityName: 'Ultrasound Therapy', sessionsPrescribed: 7, frequency: 'daily' },
      ],
      advice: 'Avoid sleeping on thick pillows. Perform chin tucks 3 times daily.',
    }),
  });
  console.log(`   5.5in x 8.27in Prescription Generated! ID: ${rx.id} (${rx.medicines.length} Rx meds, ${rx.modalities.length} modalities)`);

  // Step 5: Waiting Room TV Display Snapshot
  const tvSnapshot = await request('/visits/tv/snapshot');
  console.log(`\n5. [WAITING ROOM TV] Live Display Feed:`);
  console.log(`   NOW SERVING: ${tvSnapshot.nowServing?.tokenNumber} | Patient: ${tvSnapshot.nowServing?.patientName} | Chamber: ${tvSnapshot.nowServing?.chamber}`);
  console.log(`   Upcoming in queue: ${tvSnapshot.waitingQueue.length} patient(s)`);

  // Step 6: Therapy Hall — Bed Allocation, Modality Session, PIN Completion
  const beds = await request('/therapy/beds', { headers: authHeaders });
  const targetBed = beds[0];
  console.log(`\n6. [THERAPY HALL] Allocating ${targetBed.name} (${targetBed.code})...`);

  const session = await request('/therapy/sessions/start', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      bedId: targetBed.id,
      modalityCode: 'IFT',
      durationMinutes: 15,
    }),
  });
  console.log(`   Active Session Started! Duration: 15 mins | Bed: ${targetBed.name}`);

  // Complete session with therapist PIN (3579)
  const completedSession = await request(`/therapy/sessions/${session.id}/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      pin: '3579',
      painScoreAfter: 3,
      outcomeNote: 'Neck stiffness significantly reduced. Good compliance.',
    }),
  });
  console.log(`   Session Verified & Completed with PIN! Pain reduced: 8/10 -> 3/10`);

  // Step 7: Cashier Counter — Shift Float, Bill Settlement, bKash Payment
  console.log(`\n7. [CASHIER DESK] Drawer & Billing Settlement...`);
  const drawer = await request('/billing/drawers/open', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      deskId: 'reception-1',
      openingCashPaisa: 500000, // 5,000 BDT
    }),
  });
  console.log(`   Cash Drawer Float Opened: ৳${drawer.openingCashPaisa / 100} BDT`);

  const bill = await request('/billing/bills', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      visitId: calledSerial.visitId,
      items: [
        { itemType: 'consultation', description: 'Doctor Consultation (Dr. Toufiq)', unitPricePaisa: 50000, quantity: 1, totalPaisa: 50000 },
        { itemType: 'therapy', description: 'IFT Therapy Session', unitPricePaisa: 30000, quantity: 1, totalPaisa: 30000 },
      ],
      discountPaisa: 5000, // 50 BDT discount
      paidPaisa: 75000, // 750 BDT paid
      paymentMethod: 'bkash',
      txnId: 'BKASH-TX-998811',
    }),
  });
  console.log(`   Bill Settled! Bill #: ${bill.billNumber}`);
  console.log(`   Total: ৳${bill.totalPaisa / 100} BDT | Paid via bKash: ৳${bill.paidPaisa / 100} BDT (Txn: BKASH-TX-998811)`);
  console.log(`   Due Balance: ৳${bill.duePaisa / 100} BDT`);

  console.log('\n=====================================================');
  console.log('✅ ALL 5 WORKSTATIONS PASSED E2E WALKTHROUGH TEST!');
  console.log('=====================================================');
}

runE2E().catch((err) => {
  console.error('E2E Walkthrough Failed:', err);
  process.exit(1);
});
