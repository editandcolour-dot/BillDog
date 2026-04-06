import { generateTokeniseUrl } from './lib/payfast/tokenise.ts';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = generateTokeniseUrl({
  userId: '1234',
  userEmail: 'editandcolour@gmail.com',
  userName: 'User'
});

console.log('GEN URL: ', url);

fetch(url)
  .then(res => res.text())
  .then(txt => {
    if (txt.includes('glitch somewhere')) console.log('500 ERROR GLITCH!');
    else console.log('SUCCESS');
});
