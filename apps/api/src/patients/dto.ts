import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ description: 'Full name in English' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Full name in Bengali' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameBn?: string;

  @ApiProperty({ description: 'Bangladeshi 11-digit mobile number: 01XXXXXXXXX' })
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Phone must be a valid Bangladeshi mobile number (01XXXXXXXXX)' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ description: 'Age in years' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ageYears?: number;

  @ApiProperty({ enum: ['male', 'female'], description: 'Gender: strictly male or female' })
  @IsIn(['male', 'female'], { message: 'Gender must be strictly male or female' })
  gender!: 'male' | 'female';

  @ApiPropertyOptional({ description: 'Blood group: A+, A-, B+, B-, AB+, AB-, O+, O-' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @ApiPropertyOptional({ description: 'Full residential address' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;

  @ApiPropertyOptional({ description: 'Occupation / Profession' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  occupation?: string;

  @ApiPropertyOptional({ description: 'Profession alias for occupation' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  profession?: string;

  @ApiPropertyOptional({ description: 'Emergency contact name and phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  emergencyContact?: string;

  @ApiPropertyOptional({ description: 'Allergies list' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ description: 'Chronic medical conditions' })
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiPropertyOptional({ description: 'Contraindications or precautions' })
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiPropertyOptional({ description: 'General clinical or frontdesk notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Consent signed flag (0 or 1)' })
  @IsOptional()
  @IsInt()
  consentSigned?: number;
}

export class UpdatePatientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameBn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Phone must be a valid Bangladeshi mobile number (01XXXXXXXXX)' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ageYears?: number;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'], { message: 'Gender must be strictly male or female' })
  gender?: 'male' | 'female';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  profession?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiPropertyOptional({ description: 'General clinical or frontdesk notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  consentSigned?: number;
}

export class CreateIntakeFormDto {
  @ApiPropertyOptional({ description: 'Existing patient ID if already registered' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Target doctor user/staff ID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Target date (defaults to today)' })
  @IsOptional()
  @IsString()
  date?: string;

  // 1. Personal Info
  @ApiProperty({ description: 'Patient Name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Patient Age in years' })
  @IsOptional()
  @IsInt()
  ageYears?: number;

  @ApiProperty({ description: 'Mobile Number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: ['male', 'female', 'other'], description: 'Gender' })
  @IsIn(['male', 'female', 'other'])
  gender!: 'male' | 'female' | 'other';

  @ApiPropertyOptional({ description: 'Occupation / Profession' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  // 2. Initial Health Info
  @ApiPropertyOptional({ description: 'BP Systolic' })
  @IsOptional()
  @IsInt()
  bpSystolic?: number;

  @ApiPropertyOptional({ description: 'BP Diastolic' })
  @IsOptional()
  @IsInt()
  bpDiastolic?: number;

  @ApiPropertyOptional({ description: 'Blood Sugar' })
  @IsOptional()
  bloodSugar?: string | number;

  @ApiPropertyOptional({ description: 'Has Diabetes (0: No, 1: Yes)' })
  @IsOptional()
  @IsInt()
  hasDiabetes?: number;

  @ApiPropertyOptional({ description: 'Weight in kg' })
  @IsOptional()
  weightKg?: string | number;

  @ApiPropertyOptional({ description: 'Chief complaint' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'Problem duration' })
  @IsOptional()
  @IsString()
  problemDuration?: string;

  // 3. Past Medical History
  @ApiPropertyOptional({ description: 'Seen doctor before (0: No, 1: Yes)' })
  @IsOptional()
  @IsInt()
  seenDoctorBefore?: number;

  @ApiPropertyOptional({ description: 'Previous doctor details' })
  @IsOptional()
  @IsString()
  previousDoctorDetails?: string;

  @ApiPropertyOptional({ description: 'Has previous reports (0: No, 1: Yes)' })
  @IsOptional()
  @IsInt()
  hasPreviousReports?: number;

  @ApiPropertyOptional({ description: 'Previous report names' })
  @IsOptional()
  @IsString()
  previousReportNames?: string;

  @ApiPropertyOptional({ description: 'Takes regular medication (0: No, 1: Yes)' })
  @IsOptional()
  @IsInt()
  takesRegularMedication?: number;

  @ApiPropertyOptional({ description: 'Regular medication details' })
  @IsOptional()
  @IsString()
  regularMedicationDetails?: string;

  @ApiPropertyOptional({ description: 'Has drug allergies (0: No, 1: Yes)' })
  @IsOptional()
  @IsInt()
  hasDrugAllergies?: number;

  @ApiPropertyOptional({ description: 'Drug allergy details' })
  @IsOptional()
  @IsString()
  drugAllergyDetails?: string;

  // 4. Referral Source
  @ApiPropertyOptional({ description: 'Referral source' })
  @IsOptional()
  @IsString()
  referralSource?: string;

  @ApiPropertyOptional({ description: 'Referral other details' })
  @IsOptional()
  @IsString()
  referralOtherDetails?: string;

  // 5. Reception Notes
  @ApiPropertyOptional({ description: 'Receptionist name' })
  @IsOptional()
  @IsString()
  receptionistName?: string;

  @ApiPropertyOptional({ description: 'Special notes or reference' })
  @IsOptional()
  @IsString()
  specialNotes?: string;

  @ApiPropertyOptional({ description: 'Forward to cashier immediately (default true)' })
  @IsOptional()
  @IsBoolean()
  forwardToCashier?: boolean;
}

export class AdmitToQueueDto {
  @ApiPropertyOptional({ description: 'Consultation fee collected in Taka' })
  @IsOptional()
  @IsInt()
  feeTaka?: number;

  @ApiPropertyOptional({ description: 'Payment method: cash, bkash, nagad, card' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Chamber room ID override' })
  @IsOptional()
  @IsString()
  chamberRoomId?: string;

  @ApiPropertyOptional({ description: 'Target doctor ID override' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTimelineEventDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  @IsNotEmpty()
  step!: string;

  @ApiProperty({ description: 'English Title' })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiProperty({ description: 'Bengali Title' })
  @IsString()
  @IsNotEmpty()
  titleBn!: string;

  @ApiPropertyOptional({ description: 'English Description' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Bengali Description' })
  @IsOptional()
  @IsString()
  descriptionBn?: string;

  @ApiPropertyOptional({ description: 'Visit ID' })
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional({ description: 'Intake form ID' })
  @IsOptional()
  @IsString()
  intakeFormId?: string;

  @ApiPropertyOptional({ description: 'Metadata JSON' })
  @IsOptional()
  metadataJson?: string;
}

export class CreateAssessmentFileDto {
  @ApiPropertyOptional({ description: 'Target doctor user ID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Target doctor name' })
  @IsOptional()
  @IsString()
  doctorName?: string;

  @ApiPropertyOptional({ description: 'Associated visit ID' })
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional({ description: 'Assessment date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  assessmentDate?: string;

  // Demographics
  @ApiProperty({ description: 'Patient Name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Age' })
  @IsOptional()
  @IsString()
  age?: string;

  @ApiPropertyOptional({ description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'ID No / MRN' })
  @IsOptional()
  @IsString()
  idNo?: string;

  @ApiPropertyOptional({ description: 'Occupation' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Mobile Phone' })
  @IsOptional()
  @IsString()
  mobile?: string;

  // Section 2: Pain Details
  @ApiPropertyOptional({ description: 'Pain areas JSON array string or array' })
  @IsOptional()
  painAreas?: any;

  @ApiPropertyOptional({ description: 'Pain areas others text' })
  @IsOptional()
  @IsString()
  painAreaOthers?: string;

  @ApiPropertyOptional({ description: 'Side: Right, Left, Both' })
  @IsOptional()
  @IsString()
  side?: string;

  @ApiPropertyOptional({ description: 'Duration' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ description: 'Pain types JSON array string or array' })
  @IsOptional()
  painTypes?: any;

  // Section 3: Pain Scale
  @ApiPropertyOptional({ description: 'VAS Score 0 to 10' })
  @IsOptional()
  @IsInt()
  vasScore?: number;

  @ApiPropertyOptional({ description: 'Pain increases with' })
  @IsOptional()
  painIncreasesWith?: any;

  @ApiPropertyOptional({ description: 'Pain reduces with' })
  @IsOptional()
  painReducesWith?: any;

  // Section 4: History
  @ApiPropertyOptional({ description: 'Injury / Accident: yes, no' })
  @IsOptional()
  @IsString()
  injuryAccident?: string;

  @ApiPropertyOptional({ description: 'Injury details' })
  @IsOptional()
  @IsString()
  injuryDetails?: string;

  @ApiPropertyOptional({ description: 'Posture advice / habits: yes, no' })
  @IsOptional()
  @IsString()
  postureAdvice?: string;

  @ApiPropertyOptional({ description: 'Posture habits' })
  @IsOptional()
  @IsString()
  postureHabits?: string;

  @ApiPropertyOptional({ description: 'Surgery history: yes, no' })
  @IsOptional()
  @IsString()
  surgeryHistory?: string;

  @ApiPropertyOptional({ description: 'Surgery details' })
  @IsOptional()
  @IsString()
  surgeryDetails?: string;

  @ApiPropertyOptional({ description: 'Previous treatment' })
  @IsOptional()
  previousTreatment?: any;

  @ApiPropertyOptional({ description: 'Previous treatment details' })
  @IsOptional()
  @IsString()
  previousTreatmentDetails?: string;

  // Section 5: Functional Limitation
  @ApiPropertyOptional({ description: 'Functional limitations' })
  @IsOptional()
  functionalLimitations?: any;

  @ApiPropertyOptional({ description: 'Functional notes' })
  @IsOptional()
  @IsString()
  functionalNotes?: string;

  // Section 6: Physical Examination
  @ApiPropertyOptional({ description: 'ROM: Normal, Restricted' })
  @IsOptional()
  @IsString()
  rom?: string;

  @ApiPropertyOptional({ description: 'Muscle spasm: yes, no' })
  @IsOptional()
  @IsString()
  muscleSpasm?: string;

  @ApiPropertyOptional({ description: 'Tenderness: yes, no' })
  @IsOptional()
  @IsString()
  tenderness?: string;

  @ApiPropertyOptional({ description: 'Swelling: yes, no' })
  @IsOptional()
  @IsString()
  swelling?: string;

  @ApiPropertyOptional({ description: 'Physical exam notes' })
  @IsOptional()
  @IsString()
  physicalExamNotes?: string;

  // Section 7: Physiotherapy Diagnosis
  @ApiPropertyOptional({ description: 'Physiotherapy Diagnosis' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  // Section 8: Treatment Plan
  @ApiPropertyOptional({ description: 'Treatment plans' })
  @IsOptional()
  treatmentPlans?: any;

  @ApiPropertyOptional({ description: 'Treatment plan notes' })
  @IsOptional()
  @IsString()
  treatmentPlanNotes?: string;

  @ApiPropertyOptional({ description: 'Prescribed sessions count' })
  @IsOptional()
  @IsInt()
  prescribedSessions?: number;

  // Section 9: Home Advice
  @ApiPropertyOptional({ description: 'Exercise explained: yes, no' })
  @IsOptional()
  @IsString()
  exerciseExplained?: string;

  @ApiPropertyOptional({ description: 'Home posture advice: yes, no' })
  @IsOptional()
  @IsString()
  homePostureAdvice?: string;

  @ApiPropertyOptional({ description: 'Home advice notes' })
  @IsOptional()
  @IsString()
  homeAdviceNotes?: string;

  // Follow-up & Progress
  @ApiPropertyOptional({ description: 'Pain scale after treatment (VAS 0-10)' })
  @IsOptional()
  @IsInt()
  painScaleAfterTreatment?: number;

  @ApiPropertyOptional({ description: 'Improvement notes' })
  @IsOptional()
  @IsString()
  improvement?: string;

  @ApiPropertyOptional({ description: 'Therapist signature' })
  @IsOptional()
  @IsString()
  therapistSignature?: string;

  @ApiPropertyOptional({ description: 'Status: active, completed, archived' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateAssessmentFileDto extends CreateAssessmentFileDto {}

