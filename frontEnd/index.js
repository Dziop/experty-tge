const SplitableResponseFields = {
  tokensPerField: 0,
  proposalAddress: 1,
  claimedPeriods: 2,
  state: 3,
  address: 4
}

const BountyFields = {
  amountField: 0,
  proposalAddressField: 1,
  bountyStateField: 2,
  address: 3
}

function addCell(value, tr) {
  const cell = document.createElement('td');
  cell.innerHTML = value;
  tr.appendChild(cell);
}

function getState(state) {
  switch (state) {
    case 0:
      return "Proposed"
    case 1:
      return "Approved"
    case 2:
      return "Rejected"
  }
}

function fullFillSplittableTable(tableId, mockResponse) {
  const table = document.getElementById(tableId);
  mockResponse.map(res => {
    const tr = document.createElement('tr');

    addCell(res[SplitableResponseFields.address], tr);
    addCell(res[SplitableResponseFields.tokensPerField].toNumber(), tr);
    addCell(res[SplitableResponseFields.claimedPeriods].toNumber(), tr);
    addCell(getState(res[SplitableResponseFields.state].toNumber()), tr);

    table.appendChild(tr);
  });
}
function fullFillBountyTable(tableId, mockResponse) {
  const table = document.getElementById(tableId);
  mockResponse.map(res => {
    const tr = document.createElement('tr');

    addCell(res[BountyFields.address], tr);
    addCell(res[BountyFields.amountField].toNumber(), tr);
    addCell(getState(res[BountyFields.bountyStateField].toNumber()), tr);

    table.appendChild(tr);
  });
}

const Web3 = require('web3');

fetch('contracts/ExyToken.json')
  .then(res => res.json())
  .then(res => {
    const ABI = res.abi;
    const BYTECODE = res.bytecode;
    const PROVIDER = 'http://localhost:8545';
    const ADDRESS = '0xcae968005d178839204bdf0ee19ae1afbeccd8f7';
    if (typeof web3 !== 'undefined') {
      web3 = new Web3(web3.currentProvider);
    } else {
      web3 = new Web3(new Web3.providers.HttpProvider(PROVIDER));
    }
    console.log(web3);
    web3.eth.defaultAccount = web3.eth.accounts[0];
    const ExyTokenContract = web3.eth.contract(ABI);

    var DEPLOY = true;
    if (DEPLOY) {
      ExyTokenContract.new({
        data: '0x' + BYTECODE,
        from: web3.eth.coinbase,
        gas: 90000 * 2
      }, function (err, res) {
        console.log(err);
        console.log(res);
      })
    } else {
      const exyTokenInstance = ExyTokenContract.at(ADDRESS);

      function getAndFullfillSplitable(lengthGetter, allocationGetter, tableId, fulfillFunction) {
        lengthGetter.call((err, res) => {
          const companyListLength = res.toNumber();
          const promises = [];
          function createPromise(id) {
            return new Promise(function (resolve, reject) {
              allocationGetter.call(id, (err, res) => {
                resolve(res);
              })
            });
          }
          for (let i = 0; i < companyListLength; ++i) {
            promises.push(createPromise(i));
          }
          Promise.all(promises).then(res =>
            fulfillFunction(tableId, res)
          );
        });
      }
      getAndFullfillSplitable(
        exyTokenInstance.getCompanyAllocationListLength,
        exyTokenInstance.getCompanyAllocation,
        'tkn-company-allocation-tbody',
        fullFillSplittableTable);
      getAndFullfillSplitable(
        exyTokenInstance.getPartnerAllocationListLength,
        exyTokenInstance.getPartnerAllocation,
        'tkn-partner-allocation-tbody',
        fullFillSplittableTable);
      getAndFullfillSplitable(
        exyTokenInstance.getBountyAllocationListLength,
        exyTokenInstance.getBountyAllocation,
        'tkn-bounty-allocation-tbody',
        fullFillBountyTable);
    }
  });
