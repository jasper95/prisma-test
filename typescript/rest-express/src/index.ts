import pluralize from 'pluralize'
import { Prisma, PrismaClient } from '@prisma/client'
import express from 'express'
const snakeCase = require('lodash.snakecase');

const knex = require('knex')({
  client: 'pg',
  connection: 'postgresql://jasper:jasper@localhost:5434/prisma-test?schema=public',
});

const prisma = new PrismaClient()
const app = express()

app.use(express.json())

function buildFilter(queryPlan: any): any {
  if(queryPlan.userId) {
    return {
      userId: {
        in: queryPlan.userId
      }
    }
  }
  if(queryPlan.case === 'many-to-many') {
    return {
      [pluralize(snakeCase(queryPlan.to))]: {
        some: {
          [snakeCase(queryPlan.to)]: buildFilter(queryPlan.in)
        }
      }
    }
  }
  if(queryPlan.case === 'many-to-one') {
    return {
      [pluralize(snakeCase(queryPlan.to))]: {
        some: buildFilter(queryPlan.in)
      }
    }
  }
  return {
    [snakeCase(queryPlan.to)]: buildFilter(queryPlan.in)
  }
}

function buildKnexQuery(q: any): any {
  // base case
  if(q.userId) {
    return knex(q.from)
      .where(q.fromField, 'in', q.userId)
  }
  if(q.case === 'many-to-many') {
    return knex(q.from)
      .where(q.fromField, 'in',
        knex(q.joinRelation)
          .where(q.joinRelationFromField, 'in',
            buildKnexQuery(q.in)
              .select(q.toField)
          )
          .select(q.joinRelationFromField)
      )
  }
  if(q.case === 'many-to-one') {
    return knex(q.from)
      .where(q.fromField, 'in',
        buildKnexQuery(q.in)
          .select(q.toField)
      )
  }
  if(q.case === 'one-to-many') {
    return knex(q.from)
      .where(q.fromField, 'in',
        buildKnexQuery(q.in)
          .select(q.toField)
      )
      .select(q.select)
  }
  throw Error('not supported')
}
app.get('/sql', async(req, res) => {
  const queryPlan = {
    from: 'MenuItem',
    fromField: 'menuId',
    to: "Menu",
    toField: 'id',
    case: "one-to-many",
    in: {
      from: 'Menu',
      fromField: 'id',
      to: "Restaurant",
      toField: 'menuId',
      case: "many-to-one",
      in: {
        from: 'Restaurant',
        fromField: 'id',
        joinRelation: 'ChefsOnRestaurants',
        joinRelationFromField: 'restaurantId',
        joinRelationtoField: 'chefId',
        to: 'Chef',
        toField: 'id',
        case: 'many-to-many',
        in: {
          from: 'Chef',
          fromField: 'userId',
          userId: [1],
        }
      }
    }
  }
  const ids = await buildKnexQuery(queryPlan)

  res.json(ids)
})

app.get('/user/:userId/chef/menuItems', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    from: 'MenuItem',
    fromField: 'menuId',
    to: "Menu",
    toField: 'id',
    case: "one-to-many",
    in: {
      from: 'Menu',
      fromField: 'id',
      to: "Restaurant",
      toField: 'menuId',
      case: "many-to-one",
      in: {
        from: 'Restaurant',
        fromField: 'id',
        joinRelation: 'ChefsOnRestaurants',
        joinRelationFromField: 'restaurantId',
        joinRelationtoField: 'chefId',
        to: 'Chef',
        toField: 'id',
        case: 'many-to-many',
        in: {
          from: 'Chef',
          fromField: 'userId',
          userId: [Number(userId)],
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
    from: 'MenuItem',
    fromField: 'menuId',
    to: "Menu",
    toField: 'id',
    case: "one-to-many",
    in: {
      from: 'Menu',
      fromField: 'id',
      to: "Restaurant",
      toField: 'menuId',
      case: "many-to-one",
      in: {
        from: 'Restaurant',
        fromField: 'id',
        joinRelation: 'WaitersOnRestaurants',
        joinRelationFromField: 'restaurantId',
        joinRelationtoField: 'waiterId',
        to: 'Waiter',
        toField: 'id',
        case: 'many-to-many',
        in: {
          from: 'Waiter',
          fromField: 'userId',
          userId: [Number(userId)],
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
    from: 'Menu',
    fromField: 'id',
    to: "Restaurant",
    toField: 'menuId',
    case: "many-to-one",
    in: {
      from: 'Restaurant',
      fromField: 'id',
      joinRelation: 'ChefsOnRestaurants',
      joinRelationFromField: 'restaurantId',
      joinRelationtoField: 'chefId',
      to: 'Chef',
      toField: 'id',
      case: 'many-to-many',
      in: {
        from: 'Chef',
        fromField: 'userId',
        userId: [Number(userId)],
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
    from: 'Menu',
    fromField: 'id',
    to: "Restaurant",
    toField: 'menuId',
    case: "many-to-one",
    in: {
      from: 'Restaurant',
      fromField: 'id',
      joinRelation: 'WaitersOnRestaurants',
      joinRelationFromField: 'restaurantId',
      joinRelationtoField: 'waiterId',
      to: 'Waiter',
      toField: 'id',
      case: 'many-to-many',
      in: {
        from: 'Waiter',
        fromField: 'userId',
        userId: [Number(userId)],
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
    from: 'Restaurant',
    fromField: 'id',
    joinRelation: 'ChefsOnRestaurants',
    joinRelationFromField: 'restaurantId',
    joinRelationtoField: 'chefId',
    to: 'Chef',
    toField: 'id',
    case: 'many-to-many',
    in: {
      from: 'Chef',
      fromField: 'userId',
      userId: [Number(userId)],
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
    from: 'Restaurant',
    fromField: 'id',
    joinRelation: 'WaitersOnRestaurants',
    joinRelationFromField: 'restaurantId',
    joinRelationtoField: 'waiterId',
    to: 'Waiter',
    toField: 'id',
    case: 'many-to-many',
    in: {
      from: 'Waiter',
      fromField: 'userId',
      userId: [Number(userId)],
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
