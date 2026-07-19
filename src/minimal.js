// Ultra minimal Express app - NO dependencies except express
const express = require('express');
const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minimal app works!' });
});

app.get('/api/test', (req, res) => {
  res.json({ test: 'success', time: new Date().toISOString() });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});
