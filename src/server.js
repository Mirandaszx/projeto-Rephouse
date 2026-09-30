const express = require('express')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`)
})
