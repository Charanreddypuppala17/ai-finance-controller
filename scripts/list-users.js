const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            runs: true,
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log('==============================================');
    console.log(`📊 REVALTO USER REPORT (Total Users: ${users.length})`);
    console.log('==============================================\n');

    users.forEach((user, index) => {
      console.log(`${index + 1}. [${user.name}]`);
      console.log(`   📧 Email:        ${user.email}`);
      console.log(`   🆔 User ID:      ${user.id}`);
      console.log(`   📅 Created At:   ${user.createdAt.toISOString()}`);
      console.log(`   📁 Total Runs:   ${user._count.runs}`);
      console.log(`   💳 Transactions: ${user._count.transactions}`);
      console.log('----------------------------------------------');
    });
  } catch (error) {
    console.error('Error fetching users from database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
