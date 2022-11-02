import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// const userData: Prisma.UserCreateInput[] = [
//   {
//     name: 'Alice',
//     waiter: {
//       create: {
//         name: 'Alice Waiter'
//       },
//     }
//   },
//   {
//     name: 'Nilu',
//     waiter: {
//       create: {
//         name: 'Nilu Waiter'
//       }
//     }
//   },
//   {
//     name: 'Mahmoud',
//     waiter: {
//       create: {
//         name: 'Mahmoud Waiter',
//       },
//     }
//   },
// ]

const waiters: Prisma.WaiterCreateInput = [
  {
    name: 'Alice Waiter',
  }
]
async function main() {
  console.log(`Start seeding ...`)
  prisma.restaurant.create({
    data: {
      waiters: {
        create: waiters
      }
    }
  })
  // for (const u of userData) {
  //   const user = await prisma.user.create({
  //     data: u,
  //   })
  //   console.log(`Created user with id: ${user.id}`)
  // }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
