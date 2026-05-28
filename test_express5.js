const express = require('express');
const app = express();

app.get('/test123', (req, res) => {
  res.send('test123 from express 5');
});

app.listen(3005, () => {
  console.log('Express 5 test on 3005');
});
