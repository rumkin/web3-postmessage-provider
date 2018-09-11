const PostMessageProvider = require('./index.js');

const ETHEREUM_PROVIDER_REQUEST = 'ETHEREUM_PROVIDER_REQUEST';
const ETHEREUM_PROVIDER_SUCCESS = 'ETHEREUM_PROVIDER_SUCCESS';

// Extension side
window.addEventListener('message', (e) => {
  const {type} = e.data;

  if (e.origin !== window.origin) {
    return;
  }

  if (type !== ETHEREUM_PROVIDER_REQUEST) {
    return;
  }

  const {port1, port2} = new MessageChannel();

  port1.addEventListener('message', (e) => {
    const {data} = e;
    console.log('port1 data:', {data});

    port1.postMessage({
      jsonrpc: '2.0',
      id: data.id,
      result: '0',
    });
  });
  port1.start();

  e.target.postMessage({
    type: ETHEREUM_PROVIDER_SUCCESS,
  }, this.origin, [port2]);
});

const web3 = new Web3(new PostMessageProvider());

web3.eth.getBalance('0x0000000000000000000000000000000000000001')
.then((balance) => console.log({balance}), console.error);
