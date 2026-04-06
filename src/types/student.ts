import { Prisma } from "@prisma/client";

export type StudentWithClass = Prisma.StudentGetPayload<{
  include: { class: true };
}>;