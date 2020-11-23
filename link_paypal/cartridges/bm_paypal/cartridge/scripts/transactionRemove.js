/**
 * Remove custom transction that more than year old
 */
function execute() {
    const year = 31556952000;
    const { queryCustomObjects, remove } = require('dw/object/CustomObjectMgr');
    const dueDate = new Date((new Date()).getTime() - year);
    const transactionToRemove = queryCustomObjects('PayPalNewTransactions', 'creationDate < {0}', 'creationDate desc', dueDate);
    while (transactionToRemove.hasNext()) {
        remove(transactionToRemove.next());
    }
}

exports.execute = execute;
