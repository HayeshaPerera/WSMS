const bcrypt = require('bcryptjs');

const password = 'password123';
const hash = bcrypt.hashSync(password, 10);
console.log('Password hash for "password123":');
console.log(hash);
