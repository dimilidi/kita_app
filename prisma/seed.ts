import { Day, PrismaClient, UserSex } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.admin.findFirst();

  if (existing) {
    console.log("⏭️ Database already seeded, skipping...");
    return;
  }

  console.log("🌱 Seeding database...");

  // ADMIN
  await prisma.admin.createMany({
    data: [
      { id: "admin1", username: "admin1" },
    ],
    skipDuplicates: true,
  });

  // AGE GROUPS (Grades)
  await prisma.grade.createMany({
    data: [
      { level: 1 }, // Krippe (0-3)
      { level: 2 }, // Kindergarten (3-6)
    ],
    skipDuplicates: true,
  });

  //  GROUPS (Classes)
  await prisma.class.createMany({
    data: [
      { name: "Sonnenkäfer", gradeId: 1, capacity: 12 },
      { name: "Regenbogen", gradeId: 1, capacity: 12 },
      { name: "Bären", gradeId: 2, capacity: 20 },
      { name: "Tiger", gradeId: 2, capacity: 20 },
    ],
    skipDuplicates: true,
  });

    // ZONES
  await prisma.zone.createMany({
    data: [
      { id: "zone1", name: "Turnhalle" },
      { id: "zone2", name: "Spielplatz" },
      { id: "zone3", name: "Atelier" },
      { id: "zone4", name: "Schlafraum" },
      { id: "zone5", name: "Essraum" },
      { id: "zone6", name: "Bauwelt" },
    ],
    skipDuplicates: true,
  });

  const zones = await prisma.zone.findMany();

//  TEACHERS (Erzieher)
 const classes = await prisma.class.findMany();

  for (let i = 1; i <= 6; i++) {
    if (classes.length > 0) {
      await prisma.teacher.create({
        data: {
          id: `teacher${i}`,
          username: `teacher${i}`,
          name: `Erzieher${i}`,
          surname: `Test`,
          email: `teacher${i}@kita.com`,
          phone: `12345678${i}`,
          address: `Street ${i}`,
          bloodType: "A+",
          sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
          birthday: new Date(
            new Date().setFullYear(new Date().getFullYear() - 30)
          ),
          classes: {
            connect: [{ id: classes[i % classes.length].id }],
          },
        },
      })
    }
  };
  

  const teachers = await prisma.teacher.findMany();

  for (let i = 1; i <= 8; i++) {
    await prisma.lesson.create({
      data: {
        name: `Lesson${i}`,
        day: Day[
          Object.keys(Day)[
            Math.floor(Math.random() * Object.keys(Day).length)
          ] as keyof typeof Day
        ],
        startTime: new Date(),
        endTime: new Date(),
        zone: {
          connect: { id: zones[(i - 1) % zones.length].id },
        },
        class: {
          connect: { id: classes[i % classes.length].id },
        },
        teacher: {
          connect: { id: teachers[i % teachers.length].id },
        },
      },
    });
  }

  
  //  PARENTS
  for (let i = 1; i <= 20; i++) {
    await prisma.parent.create({
      data: {
        id: `parent${i}`,
        username: `parent${i}`,
        name: `Parent${i}`,
        surname: `Test`,
        email: `parent${i}@mail.com`,
        phone: `99988877${i}`,
        address: `Address ${i}`,
      },
    });
  }

  //  CHILDREN (Students)
  for (let i = 1; i <= 40; i++) {
    const age = Math.floor(Math.random() * 5) + 1; // 1–6 years
    const gradeId = age <= 3 ? 1 : 2;

    await prisma.student.create({
      data: {
        id: `child${i}`,
        username: `child${i}`,
        name: `Child${i}`,
        surname: `Test`,
        email: `child${i}@mail.com`,
        phone: `00011122${i}`,
        address: `Address ${i}`,
        bloodType: "O+",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        parentId: `parent${(i % 20) + 1}`,
        gradeId,
        classId: gradeId === 1 ? ((i % 2) + 1) : ((i % 2) + 3),
        birthday: new Date(
          new Date().setFullYear(new Date().getFullYear() - age)
        ),
      },
    });
  }

    // EVENT
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`, 
        description: `Description for Event ${i}`, 
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
        classId: (i % 4) + 1, 
      },
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`, 
        description: `Description for Announcement ${i}`, 
        date: new Date(), 
        classId: (i % 4) + 1, 
      },
    });
  }


  console.log("✅ Kita seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());