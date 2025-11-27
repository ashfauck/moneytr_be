import { PrismaClient } from '@prisma/client';
import { HashUtils } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users
  const testUsers = [
    {
      phoneNumber: '+14155552671',
      name: 'John Doe',
      email: 'john.doe@example.com',
      pin: '123456',
      isVerified: true,
      accountStatus: 'ACTIVE' as const,
    },
    {
      phoneNumber: '+966501234567',
      name: 'Ahmed Ali',
      email: 'ahmed.ali@example.com',
      pin: '654321',
      isVerified: true,
      accountStatus: 'ACTIVE' as const,
    },
    {
      phoneNumber: '+919876543210',
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      pin: '111111',
      isVerified: false,
      accountStatus: 'PENDING_VERIFICATION' as const,
    },
  ];

  for (const userData of testUsers) {
    const pinHash = await HashUtils.hash(userData.pin);

    const user = await prisma.user.upsert({
      where: { phoneNumber: userData.phoneNumber },
      update: {},
      create: {
        phoneNumber: userData.phoneNumber,
        name: userData.name,
        email: userData.email,
        pinHash,
        isVerified: userData.isVerified,
        accountStatus: userData.accountStatus,
      },
    });

    console.log(`✅ Created user: ${user.phoneNumber} (${user.name})`);
  }

  console.log('✨ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
