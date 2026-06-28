async function test() {
  const res = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
    method: 'POST'
  });
  console.log(res.status);
}
test();
