const express = require('express');
const app = express();

app.get('/test123', (req, res) => {
  res.send('test123 from minimal server');
});

app.listen(3007, () => console.log('Minimal on 3007'));
