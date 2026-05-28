const express = require('express');
const app = express();

app.get('/hello', (req, res) => {
  console.log('HELLO');
  res.send('hello');
});

app.listen(3002, () => console.log('Test on 3002'));
