import { PrismaClient, Prisma } from '@prisma/client'
const prisma = new PrismaClient()

const userWaiter: Prisma.WaiterCreateInput[] = [1,2,3,4,5,6].map(i => (
  {
    name: `User Waiter ${i}`,
    userId: i
  }
))

const restaurants: Prisma.RestaurantCreateInput[] = [1,2,3,4,5,6].map(i => ({
  name: `Restaurant ${i}`,
  chefs: {
    create: {
      name: `Chef ${i}`,
      userId: 6+i
    }
  },
  chain: {
    create: {
      name: `Chain ${i}`,
      managers: {
        create: {
          name: `Manager ${i}`,
          userId: 12 + i
        }
      }
    }
  },
  menus: {
    create: {
      content: `Menu ${i}`,
      menuItems: {
        create: {
          name: `Menu Item ${i}`
        }
      }
    }
  }
}))
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
  for(const data of userWaiter) {
    await prisma.waiter.create({
      data
    })
  }
  
  for(const data of restaurants) {
    await prisma.restaurant.create({
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
