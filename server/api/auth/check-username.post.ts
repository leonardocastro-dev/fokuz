import { db } from '~/server/utils/firebase-admin'

export default defineEventHandler(async (event) => {
  const { username } = await readBody(event)

  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username is required'
    })
  }

  try {
    // Check if username already exists
    const usersRef = db.collection('users')
    const snapshot = await usersRef.where('username', '==', username).get()

    if (!snapshot.empty) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Username already exists'
      })
    }

    return { available: true }
  } catch (error: any) {
    if (error.statusCode === 409) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
