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
    const response =  {
      userId: {
        in: queryPlan.userId
      }
    }
    console.log('response: ', JSON.stringify(response));
    return response
  }
  if(queryPlan.case === 'many-to-many') {
    const response = {
      [pluralize(snakeCase(queryPlan.to))]: {
        some: {
          [snakeCase(queryPlan.to)]: buildFilter(queryPlan.in)
        }
      }
    }
    console.log('response: ', JSON.stringify(response));
    return response
  }
  if(queryPlan.case === 'many-to-one') {
    const response = {
      [snakeCase(queryPlan.to)]: buildFilter(queryPlan.in)
    }
    console.log('response: ', JSON.stringify(response));
    return response
  }

  const response =  {
    [pluralize(snakeCase(queryPlan.to))]: {
      some: buildFilter(queryPlan.in)
    }
  }
  console.log('response: ', JSON.stringify(response));
  return response
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

function getPrismaAuthorizationFilter(queryPlans: any) {
  const conditionals = queryPlans.filter((e: any) => e.kind === 'conditional')
  const canAccessAll = queryPlans.find((e: any) => e.kind === 'all')
  if(canAccessAll) {
    return {}
  }
  if(conditionals.length >= 2) {
    return {
      OR: conditionals.map((e:any) => buildFilter(e.queryPlan))
    }
  }
  if(conditionals.length === 1) {
    return buildFilter(conditionals[0].queryPlan)
  }
  return {
    id: {
      in: []
    }
  }
}

function getAuthorizationFilter(queryPlans: any) {
  const conditionals = queryPlans.filter((e: any) => e.kind === 'conditional')
  const canAccessAll = queryPlans.find((e: any) => e.kind === 'all')

  return (query: any) => {
    if(canAccessAll) {
      return query
    }
    if(conditionals.length === 0) {
      return  query.where('id', 'in', [])
    }
    return query.where('id', 'in',
      knex.union(
        conditionals.map((q: any) => buildKnexQuery(q.queryPlan).select('id'))
      )
    )
  }
}

app.get('/knex', async(req, res) => {
  const queryPlans = [
    {
      "queryPlan": {
        "from": "MenuItem",
        "to": "Menu",
        "case": "many-to-one",
        "fromField": "menuId",
        "toField": "id",
        "in": {
          "from": "Menu",
          "to": "Restaurant",
          "case": "many-to-one",
          "fromField": "restaurantId",
          "toField": "id",
          "in": {
            "from": "Restaurant",
            "to": "Chain",
            "case": "many-to-one",
            "fromField": "chainId",
            "toField": "id",
            "in": {
              "from": "Chain",
              "to": "Manager",
              "case": "one-to-many",
              "fromField": "id",
              "toField": "chainId",
              "in": {
                "from": "Manager",
                "fromField": "userId",
                "userId": [
                  7
                ]
              }
            }
          }
        }
      },
      "kind": "conditional"
    },
    {
      "queryPlan": {
        "from": "MenuItem",
        "to": "Menu",
        "case": "many-to-one",
        "fromField": "menuId",
        "toField": "id",
        "in": {
          "from": "Menu",
          "to": "Restaurant",
          "case": "many-to-one",
          "fromField": "restaurantId",
          "toField": "id",
          "in": {
            "from": "Restaurant",
            "to": "Chef",
            "case": "one-to-many",
            "fromField": "id",
            "toField": "restaurantId",
            "in": {
              "from": "Chef",
              "fromField": "userId",
              "userId": [
                7
              ]
            }
          }
        }
      },
      "kind": "conditional"
    }
  ]
  const baseQuery = knex('MenuItem')
  const applyAuthorizationFilter = getAuthorizationFilter(queryPlans)
  const query = await applyAuthorizationFilter(baseQuery)
  res.json(query)
})

