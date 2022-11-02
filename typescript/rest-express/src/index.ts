import pluralize from 'pluralize'
import { Prisma, PrismaClient } from '@prisma/client'
import express from 'express'

const prisma = new PrismaClient()
const app = express()

app.use(express.json())

function buildFilter(queryPlan: any): any {
  if(queryPlan.userId) {
    return {
      userId: queryPlan.userId
    }
  }
  if(queryPlan.case === 'many-to-many') {
    return {
      [pluralize(queryPlan.to)]: {
        some: {
          [queryPlan.to]: buildFilter(queryPlan.in)
        }
      }
    }
  }
  if(queryPlan.case === 'many-to-one') {
    return {
      [pluralize(queryPlan.to)]: {
        some: buildFilter(queryPlan.in)
      }
    }
  }
  return {
    [queryPlan.to]: buildFilter(queryPlan.in)
  }
}

app.get('/user/:userId/chef/menuItems', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'menuItem',
    fromField: 'menuItemId',
    to: "menu",
    toField: 'id',
    case: "one-to-many",
    in: {
      from: 'menu',
      fromField: 'menuId',
      to: "restaurant",
      toField: 'id',
      case: "many-to-one",
      in: {
        from: 'restaurant',
        fromField: 'restaurantId',
        joinRelation: 'chefs_on_restaurant',
        to: 'chef',
        toField: 'chefId',
        case: 'many-to-many',
        in: {
          userId: Number(userId),
        }
      }
    }
  }
  const filter = buildFilter(queryPlan)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.menuItem.findMany({
    where: filter
  })
  res.json(menus)
})

app.get('/user/:userId/waiter/menuItems', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'menuItem',
    fromField: 'menuItemId',
    to: "menu",
    toField: 'id',
    case: "one-to-many",
    in: {
      from: 'menu',
      fromField: 'menuId',
      to: "restaurant",
      toField: 'id',
      case: "many-to-one",
      in: {
        from: 'restaurant',
        fromField: 'restaurantId',
        joinRelation: 'waiters_on_restaurant',
        to: 'waiter',
        toField: 'waiterId',
        case: 'many-to-many',
        in: {
          userId: Number(userId),
        }
      }
    }
  }
  const filter = buildFilter(queryPlan)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.menuItem.findMany({
    where: filter
  })
  res.json(menus)
})

app.get('/user/:userId/chef/menus', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'menu',
    fromField: 'menuId',
    to: "restaurant",
    toField: 'id',
    case: "many-to-one",
    in: {
      from: 'restaurant',
      fromField: 'restaurantId',
      joinRelation: 'chefs_on_restaurant',
      to: 'chef',
      toField: 'chefId',
      case: 'many-to-many',
      in: {
        userId: Number(userId),
      }
    }
  }
  const filter = buildFilter(queryPlan)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.menu.findMany({
    where: filter
  })
  res.json(menus)
})

app.get('/user/:userId/waiter/menus', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'menu',
    fromField: 'menuId',
    to: "restaurant",
    toField: 'id',
    case: "many-to-one",
    in: {
      from: 'restaurant',
      fromField: 'restaurantId',
      joinRelation: 'waiters_on_restaurant',
      to: 'waiter',
      toField: 'waiterId',
      case: 'many-to-many',
      in: {
        userId: Number(userId),
      }
    }
  }
  const filter = buildFilter(queryPlan)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.menu.findMany({
    where: filter
  })
  res.json(menus)
})

app.get('/user/:userId/chef/restaurants', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'restaurant',
    fromField: 'restaurantId',
    joinRelation: 'chefs_on_restaurant',
    to: 'chef',
    toField: 'chefId',
    case: 'many-to-many',
    in: {
      userId: Number(userId),
    }
  }
  const filter = buildFilter(queryPlan)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.restaurant.findMany({
    where: buildFilter(queryPlan)
  })
  res.json(menus)
})

app.get('/user/:userId/waiter/restaurants', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'restaurant',
    fromField: 'restaurantId',
    joinRelation: 'waiters_on_restaurant',
    to: 'waiter',
    toField: 'waiterId',
    case: 'many-to-many',
    in: {
      userId: Number(userId),
    }
  }
  const filter = buildFilter(queryPlan)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.restaurant.findMany({
    where: filter
  })
  res.json(menus)
})

const server = app.listen(3000, () =>
  console.log(`
🚀 Server ready at: http://localhost:3000
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`),
)
