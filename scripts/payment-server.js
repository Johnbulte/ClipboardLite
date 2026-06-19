const { createPaymentServer, TEST_LICENSE_KEY } = require('../src/paymentServer');

const port = Number(process.env.PORT || 8787);
const server = createPaymentServer();

server.listen(port, '127.0.0.1', () => {
  console.log(`Cliply local payment server: http://localhost:${port}`);
  console.log(`Test license key: ${TEST_LICENSE_KEY}`);
});
