const res = await fetch('https://wandbox.org/api/compile.json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    compiler: 'cpython-3.10.6',
    code: 'print("Hello from Wandbox")'
  })
});
console.log(await res.json());
