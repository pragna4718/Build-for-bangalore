const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const AI_URL = process.env.AI_URL || "http://localhost:8000";

const tests = [
  {
    name: "Node health ping",
    url: `${SERVER_URL}/api/ping`,
    method: "GET",
    expectStatus: [200],
  },
  {
    name: "AI service ping",
    url: `${AI_URL}/ping`,
    method: "GET",
    expectStatus: [200],
  },
  {
    name: "Food plate proxy",
    url: `${SERVER_URL}/api/food-plate/analyze`,
    method: "POST",
    body: { image: "dGVzdA==" },
    expectStatus: [200],
  },
  {
    name: "Health QA proxy",
    url: `${SERVER_URL}/api/health-qa/ask`,
    method: "POST",
    body: { question: "What foods help with sleep?" },
    expectStatus: [200],
  },
  {
    name: "Grocery image proxy",
    url: `${SERVER_URL}/api/grocery/scan-image`,
    method: "POST",
    body: { image: "dGVzdA==" },
    expectStatus: [200],
  },
  {
    name: "Direct AI food-plate",
    url: `${AI_URL}/food-plate`,
    method: "POST",
    body: { image: "dGVzdA==" },
    expectStatus: [200],
  },
  {
    name: "Direct AI health-qa",
    url: `${AI_URL}/health-qa`,
    method: "POST",
    body: { question: "I have headache, what should I eat?" },
    expectStatus: [200],
  },
  {
    name: "Direct AI grocery image",
    url: `${AI_URL}/grocery-analyze/image`,
    method: "POST",
    body: { image: "dGVzdA==", userId: "smoke" },
    expectStatus: [200],
  },
];

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

async function runTest(test) {
  const options = {
    method: test.method,
    headers: { "Content-Type": "application/json" },
  };
  if (test.body) options.body = JSON.stringify(test.body);

  try {
    const response = await withTimeout(fetch(test.url, options), 12000);
    const ok = test.expectStatus.includes(response.status);
    let preview = "";

    try {
      const text = await response.text();
      preview = text.slice(0, 160).replace(/\s+/g, " ").trim();
    } catch {
      preview = "<no body>";
    }

    return {
      name: test.name,
      pass: ok,
      status: response.status,
      preview,
      url: test.url,
    };
  } catch (error) {
    return {
      name: test.name,
      pass: false,
      status: "ERR",
      preview: error.message,
      url: test.url,
    };
  }
}

async function main() {
  console.log("Running PreventAI smoke tests...");
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`AI URL: ${AI_URL}\n`);

  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    const icon = result.pass ? "PASS" : "FAIL";
    console.log(`${icon} ${result.name} [${result.status}]`);
    if (!result.pass) {
      console.log(`  URL: ${result.url}`);
      console.log(`  Detail: ${result.preview}`);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  console.log(`\nSummary: ${passed}/${results.length} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Smoke test runner crashed:", err);
  process.exit(1);
});
