'use strict';
const termops = require('../lib/util/termops');
const test = require('tape');

test('maskAddress', (q) => {
    q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100'], 'fake street ###', parseInt('1110',2)), { addr: '100', pos: 3 });
    q.deepEqual(termops.maskAddress(['100', '1', 'fake', 'street'], '### 1 fake street', parseInt('1111',2)), { addr: '100', pos: 0 });
    q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100b'], 'fake street ###', parseInt('1110',2)), { addr: '100b', pos: 3 });
    q.deepEqual(termops.maskAddress(['100b', '1', 'fake', 'street'], '', parseInt('1111',2)), { addr: '100b', pos: 0 });

    // Kane IL Style Addresses
    q.deepEqual(termops.maskAddress(['1s13', 'fake', 'street'], '## fake street', parseInt('111',2)), { addr: '1s13', pos: 0 });
    q.deepEqual(termops.maskAddress(['6n486', 'fake', 'street'], '### fake street', parseInt('111',2)), { addr: '6n486', pos: 0 });
    q.deepEqual(termops.maskAddress(['54w32', 'fake', 'street'], '## fake street', parseInt('111',2)), { addr: '54w32', pos: 0 });
    q.deepEqual(termops.maskAddress(['8e234', 'fake', 'street'], '### fake street', parseInt('111',2)), { addr: '8e234', pos: 0 });

    // Waukesha, WI Style Addresses
    q.deepEqual(termops.maskAddress(['w350n5337', 'road', 'c'], '## road c', parseInt('111',2)), { addr: 'w350n5337', pos: 0 });
    q.deepEqual(termops.maskAddress(['n60w35415', 'bayshore', 'circle'], '## bayshore circle', parseInt('111',2)), { addr: 'n60w35415', pos: 0 });
    q.deepEqual(termops.maskAddress(['w35295', 'coastal', 'avenue'], '## coastal avenue', parseInt('111',2)), { addr: 'w35295', pos: 0 });
    q.deepEqual(termops.maskAddress(['n35295', 'lakeshore', 'drive'], '## lakeshore drive', parseInt('111',2)), { addr: 'n35295', pos: 0 });

    q.deepEqual(termops.maskAddress(['115', '37'], '## 115', parseInt('11',2)), { addr: '37', pos: 1 });
    q.deepEqual(termops.maskAddress(['115', '115'], '## 115', parseInt('11',2)), { addr: '115', pos: 1 });
    q.end();
});
