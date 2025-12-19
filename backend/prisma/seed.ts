import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 创建默认地点
  const location = await prisma.location.upsert({
    where: { name: '紫竹郡' },
    update: {},
    create: {
      name: '紫竹郡',
      isDefault: true,
    },
  });

  console.log('Created default location:', location);

  // 创建默认玩家（本人）
  const existingMe = await prisma.player.findFirst({
    where: { isMe: true },
  });

  if (!existingMe) {
    const me = await prisma.player.create({
      data: {
        name: '我',
        isMe: true,
      },
    });
    console.log('Created default player:', me);
  } else {
    console.log('Default player already exists');
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

