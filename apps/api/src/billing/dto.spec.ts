// apps/api/src/billing/dto.spec.ts
// Runnable with: pnpm --filter @hpc/api exec ts-node -T src/billing/dto.spec.ts
import 'reflect-metadata';
import assert from 'node:assert';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BillItemInputDto, CreateBillDto } from './dto';

async function runDtoTests() {
  console.log('--- Running Billing DTO Validation Test Suite ---');

  // Strict ValidationPipe options matching apps/api/src/main.ts:43-45
  const validatorOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
  };

  // TEST 1: BillItemInputDto with totalPaisa passes validation without error
  const itemWithTotalPaisa = {
    itemType: 'therapy',
    itemId: 'item-uuid-1',
    description: 'Physiotherapy Rehab Session',
    unitPricePaisa: 50000,
    quantity: 1,
    discountPaisa: 0,
    totalPaisa: 50000,
  };

  const instance1 = plainToInstance(BillItemInputDto, itemWithTotalPaisa);
  const errors1 = await validate(instance1, validatorOptions);

  assert.strictEqual(
    errors1.length,
    0,
    `Validation failed unexpectedly when totalPaisa was passed: ${JSON.stringify(errors1.map((e) => e.constraints))}`,
  );
  assert.strictEqual(instance1.totalPaisa, 50000);
  console.log('✓ TEST 1 Passed: BillItemInputDto with totalPaisa passes strict validation without error');

  // TEST 2: Nested inside CreateBillDto items array with totalPaisa
  const createBillPayload = {
    patientId: 'patient-uuid-1',
    items: [
      {
        itemType: 'therapy',
        description: 'Session 1',
        unitPricePaisa: 50000,
        quantity: 2,
        totalPaisa: 100000,
      },
      {
        itemType: 'consultation',
        description: 'Doctor Assessment',
        unitPricePaisa: 30000,
        quantity: 1,
        totalPaisa: 30000,
      },
    ],
    overallDiscountPaisa: 0,
    paidPaisa: 130000,
    paymentMethod: 'cash',
  };

  const instance2 = plainToInstance(CreateBillDto, createBillPayload);
  const errors2 = await validate(instance2, validatorOptions);
  assert.strictEqual(
    errors2.length,
    0,
    `CreateBillDto validation failed with nested items totalPaisa: ${JSON.stringify(errors2)}`,
  );
  console.log('✓ TEST 2 Passed: CreateBillDto with items containing totalPaisa passes validation');

  // TEST 3: Negative totalPaisa fails validation (@Min(0))
  const invalidNegativeItem = {
    itemType: 'consultation',
    description: 'Consultation',
    unitPricePaisa: 50000,
    quantity: 1,
    totalPaisa: -500,
  };
  const instance3 = plainToInstance(BillItemInputDto, invalidNegativeItem);
  const errors3 = await validate(instance3, validatorOptions);
  assert.ok(errors3.length > 0, 'Negative totalPaisa must trigger validation error');
  assert.ok(
    errors3.some((e) => e.property === 'totalPaisa'),
    'Error must specifically target totalPaisa property',
  );
  console.log('✓ TEST 3 Passed: Negative totalPaisa is rejected with validation error');

  console.log('\n🎉 ALL BILLING DTO TESTS PASSED!\n');
}

runDtoTests().catch((err) => {
  console.error('❌ DTO Test execution failed:', err);
  process.exit(1);
});