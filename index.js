const { app } = require('./backend/server');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TrocaLanches API ouvindo em http://localhost:${PORT}`);
});
