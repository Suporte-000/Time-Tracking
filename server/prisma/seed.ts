// Seed data for TimeTrack Server

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const managerPassword = await bcrypt.hash('manager123', 12);
  const devPassword = await bcrypt.hash('dev123', 12);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@timetrack.com' },
    update: {},
    create: {
      email: 'manager@timetrack.com',
      name: 'Paulo Silva',
      passwordHash: managerPassword,
      role: 'MANAGER',
      isActive: true,
    },
  });

  const developer1 = await prisma.user.upsert({
    where: { email: 'rodrigo@timetrack.com' },
    update: {},
    create: {
      email: 'rodrigo@timetrack.com',
      name: 'Rodrigo C.',
      passwordHash: devPassword,
      role: 'DEVELOPER',
      isActive: true,
    },
  });

  const developer2 = await prisma.user.upsert({
    where: { email: 'ana@timetrack.com' },
    update: {},
    create: {
      email: 'ana@timetrack.com',
      name: 'Ana L.',
      passwordHash: devPassword,
      role: 'DEVELOPER',
      isActive: true,
    },
  });

  console.log('✅ Created users:', { manager, developer1, developer2 });

  // Create projects
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { id: 'proj-1' },
      update: {},
      create: {
        id: 'proj-1',
        name: 'Dashboard BI Bicicletas',
        color: '#0B5563',
        isActive: true,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-2' },
      update: {},
      create: {
        id: 'proj-2',
        name: 'Portal MedOcup',
        subproject: 'Backend',
        color: '#14919B',
        isActive: true,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-3' },
      update: {},
      create: {
        id: 'proj-3',
        name: 'E-commerce Cliente X',
        color: '#1FB8A0',
        isActive: true,
      },
    }),
    prisma.project.upsert({
      where: { id: 'proj-4' },
      update: {},
      create: {
        id: 'proj-4',
        name: 'Reuniões e Comunicação',
        color: '#0EA5A5',
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created projects:', projects.length);

  // Create sample time entries
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

  await prisma.timeEntry.createMany({
    data: [
      {
        userId: developer1.id,
        projectId: projects[0].id,
        appName: 'Visual Studio Code',
        processName: 'Code',
        startTime: new Date(today.getTime()),
        endTime: new Date(today.getTime() + 26 * 60 * 1000),
        duration: 26 * 60,
        status: 'AUTO',
      },
      {
        userId: developer1.id,
        projectId: projects[1].id,
        appName: 'Google Chrome',
        processName: 'chrome',
        startTime: new Date(today.getTime() + 30 * 60 * 1000),
        endTime: new Date(today.getTime() + 64 * 60 * 1000),
        duration: 34 * 60,
        status: 'AUTO',
      },
      {
        userId: developer2.id,
        projectId: projects[2].id,
        appName: 'Figma',
        processName: 'Figma',
        startTime: new Date(today.getTime()),
        endTime: new Date(today.getTime() + 45 * 60 * 1000),
        duration: 45 * 60,
        status: 'AUTO',
      },
    ],
  });

  console.log('✅ Created sample time entries');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Test credentials:');
  console.log('  Manager: manager@timetrack.com / manager123');
  console.log('  Developer: rodrigo@timetrack.com / dev123');
  console.log('  Developer: ana@timetrack.com / dev123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
