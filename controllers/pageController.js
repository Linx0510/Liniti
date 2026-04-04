const getIndexPage = (req, res) => {
  res.render('index');
};

const getLentaPage = (req, res) => {
  res.render('lenta_new');
};

module.exports = {
  getIndexPage,
  getLentaPage,
};