app.get('/prisma', async(req, res) => {
  const queryPlans = [
    {
      "queryPlan": {
        "from": "MenuItem",
        "to": "Menu",
        "case": "many-to-one",
        "fromField": "menuId",
        "toField": "id",
        "in": {
          "from": "Menu",
          "to": "Restaurant",
          "case": "many-to-one",
          "fromField": "restaurantId",
          "toField": "id",
          "in": {
            "from": "Restaurant",
            "to": "Chain",
            "case": "many-to-one",
            "fromField": "chainId",
            "toField": "id",
            "in": {
              "from": "Chain",
              "to": "Manager",
              "case": "one-to-many",
              "fromField": "id",
              "toField": "chainId",
              "in": {
                "from": "Manager",
                "fromField": "userId",
                "userId": [
                  7
                ]
              }
            }
          }
        }
      },
      "kind": "conditional"
    },
    {
      "queryPlan": {
        "from": "MenuItem",
        "to": "Menu",
        "case": "many-to-one",
        "fromField": "menuId",
        "toField": "id",
        "in": {
          "from": "Menu",
          "to": "Restaurant",
          "case": "many-to-one",
          "fromField": "restaurantId",
          "toField": "id",
          "in": {
            "from": "Restaurant",
            "to": "Chef",
            "case": "one-to-many",
            "fromField": "id",
            "toField": "restaurantId",
            "in": {
              "from": "Chef",
              "fromField": "userId",
              "userId": [
                7
              ]
            }
          }
        }
      },
      "kind": "conditional"
    }
  ]
  const filter = getPrismaAuthorizationFilter(queryPlans)
  console.log('filter: ', JSON.stringify(filter));
  const menus = await prisma.menuItem.findMany({
    where: filter
  })
  res.json(menus)
})

app.get('/user/:userId/waiter/menuItems', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    "from": "MenuItem",
    "to": "Menu",
    "case": "many-to-one",
    "fromField": "menuId",
    "toField": "id",
    "in": {
      "from": "Menu",
      "to": "Restaurant",
      "case": "many-to-one",
      "fromField": "restaurantId",
      "toField": "id",
      "in": {
        "from": "Restaurant",
        "to": "Waiter",
        "case": "many-to-many",
        "joinRelation": "WaitersOnRestaurants",
        "joinRelationFromField": "restaurantId",
        "joinRelationtoField": "waiterId",
        "fromField": "id",
        "toField": "id",
        "in": {
          "from": "Waiter",
          "fromField": "userId",
          "userId": [
            Number(userId)
          ]
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

app.get('/user/:userId/manager/chain', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    "from": "Chain",
    "to": "Manager",
    "case": "one-to-many",
    "fromField": "id",
    "toField": "chainId",
    "in": {
      "from": "Manager",
      "fromField": "userId",
      "userId": [
        Number(userId)
      ]
    }
  }
  const filter = buildFilter(queryPlan)
  const menus = await prisma.chain.findMany({
    where: filter
  })
  res.json(menus)
})

app.get('/user/:userId/chef/menus', async(req, res) => {
  const { userId = 1 } = req.params
  const queryPlan = {
    "from": "Menu",
    "to": "Restaurant",
    "case": "many-to-one",
    "fromField": "restaurantId",
    "toField": "id",
    "in": {
      "from": "Restaurant",
      "to": "Chef",
      "case": "one-to-many",
      "fromField": "id",
      "toField": "restaurantId",
      "in": {
        "from": "Chef",
        "fromField": "userId",
        "userId": [
          Number(userId)
        ]
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
    "from": "Menu",
    "to": "Restaurant",
    "case": "many-to-one",
    "fromField": "restaurantId",
    "toField": "id",
    "in": {
      "from": "Restaurant",
      "to": "Waiter",
      "case": "many-to-many",
      "joinRelation": "WaitersOnRestaurants",
      "joinRelationFromField": "restaurantId",
      "joinRelationtoField": "waiterId",
      "fromField": "id",
      "toField": "id",
      "in": {
        "from": "Waiter",
        "fromField": "userId",
        "userId": [
          Number(userId)
        ]
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
    "from": "Restaurant",
    "to": "Chef",
    "case": "one-to-many",
    "fromField": "id",
    "toField": "restaurantId",
    "in": {
      "from": "Chef",
      "fromField": "userId",
      "userId": [
        Number(userId)
      ]
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
    "from": "Restaurant",
    "to": "Waiter",
    "case": "many-to-many",
    "joinRelation": "WaitersOnRestaurants",
    "joinRelationFromField": "restaurantId",
    "joinRelationtoField": "waiterId",
    "fromField": "id",
    "toField": "id",
    "in": {
      "from": "Waiter",
      "fromField": "userId",
      "userId": [
        Number(userId)
      ]
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
