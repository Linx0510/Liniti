const express = require('express');
const app = express();
const pageRoutes = require('./routes/pageRoutes');

app.use(pageRoutes);

app.get('/test456', (req, res) => {
  res.send('test456 works');
});

app.listen(3006, () => {
  console.log('PageRoutes test on 3006');
});
