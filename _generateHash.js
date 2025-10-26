import userModel from './models/user.model.js';

async function createPassword() {
  const myPassword = 'password123'; 
  const hash = await userModel.hashPassword(myPassword);
  
  console.log('--- Your Admin Password Hash ---');
  console.log(hash);
  console.log('----------------------------------');
}

createPassword();