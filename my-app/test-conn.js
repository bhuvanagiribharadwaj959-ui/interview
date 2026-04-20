
const url = process.argv[2];
console.log(`Checking ${url}...`);

fetch(url)
  .then(res => console.log(`Status: ${res.status}`))
  .catch(err => console.error(`Error: ${err.message}`));
