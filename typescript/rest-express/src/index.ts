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

async function isAllowed(queryPlans: any, id: number | null, operation = 'read') {
  // const queryPlans = 
  const conditionals = queryPlans.filter((e: any) => e.kind === 'restricted')
  const canAccessAll = queryPlans.find((e: any) => e.kind === 'fullAccess')

  if(operation === 'create') {
    return queryPlans.some((e: any) => e.kind !== 'noAccess')
  }

  if(canAccessAll) {
    return true
  }

  if(conditionals.length === 0) {
    return false
  }

  const resultSets = []
  for (const q of conditionals) {
    const query =  buildKnexQuery(q.queryPlan)
      .where({ id })
    console.log('query:', query.toString())
    const resultSet = await query
    resultSets.push(resultSet)
    if(resultSet.length) {
      break
    }
  }
  return resultSets.some(resultSet => resultSet.length > 0)
}

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
  if(q.case === 'many-to-one' || q.case === 'one-to-many') {
    return knex(q.from)
      .where(q.fromField, 'in',
        buildKnexQuery(q.in)
          .select(q.toField)
      )
  }
  // if(q.case === 'one-to-many') {
  //   return knex(q.from)
  //     .where(q.fromField, 'in',
  //       buildKnexQuery(q.in)
  //         .select(q.toField)
  //     )
  //     // .select(q.select)
  // }
  throw Error('not supported')
}

function getPrismaAuthorizationFilter(queryPlans: any) {
  const conditionals = queryPlans.filter((e: any) => e.kind === 'restricted')
  const canAccessAll = queryPlans.find((e: any) => e.kind === 'fullAccess')
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
  const conditionals = queryPlans.filter((e: any) => e.kind === 'restricted')
  const canAccessAll = queryPlans.find((e: any) => e.kind === 'fullAccess')

  return (query: any) => {
    if(canAccessAll) {
      return query
    }
    if(conditionals.length === 0) {
      return query.where('id', 'in', [])
    }
    return query.where('id', 'in',
      knex.union(
        conditionals.map((q: any) => buildKnexQuery(q.queryPlan).select('id'))
      )
    )
  }
}

app.get('/menuItems/:id', async (req, res) => {
  const { id = 1 } = req.params
  const queryPlans = [
    // {
    //   "queryPlan": {
    //     "from": "MenuItem",
    //     "to": "Menu",
    //     "case": "many-to-one",
    //     "fromField": "menuId",
    //     "toField": "id",
    //     "in": {
    //       "from": "Menu",
    //       "to": "Restaurant",
    //       "case": "many-to-one",
    //       "fromField": "restaurantId",
    //       "toField": "id",
    //       "in": {
    //         "from": "Restaurant",
    //         "to": "Chef",
    //         "case": "one-to-many",
    //         "fromField": "id",
    //         "toField": "restaurantId",
    //         "in": {
    //           "from": "Chef",
    //           "fromField": "userId",
    //           "userId": [
    //             7
    //           ]
    //         }
    //       }
    //     }
    //   },
    //   "kind": 'restricted'
    // },
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
      "kind": "restricted"
    }
  ]
  const result = await isAllowed(queryPlans, id as number, 'read')
  res.json({ result })
})

app.post('/menuItems', async (req, res) => {
  const queryPlans = [
    {
      "queryPlan": null,
      "kind": 'noAccess'
    }
  ]
  const allowed = await isAllowed(queryPlans, null, 'create')
  if(allowed) {
    const response: any = await knex('MenuItem')
      .insert(req.body)
    return res.json(response)
  }
  res.status(403).json({ message: 'Forbidden' })
})

app.put('/menuItems/:id', async (req, res) => {
  const { id } = req.params
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
      "kind": 'restricted'
    }
  ]
  const allowed = await isAllowed(queryPlans, Number(id), 'update')
  if(allowed) {
    const response: any = await knex('MenuItem')
      .where({ id })
      .update(req.body)
    return res.json(response)
  }
  res.status(403).json({ message: 'Forbidden' })
})

app.delete('/menuItems/:id', async (req, res) => {
  const { id } = req.params
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
      "kind": 'restricted'
    }
  ]
  const allowed = await isAllowed(queryPlans, Number(id), 'delete')
  if(allowed) {
    const response: any = await knex('MenuItem')
      .where({ id })
      .del()
    return res.json(response)
  }
  res.status(403).json({ message: 'Forbidden' })
})


app.get('/menuItems', async(req, res) => {
  const queryPlans = [
    {
      "queryPlan": null,
      "kind": "fullAccess"
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
      "kind": "restricted"
    }
  ]
  const baseQuery = knex('MenuItem')
  const applyAuthorizationFilter = getAuthorizationFilter(queryPlans)
  const query = applyAuthorizationFilter(baseQuery)
  const response = await query
  res.json(response)
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
      "kind": 'restricted'
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
      "kind": 'restricted'
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
