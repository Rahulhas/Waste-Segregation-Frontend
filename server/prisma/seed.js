import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    email: 'user@campus.demo',
    password: 'User@123',
    name: 'Campus User',
    role: 'USER',
  },
  {
    email: 'driver@campus.demo',
    password: 'Driver@123',
    name: 'Rajesh Kumar',
    role: 'DRIVER',
  },
  {
    email: 'admin@campus.demo',
    password: 'Admin@123',
    name: 'Priya Sharma',
    role: 'ADMIN',
  },
  {
    email: 'operator@campus.demo',
    password: 'Operator@123',
    name: 'Amit Patel',
    role: 'OPERATOR',
  },
];

async function main() {
  console.log('Seeding demo users...');

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
      },
    });
    console.log(`  ✓ ${user.role.toLowerCase()}: ${user.email}`);
  }

  console.log('\nDemo credentials:');
  DEMO_USERS.forEach((u) => {
    console.log(`  ${u.email} / ${u.password}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
