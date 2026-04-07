//  import { Day, PrismaClient, UserSex } from "@prisma/client";

//  const prisma = new PrismaClient();

// async function main() {
//   // ADMIN
//   await prisma.admin.create({
//     data: {
//       id: "admin1",
//       username: "admin1",
//     },
//   });
//   await prisma.admin.create({
//     data: {
//       id: "admin2",
//       username: "admin2",
//     },
//   });

//   // GRADE
//   for (let i = 1; i <= 6; i++) {
//     await prisma.grade.create({
//       data: {
//         level: i,
//       },
//     });
//   }

//   // CLASS
//   for (let i = 1; i <= 6; i++) {
//     await prisma.class.create({
//       data: {
//         name: `${i}A`, 
//         gradeId: i, 
//         capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
//       },
//     });
//   }

//   // SUBJECT
//   const subjectData = [
//     { name: "Mathematics" },
//     { name: "Science" },
//     { name: "English" },
//     { name: "History" },
//     { name: "Geography" },
//     { name: "Physics" },
//     { name: "Chemistry" },
//     { name: "Biology" },
//     { name: "Computer Science" },
//     { name: "Art" },
//   ];

//   for (const subject of subjectData) {
//     await prisma.subject.create({ data: subject });
//   }

//   // TEACHER
//   for (let i = 1; i <= 15; i++) {
//     await prisma.teacher.create({
//       data: {
//         id: `teacher${i}`, // Unique ID for the teacher
//         username: `teacher${i}`,
//         name: `TName${i}`,
//         surname: `TSurname${i}`,
//         email: `teacher${i}@example.com`,
//         phone: `123-456-789${i}`,
//         address: `Address${i}`,
//         bloodType: "A+",
//         sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
//         subjects: { connect: [{ id: (i % 10) + 1 }] }, 
//         classes: { connect: [{ id: (i % 6) + 1 }] }, 
//         birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 30)),
//       },
//     });
//   }

//   let zones = await prisma.zone.findMany();
//   if (zones.length === 0) {
//     await prisma.zone.createMany({
//       data: [
//         { name: "Turnhalle" },
//         { name: "Spielplatz" },
//         { name: "Atelier" },
//       ],
//     });
//     zones = await prisma.zone.findMany();
//   }

  // // LESSON
  // for (let i = 1; i <= 30; i++) {
  //   await prisma.lesson.create({
  //     data: {
  //       name: `Lesson${i}`,
  //       day: Day[
  //         Object.keys(Day)[
  //           Math.floor(Math.random() * Object.keys(Day).length)
  //         ] as keyof typeof Day
  //       ],
  //       startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
  //       endTime: new Date(new Date().setHours(new Date().getHours() + 3)),
  //       zoneId: zones[(i - 1) % zones.length].id,
  //       classId: (i % 6) + 1,
  //       teacherId: `teacher${(i % 15) + 1}`,
  //     },
  //   });
  // }

//   // PARENT
//   for (let i = 1; i <= 25; i++) {
//     await prisma.parent.create({
//       data: {
//         id: `parentId${i}`,
//         username: `parentId${i}`,
//         name: `PName ${i}`,
//         surname: `PSurname ${i}`,
//         email: `parent${i}@example.com`,
//         phone: `123-456-789${i}`,
//         address: `Address${i}`,
//       },
//     });
//   }

//   // STUDENT
//   for (let i = 1; i <= 50; i++) {
//     await prisma.student.create({
//       data: {
//         id: `student${i}`, 
//         username: `student${i}`, 
//         name: `SName${i}`,
//         surname: `SSurname ${i}`,
//         email: `student${i}@example.com`,
//         phone: `987-654-321${i}`,
//         address: `Address${i}`,
//         bloodType: "O-",
//         sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
//         parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`, 
//         gradeId: (i % 6) + 1, 
//         classId: (i % 6) + 1, 
//         birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
//       },
//     });
//   }

//   // EXAM
//   for (let i = 1; i <= 10; i++) {
//     await prisma.exam.create({
//       data: {
//         title: `Exam ${i}`, 
//         startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
//         endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
//         lessonId: (i % 30) + 1, 
//       },
//     });
//   }

//   // ASSIGNMENT
//   for (let i = 1; i <= 10; i++) {
//     await prisma.assignment.create({
//       data: {
//         title: `Assignment ${i}`, 
//         startDate: new Date(new Date().setHours(new Date().getHours() + 1)), 
//         dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), 
//         lessonId: (i % 30) + 1, 
//       },
//     });
//   }

