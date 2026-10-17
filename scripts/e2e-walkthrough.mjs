// scripts/e2e-walkthrough.mjs
// Native ES module for Live E2E Patient Lifecycle Walkthrough

const API_BASE = 'http://localhost:4000/api';

async function request(path, options = {}) {
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
  console.log('2. Admin Authenticated. Response:', JSON.stringify(adminLogin));
  const authHeaders = { Authorization: `Bearer ${token}` };

  const staffList = await request('/staff', { headers: authHeaders });
  const headDoc = staffList.find((s) => s.role === 'head_doctor');
  const therapist = staffList.find((s) => s.role === 'therapist');
  const cashier = staffList.find((s) => s.role === 'cashier');
  console.log(`   Staff discovered: Doctor=${headDoc?.fullName}, Therapist=${therapist?.fullName}`);

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
  console.log(`   Token Number: #${checkIn.tokenSlip?.tokenNumber} | Serial: ${checkIn.tokenSlip?.serialNumber}`);

  // Step 4: Doctor Chamber — Call Serial, SOAP Notes, 5.5in x 8.27in Prescription
  console.log(`\n4. [DOCTOR CHAMBER] Calling patient to chamber...`);
  const calledSerial = await request(`/visits/doctor/${headDoc.id}/call-next`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ chamberCode: 'Chamber 1' }),
  });
  const visitId = calledSerial.serial?.visitId ?? checkIn.visit.id;
  console.log(`   Now Serving Serial #${calledSerial.payload?.serialNumber} (Visit ID: ${visitId})`);

  // Save Consultation (with embedded Rx and Therapy Plans)
  const consult = await request('/clinical/consultations', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      visitId: visitId,
      patientId: patient.id,
      chiefComplaints: 'Cervical neck pain radiating to right shoulder and fingers for 4 weeks.',
      painScoreVas: 8,
      soapNotes: {
        subjective: 'Pain radiating to right shoulder.',
        objective: 'Spurling test positive on right side. Limited cervical extension (20 deg).',
        assessment: 'Cervical Radiculopathy (C5-C6)',
        plan: 'Cervical traction and posture correction.',
      },
      diagnosis: ['Cervical Radiculopathy (C5-C6)'],
      therapyPlans: [
        { modalityCode: 'IFT', totalSessions: 7, frequency: 'daily', notes: 'Daily sessions' },
        { modalityCode: 'UST', totalSessions: 7, frequency: 'daily', notes: 'Daily sessions' },
      ],
      prescriptionItems: [
        { medicineName: 'Naprosyn 500', dosage: '1+0+1', durationDays: 7, instructionsBn: 'খাবারের পর' },
        { medicineName: 'Myolax 50', dosage: '1+0+1', durationDays: 7, instructionsBn: 'খাবারের পর' },
      ],
      generalAdvice: 'Avoid sleeping on thick pillows. Perform chin tucks 3 times daily.',
    }),
  });
  console.log(`   SOAP Consultation & 5.5in x 8.27in Prescription Saved! ID: ${consult.id} | VAS: 8/10`);

  // Step 5: Waiting Room TV Display Snapshot
  const tvSnapshot = await request('/visits/tv/snapshot');
  console.log(`\n5. [WAITING ROOM TV] Live Display Feed:`);
  const ch = tvSnapshot.channels?.[0];
  console.log(`   NOW SERVING: Serial #${ch?.nowServing?.serialNumber ?? 'None'} | Patient: ${ch?.nowServing?.patientName ?? 'None'}`);
  console.log(`   Upcoming in doctor queue: ${ch?.nextQueue?.length ?? 0} patient(s)`);

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
    }),
  });
  console.log(`   Active Session Started! Bed: ${targetBed.name}`);

  // Complete session
  const completedSession = await request(`/therapy/sessions/${session.id}/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      durationMinutes: 15,
      painScoreAfter: 3,
      outcomeNote: 'Neck stiffness significantly reduced. Good compliance.',
    }),
  });
  console.log(`   Session Verified & Completed! Pain reduced: 8/10 -> 3/10`);

  // Step 7: Cashier Counter — Shift Float, Bill Settlement, bKash Payment
  console.log(`\n7. [CASHIER DESK] Drawer & Billing Settlement...`);
  const deskList = await request('/desks', { headers: authHeaders });
  const cashierDesk = deskList.find((d) => d.type === 'cashier') || deskList[0];

  let drawer;
  const currentDrawer = await request('/billing/drawers/current', { headers: authHeaders });
  if (currentDrawer.hasActiveDrawer && currentDrawer.drawer) {
    drawer = currentDrawer.drawer;
    console.log(`   Active Cash Drawer Reused: ৳${drawer.openingCashPaisa / 100} BDT (Desk: ${cashierDesk.name})`);
  } else {
    drawer = await request('/billing/drawers/open', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        deskId: cashierDesk.id,
        openingCashPaisa: 500000, // 5,000 BDT
      }),
    });
    console.log(`   Cash Drawer Float Opened: ৳${drawer.openingCashPaisa / 100} BDT (Desk: ${cashierDesk.name})`);
  }

  const bill = await request('/billing/bills', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patientId: patient.id,
      visitId: visitId,
      items: [
        { itemType: 'consultation', description: 'Doctor Consultation (Dr. Toufiq)', unitPricePaisa: 50000, quantity: 1 },
        { itemType: 'therapy', description: 'IFT Therapy Session', unitPricePaisa: 30000, quantity: 1 },
      ],
      overallDiscountPaisa: 5000, // 50 BDT discount
    }),
  });
  console.log(`   Bill Created! Bill #: ${bill.billNumber} | Net Payable: ৳${(bill.totalPaisa ?? bill.netTotalPaisa) / 100} BDT`);

  const payment = await request(`/billing/bills/${bill.id}/pay`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      amountPaisa: 75000, // 750 BDT paid
      method: 'bkash',
      txnId: 'BKASH-TX-998811',
    }),
  });
  console.log(`   Payment Recorded via bKash! Paid: ৳${payment.paidPaisa / 100} BDT (Txn: BKASH-TX-998811)`);
  console.log(`   Remaining Due Balance: ৳${payment.duePaisa / 100} BDT`);

  console.log('\n=====================================================');
  console.log('✅ ALL 5 WORKSTATIONS PASSED E2E WALKTHROUGH TEST!');
  console.log('=====================================================');
}

runE2E().catch((err) => {
  console.error('E2E Walkthrough Failed:', err);
  process.exit(1);
});
