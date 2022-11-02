import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

const userWaiter: Prisma.UserCreateInput[] = [1,2,3,4,5,6].map(i => (
  {
    name: `User Waiter ${i}`,
    waiter: {
      create: {
        name: `User Waiter ${i}`,
      },
    }
  }
))

const userChef: Prisma.UserCreateInput[] = [1,2,3,4,5,6].map(i => (
  {
    name: `User Chef ${i}`,
    chef: {
      create: {
        name: `User Chef ${i}`,
      },
    }
  }
))


const menuData: Prisma.MenuCreateInput[] = [1,2,3,4,5,6,].map(i => ({
  content: `Menu ${i}`,
    restaurants: {
      createMany: {
        data: [
          {
            name: `Restaurant ${i}`,
          },
        ]
      }
    },
    menuItems: {
      createMany: {
        data: [
          {
            name: `Menu Item ${i}`
          },
        ]
      }
    }
  }
))
const chefRestaurantData: Prisma.ChefsOnRestaurantsUncheckedCreateInput[] = [
  {
    chefId: 1,
    restaurantId: 1
  },
  {
    chefId: 2,
    restaurantId: 2
  },
  {
    chefId: 3,
    restaurantId: 3
  },
  {
    chefId: 4,
    restaurantId: 4
  },
  {
    chefId: 5,
    restaurantId: 5
  },
  {
    chefId: 6,
    restaurantId: 6
  }
]

const waiterRestaurantData: Prisma.WaitersOnRestaurantsUncheckedCreateInput[] = [
  {
    waiterId: 1,
    restaurantId: 1
  },
  {
    waiterId: 2,
    restaurantId: 2
  },
  {
    waiterId: 3,
    restaurantId: 3
  },
  {
    waiterId: 4,
    restaurantId: 4
  },
  {
    waiterId: 5,
    restaurantId: 5
  },
  {
    waiterId: 6,
    restaurantId: 6
  }
]
async function main() {
  for(const data of userChef) {
    await prisma.user.create({
      data
    })
  }
  for(const data of userWaiter) {
    await prisma.user.create({
      data
    })
  }
  console.log('menuData: ', menuData.length);
  for(const data of menuData) {
    await prisma.menu.create({
      data
    })
  }
  for(const data of chefRestaurantData) {
    await prisma.chefsOnRestaurants.create({
      data
    })
  }
  for(const data of waiterRestaurantData) {
    await prisma.waitersOnRestaurants.create({
      data
    })
  }
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