//   // RESULT
//   for (let i = 1; i <= 10; i++) {
//     await prisma.result.create({
//       data: {
//         score: 90, 
//         studentId: `student${i}`, 
//         ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }), 
//       },
//     });
//   }

//   // ATTENDANCE
//   for (let i = 1; i <= 10; i++) {
//     await prisma.attendance.create({
//       data: {
//         date: new Date(), 
//         present: true, 
//         studentId: `student${i}`, 
//         lessonId: (i % 30) + 1, 
//       },
//     });
//   }

//   // EVENT
//   for (let i = 1; i <= 5; i++) {
//     await prisma.event.create({
//       data: {
//         title: `Event ${i}`, 
//         description: `Description for Event ${i}`, 
//         startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
//         endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
//         classId: (i % 5) + 1, 
//       },
//     });
//   }

//   // ANNOUNCEMENT
//   for (let i = 1; i <= 5; i++) {
//     await prisma.announcement.create({
//       data: {
//         title: `Announcement ${i}`, 
//         description: `Description for Announcement ${i}`, 
//         date: new Date(), 
//         classId: (i % 5) + 1, 
//       },
//     });
//   }

//   // ZONES
//   await prisma.zone.createMany({
//     data: [
//       { name: "WC", capacity: 3 },
//       { name: "Flur", capacity: 10 },
//       { name: "Spielplatz" },
//       { name: "Restaurant", capacity: 15 },
//       { name: "Bauwelt", capacity: 24 },
//       { name: "Abenteuerland", capacity: 24 },
//       { name: "Kreativwerkstatt", capacity: 24 },
//     ],
//     skipDuplicates: true,
//   });
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });

import { Day, PrismaClient, UserSex } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ADMIN
  await prisma.admin.createMany({
    data: [
      { id: "admin1", username: "admin1" },
    ],
    skipDuplicates: true,
  });

  // 🎯 AGE GROUPS (Grades)
  await prisma.grade.createMany({
    data: [
      { level: 1 }, // Krippe (0-3)
      { level: 2 }, // Kindergarten (3-6)
    ],
    skipDuplicates: true,
  });

  // 🎯 GROUPS (Classes)
  await prisma.class.createMany({
    data: [
      { name: "Sonnenkäfer", gradeId: 1, capacity: 12 },
      { name: "Regenbogen", gradeId: 1, capacity: 12 },
      { name: "Bären", gradeId: 2, capacity: 20 },
      { name: "Tiger", gradeId: 2, capacity: 20 },
    ],
    skipDuplicates: true,
  });

    // 🏫 ZONES
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

  // // 🎨 Subjects
  // await prisma.subject.createMany({
  //   data: [
  //     { name: "Art" },
  //     { name: "Music" },
  //     { name: "Sport" },
  //     { name: "Language" },
  //     { name: "Crafts" },
  //     { name: "Outdoor Play" },
  //   ],
  //   skipDuplicates: true,
  // });

//   // ACTIVITY (за детска градина)
// const activities = [
//   { name: "Drawing", zoneIndex: 2 },
//   { name: "Playing", zoneIndex: 1 },
//   { name: "Sports", zoneIndex: 0 },
//   { name: "Music", zoneIndex: 2 },
//   { name: "Crafts", zoneIndex: 2 },
// ];

// for (const activity of activities) {
//   await prisma.activity.create({
//     data: {
//       name: activity.name,
//       zoneId: zones[activity.zoneIndex % zones.length].id,
//     },
//   });
// }

// 👩‍🏫 TEACHERS (Erzieher)
 const classes = await prisma.class.findMany();

  for (let i = 1; i <= 6; i++) {
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
    });
  }


// LESSON
  // for (let i = 1; i <= 30; i++) {
  //   await prisma.lesson.create({
  //     data: {
  //       name: `Lesson${i}`,
  //       day: Day[
  //         Object.keys(Day)[
  //           Math.floor(Math.random() * Object.keys(Day).length)
  //         ] as keyof typeof Day
  //       ],
  //       startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
  //       endTime: new Date(new Date().setHours(new Date().getHours() + 3)),
  //       zoneId: zones[(i - 1) % zones.length].id,
  //       classId: (i % 4) + 1,
  //       teacherId: `teacher${(i % 5) + 1}`,
  //     },
  //   });
  // }

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

  
  // 👨‍👩‍👧 PARENTS
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

  // 👶 CHILDREN (Students)
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